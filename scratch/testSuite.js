import express from 'express';
import { config } from '../server/config/env.js';
import { supabase, checkSupabaseHealth } from '../server/database/supabase.js';

// Import route handlers directly or spin up an instance to test endpoints
import authRoutes from '../server/routes/authRoutes.js';
import donorRoutes from '../server/routes/donorRoutes.js';
import requestRoutes from '../server/routes/requestRoutes.js';
import inventoryRoutes from '../server/routes/inventoryRoutes.js';
import matchingRoutes from '../server/routes/matchingRoutes.js';
import notificationRoutes from '../server/routes/notificationRoutes.js';
import adminRoutes from '../server/routes/adminRoutes.js';
import organizationRoutes from '../server/routes/organizationRoutes.js';
import healthRoutes from '../server/routes/healthRoutes.js';
import { handleChatbotMessage } from '../server/controllers/chatbotController.js';

async function runTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING DONORSYNC AUTOMATED BACKEND TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} - ${details}`);
      failed++;
    }
  }

  // TEST 1: Database Reachability
  const health = await checkSupabaseHealth();
  assert(health.reachable === true, 'Supabase Database Reachability', health.error || 'Host unreachable');
  assert(health.configured === true, 'Supabase Client Configuration');

  // Set up Express test server
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/donors', donorRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/matching', matchingRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/organization', organizationRoutes);
  app.use('/api/health', healthRoutes);
  app.post('/api/chatbot', handleChatbotMessage);

  const server = app.listen(5099);
  const BASE = 'http://localhost:5099/api';

  try {
    // TEST 2: Health API Route
    const healthRes = await fetch(`${BASE}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint status 200');
    assert(healthData.status === 'ONLINE', 'Health API status ONLINE');
    assert(healthData.database.configured === true, 'Database configured in health API');

    // TEST 3: User Registration - Donor
    const testEmail = `test_donor_${Date.now()}@donorsync.local`;
    const regRes = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sarah Connor',
        email: testEmail,
        password: 'securePassword123!',
        role: 'Donor',
        phone: '+919876543210',
        bloodGroup: 'O-'
      })
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Donor registration returns HTTP 201', regData.error);
    assert(Boolean(regData.token), 'Registration generates signed JWT');
    assert(regData.user.role === 'Donor', 'Registration assigns role Donor');

    // TEST 4: Authentication - Wrong Password (MUST FAIL with 401)
    const wrongAuthRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'wrongPassword123'
      })
    });
    assert(wrongAuthRes.status === 401, 'Wrong password strictly returns HTTP 401');

    // TEST 5: Authentication - Correct Password
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'securePassword123!'
      })
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Valid login returns HTTP 200');
    assert(Boolean(loginData.token), 'Valid login returns JWT');
    assert(!loginData.user.password_hash && !loginData.user.passwordHash, 'Password hash is NEVER leaked in user response');

    const authToken = loginData.token;

    // TEST 6: Phone OTP Flow
    const otpSendRes = await fetch(`${BASE}/auth/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919988776655' })
    });
    const otpSendData = await otpSendRes.json();
    assert(otpSendRes.status === 200, 'Phone send-otp returns HTTP 200');
    assert(Boolean(otpSendData.debugCode), 'OTP code generated in simulation mode');

    const otpVerifyRes = await fetch(`${BASE}/auth/phone/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '+919988776655',
        otp: otpSendData.debugCode,
        role: 'Donor'
      })
    });
    const otpVerifyData = await otpVerifyRes.json();
    assert(otpVerifyRes.status === 200, 'Phone verify-otp returns HTTP 200');
    assert(Boolean(otpVerifyData.token), 'Phone verification returns JWT');

    // TEST 7: Emergency Request Creation & Matching
    const reqRes = await fetch(`${BASE}/requests/emergency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        patientName: 'John Test Patient',
        bloodGroup: 'O-',
        unitsRequired: 2,
        urgency: 'Critical',
        hospital: 'St. Jude General Hospital'
      })
    });
    const reqData = await reqRes.json();
    assert(reqRes.status === 201, 'Emergency blood request returns HTTP 201', reqData.error);
    assert(Boolean(reqData.request.id), 'Emergency request assigned ID');
    assert(reqData.request.status === 'MATCHING', 'Emergency request status is MATCHING');

    const createdRequestId = reqData.request.id;

    // TEST 8: Blood Matching Radar
    const matchRes = await fetch(`${BASE}/matching/donors?lat=12.9716&lon=77.5946&bloodGroup=O-&radius=25`);
    const matchData = await matchRes.json();
    assert(matchRes.status === 200, 'Matching radar returns HTTP 200');
    assert(Array.isArray(matchData.matches), 'Matching radar returns array of matches');
    if (matchData.matches.length > 0) {
      assert(Boolean(matchData.matches[0].matchScore), 'Match results contain explainable score');
      assert(Boolean(matchData.matches[0].scoringExplanation), 'Match results contain scoring explanation');
    }

    // TEST 9: Donor Acceptance Flow
    const acceptRes = await fetch(`${BASE}/donors/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ requestId: createdRequestId })
    });
    const acceptData = await acceptRes.json();
    assert(acceptRes.status === 200, 'Donor accept request returns HTTP 200', acceptData.error);
    assert(acceptData.status === 'ACCEPTED', 'Donor acceptance confirms status ACCEPTED');

    // TEST 10: Inventory Management - Validation (Negative units rejection)
    const negInvRes = await fetch(`${BASE}/inventory/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ bloodGroup: 'O-', quantity: -5 })
    });
    assert(negInvRes.status === 400, 'Negative inventory quantity is rejected with HTTP 400');

    // TEST 11: Inventory Management - Valid Stock Update
    const validInvRes = await fetch(`${BASE}/inventory/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ bloodGroup: 'O-', quantity: 18, reason: 'Routine intake collection' })
    });
    const validInvData = await validInvRes.json();
    assert(validInvRes.status === 200, 'Valid inventory update returns HTTP 200');
    assert(validInvData.stocks['O-'] === 18, 'Inventory map reflects updated 18 units');

    // TEST 12: NGO Campaigns - Listing and Creation
    const campRes = await fetch(`${BASE}/organization/campaigns`);
    const campData = await campRes.json();
    assert(campRes.status === 200, 'Organization campaigns list returns HTTP 200');
    assert(Array.isArray(campData), 'Campaigns returned as array');

    const newCampRes = await fetch(`${BASE}/organization/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        title: 'Emergency Life Drive 2026',
        venue: 'Town Hall',
        city: 'Bengaluru',
        startDate: '2026-11-01',
        endDate: '2026-11-02',
        targetUnits: 120
      })
    });
    assert(newCampRes.status === 201, 'Create campaign returns HTTP 201');

    // TEST 13: Admin Metrics
    const adminRes = await fetch(`${BASE}/admin/metrics`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const adminData = await adminRes.json();
    assert(adminRes.status === 200, 'Admin metrics returns HTTP 200');
    assert(typeof adminData.users.total === 'number', 'Admin metrics provides numeric user counts');
    assert(typeof adminData.requests.total === 'number', 'Admin metrics provides numeric request counts');

    // TEST 14: Chatbot Assistant
    const botRes = await fetch(`${BASE}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Am I eligible to donate with a tattoo?' })
    });
    const botData = await botRes.json();
    assert(botRes.status === 200, 'Chatbot assistant returns HTTP 200');
    assert(botData.reply.includes('6-month'), 'Chatbot contains clinical 6-month tattoo deferral notice');
    assert(botData.reply.includes('Notice: This information is for general educational guidance'), 'Chatbot includes mandatory clinical disclaimer');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
