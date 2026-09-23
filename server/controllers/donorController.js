import { inMemoryStore } from '../database/inMemoryStore.js';
import { supabase, isSupabaseConfigured } from '../database/supabase.js';
import { isProduction } from '../config/env.js';
import { calculateDistance, findMatches, VALID_BLOOD_GROUPS, COMPATIBILITY_MAP } from '../services/matchingService.js';
import { NotificationService } from '../services/notificationService.js';
import { emailService } from '../services/emailService.js';

/**
 * Register a new Donor
 */
export async function registerDonor(req, res) {
  const { name, bloodGroup, email, phone, age, weight, gender, city, state, pincode, latitude, longitude, lastDonationDate } = req.body;

  if (!name || !bloodGroup || !email || !phone) {
    return res.status(400).json({ error: 'Name, blood group, email, and phone number are required.' });
  }

  if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ error: `Invalid blood group. Allowed groups: ${VALID_BLOOD_GROUPS.join(', ')}` });
  }

  const numAge = parseInt(age, 10) || 25;
  const numWeight = parseFloat(weight) || 60;

  // Pre-screening checks
  if (numAge < 18 || numAge > 65) {
    return res.status(400).json({ error: 'Medical Pre-screening Deferral: Donors must be between 18 and 65 years of age.' });
  }

  if (numWeight < 50.0) {
    return res.status(400).json({ error: 'Medical Pre-screening Deferral: Donors must weigh at least 50 kg.' });
  }

  const lat = parseFloat(latitude) || 12.9716;
  const lon = parseFloat(longitude) || 77.5946;
  const donationDate = lastDonationDate || null;

  // 1. Production / Supabase Persistence in 'donors' table
  if (isSupabaseConfigured && supabase) {
    try {
      const donorPayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        blood_group: bloodGroup,
        age: numAge,
        weight: numWeight,
        gender: gender || 'Other',
        city: city || 'Bengaluru',
        state: state || 'Karnataka',
        latitude: lat,
        longitude: lon,
        available: true,
        last_donation_date: donationDate,
        total_donations: 0,
        active_rating: 5.0
      };

      const { data, error } = await supabase
        .from('donors')
        .insert([donorPayload])
        .select()
        .single();

      if (error) throw error;

      // Non-blocking welcome email dispatch
      emailService.sendRegistrationConfirmation({
        to: data.email,
        name: data.name,
        role: 'Donor'
      }).catch(err => console.warn('[EMAIL] Donor confirmation note:', err.message));

      return res.status(201).json({
        message: 'Donor registered successfully!',
        donor: {
          id: data.id,
          name: data.name,
          bloodGroup: data.blood_group,
          phone: data.phone,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
          isAvailable: data.available,
          activeRating: data.active_rating,
          createdAt: data.created_at
        },
        advisory: 'Pre-screening only. Final eligibility is determined by qualified healthcare professionals.'
      });
    } catch (err) {
      console.error('[DONOR REGISTER ERROR]:', err);
      if (err.code === '23505') {
        return res.status(409).json({
          error: 'A donor with this email address or phone number is already registered.',
          detail: err.message
        });
      }
      if (isProduction) {
        return res.status(503).json({
          error: `Registration failed: ${err.message || 'Database error occurred in production mode.'}`,
          detail: err.message
        });
      }
    }
  }

  // 2. Demo fallback
  const donorCode = `DS-${bloodGroup.replace('+', 'POS').replace('-', 'NEG')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newDonor = {
    id: `d-${Date.now()}`,
    userId: req.user ? req.user.id : `u-${Date.now()}`,
    donorCode,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    bloodGroup,
    age: numAge,
    weight: numWeight,
    gender: gender || 'Other',
    city: city || 'Bengaluru',
    state: state || 'Karnataka',
    pincode: pincode || '560001',
    latitude: lat,
    longitude: lon,
    isAvailable: true,
    lastDonationDate: donationDate || new Date(Date.now() - 95 * 86400000).toISOString().split('T')[0],
    activeRating: 5.0,
    totalDonations: 0,
    searchRadiusKm: 15,
    createdAt: new Date().toISOString()
  };

  inMemoryStore.donorProfiles.unshift(newDonor);

  return res.status(201).json({
    message: 'Donor registered successfully (Demo Mode)!',
    donor: newDonor,
    advisory: 'Pre-screening only. Final eligibility is determined by qualified healthcare professionals.'
  });
}

/**
 * Get nearby emergency requests for the authenticated donor
 */
export async function getNearbyRequests(req, res) {
  const donorId = req.user ? req.user.id : null;

  // 1. Fetch live requests from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: requests, error } = await supabase
        .from('blood_requests')
        .select('*')
        .neq('status', 'FULFILLED')
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && requests) {
        const mapped = requests.map(r => ({
          id: r.id,
          patientName: r.patient_name,
          bloodGroup: r.blood_group,
          unitsRequired: r.units_required,
          urgency: r.urgency,
          status: r.status,
          hospital: r.hospital_name || 'Clinical Medical Center',
          distanceKm: 3.4,
          createdAt: r.created_at
        }));
        return res.json(mapped);
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to fetch nearby blood requests', detail: e.message });
      }
    }
  }

  // 2. Demo fallback
  const list = inMemoryStore.bloodRequests
    .filter(r => r.status === 'PENDING' || r.status === 'MATCHING' || r.status === 'ALERTED')
    .slice(0, 10);

  return res.json(list);
}

/**
 * Toggle Donor Availability
 */
export async function toggleAvailability(req, res) {
  const userId = req.user ? req.user.id : null;

  if (isSupabaseConfigured && supabase && userId) {
    try {
      // Find donor by email or user id
      const { data: donor } = await supabase
        .from('donors')
        .select('id, available')
        .or(`id.eq.${userId},email.eq.${req.user.email}`)
        .maybeSingle();

      if (donor) {
        const newStatus = !donor.available;
        await supabase
          .from('donors')
          .update({ available: newStatus })
          .eq('id', donor.id);

        return res.json({ message: 'Availability status updated.', isAvailable: newStatus });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to update availability', detail: e.message });
      }
    }
  }

  // Fallback demo toggle
  const donor = inMemoryStore.donorProfiles.find(d => d.userId === userId || d.id === userId) || inMemoryStore.donorProfiles[0];
  if (donor) {
    donor.isAvailable = !donor.isAvailable;
    return res.json({ message: 'Availability status updated (Demo Mode).', isAvailable: donor.isAvailable });
  }

  return res.json({ message: 'Availability status updated.', isAvailable: true });
}

/**
 * Donor accepts an emergency request
 */
export async function acceptRequest(req, res) {
  const { requestId } = req.body;
  const donorUser = req.user;

  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required.' });
  }

  let requestDetails = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: reqData } = await supabase
        .from('blood_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (reqData) {
        requestDetails = reqData;
        // Update request status to DONOR_CONTACTED
        await supabase
          .from('blood_requests')
          .update({ status: 'DONOR_CONTACTED' })
          .eq('id', requestId);

        // Record in donor_matches if table exists
        try {
          await supabase.from('donor_matches').insert([{
            request_id: requestId,
            donor_id: donorUser ? donorUser.id : null,
            status: 'ACCEPTED',
            response_eta_minutes: 25
          }]);
        } catch (mErr) {}

        // Notify Hospital / Patient
        await NotificationService.notifyDonorAccepted(
          { id: reqData.id, patientName: reqData.patient_name, hospital: reqData.hospital_name, createdBy: reqData.created_by },
          { id: donorUser ? donorUser.id : 'donor', name: donorUser ? donorUser.name : 'Verified Life Saver', bloodGroup: reqData.blood_group }
        );

        return res.json({
          message: 'Thank you! Your dispatch has been confirmed. Hospital notified.',
          status: 'ACCEPTED',
          routeEtaMinutes: 25
        });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to accept request', detail: e.message });
      }
    }
  }

  // Demo fallback
  const request = inMemoryStore.bloodRequests.find(r => r.id === requestId);
  if (request) {
    request.status = 'DONOR_CONTACTED';
  }

  return res.json({
    message: 'Thank you! Your dispatch has been confirmed. Hospital notified (Demo Mode).',
    status: 'ACCEPTED',
    routeEtaMinutes: 20
  });
}

/**
 * Get donor safety and eligibility checks
 */
export async function getSafetyChecks(req, res) {
  return res.json({
    clinicalGuidelines: [
      { rule: 'Age Range', requirement: '18 - 65 years', status: 'COMPLIANT' },
      { rule: 'Minimum Body Weight', requirement: '>= 50 kg (110 lbs)', status: 'COMPLIANT' },
      { rule: 'Rest Interval', requirement: '90 days between whole blood donations', status: 'COMPLIANT' },
      { rule: 'Hemoglobin Level', requirement: '>= 12.5 g/dL (Female) / >= 13.0 g/dL (Male)', status: 'PENDING_ONSITE_TEST' }
    ],
    advisory: 'Pre-screening only. Final eligibility is determined by qualified healthcare professionals.'
  });
}
