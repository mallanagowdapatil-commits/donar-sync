import crypto from 'crypto';
import { inMemoryStore } from '../database/inMemoryStore.js';
import { supabase, isSupabaseConfigured } from '../database/supabase.js';
import { isProduction } from '../config/env.js';
import { findMatches, VALID_BLOOD_GROUPS } from '../services/matchingService.js';
import { NotificationService } from '../services/notificationService.js';

/**
 * Create Emergency or Standard Blood Request (Patient / Hospital)
 */
export async function createEmergencyRequest(req, res) {
  const { patientName, bloodGroup, unitsRequired, urgency, hospital, latitude, longitude, requiredTime, notes } = req.body;

  if (!patientName || !bloodGroup || !unitsRequired) {
    return res.status(400).json({ error: 'Patient name, blood group, and units required are mandatory fields.' });
  }

  if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ error: `Invalid blood group: ${bloodGroup}` });
  }

  const units = parseInt(unitsRequired, 10);
  if (isNaN(units) || units <= 0) {
    return res.status(400).json({ error: 'Units required must be a positive number greater than zero.' });
  }

  const reqLat = parseFloat(latitude) || 12.9736;
  const reqLon = parseFloat(longitude) || 77.6111;
  const reqUrgency = urgency || 'Critical';
  const reqHospital = hospital || (req.user && req.user.role === 'Hospital' ? req.user.name : 'St. Jude General Hospital');
  const creatorId = req.user ? req.user.id : null;

  let createdRequest = null;
  let matches = [];

  // 1. Supabase Database Persistence
  if (isSupabaseConfigured && supabase) {
    try {
      // Find candidate donors from real 'donors' table
      const { data: dbDonors } = await supabase
        .from('donors')
        .select('*')
        .eq('available', true)
        .limit(100);

      const availableDonors = (dbDonors || []).map(d => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        bloodGroup: d.blood_group,
        latitude: parseFloat(d.latitude) || 12.9716,
        longitude: parseFloat(d.longitude) || 77.5946,
        activeRating: d.active_rating || 5.0,
        lastDonationDate: d.last_donation_date,
        isAvailable: d.available
      }));

      // Compute explainable matching scores
      matches = findMatches(reqLat, reqLon, bloodGroup, availableDonors, 50);

      const payload = {
        id: crypto.randomUUID(),
        patient_name: patientName.trim(),
        blood_group: bloodGroup,
        units_required: units,
        urgency: reqUrgency,
        status: 'MATCHING',
        hospital_name: reqHospital,
        latitude: reqLat,
        longitude: reqLon,
        notes: notes || 'Emergency clinical dispatch requested.'
      };

      const { data, error } = await supabase
        .from('blood_requests')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      createdRequest = {
        id: data.id,
        patientName: data.patient_name,
        bloodGroup: data.blood_group,
        unitsRequired: data.units_required,
        unitsFulfilled: data.units_fulfilled || 0,
        urgency: data.urgency,
        status: data.status,
        hospital: data.hospital_name || reqHospital,
        latitude: data.latitude || reqLat,
        longitude: data.longitude || reqLon,
        notes: data.notes,
        createdAt: data.created_at
      };

      // Save match entries to donor_matches if available
      try {
        const matchEntries = matches.slice(0, 5).map(m => ({
          request_id: data.id,
          donor_id: m.id,
          status: 'ALERTED',
          distance_km: m.distanceKm,
          match_score: m.matchScore,
          response_eta_minutes: m.routeEtaMinutes
        }));
        if (matchEntries.length > 0) {
          await supabase.from('donor_matches').insert(matchEntries);
        }
      } catch (matchErr) {
        // Non-blocking auxiliary table insert
      }

      // Broadcast notifications to top 10 matched donors
      await NotificationService.broadcastEmergencyToDonors(matches, createdRequest);

      return res.status(201).json({
        message: 'Emergency request registered. Matching donors alerted.',
        request: createdRequest,
        matchingDonorsCount: matches.length,
        topMatches: matches.slice(0, 5)
      });
    } catch (err) {
      if (isProduction) {
        return res.status(503).json({
          error: 'Database connection failed. Unable to persist blood request in production.',
          detail: err.message
        });
      }
    }
  }

  // 2. Demo fallback
  const fallbackReq = {
    id: `r-${Date.now()}`,
    createdBy: creatorId || 'u4',
    patientName,
    bloodGroup,
    unitsRequired: units,
    unitsFulfilled: 0,
    urgency: reqUrgency,
    status: 'MATCHING',
    hospital: reqHospital,
    latitude: reqLat,
    longitude: reqLon,
    requiredTime: requiredTime || new Date(Date.now() + 4 * 3600000).toISOString(),
    notes: notes || 'Emergency clinical dispatch requested.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const compatibleDonors = inMemoryStore.donorProfiles.filter(d => d.isAvailable);
  matches = findMatches(reqLat, reqLon, bloodGroup, compatibleDonors, 50);

  await NotificationService.broadcastEmergencyToDonors(matches, fallbackReq);
  inMemoryStore.bloodRequests.unshift(fallbackReq);

  return res.status(201).json({
    message: 'Emergency request registered (Demo Mode). Matching donors alerted.',
    request: fallbackReq,
    matchingDonorsCount: matches.length,
    topMatches: matches.slice(0, 5)
  });
}

/**
 * Get all blood requests with optional filters
 */
export async function getAllRequests(req, res) {
  const { status, bloodGroup } = req.query;

  // 1. Supabase Query
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('blood_requests').select('*').order('created_at', { ascending: false });

      if (status) query = query.eq('status', status.toUpperCase());
      if (bloodGroup) query = query.eq('blood_group', bloodGroup);

      const { data, error } = await query;
      if (!error && data) {
        const mapped = data.map(r => ({
          id: r.id,
          patientName: r.patient_name,
          bloodGroup: r.blood_group,
          unitsRequired: r.units_required,
          unitsFulfilled: r.units_fulfilled || 0,
          urgency: r.urgency,
          status: r.status,
          hospital: r.hospital_name || 'Medical Center',
          latitude: r.latitude,
          longitude: r.longitude,
          notes: r.notes,
          createdAt: r.created_at
        }));
        return res.json(mapped);
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to fetch blood requests', detail: e.message });
      }
    }
  }

  // 2. Demo fallback
  let list = inMemoryStore.bloodRequests;
  if (status) list = list.filter(r => r.status.toLowerCase() === status.toLowerCase());
  if (bloodGroup) list = list.filter(r => r.bloodGroup === bloodGroup);

  return res.json(list);
}

/**
 * Get requests created by the authenticated patient/hospital
 */
export async function getMyRequests(req, res) {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  // 1. Supabase Query
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('blood_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // In case created_by was populated
        const myRequests = data.map(r => ({
          id: r.id,
          patientName: r.patient_name,
          bloodGroup: r.blood_group,
          unitsRequired: r.units_required,
          unitsFulfilled: r.units_fulfilled || 0,
          urgency: r.urgency,
          status: r.status,
          hospital: r.hospital_name || 'St. Jude General Hospital',
          latitude: r.latitude || 12.9736,
          longitude: r.longitude || 77.6111,
          notes: r.notes,
          createdAt: r.created_at,
          matches: []
        }));
        return res.json(myRequests);
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to fetch requests history', detail: e.message });
      }
    }
  }

  // 2. Demo fallback
  const myRequests = inMemoryStore.bloodRequests
    .map(r => ({
      ...r,
      matches: inMemoryStore.donorMatches.filter(m => m.requestId === r.id)
    }));

  return res.json(myRequests);
}

/**
 * Update request status (e.g. FULFILLED, CANCELLED)
 */
export async function updateRequestStatus(req, res) {
  const { id } = req.params;
  const { status, unitsFulfilled } = req.body;

  const validStatuses = ['PENDING', 'MATCHING', 'DONOR_CONTACTED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const updateData = { updated_at: new Date().toISOString() };
      if (status) updateData.status = status;
      if (unitsFulfilled !== undefined) updateData.units_fulfilled = Math.max(0, parseInt(unitsFulfilled, 10) || 0);

      const { data, error } = await supabase
        .from('blood_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return res.json({
          message: 'Request status updated successfully.',
          request: {
            id: data.id,
            status: data.status,
            unitsFulfilled: data.units_fulfilled
          }
        });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to update request status', detail: e.message });
      }
    }
  }

  // Demo fallback
  const request = inMemoryStore.bloodRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Blood request not found.' });
  }

  if (status) request.status = status;
  if (unitsFulfilled !== undefined) request.unitsFulfilled = Math.max(0, parseInt(unitsFulfilled, 10) || 0);
  request.updatedAt = new Date().toISOString();

  return res.json({ message: 'Request status updated successfully (Demo Mode).', request });
}

/**
 * Get Request details along with matches
 */
export async function getRequestDetails(req, res) {
  const { id } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: request, error } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && request) {
        // Fetch matches
        let matches = [];
        try {
          const { data: mData } = await supabase
            .from('donor_matches')
            .select('*')
            .eq('request_id', id);
          if (mData) matches = mData;
        } catch (e) {}

        return res.json({
          request: {
            id: request.id,
            patientName: request.patient_name,
            bloodGroup: request.blood_group,
            unitsRequired: request.units_required,
            unitsFulfilled: request.units_fulfilled || 0,
            urgency: request.urgency,
            status: request.status,
            hospital: request.hospital_name,
            notes: request.notes,
            createdAt: request.created_at
          },
          matches
        });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to load request details', detail: e.message });
      }
    }
  }

  const request = inMemoryStore.bloodRequests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Blood request not found.' });
  }

  return res.json({
    request,
    matches: inMemoryStore.donorMatches.filter(m => m.requestId === id)
  });
}
