/**
 * DigiVirasat Phase 5 Automated Test Suite
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const assert = require('assert');
const pool = require('./src/db');
const customCategoryService = require('./src/services/customCategory.service');
const taskService = require('./src/services/task.service');
const assetService = require('./src/services/asset.service');
const { listActivities } = require('./src/services/activity.service');

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

async function runTests() {
  console.log(colors.bold('\n===================================================='));
  console.log(colors.bold('  DIGIVIRASAT PHASE 5: CATEGORIES & TASKS TEST SUITE'));
  console.log(colors.bold('====================================================\n'));

  // Clean up any old test users
  await pool.query("DELETE FROM users WHERE email LIKE '%@phase5test.digivirasat.internal'");

  // Create isolated test users
  const userARes = await pool.query(
    `
      INSERT INTO users (name, email, password_hash, email_verified, onboarding_completed)
      VALUES ('Phase5 User A', 'usera@phase5test.digivirasat.internal', 'hash_a', true, true)
      RETURNING id
    `
  );
  const userBRes = await pool.query(
    `
      INSERT INTO users (name, email, password_hash, email_verified, onboarding_completed)
      VALUES ('Phase5 User B', 'userb@phase5test.digivirasat.internal', 'hash_b', true, true)
      RETURNING id
    `
  );

  const userAId = userARes.rows[0].id;
  const userBId = userBRes.rows[0].id;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Key Normalization Function
    // -------------------------------------------------------------------------
    console.log('1. Testing key normalization...');
    assert.strictEqual(customCategoryService.normalizeKey('Rare Books'), 'rare_books');
    assert.strictEqual(customCategoryService.normalizeKey('  Fine   Art  '), 'fine_art');
    assert.strictEqual(customCategoryService.normalizeKey('Family-Jewellery!'), 'family_jewellery');
    assert.strictEqual(customCategoryService.normalizeKey('Vehicles & Cars'), 'vehicles_cars');
    console.log(colors.green('✓ Key normalization verified.'));

    // -------------------------------------------------------------------------
    // TEST 2: Custom Category Creation & Field Definitions
    // -------------------------------------------------------------------------
    console.log('\n2. Testing custom category creation & field definitions...');
    const catA = await customCategoryService.createCustomCategory(userAId, {
      name: 'Rare Books',
      description: 'Collectible first editions and manuscripts',
      fields: [
        { label: 'Author', type: 'text', isRequired: true },
        { label: 'Edition', type: 'number', isRequired: false },
        { label: 'First Edition', type: 'boolean', isRequired: false },
        { label: 'Appraisal Date', type: 'date', isRequired: false },
      ],
    });

    assert.strictEqual(catA.name, 'Rare Books');
    assert.strictEqual(catA.key, 'rare_books');
    assert.strictEqual(catA.fields.length, 4);
    assert.strictEqual(catA.fields[0].key, 'author');
    assert.strictEqual(catA.fields[0].isRequired, true);
    assert.strictEqual(catA.fields[1].key, 'edition');
    assert.strictEqual(catA.fields[1].type, 'number');
    assert.strictEqual(catA.fields[2].key, 'first_edition');
    assert.strictEqual(catA.fields[2].type, 'boolean');
    assert.strictEqual(catA.fields[3].key, 'appraisal_date');
    assert.strictEqual(catA.fields[3].type, 'date');
    console.log(colors.green('✓ Custom category creation and field definitions verified.'));

    // -------------------------------------------------------------------------
    // TEST 3: Validation & System Category Collision Prevention
    // -------------------------------------------------------------------------
    console.log('\n3. Testing custom category validation & collisions...');
    
    // Duplicate category for same user
    await assert.rejects(
      customCategoryService.createCustomCategory(userAId, { name: 'rare books' }),
      /already exists/
    );

    // Collision with system categories
    await assert.rejects(
      customCategoryService.createCustomCategory(userAId, { name: 'Financial' }),
      /collides with a built-in system category/
    );
    await assert.rejects(
      customCategoryService.createCustomCategory(userAId, { name: 'PROPERTY' }),
      /collides with a built-in system category/
    );

    // Forbidden secret fields
    await assert.rejects(
      customCategoryService.createCustomCategory(userAId, {
        name: 'Crypto Vault',
        fields: [{ label: 'Private Key', type: 'text' }],
      }),
      /Disallowed/
    );
    await assert.rejects(
      customCategoryService.createCustomCategory(userAId, {
        name: 'Secret Wallets',
        fields: [{ label: 'Seed Phrase Backup', type: 'textarea' }],
      }),
      /Disallowed/
    );

    // Unsupported field types
    await assert.rejects(
      customCategoryService.createCustomCategory(userAId, {
        name: 'Antique Clocks',
        fields: [{ label: 'Clock Photo', type: 'image_file' }],
      }),
      /Unsupported field type/
    );

    // Duplicate field keys
    await assert.rejects(
      customCategoryService.createCustomCategory(userAId, {
        name: 'Stamps',
        fields: [
          { label: 'Issue Year', type: 'number' },
          { label: 'Issue Year', type: 'text' },
        ],
      }),
      /Duplicate field key/
    );
    console.log(colors.green('✓ Custom category validation and collision guards verified.'));

    // -------------------------------------------------------------------------
    // TEST 4: Category Updates & Field Key Preservation
    // -------------------------------------------------------------------------
    console.log('\n4. Testing category updates and field preservation...');
    const updatedCat = await customCategoryService.updateCustomCategory(userAId, catA.id, {
      name: 'Rare Books & Manuscripts',
      description: 'Expanded collection description',
      fields: [
        { id: catA.fields[0].id, key: 'author', label: 'Book Author', type: 'text', isRequired: true },
        { id: catA.fields[1].id, key: 'edition', label: 'Edition', type: 'number', isRequired: false },
        { id: catA.fields[2].id, key: 'first_edition', label: 'First Edition', type: 'boolean', isRequired: false },
        { id: catA.fields[3].id, key: 'appraisal_date', label: 'Appraisal Date', type: 'date', isRequired: false },
        { label: 'Catalog Link', type: 'url', isRequired: false }, // New field
      ],
    });

    assert.strictEqual(updatedCat.name, 'Rare Books & Manuscripts');
    assert.strictEqual(updatedCat.fields.length, 5);
    // Preserved existing key despite label change:
    assert.strictEqual(updatedCat.fields[0].key, 'author');
    assert.strictEqual(updatedCat.fields[0].label, 'Book Author');
    assert.strictEqual(updatedCat.fields[4].key, 'catalog_link');
    assert.strictEqual(updatedCat.fields[4].type, 'url');
    console.log(colors.green('✓ Category updates and key stability verified.'));

    // -------------------------------------------------------------------------
    // TEST 5: Asset Creation with Custom Category & Deletion Protection
    // -------------------------------------------------------------------------
    console.log('\n5. Testing asset creation with custom category & deletion protection...');
    const asset = await assetService.createAsset(userAId, {
      name: '1984 First Edition',
      category: updatedCat.key, // 'rare_books'
      estimatedValue: 45000,
      metadata: {
        customFields: {
          author: 'George Orwell',
          edition: 1,
          first_edition: true,
          appraisal_date: '2026-09-01',
        },
      },
    });
    assert.strictEqual(asset.category, 'rare_books');

    // Attempting to delete category while asset is in use MUST fail
    await assert.rejects(
      customCategoryService.deleteCustomCategory(userAId, updatedCat.id),
      /This category cannot be deleted because 1 asset is using it/
    );

    // Attempting to remove field that has asset data MUST fail
    await assert.rejects(
      customCategoryService.updateCustomCategory(userAId, updatedCat.id, {
        fields: [
          // Author omitted
          { id: catA.fields[1].id, key: 'edition', label: 'Edition', type: 'number' },
        ],
      }),
      /Cannot delete field '.*' because existing assets contain values for it/
    );
    console.log(colors.green('✓ Data preservation and category deletion guards verified.'));

    // -------------------------------------------------------------------------
    // TEST 6: Tenant Isolation for Custom Categories
    // -------------------------------------------------------------------------
    console.log('\n6. Testing cross-tenant custom category isolation...');
    const userBCategories = await customCategoryService.listCustomCategories(userBId);
    assert.strictEqual(userBCategories.length, 0);

    // User B cannot fetch, update, or delete User A's category
    await assert.rejects(
      customCategoryService.getCustomCategory(userBId, updatedCat.id),
      /Custom category not found/
    );
    await assert.rejects(
      customCategoryService.updateCustomCategory(userBId, updatedCat.id, { name: 'Hacked' }),
      /Custom category not found/
    );
    await assert.rejects(
      customCategoryService.deleteCustomCategory(userBId, updatedCat.id),
      /Custom category not found/
    );
    console.log(colors.green('✓ Multi-tenant custom category isolation confirmed.'));

    // -------------------------------------------------------------------------
    // TEST 7: Task CRUD and Asset Association
    // -------------------------------------------------------------------------
    console.log('\n7. Testing task CRUD and asset association...');
    const task1 = await taskService.createTask(userAId, {
      title: 'Get 1984 book appraised',
      description: 'Contact rare book specialist in London',
      dueDate: '2026-09-15',
      dueTime: '14:30',
      assetId: asset.id,
    });

    assert.strictEqual(task1.title, 'Get 1984 book appraised');
    assert.strictEqual(task1.dueDate, '2026-09-15');
    assert.strictEqual(task1.dueTime, '14:30');
    assert.strictEqual(task1.status, 'scheduled');
    assert.strictEqual(task1.assetId, asset.id);
    assert.strictEqual(task1.assetName, '1984 First Edition');

    // Update task
    const updatedTask = await taskService.updateTask(userAId, task1.id, {
      title: 'Get 1984 book appraised (Urgent)',
      dueTime: '15:00',
    });
    assert.strictEqual(updatedTask.title, 'Get 1984 book appraised (Urgent)');
    assert.strictEqual(updatedTask.dueTime, '15:00');
    console.log(colors.green('✓ Task creation and update verified.'));

    // -------------------------------------------------------------------------
    // TEST 8: Task Status Transitions & Completed State Precedence
    // -------------------------------------------------------------------------
    console.log('\n8. Testing task status transitions...');
    const completedTask = await taskService.updateTaskStatus(userAId, task1.id, 'completed');
    assert.strictEqual(completedTask.status, 'completed');
    assert.ok(completedTask.completedAt !== null);

    // Toggle back to scheduled
    const reopenedTask = await taskService.updateTaskStatus(userAId, task1.id, 'scheduled');
    assert.strictEqual(reopenedTask.status, 'scheduled');
    assert.strictEqual(reopenedTask.completedAt, null);
    console.log(colors.green('✓ Task status transitions verified.'));

    // -------------------------------------------------------------------------
    // TEST 9: Timezone-Safe Missed Calculation Rules
    // -------------------------------------------------------------------------
    console.log('\n9. Testing timezone-safe missed status rules...');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const yesterdayObj = new Date(today.getTime() - 24 * 3600 * 1000);
    const y_yyyy = yesterdayObj.getFullYear();
    const y_mm = String(yesterdayObj.getMonth() + 1).padStart(2, '0');
    const y_dd = String(yesterdayObj.getDate()).padStart(2, '0');
    const yesterdayStr = `${y_yyyy}-${y_mm}-${y_dd}`;

    const tomorrowObj = new Date(today.getTime() + 24 * 3600 * 1000);
    const t_yyyy = tomorrowObj.getFullYear();
    const t_mm = String(tomorrowObj.getMonth() + 1).padStart(2, '0');
    const t_dd = String(tomorrowObj.getDate()).padStart(2, '0');
    const tomorrowStr = `${t_yyyy}-${t_mm}-${t_dd}`;

    // Rule A: Yesterday, no time -> missed
    const missedTask = await taskService.createTask(userAId, {
      title: 'Yesterday task',
      dueDate: yesterdayStr,
    });
    assert.strictEqual(missedTask.status, 'missed');

    // Rule B: Tomorrow -> scheduled
    const futureTask = await taskService.createTask(userAId, {
      title: 'Tomorrow task',
      dueDate: tomorrowStr,
    });
    assert.strictEqual(futureTask.status, 'scheduled');

    // Rule C: Completed task is ALWAYS completed, even if due yesterday
    const completedYesterday = await taskService.updateTaskStatus(userAId, missedTask.id, 'completed');
    assert.strictEqual(completedYesterday.status, 'completed');

    // Rule D: Today with future time -> scheduled
    const todayFutureTime = new Date(today.getTime() + 3600 * 1000); // 1 hour ahead
    const tfHours = String(todayFutureTime.getHours()).padStart(2, '0');
    const tfMins = String(todayFutureTime.getMinutes()).padStart(2, '0');
    const futureTimeTask = await taskService.createTask(userAId, {
      title: 'Today future task',
      dueDate: todayStr,
      dueTime: `${tfHours}:${tfMins}`,
    });
    assert.strictEqual(futureTimeTask.status, 'scheduled');

    // Rule E: Today with past time -> missed
    const todayPastTime = new Date(today.getTime() - 3600 * 1000); // 1 hour ago
    const tpHours = String(todayPastTime.getHours()).padStart(2, '0');
    const tpMins = String(todayPastTime.getMinutes()).padStart(2, '0');
    const pastTimeTask = await taskService.createTask(userAId, {
      title: 'Today past task',
      dueDate: todayStr,
      dueTime: `${tpHours}:${tpMins}`,
    });
    assert.strictEqual(pastTimeTask.status, 'missed');
    console.log(colors.green('✓ Timezone-safe missed calculation verified.'));

    // -------------------------------------------------------------------------
    // TEST 10: Cross-Tenant Task Isolation
    // -------------------------------------------------------------------------
    console.log('\n10. Testing cross-tenant task isolation...');
    const userBTasks = await taskService.listTasks(userBId);
    assert.strictEqual(userBTasks.length, 0);

    // User B cannot access or modify User A's task
    await assert.rejects(
      taskService.getTask(userBId, task1.id),
      /Task not found/
    );
    await assert.rejects(
      taskService.updateTask(userBId, task1.id, { title: 'User B update' }),
      /Task not found/
    );
    await assert.rejects(
      taskService.updateTaskStatus(userBId, task1.id, 'completed'),
      /Task not found/
    );
    await assert.rejects(
      taskService.deleteTask(userBId, task1.id),
      /Task not found/
    );

    // User B cannot link task to User A's asset
    await assert.rejects(
      taskService.createTask(userBId, {
        title: 'Unauthorized asset link',
        dueDate: '2026-09-20',
        assetId: asset.id,
      }),
      /Associated asset not found/
    );
    console.log(colors.green('✓ Strict cross-tenant task isolation confirmed.'));

    // -------------------------------------------------------------------------
    // TEST 11: Activity Logging & Date Serialization
    // -------------------------------------------------------------------------
    console.log('\n11. Testing activity logging and timestamps...');
    const activities = await listActivities(userAId, 10);
    assert.ok(activities.length > 0);
    for (const act of activities) {
      assert.ok(act.createdAt, 'Activity must have valid createdAt');
      assert.ok(act.created_at, 'Activity must have valid created_at');
      assert.ok(act.relativeTime, 'Activity must have valid relativeTime');
      assert.notStrictEqual(act.relativeTime, 'Invalid Date');
    }
    const taskActivity = activities.find((a) => a.category === 'tasks');
    assert.ok(taskActivity, 'Task creation/completion activity must be logged');
    console.log(colors.green('✓ Activity logging and date formatting verified.'));

    console.log(colors.bold('\n===================================================='));
    console.log(colors.bold(colors.green('  ALL PHASE 5 TESTS PASSED SUCCESSFULLY!')));
    console.log(colors.bold('====================================================\n'));
  } finally {
    // Cleanup test data
    await pool.query("DELETE FROM users WHERE email LIKE '%@phase5test.digivirasat.internal'");
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error(colors.bold(colors.red('\nTEST FAILED:')), err);
  pool.end();
  process.exit(1);
});
