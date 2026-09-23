import express from 'express';
import { inMemoryStore } from '../database/inMemoryStore.js';
import { supabase, isSupabaseConfigured } from '../database/supabase.js';
import { findMatches, VALID_BLOOD_GROUPS } from '../services/matchingService.js';

const router = express.Router();

router.get('/donors', async (req, res) => {
  const { lat, lon, bloodGroup, radius } = req.query;

  if (!lat || !lon || !bloodGroup) {
    return res.status(400).json({ error: 'lat, lon, and bloodGroup are required query parameters.' });
  }

  if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
    return res.status(400).json({ error: `Invalid blood group: ${bloodGroup}` });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  const maxRadius = radius ? parseFloat(radius) : 50;

  let donorPool = [];

  // 1. Fetch available donors from real Supabase table 'donors'
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('donors')
        .select('*')
        .eq('available', true)
        .limit(150);

      if (!error && data) {
        donorPool = data.map(d => ({
          id: d.id,
          donorCode: `DS-${d.blood_group.replace('+', 'POS').replace('-', 'NEG')}-${d.id ? d.id.slice(-4) : '2026'}`,
          name: d.name,
          phone: d.phone,
          bloodGroup: d.blood_group,
          latitude: parseFloat(d.latitude) || 12.9716,
          longitude: parseFloat(d.longitude) || 77.5946,
          activeRating: d.active_rating || 5.0,
          lastDonationDate: d.last_donation_date,
          isAvailable: d.available
        }));
      }
    } catch (e) {
      console.warn('Radar Supabase donor fetch warning:', e.message);
    }
  }

  // Fallback to demo pool if no db records yet
  if (donorPool.length === 0) {
    donorPool = inMemoryStore.donorProfiles.filter(d => d.isAvailable !== false);
  }

  const matches = findMatches(latitude, longitude, bloodGroup, donorPool, maxRadius);

  // Return privacy-masked donor view for public radar
  const safeMatches = matches.map(d => ({
    id: d.id,
    donorCode: d.donorCode || 'DS-DONOR',
    name: d.name ? `${d.name.split(' ')[0]} ${d.name.split(' ')[1]?.[0] || ''}.` : 'Verified Life Saver',
    bloodGroup: d.bloodGroup,
    distanceKm: d.distanceKm,
    matchScore: d.matchScore,
    scoringFactors: d.scoringFactors,
    scoringExplanation: d.scoringExplanation,
    routeEtaMinutes: d.routeEtaMinutes,
    lastDonationDate: d.lastDonationDate,
    isEligible: d.isEligible
  }));

  return res.json({
    receiverCoordinates: { latitude, longitude },
    bloodGroupRequested: bloodGroup,
    radiusScannedKm: maxRadius,
    matchesCount: safeMatches.length,
    matches: safeMatches
  });
});

export default router;
