const pool = require('../db');
const { listActivities } = require('./activity.service');

/**
 * Calculates the Legacy Readiness Score (0 - 100) based on component weights:
 * 1. Email verification: 15 pts
 * 2. Asset coverage: 25 pts (0 assets = 0, 1 asset = 15, 2+ assets = 25)
 * 3. Nominee coverage: 20 pts (0 nominees = 0, 1 nominee = 10, 2+ nominees = 20)
 * 4. Allocation coverage: 25 pts ((allocationCoverage / 100) * 25)
 * 5. Document coverage: 15 pts ((documentCoverage / 100) * 15)
 */
function calculateReadinessScore({
  emailVerified,
  assetCount,
  nomineeCount,
  allocationCoveragePercentage,
  documentCoveragePercentage,
}) {
  const verificationPoints = emailVerified ? 15 : 0;

  let assetPoints = 0;
  if (assetCount === 1) {
    assetPoints = 15;
  } else if (assetCount >= 2) {
    assetPoints = 25;
  }

  let nomineePoints = 0;
  if (nomineeCount === 1) {
    nomineePoints = 10;
  } else if (nomineeCount >= 2) {
    nomineePoints = 20;
  }

  const rawAllocationPoints = (allocationCoveragePercentage / 100) * 25;
  const rawDocumentPoints = (documentCoveragePercentage / 100) * 15;

  const allocationPoints = Math.round(rawAllocationPoints * 100) / 100;
  const documentPoints = Math.round(rawDocumentPoints * 100) / 100;

  const rawTotal = verificationPoints + assetPoints + nomineePoints + rawAllocationPoints + rawDocumentPoints;
  const finalScore = Math.round(Math.min(100, Math.max(0, rawTotal)));

  return {
    score: finalScore,
    components: {
      verification: verificationPoints,
      assets: assetPoints,
      nominees: nomineePoints,
      allocation: allocationPoints,
      documents: documentPoints,
    },
  };
}

/**
 * Maps the readiness score to exact threshold labels:
 * 0–24: "Getting Started"
 * 25–49: "Early Stage"
 * 50–74: "In Progress"
 * 75–89: "Nearly Ready"
 * 90–100: "Legacy Ready"
 */
function calculateReadinessLabel(score) {
  if (score >= 90) return 'Legacy Ready';
  if (score >= 75) return 'Nearly Ready';
  if (score >= 50) return 'In Progress';
  if (score >= 25) return 'Early Stage';
  return 'Getting Started';
}

/**
 * Builds deterministic, deduplicated attention items in strict order:
 * 1. verify_email
 * 2. add_assets
 * 3. add_nominee
 * 4. assign_nominees
 * 5. complete_allocations
 * 6. add_documents
 */
function buildNeedsAttention({
  emailVerified,
  assetCount,
  nomineeCount,
  assetsWithoutAllocation,
  partiallyAllocatedCount,
  assetsWithoutDocuments,
}) {
  const items = [];

  // RULE 1: Unverified Email
  if (!emailVerified) {
    items.push({
      key: 'verify_email',
      severity: 'high',
      message: 'Verify your email address.',
      action: 'verify_email',
    });
  }

  // RULE 2: No Assets
  if (assetCount === 0) {
    items.push({
      key: 'add_assets',
      severity: 'high',
      message: 'Add your first asset.',
      action: 'assets',
    });
    // Do not also generate nominee/allocation/document warnings when there are no assets
    return items;
  }

  // RULE 3: No Nominees
  if (assetCount > 0 && nomineeCount === 0) {
    items.push({
      key: 'add_nominee',
      severity: 'high',
      message: 'Add at least one nominee.',
      action: 'nominees',
    });
  }

  // RULE 4: Assets Without Nominee Allocation (0% allocated)
  if (assetCount > 0 && assetsWithoutAllocation > 0) {
    items.push({
      key: 'assign_nominees',
      severity: 'high',
      message: `Assign nominees to ${assetsWithoutAllocation} asset${assetsWithoutAllocation > 1 ? 's' : ''}.`,
      action: 'allocations',
    });
  }

  // RULE 5: Partially Allocated Assets (0 < allocation < 100%)
  if (assetCount > 0 && partiallyAllocatedCount > 0) {
    items.push({
      key: 'complete_allocations',
      severity: 'medium',
      message: `Complete nominee allocations for ${partiallyAllocatedCount} asset${partiallyAllocatedCount > 1 ? 's' : ''}.`,
      action: 'allocations',
    });
  }

  // RULE 6: Assets Without Documents
  if (assetCount > 0 && assetsWithoutDocuments > 0) {
    items.push({
      key: 'add_documents',
      severity: 'medium',
      message: `Add supporting documents to ${assetsWithoutDocuments} asset${assetsWithoutDocuments > 1 ? 's' : ''}.`,
      action: 'documents',
    });
  }

  return items;
}

/**
 * Aggregates all live owner dashboard metrics directly from PostgreSQL.
 */
async function getOwnerDashboardData({ userId, emailVerified }) {
  // 1. ASSETS AGGREGATION
  // Total assets and currency sums
  const currencyRes = await pool.query(
    `
      SELECT
        currency,
        COUNT(*)::int AS count,
        COALESCE(SUM(estimated_value), 0)::float AS total_value
      FROM assets
      WHERE user_id = $1
      GROUP BY currency
      ORDER BY currency ASC
    `,
    [userId]
  );

  let totalAssets = 0;
  const totalValueByCurrency = currencyRes.rows.map((row) => {
    totalAssets += row.count;
    return {
      currency: row.currency,
      amount: Math.round(row.total_value * 100) / 100,
    };
  });

  let totalValue;
  if (totalAssets === 0) {
    totalValue = 0;
  } else if (totalValueByCurrency.length === 1) {
    totalValue = totalValueByCurrency[0].amount;
  } else {
    // Multiple distinct currencies: never mathematically combine different currencies
    totalValue = null;
  }

  // Asset category breakdown
  const categoryRes = await pool.query(
    `
      SELECT
        category,
        COUNT(*)::int AS count,
        COALESCE(SUM(estimated_value), 0)::float AS value
      FROM assets
      WHERE user_id = $1
      GROUP BY category
      ORDER BY count DESC, category ASC
    `,
    [userId]
  );

  const byCategory = categoryRes.rows.map((r) => ({
    category: r.category,
    count: r.count,
    value: Math.round(r.value * 100) / 100,
  }));

  // 2. NOMINEES AGGREGATION
  const nomineeTotalRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM nominees WHERE user_id = $1`,
    [userId]
  );
  const totalNominees = nomineeTotalRes.rows[0].total;

  const nomineeAssignedRes = await pool.query(
    `
      SELECT COUNT(DISTINCT an.nominee_id)::int AS assigned
      FROM asset_nominees an
      JOIN nominees n ON n.id = an.nominee_id
      JOIN assets a ON a.id = an.asset_id
      WHERE n.user_id = $1 AND a.user_id = $1
    `,
    [userId]
  );
  const assignedNominees = nomineeAssignedRes.rows[0].assigned;
  const unassignedNominees = Math.max(0, totalNominees - assignedNominees);

  // 3. PER-ASSET ALLOCATION COVERAGE
  const assetAllocationRes = await pool.query(
    `
      SELECT
        a.id,
        COALESCE(SUM(CASE WHEN n.id IS NOT NULL THEN an.allocation_percentage ELSE 0 END), 0)::float AS allocated_percentage
      FROM assets a
      LEFT JOIN asset_nominees an ON an.asset_id = a.id
      LEFT JOIN nominees n ON n.id = an.nominee_id AND n.user_id = a.user_id
      WHERE a.user_id = $1
      GROUP BY a.id
    `,
    [userId]
  );

  let assetsWithoutAllocation = 0;
  let partiallyAllocatedCount = 0;
  let totalAssetCoverageSum = 0;

  for (const row of assetAllocationRes.rows) {
    const allocated = row.allocated_percentage;
    const roundedAllocated = Math.round(allocated * 100) / 100;

    if (roundedAllocated === 0) {
      assetsWithoutAllocation += 1;
    } else if (roundedAllocated > 0 && roundedAllocated < 100) {
      partiallyAllocatedCount += 1;
    }

    const cappedCoverage = Math.min(roundedAllocated, 100);
    totalAssetCoverageSum += cappedCoverage;
  }

  const rawAllocationCoverage = totalAssets === 0 ? 0 : totalAssetCoverageSum / totalAssets;
  const allocationCoveragePercentage = Math.round(rawAllocationCoverage * 100) / 100;

  // 4. DOCUMENTS AGGREGATION
  const docTotalRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM documents WHERE user_id = $1`,
    [userId]
  );
  const totalDocuments = docTotalRes.rows[0].total;

  const docAssetRes = await pool.query(
    `
      SELECT COUNT(DISTINCT d.asset_id)::int AS assets_with_docs
      FROM documents d
      JOIN assets a ON a.id = d.asset_id
      WHERE d.user_id = $1 AND a.user_id = $1 AND d.asset_id IS NOT NULL
    `,
    [userId]
  );
  const assetsWithDocuments = docAssetRes.rows[0].assets_with_docs;
  const assetsWithoutDocuments = totalAssets === 0 ? 0 : Math.max(0, totalAssets - assetsWithDocuments);

  const rawDocCoverage = totalAssets === 0 ? 0 : (assetsWithDocuments / totalAssets) * 100;
  const documentCoveragePercentage = Math.round(rawDocCoverage * 100) / 100;

  // 5. READINESS SCORE & LABEL
  const readiness = calculateReadinessScore({
    emailVerified,
    assetCount: totalAssets,
    nomineeCount: totalNominees,
    allocationCoveragePercentage,
    documentCoveragePercentage,
  });

  const readinessLabel = calculateReadinessLabel(readiness.score);

  // 6. NEEDS ATTENTION ITEMS
  const needsAttention = buildNeedsAttention({
    emailVerified,
    assetCount: totalAssets,
    nomineeCount: totalNominees,
    assetsWithoutAllocation,
    partiallyAllocatedCount,
    assetsWithoutDocuments,
  });

  // 7. RECENT ACTIVITY (Tenant-isolated, newest first)
  const recentActivity = await listActivities(userId, 10);

  return {
    assets: {
      total: totalAssets,
      totalValue,
      totalValueByCurrency,
      byCategory,
    },
    nominees: {
      total: totalNominees,
      assigned: assignedNominees,
      unassigned: unassignedNominees,
      assetsWithoutAllocation,
    },
    documents: {
      total: totalDocuments,
      assetsWithDocuments,
      assetsWithoutDocuments,
      coveragePercentage: documentCoveragePercentage,
    },
    allocation: {
      coveragePercentage: allocationCoveragePercentage,
    },
    readiness: {
      score: readiness.score,
      label: readinessLabel,
      components: readiness.components,
    },
    needsAttention,
    recentActivity,
  };
}

module.exports = {
  calculateReadinessScore,
  calculateReadinessLabel,
  buildNeedsAttention,
  getOwnerDashboardData,
};
