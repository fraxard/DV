const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, createTestUser, pool } = require('./testHelper');

describe('Calendar & Legacy Task Management Lifecycle Tests', () => {
  let userA = null;
  let userB = null;
  let taskId = null;

  before(async () => {
    await startTestServer();
    userA = await createTestUser('task_user_a');
    userB = await createTestUser('task_user_b');
  });

  after(async () => {
    if (userA) await userA.cleanup();
    if (userB) await userB.cleanup();
    await stopTestServer();
  });

  test('Task Creation: rejects missing title or due date', async () => {
    const res = await request(
      { path: '/api/tasks', method: 'POST' },
      { title: '', dueDate: '2026-10-15' },
      userA.cookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /title.*required/i);
  });

  test('Task Creation: successfully creates future task with status scheduled', async () => {
    const res = await request(
      { path: '/api/tasks', method: 'POST' },
      {
        title: 'Review Will & Nominee Designations',
        description: 'Annual estate planning review',
        dueDate: '2026-12-31',
        dueTime: '10:00',
      },
      userA.cookie
    );

    assert.equal(res.status, 201);
    assert.ok(res.body.task?.id);
    assert.equal(res.body.task.title, 'Review Will & Nominee Designations');
    assert.equal(res.body.task.status, 'scheduled');

    taskId = res.body.task.id;
  });

  test('Task Status Evaluation: past due task is dynamically evaluated as missed', async () => {
    // Insert a task due in the past
    const pastRes = await request(
      { path: '/api/tasks', method: 'POST' },
      {
        title: 'Overdue Tax Document Renewal',
        dueDate: '2025-01-01',
      },
      userA.cookie
    );
    assert.equal(pastRes.status, 201);
    assert.equal(pastRes.body.task.status, 'missed');
  });

  test('Task Update: updates task details', async () => {
    const res = await request(
      { path: `/api/tasks/${taskId}`, method: 'PUT' },
      {
        title: 'Review Will & Nominee Designations (Updated)',
        description: 'Priority annual review',
        dueDate: '2026-12-31',
      },
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.task.title, 'Review Will & Nominee Designations (Updated)');
  });

  test('Task Status Toggle: marks task as completed', async () => {
    const res = await request(
      { path: `/api/tasks/${taskId}/status`, method: 'PATCH' },
      { status: 'completed' },
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.task.status, 'completed');
    assert.ok(res.body.task.completed_at);
  });

  test('Multi-User IDOR: User B cannot access, modify, or delete User A task', async () => {
    const getRes = await request(
      { path: `/api/tasks/${taskId}`, method: 'GET' },
      null,
      userB.cookie
    );
    assert.equal(getRes.status, 404);

    const patchRes = await request(
      { path: `/api/tasks/${taskId}/status`, method: 'PATCH' },
      { status: 'scheduled' },
      userB.cookie
    );
    assert.equal(patchRes.status, 404);

    const delRes = await request(
      { path: `/api/tasks/${taskId}`, method: 'DELETE' },
      null,
      userB.cookie
    );
    assert.equal(delRes.status, 404);
  });

  test('Task Deletion: owner can delete task', async () => {
    const res = await request(
      { path: `/api/tasks/${taskId}`, method: 'DELETE' },
      null,
      userA.cookie
    );
    assert.equal(res.status, 200);

    const checkDb = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
    assert.equal(checkDb.rows.length, 0);
  });
});
