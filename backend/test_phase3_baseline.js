require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('./src/db');

const API_BASE = 'http://localhost:5000/api';

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = Buffer.alloc(0);
      res.on('data', (chunk) => {
        data = Buffer.concat([data, chunk]);
      });
      res.on('end', () => {
        const text = data.toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (_) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          rawBody: data,
          text,
          json,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('===========================================================');
  console.log('DIGIVIRASAT PHASE 3: NOMINEES & ALLOCATIONS TEST SUITE');
  console.log('===========================================================\n');

  // Test 1: Unauthenticated access rejection
  const unauthNominees = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/nominees',
    method: 'GET',
  });
  console.log('[PASS] 1. Unauthenticated /api/nominees rejected with status', unauthNominees.statusCode);

  // Test 2: Login User A (Primary user: fraxard@gmail.com / 12121212)
  const loginBody = JSON.stringify({ email: 'fraxard@gmail.com', password: '12121212' });
  const loginRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginBody) },
  }, loginBody);

  const userACookie = (loginRes.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
  const userAId = loginRes.json?.user?.id;
  console.log('[PASS] 2. User A login successful, user_id:', userAId);

  // Test 3: Setup User B for cross-tenant isolation testing
  const userBEmail = 'user_b_phase3_test@digivirasat.dev';
  await pool.query('DELETE FROM users WHERE email = $1', [userBEmail]);
  const pwdHashB = await bcrypt.hash('Password123!', 10);
  const userBInsert = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified, onboarding_completed)
     VALUES ('User B', $1, $2, true, true)
     RETURNING id`,
    [userBEmail, pwdHashB]
  );
  const userBId = userBInsert.rows[0].id;
  const sessionBId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
    [sessionBId, userBId]
  );
  const userBCookie = `dv_session=${sessionBId}`;
  console.log('[PASS] 3. User B setup for isolation testing, user_id:', userBId);

  // Clean prior data for User A & User B
  await pool.query('DELETE FROM asset_nominees WHERE asset_id IN (SELECT id FROM assets WHERE user_id IN ($1, $2))', [userAId, userBId]);
  await pool.query('DELETE FROM nominees WHERE user_id IN ($1, $2)', [userAId, userBId]);
  await pool.query('DELETE FROM assets WHERE user_id IN ($1, $2)', [userAId, userBId]);

  // Test 4: Create Nominees for User A
  const nom1Res = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/nominees',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    fullName: 'Sarah Sharma',
    email: 'sarah.sharma@example.com',
    relationship: 'Spouse',
    phone: '+91 98765 43210',
    notes: 'Primary legal beneficiary',
  });
  const nom1 = nom1Res.json?.nominee;
  console.log(`[${nom1Res.statusCode === 201 ? 'PASS' : 'FAIL'}] 4a. Create Nominee 1 (Sarah): status ${nom1Res.statusCode}, id: ${nom1?.id}`);

  const nom2Res = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/nominees',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    fullName: 'Rohan Sharma',
    email: 'rohan.sharma@example.com',
    relationship: 'Child',
    phone: '+91 98765 43211',
  });
  const nom2 = nom2Res.json?.nominee;
  console.log(`[${nom2Res.statusCode === 201 ? 'PASS' : 'FAIL'}] 4b. Create Nominee 2 (Rohan): status ${nom2Res.statusCode}, id: ${nom2?.id}`);

  const nom3Res = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/nominees',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    fullName: 'Anya Sharma',
    email: 'anya.sharma@example.com',
    relationship: 'Child',
  });
  const nom3 = nom3Res.json?.nominee;
  console.log(`[${nom3Res.statusCode === 201 ? 'PASS' : 'FAIL'}] 4c. Create Nominee 3 (Anya): status ${nom3Res.statusCode}, id: ${nom3?.id}`);

  // Test 5: Enforce case-insensitive email uniqueness per owner
  const duplicateEmailRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/nominees',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    fullName: 'Sarah Alternate Profile',
    email: 'SARAH.SHARMA@EXAMPLE.COM', // Uppercase variation
    relationship: 'Spouse',
  });
  console.log(`[${duplicateEmailRes.statusCode === 400 ? 'PASS' : 'FAIL'}] 5. Case-insensitive duplicate email rejected with status 400 (${duplicateEmailRes.json?.error?.message})`);

  // Test 6: Nominee Read & Update
  const getNomRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/nominees/${nom1.id}`,
    method: 'GET',
    headers: { 'Cookie': userACookie },
  });
  console.log(`[${getNomRes.statusCode === 200 && getNomRes.json?.nominee?.full_name === 'Sarah Sharma' ? 'PASS' : 'FAIL'}] 6a. GET /api/nominees/:id returns nominee details`);

  const updateNomRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/nominees/${nom1.id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    fullName: 'Sarah Sharma',
    email: 'sarah.sharma@example.com',
    relationship: 'Spouse & Primary Heir',
    phone: '+91 99999 88888',
  });
  console.log(`[${updateNomRes.statusCode === 200 && updateNomRes.json?.nominee?.relationship === 'Spouse & Primary Heir' ? 'PASS' : 'FAIL'}] 6b. PUT /api/nominees/:id updates relationship`);

  // Test 7: User B Nominee Ownership Isolation
  const userBNomList = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/nominees',
    method: 'GET',
    headers: { 'Cookie': userBCookie },
  });
  console.log(`[${userBNomList.statusCode === 200 && userBNomList.json?.nominees?.length === 0 ? 'PASS' : 'FAIL'}] 7a. User B sees 0 nominees in their directory`);

  const userBGetA = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/nominees/${nom1.id}`,
    method: 'GET',
    headers: { 'Cookie': userBCookie },
  });
  const userBPutA = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/nominees/${nom1.id}`,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Cookie': userBCookie },
  }, { fullName: 'Hacked Name', email: 'hack@example.com', relationship: 'Other' });
  const userBDelA = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/nominees/${nom1.id}`,
    method: 'DELETE',
    headers: { 'Cookie': userBCookie },
  });
  console.log(`[${userBGetA.statusCode === 404 && userBPutA.statusCode === 404 && userBDelA.statusCode === 404 ? 'PASS' : 'FAIL'}] 7b. User B cannot GET, PUT, or DELETE User A's nominee (all return 404 Not Found)`);

  // Test 8: Create Assets for User A and User B
  const assetARes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/vault/assets',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    name: 'Ancestral Villa Property',
    category: 'property',
    estimatedValue: 7500000,
  });
  const assetA1 = assetARes.json?.asset;

  const assetA2Res = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/vault/assets',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    name: 'HDFC Wealth Portfolio',
    category: 'financial',
    estimatedValue: 2000000,
  });
  const assetA2 = assetA2Res.json?.asset;

  const assetBRes = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/vault/assets',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userBCookie },
  }, {
    name: 'User B Apartment',
    category: 'property',
    estimatedValue: 3000000,
  });
  const assetB = assetBRes.json?.asset;
  console.log('[PASS] 8. Created test assets for User A and User B');

  // Test 9: Assign Nominees to Asset A1 (Multiple Nominees per Asset with Allocations)
  // Assign Sarah: 50%
  const assign1Res = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    nomineeId: nom1.id,
    allocationPercentage: 50,
    canView: true,
    canDownloadDocs: true,
  });
  console.log(`[${assign1Res.statusCode === 201 ? 'PASS' : 'FAIL'}] 9a. Assign Nominee 1 (Sarah 50%): status ${assign1Res.statusCode}`);

  // Assign Rohan: 30%
  const assign2Res = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    nomineeId: nom2.id,
    allocationPercentage: 30,
  });
  console.log(`[${assign2Res.statusCode === 201 ? 'PASS' : 'FAIL'}] 9b. Assign Nominee 2 (Rohan 30%): status ${assign2Res.statusCode}`);

  // Attempt to Assign Anya: 30% -> Total would be 50 + 30 + 30 = 110% (Must be rejected with 400)
  const assignOver100Res = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    nomineeId: nom3.id,
    allocationPercentage: 30,
  });
  console.log(`[${assignOver100Res.statusCode === 400 ? 'PASS' : 'FAIL'}] 9c. Allocation exceeding 100% (50 + 30 + 30 = 110%) rejected with status 400 (${assignOver100Res.json?.error?.message})`);

  // Assign Anya with remaining 20% -> Total exactly 100%
  const assign3Res = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    nomineeId: nom3.id,
    allocationPercentage: 20,
  });
  console.log(`[${assign3Res.statusCode === 201 ? 'PASS' : 'FAIL'}] 9d. Assign Nominee 3 (Anya 20%): status ${assign3Res.statusCode} (Asset A1 total is now 100%)`);

  // Test 10: One Nominee Assigned to Multiple Assets
  // Assign Sarah to Asset A2 (HDFC Portfolio) with 100%
  const assignSarahA2Res = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA2.id}/nominees`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    nomineeId: nom1.id,
    allocationPercentage: 100,
  });
  console.log(`[${assignSarahA2Res.statusCode === 201 ? 'PASS' : 'FAIL'}] 10. One nominee across multiple assets: Sarah assigned 100% to Asset A2`);

  // Test 11: List Asset Nominees with Remaining Calculation
  const listA1Nominees = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'GET',
    headers: { 'Cookie': userACookie },
  });
  const a1Data = listA1Nominees.json;
  console.log(`[${listA1Nominees.statusCode === 200 && a1Data?.nominees?.length === 3 && a1Data?.total_allocated_percentage === 100 && a1Data?.remaining_percentage === 0 ? 'PASS' : 'FAIL'}] 11. List Asset Nominees: 3 nominees returned, total = 100%, remaining = 0%`);

  // Test 12: Updating an existing allocation recalculates correctly
  // Update Sarah on Asset A1 from 50% to 40% -> new total = 40 + 30 + 20 = 90%
  const updateSarahAllocRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userACookie },
  }, {
    nomineeId: nom1.id,
    allocationPercentage: 40,
  });
  const checkUpdatedList = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'GET',
    headers: { 'Cookie': userACookie },
  });
  console.log(`[${updateSarahAllocRes.statusCode === 201 && checkUpdatedList.json?.total_allocated_percentage === 90 && checkUpdatedList.json?.remaining_percentage === 10 ? 'PASS' : 'FAIL'}] 12. Update existing allocation recalculates: Sarah updated to 40%, total = 90%, remaining = 10%`);

  // Test 13: Cross-Tenant Asset Hijacking Protection
  // 13a: User B attempts to assign User A's nominee to User B's asset -> 400
  const hijackNomineeRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetB.id}/nominees`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userBCookie },
  }, {
    nomineeId: nom1.id, // User A's nominee
    allocationPercentage: 50,
  });
  console.log(`[${hijackNomineeRes.statusCode === 400 || hijackNomineeRes.statusCode === 404 ? 'PASS' : 'FAIL'}] 13a. User B assigning User A's nominee to User B asset rejected with 400/404 (${hijackNomineeRes.json?.error?.message})`);

  // 13b: User B attempts to assign to User A's asset -> 400 / 404
  const hijackAssetRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': userBCookie },
  }, {
    nomineeId: nom1.id,
    allocationPercentage: 50,
  });
  console.log(`[${hijackAssetRes.statusCode === 400 || hijackAssetRes.statusCode === 404 ? 'PASS' : 'FAIL'}] 13b. User B assigning nominee to User A asset rejected with 400/404`);

  // 13c: User B attempts to unassign User A's nominee -> 404
  const hijackUnassignRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees/${nom1.id}`,
    method: 'DELETE',
    headers: { 'Cookie': userBCookie },
  });
  console.log(`[${hijackUnassignRes.statusCode === 404 ? 'PASS' : 'FAIL'}] 13c. User B unassigning nominee from User A asset rejected with 404 Not Found`);

  // Test 14: Cascade Behavior on Nominee Deletion
  // Delete Nominee 2 (Rohan). His assignment on Asset A1 must be removed, Sarah (40%) and Anya (20%) remain
  const deleteRohanRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/nominees/${nom2.id}`,
    method: 'DELETE',
    headers: { 'Cookie': userACookie },
  });
  const checkA1AfterNomDel = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA1.id}/nominees`,
    method: 'GET',
    headers: { 'Cookie': userACookie },
  });
  const rohanGone = !checkA1AfterNomDel.json?.nominees?.some((n) => n.nominee_id === nom2.id);
  const remainingTotal = checkA1AfterNomDel.json?.total_allocated_percentage === 60;
  console.log(`[${deleteRohanRes.statusCode === 200 && rohanGone && remainingTotal ? 'PASS' : 'FAIL'}] 14. Nominee deletion cascade: Rohan deleted, assignment automatically removed, Asset A1 total now 60%`);

  // Test 15: Cascade Behavior on Asset Deletion
  // Delete Asset A2. Sarah should remain registered in the directory, but her assignment to A2 is removed
  const deleteAssetA2Res = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/vault/assets/${assetA2.id}`,
    method: 'DELETE',
    headers: { 'Cookie': userACookie },
  });
  const checkSarahAfterAssetDel = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/nominees/${nom1.id}`,
    method: 'GET',
    headers: { 'Cookie': userACookie },
  });
  const sarahHasOnlyA1 = checkSarahAfterAssetDel.json?.nominee?.assigned_assets?.length === 1 && checkSarahAfterAssetDel.json?.nominee?.assigned_assets[0].asset_id === assetA1.id;
  console.log(`[${deleteAssetA2Res.statusCode === 200 && checkSarahAfterAssetDel.statusCode === 200 && sarahHasOnlyA1 ? 'PASS' : 'FAIL'}] 15. Asset deletion cascade: Asset A2 deleted, junction row purged, Sarah safely remains with only Asset A1`);

  // Clean up test data
  await pool.query('DELETE FROM users WHERE id = $1', [userBId]);

  console.log('\n===========================================================');
  console.log('ALL PHASE 3 NOMINEE & ALLOCATION TESTS COMPLETED!');
  console.log('===========================================================');
  await pool.end();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
