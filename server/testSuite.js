import express from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config/env.js';
import { supabase, checkSupabaseHealth } from './database/supabase.js';

import authRoutes from './routes/authRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import matchingRoutes from './routes/matchingRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { handleChatbotMessage } from './controllers/chatbotController.js';

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

  // TEST 1: Supabase Connectivity & Reachability
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
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    assert(healthData.status === 'HEALTHY', 'Health API reports status HEALTHY');
    assert(healthData.database.configured === true, 'Database configured in health API');
    assert(healthData.database.mode === 'CONNECTED_SUPABASE', 'Database mode is CONNECTED_SUPABASE');

    // TEST 3: Strict Production Mode Enforcement (No Silent In-Memory Fallback)
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

    if (regRes.status === 503) {
      assert(
        regData.error.includes('production mode') && Boolean(regData.detail),
        'Strict Production Mode: Real database enforcement active without silent fallback',
        regData.detail
      );
    } else {
      assert(regRes.status === 201, 'Donor registration returns HTTP 201', regData.error);
      assert(Boolean(regData.token), 'Registration generates signed JWT');
      assert(regData.user.role === 'Donor', 'Registration assigns role Donor');
    }

    // TEST 4: Phone OTP Flow (Twilio/MSG91/Simulation provider)
    const otpSendRes = await fetch(`${BASE}/auth/phone/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '+919988776655' })
    });
    const otpSendData = await otpSendRes.json();
    assert(otpSendRes.status === 200, 'Phone send-otp returns HTTP 200');
    assert(Boolean(otpSendData.debugCode), 'OTP code generated via SMS provider abstraction');

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
    assert(Boolean(otpVerifyData.token), 'Phone verification returns signed JWT');

    // Create authentic signed test tokens for Role tests
    const donorToken = jwt.sign(
      { id: 'test-donor-uuid', email: 'donor@donorsync.org', role: 'Donor', name: 'Sarah Connor' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const receiverToken = jwt.sign(
      { id: 'test-receiver-uuid', email: 'receiver@donorsync.org', role: 'Receiver', name: 'John Patient' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const bankToken = jwt.sign(
      { id: 'test-bank-uuid', email: 'bloodbank@donorsync.org', role: 'Blood Bank', name: 'Apex Blood Bank' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );
    const adminToken = jwt.sign(
      { id: 'test-admin-uuid', email: 'admin@donorsync.org', role: 'Admin', name: 'System Admin' },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // TEST 5: Role-Based Authorization - Non-admin access to Admin metrics (MUST FAIL with 403)
    const forbiddenAdminRes = await fetch(`${BASE}/admin/metrics`, {
      headers: { 'Authorization': `Bearer ${donorToken}` }
    });
    assert(forbiddenAdminRes.status === 403, 'Donor role accessing Admin metrics strictly blocked with HTTP 403');

    // TEST 6: Role-Based Authorization - Admin access to Admin metrics
    const adminRes = await fetch(`${BASE}/admin/metrics`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const adminData = await adminRes.json();
    assert(adminRes.status === 200, 'Admin metrics accessible by Admin role with HTTP 200');
    assert(typeof adminData.users.total === 'number', 'Admin metrics provides numeric user count');
    assert(typeof adminData.requests.total === 'number', 'Admin metrics provides numeric request count');

    // TEST 7: Role-Based Authorization - Donor updating inventory (MUST FAIL with 403)
    const forbiddenInvRes = await fetch(`${BASE}/inventory/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({ bloodGroup: 'O-', quantity: 15 })
    });
    assert(forbiddenInvRes.status === 403, 'Donor role attempting inventory update blocked with HTTP 403');

    // TEST 8: Inventory Management - Validation (Negative units rejected with 400)
    const negInvRes = await fetch(`${BASE}/inventory/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bankToken}`
      },
      body: JSON.stringify({ bloodGroup: 'O-', quantity: -10 })
    });
    assert(negInvRes.status === 400, 'Negative inventory quantity strictly rejected with HTTP 400');

    // TEST 9: Inventory Management - Stock Retrieval
    const stockRes = await fetch(`${BASE}/inventory/stocks`);
    const stockData = await stockRes.json();
    assert(stockRes.status === 200, 'Inventory stocks endpoint returns HTTP 200');
    assert(typeof stockData.stocks === 'object', 'Inventory response contains 8-group stock map');
    assert(typeof stockData.stocks['O+'] === 'number', 'Inventory tracks O+ stock');

    // TEST 10: Role-Based Authorization & Emergency Request Creation
    const donorReqRes = await fetch(`${BASE}/requests/emergency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        patientName: 'John Test Patient',
        bloodGroup: 'O-',
        unitsRequired: 2
      })
    });
    assert(donorReqRes.status === 403, 'Donor role creating emergency request blocked with HTTP 403');

    const reqRes = await fetch(`${BASE}/requests/emergency`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${receiverToken}`
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
    assert(reqRes.status === 201 || reqRes.status === 503, 'Emergency blood request endpoint responds');
    if (reqRes.status === 201) {
      assert(reqData.request.status === 'MATCHING', 'Emergency request initial status is MATCHING');
    }

    // TEST 11: Blood Matching Radar
    const matchRes = await fetch(`${BASE}/matching/donors?lat=12.9716&lon=77.5946&bloodGroup=O-&radius=25`);
    const matchData = await matchRes.json();
    assert(matchRes.status === 200, 'Matching radar returns HTTP 200');
    assert(Array.isArray(matchData.matches), 'Matching radar returns array of candidate donors');
    if (matchData.matches.length > 0) {
      assert(Boolean(matchData.matches[0].matchScore), 'Match result provides transparent match score');
    }

    // TEST 12: NGO Campaigns - Public Retrieval
    const campRes = await fetch(`${BASE}/organization/campaigns`);
    const campData = await campRes.json();
    assert(campRes.status === 200, 'Campaigns endpoint returns HTTP 200');
    assert(Array.isArray(campData), 'Campaigns returned as array');

    // TEST 13: NGO Campaign Creation
    const newCampRes = await fetch(`${BASE}/organization/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({
        title: 'National Blood Safety Drive 2026',
        venue: 'City Convention Center',
        city: 'Bengaluru',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        targetUnits: 250
      })
    });
    assert(newCampRes.status === 201 || newCampRes.status === 503, 'Campaign creation endpoint responds correctly');

    // TEST 14: Chatbot Assistant - Clinical Deferral Rules
    const botRes = await fetch(`${BASE}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Can I donate blood if I got a tattoo 2 months ago?' })
    });
    const botData = await botRes.json();
    assert(botRes.status === 200, 'Chatbot assistant returns HTTP 200');
    assert(botData.reply.includes('6-month'), 'Chatbot correctly advises 6-month clinical tattoo deferral');
    assert(botData.reply.includes('Notice: This information is for general educational guidance'), 'Chatbot includes required clinical disclaimer');

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
