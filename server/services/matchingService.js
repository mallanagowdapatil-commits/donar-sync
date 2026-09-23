/**
 * DonorSync Blood Compatibility Matrix & Deterministic Matching Engine
 * 
 * Compatibility Rules:
 * Key = Recipient Blood Group, Value = Array of Compatible Donor Groups
 */
export const COMPATIBILITY_MAP = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

/**
 * Valid blood groups list
 */
export const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Calculate Great-Circle distance in kilometers between two GPS coordinates using the Haversine formula.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const pLat1 = parseFloat(lat1);
  const pLon1 = parseFloat(lon1);
  const pLat2 = parseFloat(lat2);
  const pLon2 = parseFloat(lon2);

  if (isNaN(pLat1) || isNaN(pLon1) || isNaN(pLat2) || isNaN(pLon2)) {
    return 999.9;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = (pLat2 - pLat1) * (Math.PI / 180);
  const dLon = (pLon2 - pLon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pLat1 * (Math.PI / 180)) * Math.cos(pLat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
}

/**
 * Deterministic, Explainable Blood Match Scoring Algorithm
 * 
 * Factors (100-point composite weight):
 * 1. Compatibility Weight: 40 points (100% compatible = 40, incompatible = 0)
 * 2. Proximity Weight: 35 points (Decays linearly from 35 at 0km to 0 at maxRadius)
 * 3. Rest Eligibility Recency: 15 points (Full rest >= 90 days = 15, partial rest = scaled)
 * 4. Donor Reliability/Rating: 10 points (5.0 rating = 10 points)
 */
export function scoreDonorMatch({
  recipientBloodGroup,
  donorBloodGroup,
  distanceKm,
  maxRadiusKm = 50,
  lastDonationDate,
  activeRating = 5.0,
  isAvailable = true
}) {
  const compatibleTypes = COMPATIBILITY_MAP[recipientBloodGroup] || [];
  const isCompatible = compatibleTypes.includes(donorBloodGroup);

  if (!isCompatible) {
    return {
      isCompatible: false,
      overallScore: 0,
      factors: { compatibility: 0, proximity: 0, recency: 0, reliability: 0 },
      explanation: `${donorBloodGroup} is clinically incompatible with requested ${recipientBloodGroup}`
    };
  }

  // 1. Compatibility Factor (40 pts max)
  // Direct identical type gives max (40), universal gives 38 (saving O- for O- when possible)
  let compatibilityScore = (donorBloodGroup === recipientBloodGroup) ? 40 : 38;

  // 2. Proximity Factor (35 pts max)
  const clampedDistance = Math.min(distanceKm, maxRadiusKm);
  const proximityFraction = Math.max(0, 1 - (clampedDistance / maxRadiusKm));
  const proximityScore = Math.round(proximityFraction * 35);

  // 3. Recency / 90-day rest interval (15 pts max)
  let daysSinceDonation = 180;
  if (lastDonationDate) {
    const diffMs = Date.now() - new Date(lastDonationDate).getTime();
    daysSinceDonation = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }
  const isEligibleInterval = daysSinceDonation >= 90;
  const recencyScore = isEligibleInterval ? 15 : Math.min(14, Math.round((daysSinceDonation / 90) * 15));

  // 4. Reliability Factor (10 pts max)
  const rating = Math.max(1, Math.min(5, parseFloat(activeRating) || 5.0));
  const reliabilityScore = Math.round((rating / 5.0) * 10);

  // Availability modifier: If donor marked themselves unavailable, deduct 40 points
  let availabilityPenalty = isAvailable ? 0 : 40;

  const totalRaw = compatibilityScore + proximityScore + recencyScore + reliabilityScore - availabilityPenalty;
  const overallScore = Math.max(0, Math.min(100, totalRaw));

  return {
    isCompatible: true,
    overallScore,
    daysSinceDonation,
    isEligibleInterval,
    factors: {
      compatibility: Math.round((compatibilityScore / 40) * 100),
      proximity: Math.round((proximityScore / 35) * 100),
      recency: Math.round((recencyScore / 15) * 100),
      reliability: Math.round((reliabilityScore / 10) * 100)
    },
    explanation: `Compatibility: ${compatibilityScore}/40 | Distance (${distanceKm}km): ${proximityScore}/35 | Interval (${daysSinceDonation}d): ${recencyScore}/15 | Rating (${rating}★): ${reliabilityScore}/10`
  };
}

/**
 * Filter, score, and rank nearby compatible donors for a blood request
 */
export function findMatches(requestLat, requestLon, requestBloodGroup, donorsList = [], maxRadiusKm = 50) {
  const reqLat = parseFloat(requestLat);
  const reqLon = parseFloat(requestLon);

  return donorsList
    .map(donor => {
      const distance = calculateDistance(reqLat, reqLon, donor.latitude, donor.longitude);

      if (distance > maxRadiusKm) return null;

      const scoreData = scoreDonorMatch({
        recipientBloodGroup: requestBloodGroup,
        donorBloodGroup: donor.bloodGroup,
        distanceKm: distance,
        maxRadiusKm,
        lastDonationDate: donor.lastDonationDate,
        activeRating: donor.activeRating,
        isAvailable: donor.isAvailable !== false
      });

      if (!scoreData.isCompatible) return null;

      const etaMinutes = Math.round(distance * 1.8 + 6); // Average urban traffic transit estimation

      return {
        ...donor,
        distanceKm: distance,
        matchScore: scoreData.overallScore,
        scoringFactors: scoreData.factors,
        scoringExplanation: scoreData.explanation,
        daysSinceDonation: scoreData.daysSinceDonation,
        isEligible: scoreData.isEligibleInterval,
        routeEtaMinutes: etaMinutes
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore);
}
