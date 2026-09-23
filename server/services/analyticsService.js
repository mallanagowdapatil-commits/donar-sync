/**
 * Analytics and Demand Prediction Service
 */

// Optimal safe stock level per blood type (in Units/Pints)
const TARGET_SAFETY_STOCK = {
  'A+': 40, 'A-': 15, 'B+': 35, 'B-': 12,
  'AB+': 20, 'AB-': 8, 'O+': 55, 'O-': 25
};

/**
 * Predicts potential shortages and stock risk indexes.
 * Risk scale: 0 (Optimal/Safe) to 100 (Critical Shortage)
 */
export function calculateShortageRisk(currentStock) {
  const risks = {};
  
  Object.keys(TARGET_SAFETY_STOCK).forEach(bloodGroup => {
    const stock = currentStock[bloodGroup] || 0;
    const target = TARGET_SAFETY_STOCK[bloodGroup];
    
    // Risk percentage is high when stock is low
    let riskFactor = Math.round(((target - stock) / target) * 100);
    
    // Bound risk
    riskFactor = Math.max(0, Math.min(100, riskFactor));
    
    let status = 'Safe';
    if (riskFactor > 75) status = 'Critical Shortage';
    else if (riskFactor > 40) status = 'Low Stock Alert';
    
    risks[bloodGroup] = {
      current: stock,
      target,
      riskPercentage: riskFactor,
      status,
      recommendation: riskFactor > 40 
        ? `Initiate targeted emergency mobile drive for ${bloodGroup} donors.` 
        : `Normal replenishment schedule is sufficient.`
    };
  });
  
  return risks;
}

/**
 * Predicts monthly blood demand spikes over the course of a year based on historical seasonal trends.
 * (e.g. malaria seasons, rainy weather, travel surges, winter donation dropoffs).
 */
export function getSeasonalAnalytics() {
  const currentMonth = new Date().getMonth();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Simulated historical coefficients for blood demand fluctuations
  // 1.0 is baseline, > 1.0 is surge, < 1.0 is drop
  const surgeCoefficients = [1.12, 1.05, 0.95, 0.98, 1.15, 1.30, 1.25, 1.10, 1.08, 1.20, 1.18, 1.35];
  
  return months.map((month, index) => {
    const coef = surgeCoefficients[index];
    let surgeReason = 'Baseline demand';
    
    if (coef > 1.3) surgeReason = 'Holiday travel & winter collection shortages';
    else if (coef > 1.2) surgeReason = 'Monsoon accident surges & high endemic fever hospitalizations';
    else if (coef < 0.98) surgeReason = 'Spring donation drive excess';
    
    return {
      month,
      demandMultiplier: coef,
      predictedSpikePercentage: Math.round((coef - 1) * 100),
      riskFactor: coef > 1.25 ? 'High Risk' : coef > 1.1 ? 'Moderate Risk' : 'Low Risk',
      surgeReason
    };
  });
}

/**
 * Foresees donation turnout trends based on donor counts and weather conditions.
 */
export function getDonationTrendsForecast() {
  return [
    { name: 'Week 1', registered: 45, actualTurnout: 38, forecast: 40 },
    { name: 'Week 2', registered: 52, actualTurnout: 49, forecast: 48 },
    { name: 'Week 3', registered: 30, actualTurnout: 15, forecast: 20 }, // E.g., weather storm drop
    { name: 'Week 4', registered: 65, actualTurnout: 58, forecast: 60 }, // Post-alert surge
    { name: 'Week 5', registered: 75, actualTurnout: 71, forecast: 70 },
  ];
}
