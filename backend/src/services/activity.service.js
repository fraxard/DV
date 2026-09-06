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
};

/**
 * Calculates human-readable relative time from date
 */
function getRelativeTime(date) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = Math.max(0, now - past);
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  // Format as day and short month (e.g. 31 Aug)
  const day = past.getDate();
  const month = past.toLocaleString('en-US', { month: 'short' });
  return `${day} ${month}`;
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
 */
async function listActivities(userId, limit = 20) {
  const result = await pool.query(
    `
      SELECT id, user_id, action, title, category, metadata, created_at
      FROM activity_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, Math.min(100, Math.max(1, limit))]
  );

  return result.rows.map((row) => ({
    id: row.id,
    action: row.action,
    title: row.title,
    category: row.category,
    categoryLabel: CATEGORY_LABELS[row.category.toLowerCase()] || row.category,
    relativeTime: getRelativeTime(row.created_at),
    createdAt: row.created_at,
    metadata: row.metadata,
  }));
}

module.exports = {
  logActivity,
  listActivities,
  getRelativeTime,
};