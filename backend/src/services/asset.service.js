const pool = require('../db');
const { Errors } = require('../utils/errors');

const formatAsset = (row) => {
  if (!row) return row;
  let valDate = row.valuation_date;
  if (valDate instanceof Date) {
    // Fallback if parsed as Date: extract YYYY-MM-DD
    const year = valDate.getFullYear();
    const month = String(valDate.getMonth() + 1).padStart(2, '0');
    const day = String(valDate.getDate()).padStart(2, '0');
    valDate = `${year}-${month}-${day}`;
  } else if (typeof valDate === 'string' && valDate.includes('T')) {
    valDate = valDate.split('T')[0];
  }
  return {
    ...row,
    valuation_date: valDate || null,
  };
};

const listAssets = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        name,
        category,
        subcategory,
        description,
        estimated_value,
        currency,
        valuation_date::text AS valuation_date,
        metadata,
        created_at,
        updated_at
      FROM assets
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows.map(formatAsset);
};

const getAsset = async (userId, assetId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        name,
        category,
        subcategory,
        description,
        estimated_value,
        currency,
        valuation_date::text AS valuation_date,
        metadata,
        created_at,
        updated_at
      FROM assets
      WHERE id = $1
        AND user_id = $2
    `,
    [assetId, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('Asset not found.');
  }

  return formatAsset(result.rows[0]);
};

const createAsset = async (userId, data) => {
  const {
    name,
    category,
    subcategory = null,
    description = null,
    estimatedValue = null,
    currency = 'INR',
    valuationDate = null,
    metadata = {},
  } = data;

  const result = await pool.query(
    `
      INSERT INTO assets (
        user_id,
        name,
        category,
        subcategory,
        description,
        estimated_value,
        currency,
        valuation_date,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        user_id,
        name,
        category,
        subcategory,
        description,
        estimated_value,
        currency,
        valuation_date::text AS valuation_date,
        metadata,
        created_at,
        updated_at
    `,
    [
      userId,
      name.trim(),
      category.trim().toLowerCase(),
      subcategory ? subcategory.trim() : null,
      description ? description.trim() : null,
      estimatedValue !== null && estimatedValue !== undefined && estimatedValue !== '' ? estimatedValue : null,
      (currency || 'INR').trim().toUpperCase(),
      valuationDate || null,
      metadata && typeof metadata === 'object' ? metadata : {},
    ]
  );

  return formatAsset(result.rows[0]);
};

const updateAsset = async (userId, assetId, data) => {
  // Check existence & ownership first
  const existing = await getAsset(userId, assetId);

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  const category = data.category !== undefined ? data.category.trim().toLowerCase() : existing.category;
  const subcategory = data.subcategory !== undefined
    ? (data.subcategory ? data.subcategory.trim() : null)
    : existing.subcategory;
  const description = data.description !== undefined
    ? (data.description ? data.description.trim() : null)
    : existing.description;
  const estimatedValue = data.estimatedValue !== undefined
    ? (data.estimatedValue !== null && data.estimatedValue !== '' ? data.estimatedValue : null)
    : existing.estimated_value;
  const currency = data.currency !== undefined
    ? (data.currency || 'INR').trim().toUpperCase()
    : existing.currency;
  const valuationDate = data.valuationDate !== undefined
    ? (data.valuationDate || null)
    : existing.valuation_date;
  const metadata = data.metadata !== undefined
    ? (data.metadata && typeof data.metadata === 'object' ? data.metadata : {})
    : existing.metadata;

  const result = await pool.query(
    `
      UPDATE assets
      SET
        name = $1,
        category = $2,
        subcategory = $3,
        description = $4,
        estimated_value = $5,
        currency = $6,
        valuation_date = $7,
        metadata = $8,
        updated_at = current_timestamp
      WHERE id = $9
        AND user_id = $10
      RETURNING
        id,
        user_id,
        name,
        category,
        subcategory,
        description,
        estimated_value,
        currency,
        valuation_date::text AS valuation_date,
        metadata,
        created_at,
        updated_at
    `,
    [
      name,
      category,
      subcategory,
      description,
      estimatedValue,
      currency,
      valuationDate,
      metadata,
      assetId,
      userId,
    ]
  );

  return formatAsset(result.rows[0]);
};

const deleteAsset = async (userId, assetId) => {
  const result = await pool.query(
    `
      DELETE FROM assets
      WHERE id = $1
        AND user_id = $2
      RETURNING id
    `,
    [assetId, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('Asset not found.');
  }

  return { id: result.rows[0].id };
};

module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
};
