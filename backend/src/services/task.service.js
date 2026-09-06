const pool = require('../db');
const { Errors } = require('../utils/errors');
const { logActivity } = require('./activity.service');

const VALID_STATUSES = new Set(['scheduled', 'completed', 'missed']);

/**
 * Normalizes and determines effective task status in a timezone-safe manner.
 * 
 * Rules:
 * - If status === 'completed', task is always completed.
 * - If task has due_time (e.g. '18:00'):
 *   due_point = `${due_date}T${due_time}` evaluated in server/local reference.
 *   If current time > due_point and status !== 'completed' -> missed.
 * - If task has NO due_time:
 *   Task is only missed once the local calendar date has passed (current date > due_date).
 *   Throughout the entire due_date, it remains scheduled.
 */
function evaluateTaskStatus(task, now = new Date()) {
  if (task.status === 'completed') {
    return 'completed';
  }

  // Format local current date as YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const currentDateStr = `${year}-${month}-${day}`;

  const dueDateStr = task.due_date; // e.g. '2026-09-06'

  if (task.due_time) {
    // Due date + time comparison
    const timeStr = task.due_time.length === 5 ? `${task.due_time}:00` : task.due_time;
    const dueDateTime = new Date(`${dueDateStr}T${timeStr}`);
    if (!isNaN(dueDateTime.getTime()) && now.getTime() > dueDateTime.getTime()) {
      return 'missed';
    }
  } else {
    // Due date only: overdue only if current date has passed the due date
    if (currentDateStr > dueDateStr) {
      return 'missed';
    }
  }

  return 'scheduled';
}

function formatTask(row) {
  if (!row) return null;
  let dueDate = row.due_date;
  if (dueDate instanceof Date) {
    const y = dueDate.getFullYear();
    const m = String(dueDate.getMonth() + 1).padStart(2, '0');
    const d = String(dueDate.getDate()).padStart(2, '0');
    dueDate = `${y}-${m}-${d}`;
  } else if (typeof dueDate === 'string' && dueDate.includes('T')) {
    dueDate = dueDate.split('T')[0];
  }

  let dueTime = row.due_time || null;
  if (dueTime && typeof dueTime === 'string') {
    // Normalize HH:mm:ss to HH:mm
    dueTime = dueTime.slice(0, 5);
  }

  const rawTask = {
    ...row,
    due_date: dueDate,
    due_time: dueTime,
  };

  const effectiveStatus = evaluateTaskStatus(rawTask);

  return {
    id: row.id,
    userId: row.user_id,
    user_id: row.user_id,
    assetId: row.asset_id || null,
    asset_id: row.asset_id || null,
    assetName: row.asset_name || null,
    asset_name: row.asset_name || null,
    title: row.title,
    description: row.description || null,
    dueDate,
    due_date: dueDate,
    dueTime,
    due_time: dueTime,
    status: effectiveStatus,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at,
    completedAt: row.completed_at || null,
    completed_at: row.completed_at || null,
  };
}

/**
 * Reconciles overdue scheduled tasks in database for this user in background.
 */
async function reconcileUserTasks(userId) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDateStr = `${year}-${month}-${day}`;
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

    // 1. Tasks where due_date < today
    await pool.query(
      `
        UPDATE tasks
        SET status = 'missed', updated_at = current_timestamp
        WHERE user_id = $1
          AND status = 'scheduled'
          AND due_date < $2
      `,
      [userId, currentDateStr]
    );

    // 2. Tasks where due_date = today AND due_time IS NOT NULL AND due_time < currentTime
    await pool.query(
      `
        UPDATE tasks
        SET status = 'missed', updated_at = current_timestamp
        WHERE user_id = $1
          AND status = 'scheduled'
          AND due_date = $2
          AND due_time IS NOT NULL
          AND due_time < $3
      `,
      [userId, currentDateStr, currentTimeStr]
    );
  } catch (err) {
    // Non-fatal reconciliation error
    console.error('Task reconciliation error:', err.message);
  }
}

/**
 * Lists tasks for the user with optional filters (startDate, endDate, status).
 */
async function listTasks(userId, { startDate, endDate, status } = {}) {
  await reconcileUserTasks(userId);

  const conditions = ['t.user_id = $1'];
  const params = [userId];
  let paramIdx = 2;

  if (startDate) {
    conditions.push(`t.due_date >= $${paramIdx}`);
    params.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    conditions.push(`t.due_date <= $${paramIdx}`);
    params.push(endDate);
    paramIdx++;
  }

  if (status) {
    const s = status.trim().toLowerCase();
    if (!VALID_STATUSES.has(s)) {
      throw Errors.badRequest(`Invalid status filter '${status}'. Valid: scheduled, completed, missed`);
    }
    conditions.push(`t.status = $${paramIdx}`);
    params.push(s);
    paramIdx++;
  }

  const query = `
    SELECT
      t.id,
      t.user_id,
      t.asset_id,
      a.name AS asset_name,
      t.title,
      t.description,
      t.due_date::text AS due_date,
      t.due_time::text AS due_time,
      t.status,
      t.created_at,
      t.updated_at,
      t.completed_at
    FROM tasks t
    LEFT JOIN assets a ON a.id = t.asset_id AND a.user_id = t.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY t.due_date ASC, t.due_time ASC NULLS LAST, t.created_at ASC
  `;

  const result = await pool.query(query, params);
  return result.rows.map(formatTask);
}

/**
 * Gets a single task by ID for the user.
 */
async function getTask(userId, taskId) {
  const result = await pool.query(
    `
      SELECT
        t.id,
        t.user_id,
        t.asset_id,
        a.name AS asset_name,
        t.title,
        t.description,
        t.due_date::text AS due_date,
        t.due_time::text AS due_time,
        t.status,
        t.created_at,
        t.updated_at,
        t.completed_at
      FROM tasks t
      LEFT JOIN assets a ON a.id = t.asset_id AND a.user_id = t.user_id
      WHERE t.id = $1 AND t.user_id = $2
    `,
    [taskId, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('Task not found.');
  }

  return formatTask(result.rows[0]);
}

/**
 * Creates a new task.
 */
async function createTask(userId, data) {
  const { title, description = null, dueDate, dueTime = null, assetId = null } = data;

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw Errors.badRequest('Task title is required.');
  }
  if (title.trim().length > 255) {
    throw Errors.badRequest('Task title cannot exceed 255 characters.');
  }

  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw Errors.badRequest('Valid due date (YYYY-MM-DD) is required.');
  }
  const dateObj = new Date(dueDate);
  if (isNaN(dateObj.getTime())) {
    throw Errors.badRequest('Invalid due date.');
  }

  let formattedTime = null;
  if (dueTime) {
    if (!/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(dueTime)) {
      throw Errors.badRequest('Valid due time (HH:mm) is required.');
    }
    formattedTime = dueTime.slice(0, 5);
  }

  // Validate asset ownership if assetId provided
  let validatedAssetId = null;
  if (assetId) {
    const assetCheck = await pool.query(
      'SELECT id, name FROM assets WHERE id = $1 AND user_id = $2',
      [assetId, userId]
    );
    if (assetCheck.rows.length === 0) {
      throw Errors.badRequest('Associated asset not found or not owned by user.');
    }
    validatedAssetId = assetCheck.rows[0].id;
  }

  // Evaluate initial status (could be missed immediately if backdated)
  const initialTaskObj = {
    status: 'scheduled',
    due_date: dueDate,
    due_time: formattedTime,
  };
  const initialStatus = evaluateTaskStatus(initialTaskObj);

  const result = await pool.query(
    `
      INSERT INTO tasks (
        user_id,
        asset_id,
        title,
        description,
        due_date,
        due_time,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        user_id,
        asset_id,
        title,
        description,
        due_date::text AS due_date,
        due_time::text AS due_time,
        status,
        created_at,
        updated_at,
        completed_at
    `,
    [
      userId,
      validatedAssetId,
      title.trim(),
      description && description.trim() ? description.trim() : null,
      dueDate,
      formattedTime,
      initialStatus,
    ]
  );

  const created = await getTask(userId, result.rows[0].id);

  // Log activity
  logActivity({
    userId,
    action: 'task_created',
    title: `Task added: ${created.title}`,
    category: 'tasks',
    metadata: { taskId: created.id, title: created.title, dueDate: created.dueDate },
  }).catch(() => {});

  return created;
}

/**
 * Updates a task.
 */
async function updateTask(userId, taskId, data) {
  const existing = await getTask(userId, taskId);

  const title = data.title !== undefined ? data.title.trim() : existing.title;
  if (!title) {
    throw Errors.badRequest('Task title cannot be blank.');
  }
  if (title.length > 255) {
    throw Errors.badRequest('Task title cannot exceed 255 characters.');
  }

  const description = data.description !== undefined
    ? (data.description ? data.description.trim() : null)
    : existing.description;

  const dueDate = data.dueDate !== undefined ? data.dueDate : existing.dueDate;
  if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw Errors.badRequest('Valid due date (YYYY-MM-DD) is required.');
  }

  let dueTime = existing.dueTime;
  if (data.dueTime !== undefined) {
    if (data.dueTime === null || data.dueTime === '') {
      dueTime = null;
    } else {
      if (!/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(data.dueTime)) {
        throw Errors.badRequest('Valid due time (HH:mm) is required.');
      }
      dueTime = data.dueTime.slice(0, 5);
    }
  }

  let assetId = existing.assetId;
  if (data.assetId !== undefined) {
    if (data.assetId === null || data.assetId === '') {
      assetId = null;
    } else {
      const assetCheck = await pool.query(
        'SELECT id FROM assets WHERE id = $1 AND user_id = $2',
        [data.assetId, userId]
      );
      if (assetCheck.rows.length === 0) {
        throw Errors.badRequest('Associated asset not found.');
      }
      assetId = assetCheck.rows[0].id;
    }
  }

  // Recalculate status if not completed
  let status = existing.status;
  if (status !== 'completed') {
    status = evaluateTaskStatus({ due_date: dueDate, due_time: dueTime, status: 'scheduled' });
  }

  await pool.query(
    `
      UPDATE tasks
      SET
        title = $1,
        description = $2,
        due_date = $3,
        due_time = $4,
        asset_id = $5,
        status = $6,
        updated_at = current_timestamp
      WHERE id = $7 AND user_id = $8
    `,
    [title, description, dueDate, dueTime, assetId, status, taskId, userId]
  );

  return getTask(userId, taskId);
}

/**
 * Toggles or updates task status.
 */
async function updateTaskStatus(userId, taskId, newStatus) {
  const existing = await getTask(userId, taskId);

  const status = (newStatus || '').trim().toLowerCase();
  if (!VALID_STATUSES.has(status)) {
    throw Errors.badRequest(`Invalid status '${newStatus}'. Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`);
  }

  let completedAt = null;
  let targetStatus = status;

  if (status === 'completed') {
    completedAt = new Date();
  } else {
    // If moving back to scheduled/missed, evaluate effective status
    targetStatus = evaluateTaskStatus({
      due_date: existing.dueDate,
      due_time: existing.dueTime,
      status: 'scheduled',
    });
    completedAt = null;
  }

  await pool.query(
    `
      UPDATE tasks
      SET
        status = $1,
        completed_at = $2,
        updated_at = current_timestamp
      WHERE id = $3 AND user_id = $4
    `,
    [targetStatus, completedAt, taskId, userId]
  );

  const updated = await getTask(userId, taskId);

  if (targetStatus === 'completed') {
    logActivity({
      userId,
      action: 'task_completed',
      title: `Task completed: ${updated.title}`,
      category: 'tasks',
      metadata: { taskId: updated.id, title: updated.title },
    }).catch(() => {});
  }

  return updated;
}

/**
 * Deletes a task.
 */
async function deleteTask(userId, taskId) {
  const existing = await getTask(userId, taskId);

  await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);

  logActivity({
    userId,
    action: 'task_deleted',
    title: `Task removed: ${existing.title}`,
    category: 'tasks',
    metadata: { taskId, title: existing.title },
  }).catch(() => {});

  return { id: taskId, message: 'Task deleted successfully.' };
}

module.exports = {
  evaluateTaskStatus,
  listTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
