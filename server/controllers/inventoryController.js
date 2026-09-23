import crypto from 'crypto';
import { inMemoryStore } from '../database/inMemoryStore.js';
import { supabase, isSupabaseConfigured } from '../database/supabase.js';
import { isProduction } from '../config/env.js';
import { VALID_BLOOD_GROUPS } from '../services/matchingService.js';
import { NotificationService } from '../services/notificationService.js';

/**
 * Get current stock counts across all 8 blood groups and expiring packets
 */
export async function getStocks(req, res) {
  const stockMap = {};
  VALID_BLOOD_GROUPS.forEach(grp => {
    stockMap[grp] = 0;
  });

  // 1. Supabase Database Query
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: invData, error } = await supabase
        .from('blood_inventory')
        .select('*');

      if (!error && invData) {
        invData.forEach(item => {
          if (VALID_BLOOD_GROUPS.includes(item.blood_group)) {
            const count = item.units_available !== undefined ? item.units_available : (item.available_units !== undefined ? item.available_units : 12);
            stockMap[item.blood_group] = count;
          }
        });

        // Query expiry packets
        let expiring = [];
        try {
          const { data: expData } = await supabase
            .from('expiry_packets')
            .select('*')
            .neq('status', 'DISCARDED')
            .order('expiry_date', { ascending: true })
            .limit(20);
          if (expData) expiring = expData;
        } catch (e) {}

        return res.json({
          stocks: stockMap,
          inventoryDetails: invData.map(i => ({
            id: i.id,
            bloodGroup: i.blood_group,
            availableUnits: i.units_available !== undefined ? i.units_available : (i.available_units || 0),
            reservedUnits: i.reserved_units || 0,
            status: i.status || 'IN_STOCK',
            updatedAt: i.updated_at || i.created_at
          })),
          expiringPackets: expiring
        });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to fetch inventory from database', detail: e.message });
      }
    }
  }

  // 2. Demo fallback
  inMemoryStore.bloodInventory.forEach(item => {
    stockMap[item.bloodGroup] = item.availableUnits;
  });

  const expiring = inMemoryStore.expiryPackets.filter(p => p.status !== 'DISCARDED');

  return res.json({
    stocks: stockMap,
    inventoryDetails: inMemoryStore.bloodInventory,
    expiringPackets: expiring
  });
}

/**
 * Update stock level for a blood group (Never permit negative inventory)
 */
export async function updateStock(req, res) {
  const { bloodGroup, quantity, reason, transactionType } = req.body;

  if (!bloodGroup || quantity === undefined) {
    return res.status(400).json({ error: 'Blood group and quantity are required.' });
  }

  if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ error: `Invalid blood group: ${bloodGroup}` });
  }

  const newQty = parseInt(quantity, 10);
  if (isNaN(newQty) || newQty < 0) {
    return res.status(400).json({ error: 'Blood inventory quantity cannot be negative.' });
  }

  const userId = req.user ? req.user.id : null;

  // 1. Supabase Update
  if (isSupabaseConfigured && supabase) {
    try {
      // Find existing item
      const { data: existing } = await supabase
        .from('blood_inventory')
        .select('*')
        .eq('blood_group', bloodGroup)
        .maybeSingle();

      const prevUnits = existing ? (existing.units_available ?? existing.available_units ?? 0) : 0;
      const unitDelta = newQty - prevUnits;

      let updatedId = existing ? existing.id : null;

      if (existing) {
        await supabase
          .from('blood_inventory')
          .update({
            units_available: newQty,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        const { data: created } = await supabase
          .from('blood_inventory')
          .insert([{
            id: crypto.randomUUID(),
            blood_group: bloodGroup,
            units_available: newQty
          }])
          .select()
          .single();
        if (created) updatedId = created.id;
      }

      // Record transaction
      try {
        await supabase.from('inventory_transactions').insert([{
          inventory_id: updatedId,
          blood_group: bloodGroup,
          transaction_type: transactionType || (unitDelta >= 0 ? 'INFLOW_DONATION' : 'OUTFLOW_TRANSFUSION'),
          units: unitDelta,
          previous_units: prevUnits,
          new_units: newQty,
          reason: reason || 'Routine inventory adjustment',
          logged_by: userId
        }]);
      } catch (txErr) {}

      // Trigger low-stock alert if critical
      if (newQty <= 5 && userId) {
        await NotificationService.sendNotification({
          userId,
          type: 'LOW_STOCK_ALERT',
          title: `⚠️ Critical Shortage: ${bloodGroup}`,
          message: `${bloodGroup} blood stock has dropped to ${newQty} units. Immediate intake drive recommended.`,
          data: { bloodGroup, currentStock: newQty }
        });
      }

      // Return refreshed map
      const { data: allInv } = await supabase.from('blood_inventory').select('*');
      const stockMap = {};
      VALID_BLOOD_GROUPS.forEach(grp => { stockMap[grp] = 0; });
      if (allInv) {
        allInv.forEach(i => { stockMap[i.blood_group] = i.units_available ?? i.available_units ?? 0; });
      }

      return res.json({
        message: `Blood stock for ${bloodGroup} updated to ${newQty} units.`,
        stocks: stockMap
      });
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to update inventory in database', detail: e.message });
      }
    }
  }

  // 2. Demo fallback
  let item = inMemoryStore.bloodInventory.find(inv => inv.bloodGroup === bloodGroup);
  const prevUnits = item ? item.availableUnits : 0;
  const unitDelta = newQty - prevUnits;

  if (item) {
    item.availableUnits = newQty;
  } else {
    item = {
      id: `inv-${Date.now()}`,
      bankId: userId || 'u3',
      bloodGroup,
      availableUnits: newQty,
      reservedUnits: 0,
      targetSafetyUnits: 25
    };
    inMemoryStore.bloodInventory.push(item);
  }

  const tx = {
    id: `tx-${Date.now()}`,
    inventoryId: item.id,
    bloodGroup,
    transactionType: unitDelta >= 0 ? 'INFLOW_DONATION' : 'OUTFLOW_TRANSFUSION',
    units: unitDelta,
    previousUnits: prevUnits,
    newUnits: newQty,
    reason: reason || 'Routine inventory adjustment',
    createdAt: new Date().toISOString()
  };
  inMemoryStore.inventoryTransactions.unshift(tx);

  const stockMap = {};
  inMemoryStore.bloodInventory.forEach(i => {
    stockMap[i.bloodGroup] = i.availableUnits;
  });

  return res.json({
    message: `Blood stock for ${bloodGroup} updated to ${newQty} units (Demo Mode).`,
    stocks: stockMap,
    transaction: tx
  });
}

/**
 * Add a new expiring unit packet
 */
export async function addExpiryPacket(req, res) {
  const { bloodGroup, units, expiryDate, bankName } = req.body;

  if (!bloodGroup || !expiryDate) {
    return res.status(400).json({ error: 'Blood group and expiry date are required.' });
  }

  const numUnits = parseInt(units, 10) || 1;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('expiry_packets')
        .insert([{
          blood_group: bloodGroup,
          units: numUnits,
          expiry_date: expiryDate,
          bank_name: bankName || 'DonorSync Central Blood Bank',
          status: 'EXPIRING_SOON'
        }])
        .select()
        .single();

      if (!error && data) {
        return res.status(201).json({ message: 'Packet registered for clinical expiry tracking.', packet: data });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to record packet', detail: e.message });
      }
    }
  }

  const newPacket = {
    id: `pkt-${Date.now()}`,
    bloodGroup,
    units: numUnits,
    expiryDate,
    bankName: bankName || 'Central Bank',
    status: 'EXPIRING_SOON',
    createdAt: new Date().toISOString()
  };

  inMemoryStore.expiryPackets.unshift(newPacket);

  return res.status(201).json({
    message: 'Packet registered for clinical expiry tracking (Demo Mode).',
    packet: newPacket
  });
}

/**
 * Update expiry packet status
 */
export async function updateExpiryPacket(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('expiry_packets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return res.json({ message: 'Packet updated successfully.', packet: data });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to update packet', detail: e.message });
      }
    }
  }

  const packet = inMemoryStore.expiryPackets.find(p => p.id === id);
  if (packet) {
    packet.status = status || packet.status;
    return res.json({ message: 'Packet updated successfully (Demo Mode).', packet });
  }

  return res.status(404).json({ error: 'Packet not found' });
}

/**
 * Get inventory audit transactions
 */
export async function getTransactions(req, res) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        return res.json({ transactions: data });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to fetch transactions', detail: e.message });
      }
    }
  }

  return res.json({ transactions: inMemoryStore.inventoryTransactions });
}

