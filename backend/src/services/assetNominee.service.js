const pool = require('../db');
const { Errors } = require('../utils/errors');

const listAssetNominees = async (userId, assetId) => {
  // Verify asset ownership
  const assetCheck = await pool.query(
    `SELECT id, name, category FROM assets WHERE id = $1 AND user_id = $2`,
    [assetId, userId]
  );
  if (assetCheck.rows.length === 0) {
    throw Errors.notFound('Asset not found or access denied.');
  }

  const result = await pool.query(
    `
      SELECT
        an.id AS assignment_id,
        an.asset_id,
        an.nominee_id,
        n.full_name AS nominee_name,
        n.email AS nominee_email,
        n.relationship AS nominee_relationship,
        an.allocation_percentage::float AS allocation_percentage,
        an.can_view,
        an.can_download_docs,
        an.created_at,
        an.updated_at
      FROM asset_nominees an
      JOIN nominees n ON n.id = an.nominee_id
      WHERE an.asset_id = $1
      ORDER BY an.created_at ASC
    `,
    [assetId]
  );

  const totalAllocated = result.rows.reduce((sum, item) => sum + item.allocation_percentage, 0);
  const remaining = Math.max(0, Math.round((100 - totalAllocated) * 100) / 100);

  return {
    asset: assetCheck.rows[0],
    nominees: result.rows,
    total_allocated_percentage: Math.round(totalAllocated * 100) / 100,
    remaining_percentage: remaining,
  };
};

const assignNomineeToAsset = async (userId, assetId, data) => {
  const {
    nomineeId,
    nominee_id,
    allocationPercentage,
    allocation_percentage,
    canView,
    can_view,
    canDownloadDocs,
    can_download_docs,
  } = data;

  const resolvedNomineeId = nomineeId !== undefined ? nomineeId : nominee_id;
  const resolvedAllocation = allocationPercentage !== undefined ? allocationPercentage : allocation_percentage;
  const resolvedCanView = canView !== undefined ? canView : (can_view !== undefined ? can_view : true);
  const resolvedCanDownload = canDownloadDocs !== undefined ? canDownloadDocs : (can_download_docs !== undefined ? can_download_docs : true);

  if (!resolvedNomineeId) {
    throw Errors.badRequest('Nominee ID is required.');
  }

  if (resolvedAllocation === undefined || resolvedAllocation === null || resolvedAllocation === '') {
    throw Errors.badRequest('Allocation percentage is required.');
  }

  const numAllocation = Number(resolvedAllocation);
  if (isNaN(numAllocation) || numAllocation <= 0 || numAllocation > 100) {
    throw Errors.badRequest('Allocation percentage must be greater than 0 and at most 100.');
  }

  // BEGIN PostgreSQL Transaction with row-level lock on assets table
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify and lock the relevant asset row using FOR UPDATE
    const assetCheck = await client.query(
      `
        SELECT id, name
        FROM assets
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [assetId, userId]
    );

    if (assetCheck.rows.length === 0) {
      throw Errors.notFound('Asset not found or access denied.');
    }

    // 2. Verify nominee ownership
    const nomineeCheck = await client.query(
      `
        SELECT id, full_name, email, relationship
        FROM nominees
        WHERE id = $1 AND user_id = $2
      `,
      [resolvedNomineeId, userId]
    );

    if (nomineeCheck.rows.length === 0) {
      throw Errors.notFound('Nominee not found or access denied.');
    }

    // 3. Calculate existing allocations on this asset excluding the nominee being updated
    const sumCheck = await client.query(
      `
        SELECT COALESCE(SUM(allocation_percentage), 0)::float AS total_other
        FROM asset_nominees
        WHERE asset_id = $1 AND nominee_id != $2
      `,
      [assetId, resolvedNomineeId]
    );

    const totalOther = sumCheck.rows[0].total_other;
    const newTotal = Math.round((totalOther + numAllocation) * 100) / 100;

    if (newTotal > 100.00) {
      throw Errors.badRequest(
        `Total allocation percentage for this asset cannot exceed 100%. Currently allocated to other nominees: ${totalOther}%, requested: ${numAllocation}%.`
      );
    }

    // 4. Upsert assignment into asset_nominees
    const upsertRes = await client.query(
      `
        INSERT INTO asset_nominees (
          asset_id,
          nominee_id,
          allocation_percentage,
          can_view,
          can_download_docs
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (asset_id, nominee_id) DO UPDATE
        SET
          allocation_percentage = EXCLUDED.allocation_percentage,
          can_view = EXCLUDED.can_view,
          can_download_docs = EXCLUDED.can_download_docs,
          updated_at = current_timestamp
        RETURNING
          id,
          asset_id,
          nominee_id,
          allocation_percentage::float AS allocation_percentage,
          can_view,
          can_download_docs,
          created_at,
          updated_at
      `,
      [
        assetId,
        resolvedNomineeId,
        numAllocation,
        Boolean(resolvedCanView),
        Boolean(resolvedCanDownload),
      ]
    );

    await client.query('COMMIT');

    const assignment = upsertRes.rows[0];
    assignment.nominee = nomineeCheck.rows[0];
    return assignment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const updateAssetNomineeAllocation = async (userId, assetId, nomineeId, data) => {
  const {
    allocationPercentage,
    allocation_percentage,
    canView,
    can_view,
    canDownloadDocs,
    can_download_docs,
  } = data;

  const resolvedAllocation = allocationPercentage !== undefined ? allocationPercentage : allocation_percentage;
  const resolvedCanView = canView !== undefined ? canView : can_view;
  const resolvedCanDownload = canDownloadDocs !== undefined ? canDownloadDocs : can_download_docs;

  if (resolvedAllocation === undefined || resolvedAllocation === null || resolvedAllocation === '') {
    throw Errors.badRequest('Allocation percentage is required.');
  }

  const numAllocation = Number(resolvedAllocation);
  if (isNaN(numAllocation) || numAllocation <= 0 || numAllocation > 100) {
    throw Errors.badRequest('Allocation percentage must be greater than 0 and at most 100.');
  }

  // BEGIN PostgreSQL Transaction with row-level lock on assets table
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify and lock the relevant asset row using FOR UPDATE
    const assetCheck = await client.query(
      `
        SELECT id, name
        FROM assets
        WHERE id = $1 AND user_id = $2
        FOR UPDATE
      `,
      [assetId, userId]
    );

    if (assetCheck.rows.length === 0) {
      throw Errors.notFound('Asset not found or access denied.');
    }

    // 2. Verify nominee ownership
    const nomineeCheck = await client.query(
      `
        SELECT id, full_name, email, relationship
        FROM nominees
        WHERE id = $1 AND user_id = $2
      `,
      [nomineeId, userId]
    );

    if (nomineeCheck.rows.length === 0) {
      throw Errors.notFound('Nominee not found or access denied.');
    }

    // 3. Verify assignment exists
    const existingCheck = await client.query(
      `
        SELECT id, can_view, can_download_docs
        FROM asset_nominees
        WHERE asset_id = $1 AND nominee_id = $2
      `,
      [assetId, nomineeId]
    );

    if (existingCheck.rows.length === 0) {
      throw Errors.notFound('Assignment not found.');
    }

    // 4. Calculate total allocation on this asset excluding the nominee being updated
    const sumCheck = await client.query(
      `
        SELECT COALESCE(SUM(allocation_percentage), 0)::float AS total_other
        FROM asset_nominees
        WHERE asset_id = $1 AND nominee_id != $2
      `,
      [assetId, nomineeId]
    );

    const totalOther = sumCheck.rows[0].total_other;
    const newTotal = Math.round((totalOther + numAllocation) * 100) / 100;

    if (newTotal > 100.00) {
      throw Errors.badRequest(
        `Total allocation percentage for this asset cannot exceed 100%. Currently allocated to other nominees: ${totalOther}%, requested: ${numAllocation}%.`
      );
    }

    // 5. Update assignment
    const updatedCanView = resolvedCanView !== undefined ? Boolean(resolvedCanView) : existingCheck.rows[0].can_view;
    const updatedCanDownload = resolvedCanDownload !== undefined ? Boolean(resolvedCanDownload) : existingCheck.rows[0].can_download_docs;

    const updateRes = await client.query(
      `
        UPDATE asset_nominees
        SET
          allocation_percentage = $1,
          can_view = $2,
          can_download_docs = $3,
          updated_at = current_timestamp
        WHERE asset_id = $4 AND nominee_id = $5
        RETURNING
          id,
          asset_id,
          nominee_id,
          allocation_percentage::float AS allocation_percentage,
          can_view,
          can_download_docs,
          created_at,
          updated_at
      `,
      [numAllocation, updatedCanView, updatedCanDownload, assetId, nomineeId]
    );

    await client.query('COMMIT');

    const assignment = updateRes.rows[0];
    assignment.nominee = nomineeCheck.rows[0];
    return assignment;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const removeNomineeFromAsset = async (userId, assetId, nomineeId) => {
  // Verify asset ownership
  const assetCheck = await pool.query(
    `SELECT id FROM assets WHERE id = $1 AND user_id = $2`,
    [assetId, userId]
  );
  if (assetCheck.rows.length === 0) {
    throw Errors.notFound('Asset not found or access denied.');
  }

  const result = await pool.query(
    `
      DELETE FROM asset_nominees
      WHERE asset_id = $1 AND nominee_id = $2
      RETURNING id
    `,
    [assetId, nomineeId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('Assignment not found.');
  }

  return { id: result.rows[0].id, asset_id: assetId, nominee_id: nomineeId };
};

module.exports = {
  listAssetNominees,
  assignNomineeToAsset,
  updateAssetNomineeAllocation,
  removeNomineeFromAsset,
};
