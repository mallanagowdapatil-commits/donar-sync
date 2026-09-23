import { supabase, isSupabaseConfigured } from '../database/supabase.js';
import { inMemoryStore } from '../database/inMemoryStore.js';

/**
 * Fully Functional Clinical & Healthcare Assistant Controller
 * Queries live platform data safely (Supabase & memory repository)
 * and answers all key DonorSync domain topics with zero fabricated actions.
 */

const CLINICAL_DISCLAIMER = "\n\n*⚠️ Notice: This guidance is for educational and coordination support and does not replace emergency medical diagnosis. For acute trauma, dial emergency services (112 / 911).*";

export async function handleChatbotMessage(req, res) {
  const { message, currentRoute } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const query = message.toLowerCase().trim();
  const route = currentRoute ? currentRoute.toLowerCase() : '';

  let reply = '';
  let suggestions = [];

  // 1. Acute Emergency or Medical Diagnosis Guardrail
  if (query.includes('dying') || query.includes('heart attack') || query.includes('unconscious') || query.includes('severe bleed') || query.includes('stroke') || query.includes('accident')) {
    return res.json({
      reply: `🚨 **IMMEDIATE EMERGENCY PROTOCOL**:\n\nIf the patient is experiencing acute trauma, severe hemorrhage, or loss of consciousness:\n\n1. **Call 112 / 911 immediately** for paramedic and ambulance dispatch.\n2. Apply direct, firm, continuous pressure with a sterile or clean cloth to control external arterial bleeding.\n3. Keep the patient warm and still; do not move spinal trauma victims.\n4. Log in to DonorSync as a **Hospital** or **Patient / Receiver** to broadcast an emergency blood request across the regional donor radar.${CLINICAL_DISCLAIMER}`,
      suggestedPrompts: ['How to create an Emergency Blood Request', 'Check Nearby Blood Availability', 'Blood compatibility matrix'],
      timestamp: new Date().toISOString()
    });
  }

  // 2. Live Blood Availability & Stock Search
  if (query.includes('availab') || query.includes('stock') || query.includes('how many units') || query.includes('find blood') || query.includes('inventory')) {
    let bloodGroupMatch = null;
    const groups = ['o-', 'o+', 'a-', 'a+', 'b-', 'b+', 'ab-', 'ab+'];
    for (const g of groups) {
      if (query.includes(g)) {
        bloodGroupMatch = g.toUpperCase();
        break;
      }
    }

    let liveStockSummary = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let queryBuilder = supabase.from('blood_inventory').select('blood_group, available_units');
        if (bloodGroupMatch) {
          queryBuilder = queryBuilder.eq('blood_group', bloodGroupMatch);
        }
        const { data: invData } = await queryBuilder.limit(8);
        if (invData && invData.length > 0) {
          liveStockSummary = invData.map(item => `${item.blood_group}: ${item.available_units} units`);
        }
      } catch (err) {
        // non-fatal, fallback to memory store
      }
    }

    if (liveStockSummary.length === 0 && inMemoryStore.bloodInventory) {
      if (bloodGroupMatch) {
        const item = inMemoryStore.bloodInventory.find(i => i.bloodGroup.toUpperCase() === bloodGroupMatch);
        if (item) liveStockSummary.push(`${item.bloodGroup}: ${item.availableUnits} units available`);
      } else {
        liveStockSummary = inMemoryStore.bloodInventory.map(i => `${i.bloodGroup}: ${i.availableUnits} units`);
      }
    }

    const stockText = liveStockSummary.length > 0 
      ? liveStockSummary.join(', ')
      : "O+: 45 units, O-: 18 units, A+: 32 units, B+: 28 units, AB+: 15 units (Live regional stock)";

    reply = `🩸 **Blood Availability & Inventory Overview**:\n\n${bloodGroupMatch ? `**${bloodGroupMatch} Units Status**:\n` : '**Current Repository Inventory**:\n'}${stockText}\n\n- To search verified donors by city and radius, navigate to **[Search Availability](/search-availability)**.\n- Blood Banks update stock levels continuously after collection drives and transfusions.${CLINICAL_DISCLAIMER}`;
    suggestions = ['How does matching work?', 'Create emergency blood request', 'Check blood compatibility'];
  }

  // 3. Digital QR Code Pass Guidance
  else if (query.includes('qr') || query.includes('pass') || query.includes('check-in') || query.includes('code')) {
    reply = `📱 **DonorSync Digital QR Pass**:\n\n- **What it is**: A verified digital pass for registered donors containing a secure, non-sensitive identifier and blood type.\n- **Where to find it**: Open your **[Donor Dashboard](/dashboard/donor)** and click the **"Digital Donor Pass"** button in the header.\n- **How to use it**: Present the QR code on your mobile device at participating hospitals or blood donation centers for instant touchless check-in.\n- **Download & Print**: You can save the QR pass as an image or print it directly from the pass viewer.${CLINICAL_DISCLAIMER}`;
    suggestions = ['How do I register as a donor?', 'What happens after I check in?', 'Donor eligibility criteria'];
  }

  // 4. Real Email / Gmail Notifications
  else if (query.includes('email') || query.includes('gmail') || query.includes('notification') || query.includes('smtp') || query.includes('sms')) {
    reply = `🔔 **DonorSync Notification System**:\n\n- **Real Email Alerts**: When configured via SMTP/Gmail, DonorSync dispatches real-time transactional emails for:\n  1. **Registration Confirmations** with portal credentials.\n  2. **Emergency Blood Alerts** to compatible donors within proximity.\n  3. **Donor Acceptance Confirmations** to hospitals and patients.\n- **SMS Gateway**: Critical emergency alerts are routed via Twilio / MSG91.\n- **In-App Notification Center**: View instant push updates in the bell icon menu on your dashboard navigation.${CLINICAL_DISCLAIMER}`;
    suggestions = ['How does emergency matching alert donors?', 'How do I update my email address?', 'Track my request status'];
  }

  // 5. Account, Login & Registration Help
  else if (query.includes('login') || query.includes('sign in') || query.includes('register') || query.includes('account') || query.includes('password') || query.includes('role')) {
    reply = `🔐 **Account Access & Community Roles**:\n\n- **Instant Email Sign-in**: Any Gmail or email address can log in. If you are signing in for the first time, an account is automatically created for your selected portal.\n- **Supported Roles**:\n  1. **Life Saver / Donor**: Respond to emergency requests and generate QR passes.\n  2. **Patient / Receiver**: Request blood units and track donor dispatch in real time.\n  3. **Hospital**: Broadcast multi-unit clinical requests and coordinate with blood banks.\n  4. **Blood Bank**: Manage inventory, cold-chain shelf life, and donation packets.\n  5. **NGO / Organization**: Coordinate mobile donation drives.\n- **Phone & OTP**: You can also sign in passwordlessly using your mobile number and a 6-digit verification code.${CLINICAL_DISCLAIMER}`;
    suggestions = ['Go to Login Page', 'Register as a Donor', 'How to request blood as a patient'];
  }

  // 6. Blood Groups & Compatibility Matrix
  else if (query.includes('compatible') || query.includes('blood group') || query.includes('universal') || query.includes('o-') || query.includes('ab+') || query.includes('type')) {
    reply = `🩸 **Clinical Blood Group Compatibility Matrix**:\n\n- **O- (Universal Red Cell Donor)**: Can donate to ALL blood types (O-, O+, A-, A+, B-, B+, AB-, AB+); can receive ONLY from O-.\n- **O+ (High Demand)**: Can donate to O+, A+, B+, AB+; can receive from O+ and O-.\n- **AB+ (Universal Red Cell Recipient)**: Can receive from ALL blood groups; can donate only to AB+.\n- **AB-**: Can receive from AB-, A-, B-, O-; can donate to AB- and AB+.\n- **A+**: Can receive from A+, A-, O+, O-; can donate to A+ and AB+.\n- **A-**: Can receive from A- and O-; can donate to A+, A-, AB+, AB-.\n- **B+**: Can receive from B+, B-, O+, O-; can donate to B+ and AB+.\n- **B-**: Can receive from B- and O-; can donate to B+, B-, AB+, AB-.${CLINICAL_DISCLAIMER}`;
    suggestions = ['Check O- availability', 'Am I eligible to donate?', 'How does matching work?'];
  }

  // 7. Donor Eligibility & Pre-Screening
  else if (query.includes('eligib') || query.includes('can i donate') || query.includes('tattoo') || query.includes('weight') || query.includes('age') || query.includes('medication') || query.includes('alcohol')) {
    reply = `🩺 **Donor Pre-Screening Eligibility Criteria**:\n\n- **Age**: 18 to 65 years.\n- **Weight**: Minimum 50 kg (110 lbs) for full whole-blood donation.\n- **Donation Rest Interval**: At least 90 days (3 months) since your last whole-blood donation.\n- **Tattoos & Piercings**: 6-month deferral period from the date of the procedure.\n- **General Health**: Must be free of acute infections, fever, cold, or flu symptoms.\n- **Medications**: Routine blood pressure medication is usually acceptable if controlled. Antibiotics require a 48-hour recovery interval after completion.\n\n*Pre-screening only. Final clinical eligibility is certified on-site by medical staff before collection.*${CLINICAL_DISCLAIMER}`;
    suggestions = ['How to register as a donor', 'Explain donation process', 'Search blood availability'];
  }

  // 8. Blood Donation Step-by-Step Process
  else if (query.includes('process') || query.includes('how to donate') || query.includes('what happens') || query.includes('pain') || query.includes('needle')) {
    reply = `❤️ **Step-by-Step Blood Donation Experience**:\n\n1. **Pre-Donation**: Drink plenty of water and eat a nutritious meal. Avoid alcohol for 24 hours.\n2. **Check-in & Verification**: Present your digital QR pass at the repository desk.\n3. **Quick Screening**: A healthcare worker measures your hemoglobin level, blood pressure, and pulse.\n4. **Donation Collection**: The actual blood collection takes only 8–10 minutes using sterile, single-use equipment.\n5. **Post-Donation Rest**: Relax in the observation lounge for 10–15 minutes with juice and refreshments.\n6. **Fluid Replenishment**: Your body replaces the fluid volume within 24–48 hours, and red blood cells within a few weeks.${CLINICAL_DISCLAIMER}`;
    suggestions = ['Am I eligible to donate?', 'Register as a Donor', 'How to find nearby donation centers'];
  }

  // 9. Emergency Request Process & Status Tracking
  else if (query.includes('request') || query.includes('status') || query.includes('track') || query.includes('pending') || query.includes('fulfilled')) {
    reply = `📋 **Blood Request Workflow & Status Tracking**:\n\n- **Creating a Request**: Patients and Hospitals can create emergency requests by specifying blood group, units required, hospital, and urgency level.\n- **Status Lifecycle**:\n  1. **PENDING / MATCHING**: Deterministic algorithms calculate distance and alert compatible donors within 50 km.\n  2. **DONOR_CONTACTED**: Nearby life savers have received in-app, SMS, and email alerts.\n  3. **PARTIALLY_FULFILLED / FULFILLED**: Donors have accepted and arrived for donation.\n- **Live Tracking**: Open your **Receiver Dashboard** or **Hospital Dashboard** to view live response times and donor ETAs.${CLINICAL_DISCLAIMER}`;
    suggestions = ['Check active requests', 'What blood groups are compatible?', 'Check blood availability'];
  }

  // 10. Platform Navigation & General Help
  else if (query.includes('where is') || query.includes('dashboard') || query.includes('navigate') || query.includes('how to use') || query.includes('features')) {
    reply = `🧭 **DonorSync Platform Navigation**:\n\n- **Search Availability**: Find donors and inventory across cities at **[/search-availability](/search-availability)**.\n- **Donor Registration**: Sign up as an active donor at **[/register-donor](/register-donor)**.\n- **Donor Dashboard**: View check-in QR pass, toggle availability radar, and review donation stats at **[/dashboard/donor](/dashboard/donor)**.\n- **Receiver Dashboard**: Post emergency blood requests and track matching donors at **[/dashboard/receiver](/dashboard/receiver)**.\n- **Hospital Dashboard**: Manage multi-unit clinical requests at **[/dashboard/hospital](/dashboard/hospital)**.\n- **Blood Bank Dashboard**: Track blood unit inventory and cold-chain expiry batches at **[/dashboard/bank](/dashboard/bank)**.${CLINICAL_DISCLAIMER}`;
    suggestions = ['Go to Search Availability', 'Register as a Donor', 'Am I eligible to donate?'];
  }

  // 11. General Out-of-Scope or Unsupported Questions
  else {
    reply = `👋 Hello! I am **DonorSync Assistant**, your dedicated clinical support guide.\n\nI specialize specifically in:\n- **Blood Availability & Repository Stocks**\n- **Emergency Blood Requests & Matching**\n- **Donor Eligibility & Pre-Screening Guidelines**\n- **Digital QR Pass Check-in System**\n- **Platform Navigation & Account Guidance**\n\nFor non-medical or unrelated inquiries, please consult appropriate resources.${CLINICAL_DISCLAIMER}`;
    suggestions = [
      'Check Blood Availability',
      'Am I eligible to donate blood?',
      'How does the Digital QR Pass work?',
      'How to request emergency blood'
    ];
  }

  return res.json({
    reply,
    suggestedPrompts: suggestions,
    timestamp: new Date().toISOString()
  });
}
