import crypto from 'crypto';
import { inMemoryStore } from '../database/inMemoryStore.js';
import { supabase, isSupabaseConfigured } from '../database/supabase.js';
import { isProduction } from '../config/env.js';
import { emailService } from './emailService.js';

export class NotificationService {
  /**
   * Dispatch an SMS message via Twilio, MSG91, or local clinical simulator
   */
  static async sendSms({ phone, message }) {
    if (!phone) return { success: false, reason: 'No phone number provided' };

    const provider = process.env.SMS_PROVIDER || 'simulation';

    // 1. Twilio Integration (if environment credentials are provided)
    if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
        const params = new URLSearchParams({
          To: phone,
          From: process.env.TWILIO_PHONE_NUMBER,
          Body: message
        });

        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        const data = await res.json();
        if (res.ok) {
          return { success: true, provider: 'twilio', messageId: data.sid, status: data.status };
        } else {
          console.warn('[SMS] Twilio dispatch error:', data.message);
          return { success: false, provider: 'twilio', error: data.message };
        }
      } catch (err) {
        console.error('[SMS] Twilio connection failed:', err.message);
        return { success: false, provider: 'twilio', error: err.message };
      }
    }

    // 2. MSG91 Integration (if configured)
    if (provider === 'msg91' && process.env.MSG91_AUTH_KEY) {
      try {
        const res = await fetch('https://control.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'authkey': process.env.MSG91_AUTH_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            template_id: process.env.MSG91_TEMPLATE_ID,
            sender: process.env.MSG91_SENDER_ID || 'DONORS',
            mobiles: phone.replace(/\D/g, '')
          })
        });
        const data = await res.json();
        return { success: res.ok, provider: 'msg91', response: data };
      } catch (err) {
        return { success: false, provider: 'msg91', error: err.message };
      }
    }

    // 3. Clinical SMS Simulation (Development / Verified Staging)
    console.log(`[SMS-SIMULATOR] Dispatched to ${phone}: "${message}"`);
    return {
      success: true,
      provider: 'simulation',
      note: 'Message queued in DonorSync Clinical Dispatch Gateway (Set SMS_PROVIDER=twilio for carrier routing)'
    };
  }

  /**
   * Dispatch an in-app notification to a user with preference check
   */
  static async sendNotification({ userId, type = 'SYSTEM', title, message, data = {}, phone = null }) {
    if (!userId || !title || !message) return null;

    // 1. Check user notification preferences
    let allowSend = true;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: pref } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (pref) {
          if (type === 'EMERGENCY_REQUEST' && pref.emergency_alerts === false) allowSend = false;
          if (type === 'NEARBY_MATCH' && pref.nearby_requests === false) allowSend = false;
          if (type === 'LOW_STOCK_ALERT' && pref.inventory_alerts === false) allowSend = false;
        }
      } catch (err) {
        // Preferences table may not be queried; default to sending
      }
    }

    if (!allowSend) return null;

    let persistedNotif = null;

    // 2. Persist in Supabase PostgreSQL (using real table schema: 'read' column)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: notif, error } = await supabase
          .from('notifications')
          .insert([{
            id: crypto.randomUUID(),
            user_id: userId,
            title,
            message,
            read: false
          }])
          .select()
          .single();

        if (!error && notif) {
          persistedNotif = {
            id: notif.id,
            userId: notif.user_id,
            type,
            title: notif.title,
            message: notif.message,
            isRead: notif.read,
            data,
            createdAt: notif.created_at
          };
        }
      } catch (err) {
        if (isProduction) {
          console.error('[NOTIFICATIONS] Supabase insert failed:', err.message);
        }
      }
    }

    // Fallback if DB unavailable or in demo mode
    if (!persistedNotif) {
      persistedNotif = {
        id: `n-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      inMemoryStore.notifications.unshift(persistedNotif);
    }

    // 3. Trigger SMS alert if phone is provided and it's an emergency alert
    if (phone && (type === 'EMERGENCY_REQUEST' || type === 'REQUEST_ACCEPTED')) {
      const smsResult = await this.sendSms({ phone, message });
      persistedNotif.smsStatus = smsResult;
    }

    return persistedNotif;
  }

  /**
   * Broadcast emergency notification to matching donors
   */
  static async broadcastEmergencyToDonors(matchingDonors = [], request) {
    const notifications = [];
    const topDonors = matchingDonors.slice(0, 10);

    for (const donor of topDonors) {
      const distanceDisplay = donor.distanceKm !== undefined ? `${donor.distanceKm} km` : 'nearby';
      const smsBody = `URGENT DONORSYNC ALERT: ${request.bloodGroup} blood is required at ${request.hospital || 'local clinical center'}. Approximate distance: ${distanceDisplay}. Open DonorSync to respond.`;

      const notif = await this.sendNotification({
        userId: donor.id || donor.userId,
        type: 'EMERGENCY_REQUEST',
        title: `🚨 Emergency ${request.bloodGroup} Blood Request Nearby`,
        message: `${request.hospital || 'Clinical Facility'} requires ${request.unitsRequired} units of ${request.bloodGroup} blood (${distanceDisplay}). Compatibility match score: ${donor.matchScore || 90}%.`,
        data: {
          requestId: request.id,
          bloodGroup: request.bloodGroup,
          unitsRequired: request.unitsRequired,
          hospital: request.hospital,
          urgency: request.urgency,
          distanceKm: donor.distanceKm
        },
        phone: donor.phone || null
      });

      if (notif) notifications.push(notif);

      // 4. Dispatch Real Transactional Email Alert to Donor
      if (donor.email) {
        emailService.sendBloodRequestAlert({
          to: donor.email,
          donorName: donor.name,
          patientName: request.patientName,
          bloodGroup: request.bloodGroup,
          unitsRequired: request.unitsRequired,
          hospital: request.hospital,
          urgency: request.urgency,
          distanceKm: donor.distanceKm,
          requestId: request.id
        }).catch(err => console.warn('[EMAIL] Donor broadcast alert note:', err.message));
      }
    }

    return notifications;
  }

  /**
   * Notify hospital/patient when a donor accepts a request
   */
  static async notifyDonorAccepted(request, donor) {
    if (!request || !request.createdBy) return null;

    // Check if recipient / hospital has an email
    const recipientEmail = request.contactEmail || request.email || null;
    if (recipientEmail) {
      emailService.sendDonorAcceptedNotification({
        to: recipientEmail,
        patientName: request.patientName,
        bloodGroup: donor.bloodGroup,
        hospital: request.hospital,
        donorName: donor.name,
        donorCode: donor.donorCode || 'DS-DONOR',
        etaMinutes: donor.responseEtaMinutes || 25
      }).catch(err => console.warn('[EMAIL] Acceptance notification note:', err.message));
    }

    return await this.sendNotification({
      userId: request.createdBy,
      type: 'REQUEST_ACCEPTED',
      title: '✅ Life Saver En Route!',
      message: `A compatible ${donor.bloodGroup} donor has accepted your request for ${request.patientName || 'patient'} and is heading to ${request.hospital}.`,
      data: {
        requestId: request.id,
        donorId: donor.id,
        donorCode: donor.donorCode || 'DS-DONOR',
        bloodGroup: donor.bloodGroup
      }
    });
  }
}
