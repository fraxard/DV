require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const assert = require('assert');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('./src/db');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function request(url, options = {}, cookie = '') {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}

  return {
    status: res.status,
    headers: res.headers,
    data: json,
    rawText: text,
  };
}

async function createTestUser(email, name = 'Test User') {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  const pwdHash = await bcrypt.hash('Password123!', 10);
  const userRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified, onboarding_completed)
     VALUES ($1, $2, $3, true, true)
     RETURNING id, email, name`,
    [name, email, pwdHash]
  );
  const userId = userRes.rows[0].id;
  const sessionId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '2 hours')`,
    [sessionId, userId]
  );
  return {
    id: userId,
    email,
    cookie: `dv_session=${sessionId}`,
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('  DIGIVIRASAT PHASE 3 REFINEMENTS PERMANENT TEST SUITE');
  console.log('====================================================\n');

  // ---------------------------------------------------------------
  // 1. SETUP TEST USERS
  // ---------------------------------------------------------------
  console.log('1. Setting up isolated test users...');
  const userA = await createTestUser('test_user_a_p3@digivirasat.dev', 'User Alpha');
  const userB = await createTestUser('test_user_b_p3@digivirasat.dev', 'User Beta');
  console.log(`✓ User A (${userA.id}) and User B (${userB.id}) initialized.\n`);

  // Clean prior data for User A & User B
  await pool.query('DELETE FROM asset_nominees WHERE asset_id IN (SELECT id FROM assets WHERE user_id IN ($1, $2))', [userA.id, userB.id]);
  await pool.query('DELETE FROM nominees WHERE user_id IN ($1, $2)', [userA.id, userB.id]);
  await pool.query('DELETE FROM assets WHERE user_id IN ($1, $2)', [userA.id, userB.id]);

  // ---------------------------------------------------------------
  // 2. UNAUTHENTICATED PROTECTION
  // ---------------------------------------------------------------
  console.log('2. Verifying unauthenticated route protection...');
  const unauthNominees = await request(`${API_URL}/nominees`);
  assert.strictEqual(unauthNominees.status, 401, 'Expected 401 for unauthenticated /nominees');

  const unauthSummary = await request(`${API_URL}/nominees/dashboard-summary`);
  assert.strictEqual(unauthSummary.status, 401, 'Expected 401 for unauthenticated /nominees/dashboard-summary');

  const unauthStats = await request(`${API_URL}/nominees/stats`);
  assert.strictEqual(unauthStats.status, 401, 'Expected 401 for unauthenticated /nominees/stats');
  console.log('✓ All nominee endpoints strictly protected by authentication.\n');

  // ---------------------------------------------------------------
  // 3. PHONE NUMBER UNIQUENESS & NORMALIZATION
  // ---------------------------------------------------------------
  console.log('3. Testing phone number uniqueness & normalization (Manual Sanity Check F)...');
  const p1 = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Phone Nominee 1',
      email: 'p1@test.com',
      relationship: 'Sibling',
      phone: '+91 98765 43210',
    }),
  }, userA.cookie);
  assert.strictEqual(p1.status, 201, `Failed to create nominee: ${p1.rawText}`);
  assert.strictEqual(p1.data.nominee.phone, '+919876543210', 'Phone should be stored without whitespace');

  // Duplicate phone with different whitespace formatting for same user -> MUST BE REJECTED
  const pDup = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Phone Nominee Dup',
      email: 'pdup@test.com',
      relationship: 'Friend',
      phone: '  +91 9876543210  ',
    }),
  }, userA.cookie);
  assert.strictEqual(pDup.status, 400, 'Duplicate phone for same user must be rejected');
  assert.ok(
    pDup.data?.error?.message?.includes('already exists'),
    `Expected duplicate phone message, got: ${pDup.data?.error?.message}`
  );

  // Multiple NULL / empty phones for same user must be allowed
  const pNull = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Null Phone Nominee',
      email: 'pnull@test.com',
      relationship: 'Other',
      phone: null,
    }),
  }, userA.cookie);
  assert.strictEqual(pNull.status, 201, 'Nominee with null phone should be allowed');

  const pEmpty = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'Empty Phone Nominee',
      email: 'pempty@test.com',
      relationship: 'Other',
      phone: '   ',
    }),
  }, userA.cookie);
  assert.strictEqual(pEmpty.status, 201, 'Nominee with whitespace-only phone should be allowed');

  // Same phone for different user (User B) -> MUST BE ALLOWED
  const pUserB = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({
      fullName: 'User B Nominee',
      email: 'pb@test.com',
      relationship: 'Spouse',
      phone: '+91 98765 43210',
    }),
  }, userB.cookie);
  assert.strictEqual(pUserB.status, 201, 'Same phone for different user must be allowed');
  console.log('✓ Phone number uniqueness per user, normalization, and cross-user allowance verified.\n');

  // Clean data for User A before running Dashboard tests
  await pool.query('DELETE FROM asset_nominees WHERE asset_id IN (SELECT id FROM assets WHERE user_id = $1)', [userA.id]);
  await pool.query('DELETE FROM nominees WHERE user_id = $1', [userA.id]);
  await pool.query('DELETE FROM assets WHERE user_id = $1', [userA.id]);

  // ---------------------------------------------------------------
  // 4. MANUAL SANITY CHECK A & B: DASHBOARD / AGGREGATION CALCULATION
  // ---------------------------------------------------------------
  console.log('4. Testing Dashboard nominee aggregation & overall average share (Sanity Checks A & B)...');

  // Create 3 nominees: Sarah, John, Anya
  const sarahRes = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ fullName: 'Sarah', email: 'sarah@digivirasat.test', relationship: 'Spouse' }),
  }, userA.cookie);
  const sarah = sarahRes.data.nominee;

  const johnRes = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ fullName: 'John', email: 'john@digivirasat.test', relationship: 'Son' }),
  }, userA.cookie);
  const john = johnRes.data.nominee;

  const anyaRes = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ fullName: 'Anya', email: 'anya@digivirasat.test', relationship: 'Daughter' }),
  }, userA.cookie);
  const anya = anyaRes.data.nominee;

  // Create 2 assets: Asset A, Asset B
  const assetARes = await request(`${API_URL}/vault/assets`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Asset A', category: 'financial', estimatedValue: 100000 }),
  }, userA.cookie);
  const assetA = assetARes.data.asset;

  const assetBRes = await request(`${API_URL}/vault/assets`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Asset B', category: 'property', estimatedValue: 250000 }),
  }, userA.cookie);
  const assetB = assetBRes.data.asset;

  // SCENARIO A:
  // Asset A: Sarah = 60%, John = 40%
  // Asset B: Sarah = 40%, John = 60%
  await request(`${API_URL}/vault/assets/${assetA.id}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ nomineeId: sarah.id, allocationPercentage: 60 }),
  }, userA.cookie);
  await request(`${API_URL}/vault/assets/${assetA.id}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ nomineeId: john.id, allocationPercentage: 40 }),
  }, userA.cookie);

  await request(`${API_URL}/vault/assets/${assetB.id}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ nomineeId: sarah.id, allocationPercentage: 40 }),
  }, userA.cookie);
  await request(`${API_URL}/vault/assets/${assetB.id}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ nomineeId: john.id, allocationPercentage: 60 }),
  }, userA.cookie);

  // Check Dashboard summary for Scenario A
  const summaryA = await request(`${API_URL}/nominees/dashboard-summary`, {}, userA.cookie);
  assert.strictEqual(summaryA.status, 200);
  const sarahA = summaryA.data.nominees.find((n) => n.id === sarah.id);
  const johnA = summaryA.data.nominees.find((n) => n.id === john.id);
  const anyaA = summaryA.data.nominees.find((n) => n.id === anya.id);

  console.log(`   Scenario A Dashboard: Sarah = ${sarahA.overall_share}%, John = ${johnA.overall_share}%, Anya = ${anyaA.overall_share}%`);
  assert.strictEqual(sarahA.overall_share, 50, 'Sarah must be exactly 50% in Scenario A: (60+40)/2');
  assert.strictEqual(johnA.overall_share, 50, 'John must be exactly 50% in Scenario A: (40+60)/2');
  assert.strictEqual(anyaA.overall_share, 0, 'Anya must be 0% in Scenario A');
  assert.strictEqual(sarahA.overall_share + johnA.overall_share + anyaA.overall_share, 100, 'Total must equal 100%');
  console.log('✓ Scenario A verified: Sarah = 50%, John = 50%, NOT 100%/100% or 60%/40%.\n');

  // SCENARIO B: Nominee missing from an asset
  // Asset A: Sarah = 60%, John = 40%, Anya = 0%
  // Asset B: Sarah = 20%, John = 30%, Anya = 50%
  await request(`${API_URL}/vault/assets/${assetB.id}/nominees/${sarah.id}`, {
    method: 'PUT',
    body: JSON.stringify({ allocationPercentage: 20 }),
  }, userA.cookie);
  await request(`${API_URL}/vault/assets/${assetB.id}/nominees/${john.id}`, {
    method: 'PUT',
    body: JSON.stringify({ allocationPercentage: 30 }),
  }, userA.cookie);
  await request(`${API_URL}/vault/assets/${assetB.id}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ nomineeId: anya.id, allocationPercentage: 50 }),
  }, userA.cookie);

  // Check Dashboard summary for Scenario B
  const summaryB = await request(`${API_URL}/nominees/dashboard-summary`, {}, userA.cookie);
  assert.strictEqual(summaryB.status, 200);
  const sarahB = summaryB.data.nominees.find((n) => n.id === sarah.id);
  const johnB = summaryB.data.nominees.find((n) => n.id === john.id);
  const anyaB = summaryB.data.nominees.find((n) => n.id === anya.id);

  console.log(`   Scenario B Dashboard: Sarah = ${sarahB.overall_share}%, John = ${johnB.overall_share}%, Anya = ${anyaB.overall_share}%`);
  assert.strictEqual(sarahB.overall_share, 40, 'Sarah must be exactly 40%: (60+20)/2');
  assert.strictEqual(johnB.overall_share, 35, 'John must be exactly 35%: (40+30)/2');
  assert.strictEqual(anyaB.overall_share, 25, 'Anya must be exactly 25%: (0+50)/2');
  assert.strictEqual(sarahB.overall_share + johnB.overall_share + anyaB.overall_share, 100, 'Total must equal 100%');
  console.log('✓ Scenario B verified: Sarah = 40%, John = 35%, Anya = 25%, Total = 100%.\n');

  // ---------------------------------------------------------------
  // 5. ALLOCATION EDITING (PUT /assets/:id/nominees/:nomineeId) (Sanity Check C)
  // ---------------------------------------------------------------
  console.log('5. Testing Allocation Editing endpoint (Sanity Check C)...');

  // Change Sarah on Asset A: 60 -> 50
  const editSarah = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${sarah.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      allocationPercentage: 50,
      canView: true,
      canDownloadDocs: false,
    }),
  }, userA.cookie);
  assert.strictEqual(editSarah.status, 200, `Failed to update Sarah allocation: ${editSarah.rawText}`);
  assert.strictEqual(editSarah.data.assignment.allocation_percentage, 50);
  assert.strictEqual(editSarah.data.assignment.can_download_docs, false, 'Permission update verified');

  // Verify Asset A total & remaining percentage
  const assetAList = await request(`${API_URL}/vault/assets/${assetA.id}/nominees`, {}, userA.cookie);
  assert.strictEqual(assetAList.status, 200);
  assert.strictEqual(assetAList.data.total_allocated_percentage, 90, 'Asset A total must be 50 + 40 = 90%');
  assert.strictEqual(assetAList.data.remaining_percentage, 10, 'Asset A remaining must be 10%');

  // Verify Dashboard average recalculates automatically
  const summaryC = await request(`${API_URL}/nominees/dashboard-summary`, {}, userA.cookie);
  assert.strictEqual(summaryC.status, 200);
  const sarahC = summaryC.data.nominees.find((n) => n.id === sarah.id);
  const johnC = summaryC.data.nominees.find((n) => n.id === john.id);
  const anyaC = summaryC.data.nominees.find((n) => n.id === anya.id);
  console.log(`   Recalculated Dashboard: Sarah = ${sarahC.overall_share}%, John = ${johnC.overall_share}%, Anya = ${anyaC.overall_share}%`);
  assert.strictEqual(sarahC.overall_share, 36.84);
  assert.strictEqual(johnC.overall_share, 36.84);
  assert.strictEqual(anyaC.overall_share, 26.32);
  assert.strictEqual(Math.round(sarahC.overall_share + johnC.overall_share + anyaC.overall_share), 100);

  // Validation & Edge Cases on Allocation PUT:
  // John is 40%. Sarah tries to update to 70% -> 70 + 40 = 110% -> MUST BE REJECTED
  const overAlloc = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${sarah.id}`, {
    method: 'PUT',
    body: JSON.stringify({ allocationPercentage: 70 }),
  }, userA.cookie);
  assert.strictEqual(overAlloc.status, 400, 'Exceeding 100% total on asset must be rejected');

  // Verify rejection for <= 0%
  const zeroAlloc = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${sarah.id}`, {
    method: 'PUT',
    body: JSON.stringify({ allocationPercentage: 0 }),
  }, userA.cookie);
  assert.strictEqual(zeroAlloc.status, 400, 'Allocation <= 0% must be rejected');

  const negAlloc = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${sarah.id}`, {
    method: 'PUT',
    body: JSON.stringify({ allocationPercentage: -10 }),
  }, userA.cookie);
  assert.strictEqual(negAlloc.status, 400, 'Negative allocation must be rejected');

  // Decimal percentage update support
  const decAlloc = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${sarah.id}`, {
    method: 'PUT',
    body: JSON.stringify({ allocationPercentage: 45.5 }),
  }, userA.cookie);
  assert.strictEqual(decAlloc.status, 200, `Decimal allocation failed: ${decAlloc.rawText}`);
  assert.strictEqual(decAlloc.data.assignment.allocation_percentage, 45.5);

  // Nonexistent assignment update rejected
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const nonexistent = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${fakeId}`, {
    method: 'PUT',
    body: JSON.stringify({ allocationPercentage: 20 }),
  }, userA.cookie);
  assert.strictEqual(nonexistent.status, 404, 'Nonexistent assignment must return 404');
  console.log('✓ Allocation editing, permission toggling, decimal support, and boundary validations verified.\n');

  // ---------------------------------------------------------------
  // 6. SECURITY & CROSS-USER ISOLATION (Sanity Check G)
  // ---------------------------------------------------------------
  console.log('6. Testing security guarantees & cross-user isolation (Sanity Check G)...');

  // User B tries to update User A's asset allocation
  const crossUpdate = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${sarah.id}`, {
    method: 'PUT',
    body: JSON.stringify({ allocationPercentage: 10 }),
  }, userB.cookie);
  assert.ok([403, 404].includes(crossUpdate.status), 'Cross-user allocation update must be rejected');

  // User B tries to delete User A's asset allocation
  const crossDelete = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${sarah.id}`, {
    method: 'DELETE',
  }, userB.cookie);
  assert.ok([403, 404].includes(crossDelete.status), 'Cross-user allocation deletion must be rejected');

  // User B tries to assign User A's nominee to User B's asset
  const userBAssetRes = await request(`${API_URL}/vault/assets`, {
    method: 'POST',
    body: JSON.stringify({ name: 'User B Asset', category: 'digital', estimatedValue: 500 }),
  }, userB.cookie);
  const userBAsset = userBAssetRes.data.asset;

  const crossAssign = await request(`${API_URL}/vault/assets/${userBAsset.id}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ nomineeId: sarah.id, allocationPercentage: 50 }),
  }, userB.cookie);
  assert.ok([400, 403, 404].includes(crossAssign.status), 'Cross-user nominee assignment must be rejected');

  // User B tries to update User A's nominee directly
  const crossNomineeUpdate = await request(`${API_URL}/nominees/${sarah.id}`, {
    method: 'PUT',
    body: JSON.stringify({ fullName: 'Hacked Sarah' }),
  }, userB.cookie);
  assert.ok([403, 404].includes(crossNomineeUpdate.status), 'Cross-user nominee update must be rejected');
  console.log('✓ Security: cross-user allocation updates, deletes, assignments, and nominee edits strictly rejected.\n');

  // ---------------------------------------------------------------
  // 7. STATS & UNASSIGN RE-SELECTION BEHAVIOR (Sanity Check D & E)
  // ---------------------------------------------------------------
  console.log('7. Testing stats and unassign re-selection (Sanity Checks D & E)...');

  // User A currently has 3 nominees: Sarah, John, Anya.
  // Sarah is on Asset A & Asset B. John is on Asset A & Asset B. Anya is on Asset B.
  // Add a 4th nominee who is unassigned: Rohan
  const rohanRes = await request(`${API_URL}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ fullName: 'Rohan', email: 'rohan@digivirasat.test', relationship: 'Friend' }),
  }, userA.cookie);
  assert.strictEqual(rohanRes.status, 201);

  const statsRes = await request(`${API_URL}/nominees/stats`, {}, userA.cookie);
  assert.strictEqual(statsRes.status, 200);
  console.log('   Stats:', statsRes.data);
  assert.strictEqual(statsRes.data.total_nominees, 4, 'Total nominees must be 4');
  assert.strictEqual(statsRes.data.assigned_to_assets, 3, 'Unique assigned nominees must be 3 (Sarah, John, Anya)');
  assert.strictEqual(statsRes.data.unassigned, 1, 'Unassigned nominees must be 1 (Rohan)');

  // Dropdown verification (Sanity Check D):
  // On Asset A, Sarah and John are assigned.
  const assetANominees = await request(`${API_URL}/vault/assets/${assetA.id}/nominees`, {}, userA.cookie);
  const assignedIdsOnA = assetANominees.data.nominees.map((n) => n.nominee_id);
  assert.ok(assignedIdsOnA.includes(sarah.id), 'Sarah is assigned to Asset A');
  assert.ok(assignedIdsOnA.includes(john.id), 'John is assigned to Asset A');
  assert.ok(!assignedIdsOnA.includes(anya.id), 'Anya is not assigned to Asset A');
  assert.ok(!assignedIdsOnA.includes(rohanRes.data.nominee.id), 'Rohan is not assigned to Asset A');

  // Unassign Sarah from Asset A (Sanity Check E)
  const unassignSarah = await request(`${API_URL}/vault/assets/${assetA.id}/nominees/${sarah.id}`, {
    method: 'DELETE',
  }, userA.cookie);
  assert.strictEqual(unassignSarah.status, 200, 'Unassigning Sarah from Asset A must succeed');

  // Verify Sarah can immediately be re-assigned to Asset A
  const reassignSarah = await request(`${API_URL}/vault/assets/${assetA.id}/nominees`, {
    method: 'POST',
    body: JSON.stringify({ nomineeId: sarah.id, allocationPercentage: 30 }),
  }, userA.cookie);
  assert.strictEqual(reassignSarah.status, 201, 'Re-assigning Sarah after removal must succeed');
  console.log('✓ Stats calculation, dropdown exclusion, and unassign/re-selection verified.\n');

  console.log('====================================================');
  console.log('  ALL PHASE 3 REFINEMENT TESTS PASSED SUCCESSFULLY! ');
  console.log('====================================================');
}

runTests()
  .then(() => {
    pool.end();
    process.exit(0);
  })
  .catch((err) => {
    console.error('TEST SUITE FAILED:', err);
    pool.end();
    process.exit(1);
  });
