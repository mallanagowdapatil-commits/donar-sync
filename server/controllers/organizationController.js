import { supabase, isSupabaseConfigured } from '../database/supabase.js';
import { isProduction } from '../config/env.js';

// In-memory fallback campaigns for demo mode
const demoCampaigns = [
  {
    id: 'camp-1',
    title: 'Metro Red Cross Blood Drive 2026',
    description: 'Community emergency donor drive for critical shortage replenishment.',
    venue: 'City Civic Center, Auditorium B',
    city: 'Bengaluru',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    targetUnits: 150,
    collectedUnits: 42,
    status: 'ACTIVE'
  },
  {
    id: 'camp-2',
    title: 'Youth Pulse Campus Donation Camp',
    description: 'University-wide life-saver volunteer collection camp.',
    venue: 'National Institute Campus Grounds',
    city: 'Bengaluru',
    startDate: '2026-10-15',
    endDate: '2026-10-16',
    targetUnits: 200,
    collectedUnits: 0,
    status: 'UPCOMING'
  }
];

/**
 * Get campaigns managed by NGO or public list
 */
export async function getCampaigns(req, res) {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map(c => ({
          id: c.id,
          title: c.title,
          description: c.description,
          venue: c.venue,
          city: c.city,
          startDate: c.start_date,
          endDate: c.end_date,
          targetUnits: c.target_units,
          collectedUnits: c.collected_units,
          status: c.status
        }));
        return res.json(mapped);
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to fetch campaigns', detail: e.message });
      }
    }
  }

  return res.json(demoCampaigns);
}

/**
 * Create a new blood donation drive campaign
 */
export async function createCampaign(req, res) {
  const { title, description, venue, city, startDate, endDate, targetUnits } = req.body;

  if (!title || !venue || !city || !startDate || !endDate) {
    return res.status(400).json({ error: 'Title, venue, city, start date, and end date are required.' });
  }

  const target = parseInt(targetUnits, 10) || 100;
  const orgId = req.user ? req.user.id : null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert([{
          organization_id: orgId,
          title: title.trim(),
          description: description || 'Community blood drive.',
          venue: venue.trim(),
          city: city.trim(),
          start_date: startDate,
          end_date: endDate,
          target_units: target,
          collected_units: 0,
          status: 'UPCOMING'
        }])
        .select()
        .single();

      if (!error && data) {
        return res.status(201).json({
          message: 'Blood donation campaign created successfully.',
          campaign: {
            id: data.id,
            title: data.title,
            venue: data.venue,
            city: data.city,
            startDate: data.start_date,
            endDate: data.end_date,
            targetUnits: data.target_units,
            collectedUnits: data.collected_units,
            status: data.status
          }
        });
      }
    } catch (e) {
      if (isProduction) {
        return res.status(500).json({ error: 'Failed to create campaign in database', detail: e.message });
      }
    }
  }

  const newCamp = {
    id: `camp-${Date.now()}`,
    title: title.trim(),
    description: description || 'Community blood drive.',
    venue: venue.trim(),
    city: city.trim(),
    startDate,
    endDate,
    targetUnits: target,
    collectedUnits: 0,
    status: 'UPCOMING'
  };
  demoCampaigns.unshift(newCamp);

  return res.status(201).json({
    message: 'Blood donation campaign created successfully (Demo Mode).',
    campaign: newCamp
  });
}

/**
 * Get NGO Overview & Statistics
 */
export async function getOrganizationStats(req, res) {
  let totalDrives = demoCampaigns.length;
  let totalCollected = demoCampaigns.reduce((sum, c) => sum + (c.collectedUnits || 0), 0);
  let totalTarget = demoCampaigns.reduce((sum, c) => sum + (c.targetUnits || 0), 0);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase.from('campaigns').select('*');
      if (data && data.length > 0) {
        totalDrives = data.length;
        totalCollected = data.reduce((sum, c) => sum + (c.collected_units || 0), 0);
        totalTarget = data.reduce((sum, c) => sum + (c.target_units || 0), 0);
      }
    } catch (e) {}
  }

  return res.json({
    totalDrives,
    totalCollected,
    totalTarget,
    activeVolunteers: 128,
    partnerHospitals: 14
  });
}
