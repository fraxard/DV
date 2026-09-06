require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const assert = require('assert');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('./src/db');
const {
  calculateReadinessScore,
  calculateReadinessLabel,
  buildNeedsAttention,
} = require('./src/services/dashboard.service');

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

async function createTestUser(email, name = 'Test User', verified = true) {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  const pwdHash = await bcrypt.hash('Password123!', 10);
  const userRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified, onboarding_completed)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, email, name, email_verified`,
    [name, email, pwdHash, verified]
  );
  const user = userRes.rows[0];
  const sessionId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '2 hours')`,
    [sessionId, user.id]
  );
  return {
    id: user.id,
    email: user.email,
    verified: user.email_verified,
    cookie: `dv_session=${sessionId}`,
  };
}

async function cleanUserData(userIds) {
  if (!userIds || userIds.length === 0) return;
  await pool.query(
    'DELETE FROM asset_nominees WHERE asset_id IN (SELECT id FROM assets WHERE user_id = ANY($1))',
    [userIds]
  );
  await pool.query('DELETE FROM documents WHERE user_id = ANY($1)', [userIds]);
  await pool.query('DELETE FROM nominees WHERE user_id = ANY($1)', [userIds]);
  await pool.query('DELETE FROM assets WHERE user_id = ANY($1)', [userIds]);
}

async function runTests() {
  console.log('====================================================');
  console.log('  DIGIVIRASAT PHASE 4A: OWNER DASHBOARD DATA ENGINE');
  console.log('====================================================\n');

  // ---------------------------------------------------------------
  // 1. UNIT TESTS: PURE READINESS FORMULA & BOUNDARIES
  // ---------------------------------------------------------------
  console.log('1. Testing pure readiness formula & score boundaries...');

  // Boundary tests (Section 19.L)
  assert.strictEqual(calculateReadinessLabel(0), 'Getting Started');
  assert.strictEqual(calculateReadinessLabel(24), 'Getting Started');
  assert.strictEqual(calculateReadinessLabel(25), 'Early Stage');
  assert.strictEqual(calculateReadinessLabel(49), 'Early Stage');
  assert.strictEqual(calculateReadinessLabel(50), 'In Progress');
  assert.strictEqual(calculateReadinessLabel(74), 'In Progress');
  assert.strictEqual(calculateReadinessLabel(75), 'Nearly Ready');
  assert.strictEqual(calculateReadinessLabel(89), 'Nearly Ready');
  assert.strictEqual(calculateReadinessLabel(90), 'Legacy Ready');
  assert.strictEqual(calculateReadinessLabel(100), 'Legacy Ready');

  // Asset thresholds (Section 19.D)
  const r0Assets = calculateReadinessScore({
    emailVerified: false, assetCount: 0, nomineeCount: 0,
    allocationCoveragePercentage: 0, documentCoveragePercentage: 0,
  });
  assert.strictEqual(r0Assets.components.assets, 0);

  const r1Asset = calculateReadinessScore({
    emailVerified: false, assetCount: 1, nomineeCount: 0,
    allocationCoveragePercentage: 0, documentCoveragePercentage: 0,
  });
  assert.strictEqual(r1Asset.components.assets, 15);

  const r2Assets = calculateReadinessScore({
    emailVerified: false, assetCount: 2, nomineeCount: 0,
    allocationCoveragePercentage: 0, documentCoveragePercentage: 0,
  });
  assert.strictEqual(r2Assets.components.assets, 25);

  // Nominee thresholds (Section 19.E)
  const r0Nom = calculateReadinessScore({
    emailVerified: false, assetCount: 0, nomineeCount: 0,
    allocationCoveragePercentage: 0, documentCoveragePercentage: 0,
  });
  assert.strictEqual(r0Nom.components.nominees, 0);

  const r1Nom = calculateReadinessScore({
    emailVerified: false, assetCount: 0, nomineeCount: 1,
    allocationCoveragePercentage: 0, documentCoveragePercentage: 0,
  });
  assert.strictEqual(r1Nom.components.nominees, 10);

  const r2Nom = calculateReadinessScore({
    emailVerified: false, assetCount: 0, nomineeCount: 2,
    allocationCoveragePercentage: 0, documentCoveragePercentage: 0,
  });
  assert.strictEqual(r2Nom.components.nominees, 20);

  // Allocation Points formula: (allocationCoverage / 100) * 25 (Section 19.F)
  const rAlloc50 = calculateReadinessScore({
    emailVerified: false, assetCount: 0, nomineeCount: 0,
    allocationCoveragePercentage: 50, documentCoveragePercentage: 0,
  });
  assert.strictEqual(rAlloc50.components.allocation, 12.5);

  const rAlloc100 = calculateReadinessScore({
    emailVerified: false, assetCount: 0, nomineeCount: 0,
    allocationCoveragePercentage: 100, documentCoveragePercentage: 0,
  });
  assert.strictEqual(rAlloc100.components.allocation, 25);

  // Document Points formula: (documentCoverage / 100) * 15 (Section 19.G)
  const rDoc50 = calculateReadinessScore({
    emailVerified: false, assetCount: 0, nomineeCount: 0,
    allocationCoveragePercentage: 0, documentCoveragePercentage: 50,
  });
  assert.strictEqual(rDoc50.components.documents, 7.5);

  const rDoc100 = calculateReadinessScore({
    emailVerified: false, assetCount: 0, nomineeCount: 0,
    allocationCoveragePercentage: 0, documentCoveragePercentage: 100,
  });
  assert.strictEqual(rDoc100.components.documents, 15);

  console.log('✓ Pure readiness formulas and boundary values verified.\n');

  // ---------------------------------------------------------------
  // 2. AUTHENTICATION & ACCESS CONTROL (Section 19.A)
  // ---------------------------------------------------------------
  console.log('2. Verifying authentication & access control...');
  const unauthRes = await request(`${API_URL}/dashboard`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated /dashboard must return 401');

  const testUserA = await createTestUser('test_dash_a@digivirasat.dev', 'User Dash A', true);
  const testUserB = await createTestUser('test_dash_b@digivirasat.dev', 'User Dash B', true);
  await cleanUserData([testUserA.id, testUserB.id]);

  const authRes = await request(`${API_URL}/dashboard`, {}, testUserA.cookie);
  assert.strictEqual(authRes.status, 200, 'Authenticated user must receive 200 OK');
  console.log('✓ Authentication verified.\n');

  // ---------------------------------------------------------------
  // 3. EMPTY ACCOUNT BEHAVIOR — VERIFIED USER (Section 19.B)
  // ---------------------------------------------------------------
  console.log('3. Testing verified empty account behavior...');
  const emptyDash = authRes.data;

  assert.strictEqual(emptyDash.assets.total, 0);
  assert.strictEqual(emptyDash.assets.totalValue, 0);
  assert.deepStrictEqual(emptyDash.assets.byCategory, []);

  assert.strictEqual(emptyDash.nominees.total, 0);
  assert.strictEqual(emptyDash.nominees.assigned, 0);
  assert.strictEqual(emptyDash.nominees.unassigned, 0);
  assert.strictEqual(emptyDash.nominees.assetsWithoutAllocation, 0);

  assert.strictEqual(emptyDash.documents.total, 0);
  assert.strictEqual(emptyDash.documents.assetsWithDocuments, 0);
  assert.strictEqual(emptyDash.documents.assetsWithoutDocuments, 0);
  assert.strictEqual(emptyDash.documents.coveragePercentage, 0);

  assert.strictEqual(emptyDash.allocation.coveragePercentage, 0);

  assert.strictEqual(emptyDash.readiness.score, 15);
  assert.strictEqual(emptyDash.readiness.label, 'Getting Started');
  assert.deepStrictEqual(emptyDash.readiness.components, {
    verification: 15,
    assets: 0,
    nominees: 0,
    allocation: 0,
    documents: 0,
  });

  // Attention must contain add_assets and NOT rules 3-6
  assert.strictEqual(emptyDash.needsAttention.length, 1);
  assert.strictEqual(emptyDash.needsAttention[0].key, 'add_assets');
  console.log('✓ Empty verified account verified: score 15, "Getting Started", add_assets attention.\n');

  // ---------------------------------------------------------------
  // 4. EMPTY ACCOUNT BEHAVIOR — UNVERIFIED USER (Section 19.C)
  // ---------------------------------------------------------------
  console.log('4. Testing unverified empty account behavior...');
  const unverifiedUser = await createTestUser('test_dash_unverif@digivirasat.dev', 'Unverified User', false);
  await cleanUserData([unverifiedUser.id]);

  const unverifDashRes = await request(`${API_URL}/dashboard`, {}, unverifiedUser.cookie);
  const unverifDash = unverifDashRes.data;

  assert.strictEqual(unverifDash.readiness.score, 0);
  assert.strictEqual(unverifDash.readiness.label, 'Getting Started');
  assert.strictEqual(unverifDash.readiness.components.verification, 0);

  // Must contain verify_email first, then add_assets
  assert.strictEqual(unverifDash.needsAttention.length, 2);
  assert.strictEqual(unverifDash.needsAttention[0].key, 'verify_email');
  assert.strictEqual(unverifDash.needsAttention[1].key, 'add_assets');
  console.log('✓ Empty unverified account verified: score 0, verify_email & add_assets attention.\n');

  // ---------------------------------------------------------------
  // 5. ASSET AGGREGATIONS & CATEGORY GROUPING
  // ---------------------------------------------------------------
  console.log('5. Testing asset counts, values, categories, and currency...');
  const asset1Res = await pool.query(
    `INSERT INTO assets (user_id, name, category, estimated_value, currency)
     VALUES ($1, 'HDFC Bank Account', 'financial', 500000, 'INR')
     RETURNING id`,
    [testUserA.id]
  );
  const asset1Id = asset1Res.rows[0].id;

  const asset2Res = await pool.query(
    `INSERT INTO assets (user_id, name, category, estimated_value, currency)
     VALUES ($1, 'Apartment Mumbai', 'property', 7500000, 'INR')
     RETURNING id`,
    [testUserA.id]
  );
  const asset2Id = asset2Res.rows[0].id;

  const asset3Res = await pool.query(
    `INSERT INTO assets (user_id, name, category, estimated_value, currency)
     VALUES ($1, 'Zerodha Portfolio', 'financial', 1200000, 'INR')
     RETURNING id`,
    [testUserA.id]
  );
  const asset3Id = asset3Res.rows[0].id;

  const dashWithAssets = (await request(`${API_URL}/dashboard`, {}, testUserA.cookie)).data;
  assert.strictEqual(dashWithAssets.assets.total, 3);
  assert.strictEqual(dashWithAssets.assets.totalValue, 9200000);

  // Check category grouping
  const finCat = dashWithAssets.assets.byCategory.find((c) => c.category === 'financial');
  assert.strictEqual(finCat.count, 2);
  assert.strictEqual(finCat.value, 1700000);

  const propCat = dashWithAssets.assets.byCategory.find((c) => c.category === 'property');
  assert.strictEqual(propCat.count, 1);
  assert.strictEqual(propCat.value, 7500000);

  // Asset points: 2+ assets = 25 pts
  assert.strictEqual(dashWithAssets.readiness.components.assets, 25);
  console.log('✓ Asset totals, categories, and currency aggregation verified.\n');

  // ---------------------------------------------------------------
  // 6. NOMINEE AGGREGATION & ALLOCATION COVERAGE (Section 19.F)
  // ---------------------------------------------------------------
  console.log('6. Testing nominee aggregation & per-asset allocation coverage...');
  // Add 2 nominees for User A
  const nom1Res = await pool.query(
    `INSERT INTO nominees (user_id, full_name, email, relationship)
     VALUES ($1, 'Sarah Sharma', 'sarah@test.com', 'Spouse') RETURNING id`,
    [testUserA.id]
  );
  const nom1Id = nom1Res.rows[0].id;

  const nom2Res = await pool.query(
    `INSERT INTO nominees (user_id, full_name, email, relationship)
     VALUES ($1, 'Rohan Sharma', 'rohan@test.com', 'Child') RETURNING id`,
    [testUserA.id]
  );
  const nom2Id = nom2Res.rows[0].id;

  // Asset 1: 100% allocated (Sarah 100%)
  await pool.query(
    `INSERT INTO asset_nominees (asset_id, nominee_id, allocation_percentage)
     VALUES ($1, $2, 100)`,
    [asset1Id, nom1Id]
  );

  // Asset 2: 50% allocated (Rohan 50%)
  await pool.query(
    `INSERT INTO asset_nominees (asset_id, nominee_id, allocation_percentage)
     VALUES ($1, $2, 50)`,
    [asset2Id, nom2Id]
  );

  // Asset 3: 0% allocated (no nominee rows)

  const dashWithAlloc = (await request(`${API_URL}/dashboard`, {}, testUserA.cookie)).data;

  assert.strictEqual(dashWithAlloc.nominees.total, 2);
  assert.strictEqual(dashWithAlloc.nominees.assigned, 2);
  assert.strictEqual(dashWithAlloc.nominees.unassigned, 0);
  assert.strictEqual(dashWithAlloc.nominees.assetsWithoutAllocation, 1, 'Asset 3 has 0% allocation');

  // Allocation coverage: (100 + 50 + 0) / 3 = 50%
  assert.strictEqual(dashWithAlloc.allocation.coveragePercentage, 50);
  assert.strictEqual(dashWithAlloc.readiness.components.allocation, 12.5);
  console.log('✓ Allocation coverage correctly calculated per-asset (50% -> 12.5 pts).\n');

  // ---------------------------------------------------------------
  // 7. DOCUMENT AGGREGATION & COVERAGE (Section 19.G)
  // ---------------------------------------------------------------
  console.log('7. Testing document aggregation & asset document coverage...');
  // User has 3 assets so far. Add 1 more asset to make it 4 assets total
  const asset4Res = await pool.query(
    `INSERT INTO assets (user_id, name, category, estimated_value, currency)
     VALUES ($1, 'Crypto Ledger', 'digital', 200000, 'INR')
     RETURNING id`,
    [testUserA.id]
  );
  const asset4Id = asset4Res.rows[0].id;

  // Add 3 documents to Asset 1 and 1 document to Asset 2. Asset 3 & 4 have 0 docs.
  await pool.query(
    `INSERT INTO documents (user_id, asset_id, name, file_name, mime_type, file_size, storage_key)
     VALUES
       ($1, $2, 'Passbook', 'passbook.pdf', 'application/pdf', 1024, 'key_1'),
       ($1, $2, 'Statement 2025', 'stmt.pdf', 'application/pdf', 2048, 'key_2'),
       ($1, $2, 'KYC Form', 'kyc.pdf', 'application/pdf', 4096, 'key_3'),
       ($1, $3, 'Sale Deed', 'deed.pdf', 'application/pdf', 8192, 'key_4')`,
    [testUserA.id, asset1Id, asset2Id]
  );

  const dashWithDocs = (await request(`${API_URL}/dashboard`, {}, testUserA.cookie)).data;

  // 4 total documents, attached across 2 distinct assets out of 4 assets total
  assert.strictEqual(dashWithDocs.documents.total, 4);
  assert.strictEqual(dashWithDocs.documents.assetsWithDocuments, 2);
  assert.strictEqual(dashWithDocs.documents.assetsWithoutDocuments, 2);
  // Coverage: 2 / 4 = 50% (NOT 100% despite 4 docs)
  assert.strictEqual(dashWithDocs.documents.coveragePercentage, 50);
  assert.strictEqual(dashWithDocs.readiness.components.documents, 7.5);
  console.log('✓ Document coverage verified (2/4 assets covered = 50% -> 7.5 pts).\n');

  // ---------------------------------------------------------------
  // 8. NEEDS ATTENTION RULES & ORDERING (Section 19.J)
  // ---------------------------------------------------------------
  console.log('8. Testing Needs Attention rules and deterministic ordering...');
  // Currently:
  // - Email is verified
  // - Total assets = 4 (> 0)
  // - Total nominees = 2 (> 0)
  // - Assets without allocation = 2 (Asset 3 and Asset 4)
  // - Partially allocated assets = 1 (Asset 2 is 50%)
  // - Assets without documents = 2 (Asset 3 and Asset 4)
  const attention = dashWithDocs.needsAttention;

  assert.strictEqual(attention.length, 3);
  assert.strictEqual(attention[0].key, 'assign_nominees');
  assert.strictEqual(attention[0].message, 'Assign nominees to 2 assets.');
  assert.strictEqual(attention[1].key, 'complete_allocations');
  assert.strictEqual(attention[1].message, 'Complete nominee allocations for 1 asset.');
  assert.strictEqual(attention[2].key, 'add_documents');
  assert.strictEqual(attention[2].message, 'Add supporting documents to 2 assets.');
  console.log('✓ Needs Attention rules and ordering verified.\n');

  // ---------------------------------------------------------------
  // 9. FULL READINESS SCORE (100 PTS) (Section 19.H)
  // ---------------------------------------------------------------
  console.log('9. Testing 100% full readiness score & "Legacy Ready" status...');
  // Complete allocations on all 4 assets:
  // Asset 1: already 100%
  // Asset 2: update from 50% to 100%
  await pool.query(
    `UPDATE asset_nominees SET allocation_percentage = 100 WHERE asset_id = $1`,
    [asset2Id]
  );
  // Asset 3: allocate 100%
  await pool.query(
    `INSERT INTO asset_nominees (asset_id, nominee_id, allocation_percentage)
     VALUES ($1, $2, 100)`,
    [asset3Id, nom1Id]
  );
  // Asset 4: allocate 100%
  await pool.query(
    `INSERT INTO asset_nominees (asset_id, nominee_id, allocation_percentage)
     VALUES ($1, $2, 100)`,
    [asset4Id, nom2Id]
  );

  // Add documents to Asset 3 and Asset 4
  await pool.query(
    `INSERT INTO documents (user_id, asset_id, name, file_name, mime_type, file_size, storage_key)
     VALUES
       ($1, $2, 'Portfolio Proof', 'zerodha.pdf', 'application/pdf', 1024, 'key_5'),
       ($1, $3, 'Ledger Backup Receipt', 'ledger.pdf', 'application/pdf', 2048, 'key_6')`,
    [testUserA.id, asset3Id, asset4Id]
  );

  const fullDash = (await request(`${API_URL}/dashboard`, {}, testUserA.cookie)).data;

  assert.strictEqual(fullDash.allocation.coveragePercentage, 100);
  assert.strictEqual(fullDash.documents.coveragePercentage, 100);
  assert.strictEqual(fullDash.readiness.score, 100);
  assert.strictEqual(fullDash.readiness.label, 'Legacy Ready');
  assert.deepStrictEqual(fullDash.readiness.components, {
    verification: 15,
    assets: 25,
    nominees: 20,
    allocation: 25,
    documents: 15,
  });
  assert.deepStrictEqual(fullDash.needsAttention, [], 'Full readiness should have 0 attention items');
  console.log('✓ 100% Full readiness achieved (score 100, "Legacy Ready", 0 attention items).\n');

  // ---------------------------------------------------------------
  // 10. DECIMAL ALLOCATION (Section 19.M)
  // ---------------------------------------------------------------
  console.log('10. Testing decimal allocations (33.33% / 66.67%)...');
  // Update Asset 1 to have split: 33.33% and 66.67%
  await pool.query('DELETE FROM asset_nominees WHERE asset_id = $1', [asset1Id]);
  await pool.query(
    `INSERT INTO asset_nominees (asset_id, nominee_id, allocation_percentage)
     VALUES ($1, $2, 33.33), ($1, $3, 66.67)`,
    [asset1Id, nom1Id, nom2Id]
  );

  const decDash = (await request(`${API_URL}/dashboard`, {}, testUserA.cookie)).data;
  assert.strictEqual(decDash.allocation.coveragePercentage, 100);
  assert.strictEqual(decDash.readiness.score, 100);
  console.log('✓ Decimal allocations sum to 100% cleanly without floating-point errors.\n');

  // ---------------------------------------------------------------
  // 11. CROSS-TENANT DATA ISOLATION (Section 19.K)
  // ---------------------------------------------------------------
  console.log('11. Testing strict cross-tenant data isolation...');
  // User B currently has 0 assets, 0 nominees, 0 documents
  const dashBBefore = (await request(`${API_URL}/dashboard`, {}, testUserB.cookie)).data;
  assert.strictEqual(dashBBefore.assets.total, 0);
  assert.strictEqual(dashBBefore.nominees.total, 0);
  assert.strictEqual(dashBBefore.documents.total, 0);
  assert.strictEqual(dashBBefore.readiness.score, 15);

  // Setup distinct data for User B
  await pool.query(
    `INSERT INTO assets (user_id, name, category, estimated_value, currency)
     VALUES ($1, 'User B Bitcoin', 'digital', 4500000, 'INR')`,
    [testUserB.id]
  );
  await pool.query(
    `INSERT INTO nominees (user_id, full_name, email, relationship)
     VALUES ($1, 'User B Nominee', 'nom_b@test.com', 'Friend')`,
    [testUserB.id]
  );

  const dashB = (await request(`${API_URL}/dashboard`, {}, testUserB.cookie)).data;
  assert.strictEqual(dashB.assets.total, 1);
  assert.strictEqual(dashB.assets.totalValue, 4500000);
  assert.strictEqual(dashB.assets.byCategory[0].category, 'digital');
  assert.strictEqual(dashB.nominees.total, 1);
  assert.strictEqual(dashB.nominees.assigned, 0);

  // Verify User A still only sees User A's data
  const dashA = (await request(`${API_URL}/dashboard`, {}, testUserA.cookie)).data;
  assert.strictEqual(dashA.assets.total, 4);
  assert.strictEqual(dashA.assets.totalValue, 9400000);
  assert.strictEqual(dashA.nominees.total, 2);
  assert.strictEqual(dashA.documents.total, 6);
  console.log('✓ Cross-tenant data isolation confirmed: User A and User B metrics remain completely isolated.\n');

  // ---------------------------------------------------------------
  // 12. MULTI-CURRENCY STANDARDIZATION & ISOLATION
  // ---------------------------------------------------------------
  console.log('12. Testing multi-currency handling (INR + USD)...');
  const multiUser = await createTestUser('test_dash_multi@digivirasat.dev', 'Multi User', true);
  await cleanUserData([multiUser.id]);

  // Asset A: INR 100000
  await pool.query(
    `INSERT INTO assets (user_id, name, category, estimated_value, currency)
     VALUES ($1, 'Asset A (INR)', 'financial', 100000, 'INR')`,
    [multiUser.id]
  );
  // Asset B: INR 200000
  await pool.query(
    `INSERT INTO assets (user_id, name, category, estimated_value, currency)
     VALUES ($1, 'Asset B (INR)', 'financial', 200000, 'INR')`,
    [multiUser.id]
  );
  // Asset C: USD 5000
  await pool.query(
    `INSERT INTO assets (user_id, name, category, estimated_value, currency)
     VALUES ($1, 'Asset C (USD)', 'investments', 5000, 'USD')`,
    [multiUser.id]
  );

  const multiDash = (await request(`${API_URL}/dashboard`, {}, multiUser.cookie)).data;

  // 1. Total assets must equal 3
  assert.strictEqual(multiDash.assets.total, 3, 'Total assets must equal 3');

  // 2. Currencies must NEVER be mathematically combined (i.e. not 305000)
  assert.strictEqual(multiDash.assets.totalValue, null, 'totalValue must be null when multiple currencies exist');
  assert.notStrictEqual(multiDash.assets.totalValue, 305000, 'Currencies must never be added together into 305000');

  // 3. totalValueByCurrency must contain INR = 300000 and USD = 5000
  assert.ok(Array.isArray(multiDash.assets.totalValueByCurrency), 'totalValueByCurrency must be an array');
  assert.strictEqual(multiDash.assets.totalValueByCurrency.length, 2);

  const inrGroup = multiDash.assets.totalValueByCurrency.find((c) => c.currency === 'INR');
  const usdGroup = multiDash.assets.totalValueByCurrency.find((c) => c.currency === 'USD');

  assert.ok(inrGroup, 'totalValueByCurrency must contain INR');
  assert.strictEqual(inrGroup.amount, 300000, 'INR amount must be 300000 (100000 + 200000)');

  assert.ok(usdGroup, 'totalValueByCurrency must contain USD');
  assert.strictEqual(usdGroup.amount, 5000, 'USD amount must be 5000');

  console.log('✓ Multi-currency handling verified: totalValue is null, INR = 300000, USD = 5000, no 305000 combined sum.\n');

  // Clean test data
  await cleanUserData([testUserA.id, testUserB.id, unverifiedUser.id, multiUser.id]);
  await pool.query('DELETE FROM users WHERE id = ANY($1)', [[testUserA.id, testUserB.id, unverifiedUser.id, multiUser.id]]);

  console.log('====================================================');
  console.log('  ALL PHASE 4A DASHBOARD ENGINE TESTS PASSED!');
  console.log('====================================================\n');
  await pool.end();
}

runTests().catch(async (err) => {
  console.error('[TEST SUITE FAILED]', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
