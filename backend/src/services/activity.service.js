const pool = require('../db');

/**
 * Maps categories to readable labels
 */
const CATEGORY_LABELS = {
  property: 'Property',
  financial: 'Financial',
  crypto: 'Crypto',
  insurance: 'Insurance',
  investments: 'Investments',
  digital: 'Digital',
  business: 'Business',
  legal: 'Legal',
  other: 'Other',
  allocations: 'Allocations',
  documents: 'Documents',
  people: 'People',
  account: 'Account',
  tasks: 'Tasks',
};

/**
 * Calculates human-readable relative time from date
 */
function getRelativeTime(date) {
  if (!date) return 'Recent';
  const past = new Date(date);
  if (isNaN(past.getTime())) return 'Recent';

  const now = new Date();
  const diffMs = Math.max(0, now - past);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  const day = String(past.getDate()).padStart(2, '0');
  const month = past.toLocaleString('en-US', { month: 'short' });
  const year = past.getFullYear();
  const time = past.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} ${month} ${year}, ${time}`;
}

function formatActivityRow(row) {
  const relTime = getRelativeTime(row.created_at);
  const catKey = (row.category || 'other').toLowerCase().trim();
  const catLabel = CATEGORY_LABELS[catKey] || (row.category ? row.category.charAt(0).toUpperCase() + row.category.slice(1) : 'Other');
  return {
    id: row.id,
    action: row.action,
    title: row.title,
    category: row.category,
    categoryLabel: catLabel,
    category_label: catLabel,
    relativeTime: relTime,
    relative_time: relTime,
    createdAt: row.created_at,
    created_at: row.created_at,
    metadata: row.metadata || {},
  };
}

/**
 * Inserts an activity log for an authenticated user.
 * Safe against cross-user leakage. Errors are caught gracefully so main flows aren't disrupted.
 */
async function logActivity({ userId, action, title, category, metadata = {} }) {
  if (!userId || !title) return null;
  try {
    const result = await pool.query(
      `
        INSERT INTO activity_logs (user_id, action, title, category, metadata)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, action, title, category, metadata, created_at
      `,
      [
        userId,
        action || 'action',
        title.trim(),
        (category || 'other').trim().toLowerCase(),
        metadata && typeof metadata === 'object' ? metadata : {},
      ]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Error logging activity:', err);
    return null;
  }
}

/**
 * Lists user-scoped activity logs in descending chronological order.
 * Kept for backwards compatibility with internal callers (dashboard, tests).
 */
async function listActivities(userId, limit = 20) {
  const parsedLimit = parseInt(limit, 10);
  const safeLimit = (!isNaN(parsedLimit) && parsedLimit >= 1) ? Math.min(100, parsedLimit) : 20;

  const result = await pool.query(
    `
      SELECT id, user_id, action, title, category, metadata, created_at
      FROM activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `,
    [userId, safeLimit]
  );

  return result.rows.map(formatActivityRow);
}

/**
 * Lists user-scoped activity logs with server-side pagination.
 */
async function listActivitiesPaginated(userId, { page = 1, limit = 5 } = {}) {
  let parsedPage = parseInt(page, 10);
  let parsedLimit = parseInt(limit, 10);

  if (isNaN(parsedPage) || parsedPage < 1) {
    parsedPage = 1;
  }
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    parsedLimit = 5;
  } else if (parsedLimit > 50) {
    parsedLimit = 50;
  }

  const offset = (parsedPage - 1) * parsedLimit;

  // 1. Total count strictly tenant-scoped
  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS total FROM activity_logs WHERE user_id = $1',
    [userId]
  );
  const total = countResult.rows[0]?.total || 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / parsedLimit);

  // 2. Query page records strictly tenant-scoped with deterministic tiebreaker
  const result = await pool.query(
    `
      SELECT id, user_id, action, title, category, metadata, created_at
      FROM activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2 OFFSET $3
    `,
    [userId, parsedLimit, offset]
  );

  const activities = result.rows.map(formatActivityRow);

  return {
    activities,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages,
      hasNextPage: parsedPage < totalPages,
      hasPrevPage: parsedPage > 1 && totalPages > 0,
    },
  };
}

module.exports = {
  logActivity,
  listActivities,
  listActivitiesPaginated,
  getRelativeTime,
};