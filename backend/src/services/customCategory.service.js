const pool = require('../db');
const { Errors } = require('../utils/errors');

const SYSTEM_CATEGORIES = new Set([
  'financial',
  'property',
  'insurance',
  'crypto',
  'investments',
  'digital',
  'business',
  'legal',
  'other',
]);

const SUPPORTED_FIELD_TYPES = new Set([
  'text',
  'textarea',
  'number',
  'date',
  'url',
  'boolean',
]);

/**
 * Normalizes category or field names into clean snake_case identifiers.
 * Trims, lowercases, replaces spaces and hyphens with underscores,
 * removes non-alphanumeric chars, and collapses repeated underscores.
 */
function normalizeKey(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Checks for forbidden secret identifiers in keys and labels.
 */
const FORBIDDEN_WORDS = [
  'private_key',
  'privatekey',
  'seed_phrase',
  'seedphrase',
  'mnemonic',
  'password',
  'passphrase',
  'secret_key',
  'secretkey',
  'recovery_phrase',
  'recoveryphrase',
];

function checkForbiddenIdentifier(str, context = 'field') {
  if (!str || typeof str !== 'string') return;
  const normalized = str.toLowerCase().replace(/[-_\s]/g, '');
  for (const forbidden of FORBIDDEN_WORDS) {
    const cleanForbidden = forbidden.replace(/[-_\s]/g, '');
    if (normalized.includes(cleanForbidden)) {
      throw Errors.badRequest(
        `Disallowed ${context} identifier '${str}'. Secret credentials, private keys, passwords, and seed phrases cannot be stored in custom categories.`
      );
    }
  }
}

/**
 * Formats a category row and its field definitions into standard camelCase shape.
 */
function formatCategory(row, fields = []) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    key: row.key,
    description: row.description || null,
    fields: fields.map((f) => ({
      id: f.id,
      categoryId: f.category_id,
      key: f.key,
      label: f.label,
      type: f.type,
      isRequired: Boolean(f.is_required),
      orderIndex: f.order_index,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Lists all custom categories belonging to the authenticated user.
 */
async function listCustomCategories(userId) {
  const catRes = await pool.query(
    `
      SELECT id, user_id, name, key, description, created_at, updated_at
      FROM custom_asset_categories
      WHERE user_id = $1
      ORDER BY name ASC
    `,
    [userId]
  );

  if (catRes.rows.length === 0) {
    return [];
  }

  const catIds = catRes.rows.map((r) => r.id);
  const fieldsRes = await pool.query(
    `
      SELECT id, category_id, key, label, type, is_required, order_index, created_at, updated_at
      FROM custom_asset_fields
      WHERE category_id = ANY($1)
      ORDER BY order_index ASC, created_at ASC
    `,
    [catIds]
  );

  const fieldsByCat = {};
  for (const f of fieldsRes.rows) {
    if (!fieldsByCat[f.category_id]) fieldsByCat[f.category_id] = [];
    fieldsByCat[f.category_id].push(f);
  }

  return catRes.rows.map((row) => formatCategory(row, fieldsByCat[row.id] || []));
}

/**
 * Gets a single custom category by ID or Key for the user.
 */
async function getCustomCategory(userId, idOrKey) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrKey);
  const query = isUuid
    ? 'SELECT * FROM custom_asset_categories WHERE id = $1 AND user_id = $2'
    : 'SELECT * FROM custom_asset_categories WHERE key = $1 AND user_id = $2';

  const catRes = await pool.query(query, [idOrKey, userId]);
  if (catRes.rows.length === 0) {
    throw Errors.notFound('Custom category not found.');
  }

  const category = catRes.rows[0];
  const fieldsRes = await pool.query(
    `
      SELECT id, category_id, key, label, type, is_required, order_index, created_at, updated_at
      FROM custom_asset_fields
      WHERE category_id = $1
      ORDER BY order_index ASC, created_at ASC
    `,
    [category.id]
  );

  return formatCategory(category, fieldsRes.rows);
}

/**
 * Creates a new custom category with fields in a transaction.
 */
async function createCustomCategory(userId, { name, description, fields = [] }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw Errors.badRequest('Category name is required.');
  }
  if (name.trim().length > 100) {
    throw Errors.badRequest('Category name cannot exceed 100 characters.');
  }

  const normalizedCategoryKey = normalizeKey(name);
  if (!normalizedCategoryKey) {
    throw Errors.badRequest('Invalid category name: cannot be transformed to a valid key.');
  }

  if (SYSTEM_CATEGORIES.has(normalizedCategoryKey)) {
    throw Errors.badRequest(`'${name.trim()}' collides with a built-in system category.`);
  }

  checkForbiddenIdentifier(name, 'category name');

  if (Array.isArray(fields) && fields.length > 50) {
    throw Errors.badRequest('A custom category cannot exceed 50 fields.');
  }

  // Validate fields and uniqueness of keys
  const processedFields = [];
  const seenFieldKeys = new Set();

  for (let i = 0; i < (fields || []).length; i++) {
    const f = fields[i];
    if (!f.label || typeof f.label !== 'string' || !f.label.trim()) {
      throw Errors.badRequest(`Field ${i + 1} must have a non-empty label.`);
    }
    if (f.label.trim().length > 150) {
      throw Errors.badRequest(`Field label '${f.label}' exceeds 150 characters.`);
    }

    const fieldKey = normalizeKey(f.key || f.label);
    if (!fieldKey) {
      throw Errors.badRequest(`Field '${f.label}' generated an invalid field key.`);
    }

    if (seenFieldKeys.has(fieldKey)) {
      throw Errors.badRequest(`Duplicate field key '${fieldKey}' in category.`);
    }
    seenFieldKeys.add(fieldKey);

    const type = (f.type || 'text').trim().toLowerCase();
    if (!SUPPORTED_FIELD_TYPES.has(type)) {
      throw Errors.badRequest(`Unsupported field type '${f.type}'. Supported types: ${Array.from(SUPPORTED_FIELD_TYPES).join(', ')}`);
    }

    checkForbiddenIdentifier(f.label, 'field label');
    checkForbiddenIdentifier(fieldKey, 'field key');

    processedFields.push({
      key: fieldKey,
      label: f.label.trim(),
      type,
      isRequired: Boolean(f.isRequired || f.is_required),
      orderIndex: typeof f.orderIndex === 'number' ? f.orderIndex : i,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify key uniqueness for user
    const existingRes = await client.query(
      'SELECT id FROM custom_asset_categories WHERE user_id = $1 AND key = $2',
      [userId, normalizedCategoryKey]
    );
    if (existingRes.rows.length > 0) {
      throw Errors.badRequest(`A category with key '${normalizedCategoryKey}' already exists.`);
    }

    const insertCatRes = await client.query(
      `
        INSERT INTO custom_asset_categories (user_id, name, key, description)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, name, key, description, created_at, updated_at
      `,
      [userId, name.trim(), normalizedCategoryKey, description ? description.trim() : null]
    );

    const category = insertCatRes.rows[0];
    const createdFields = [];

    for (const pf of processedFields) {
      const fieldRes = await client.query(
        `
          INSERT INTO custom_asset_fields (category_id, key, label, type, is_required, order_index)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id, category_id, key, label, type, is_required, order_index, created_at, updated_at
        `,
        [category.id, pf.key, pf.label, pf.type, pf.isRequired, pf.orderIndex]
      );
      createdFields.push(fieldRes.rows[0]);
    }

    await client.query('COMMIT');
    return formatCategory(category, createdFields);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Updates an existing custom category and its fields.
 * Preserves existing field keys to prevent metadata corruption.
 * If a field is removed, verifies whether any assets currently have metadata for it.
 */
async function updateCustomCategory(userId, categoryId, { name, description, fields }) {
  const existing = await getCustomCategory(userId, categoryId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let updatedName = existing.name;
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || !name.trim()) {
        throw Errors.badRequest('Category name cannot be blank.');
      }
      if (name.trim().length > 100) {
        throw Errors.badRequest('Category name cannot exceed 100 characters.');
      }
      checkForbiddenIdentifier(name, 'category name');
      updatedName = name.trim();
    }

    const updatedDesc = description !== undefined ? (description ? description.trim() : null) : existing.description;

    const catUpdateRes = await client.query(
      `
        UPDATE custom_asset_categories
        SET name = $1, description = $2, updated_at = current_timestamp
        WHERE id = $3 AND user_id = $4
        RETURNING id, user_id, name, key, description, created_at, updated_at
      `,
      [updatedName, updatedDesc, existing.id, userId]
    );

    let finalFields = existing.fields;

    if (fields !== undefined) {
      if (!Array.isArray(fields)) {
        throw Errors.badRequest('Fields must be an array.');
      }
      if (fields.length > 50) {
        throw Errors.badRequest('A custom category cannot exceed 50 fields.');
      }

      // Check for removed fields and verify if existing assets store data for them
      const existingFieldMap = new Map(existing.fields.map((f) => [f.key, f]));
      const newFieldKeys = new Set();

      const processedNewFields = [];
      for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        if (!f.label || typeof f.label !== 'string' || !f.label.trim()) {
          throw Errors.badRequest(`Field ${i + 1} must have a non-empty label.`);
        }
        if (f.label.trim().length > 150) {
          throw Errors.badRequest(`Field label '${f.label}' exceeds 150 characters.`);
        }

        // If matching existing field ID or existing key, preserve key
        let key = f.key ? normalizeKey(f.key) : '';
        if (!key && f.id) {
          const match = existing.fields.find((ef) => ef.id === f.id);
          if (match) key = match.key;
        }
        if (!key) {
          key = normalizeKey(f.label);
        }

        if (newFieldKeys.has(key)) {
          throw Errors.badRequest(`Duplicate field key '${key}' in category.`);
        }
        newFieldKeys.add(key);

        const type = (f.type || 'text').trim().toLowerCase();
        if (!SUPPORTED_FIELD_TYPES.has(type)) {
          throw Errors.badRequest(`Unsupported field type '${f.type}'.`);
        }

        checkForbiddenIdentifier(f.label, 'field label');
        checkForbiddenIdentifier(key, 'field key');

        processedNewFields.push({
          id: f.id || null,
          key,
          label: f.label.trim(),
          type,
          isRequired: Boolean(f.isRequired || f.is_required),
          orderIndex: typeof f.orderIndex === 'number' ? f.orderIndex : i,
        });
      }

      // Check if any deleted fields have existing asset data
      const removedKeys = [];
      for (const [oldKey] of existingFieldMap.entries()) {
        if (!newFieldKeys.has(oldKey)) {
          removedKeys.push(oldKey);
        }
      }

      if (removedKeys.length > 0) {
        // Query assets in this category
        const assetDataRes = await client.query(
          `
            SELECT metadata FROM assets
            WHERE user_id = $1 AND category = $2
          `,
          [userId, existing.key]
        );

        for (const assetRow of assetDataRes.rows) {
          const meta = assetRow.metadata || {};
          const customFields = meta.customFields || meta;
          for (const rk of removedKeys) {
            if (customFields[rk] !== undefined && customFields[rk] !== null && String(customFields[rk]).trim() !== '') {
              throw Errors.badRequest(
                `Cannot delete field '${existingFieldMap.get(rk)?.label || rk}' because existing assets contain values for it.`
              );
            }
          }
        }
      }

      // Reconcile fields: delete removed ones, update existing ones, insert new ones
      await client.query('DELETE FROM custom_asset_fields WHERE category_id = $1', [existing.id]);

      const inserted = [];
      for (const pf of processedNewFields) {
        const insRes = await client.query(
          `
            INSERT INTO custom_asset_fields (category_id, key, label, type, is_required, order_index)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, category_id, key, label, type, is_required, order_index, created_at, updated_at
          `,
          [existing.id, pf.key, pf.label, pf.type, pf.isRequired, pf.orderIndex]
        );
        inserted.push(insRes.rows[0]);
      }
      finalFields = inserted;
    }

    await client.query('COMMIT');
    return formatCategory(catUpdateRes.rows[0], finalFields);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Deletes a custom category if no assets are currently assigned to it.
 */
async function deleteCustomCategory(userId, categoryId) {
  const existing = await getCustomCategory(userId, categoryId);

  // Check if any assets use this category
  const countRes = await pool.query(
    'SELECT COUNT(*)::int AS count FROM assets WHERE user_id = $1 AND category = $2',
    [userId, existing.key]
  );

  const inUseCount = countRes.rows[0].count;
  if (inUseCount > 0) {
    throw Errors.badRequest(
      `This category cannot be deleted because ${inUseCount} asset${inUseCount > 1 ? 's are' : ' is'} using it. Reassign or remove those assets first.`
    );
  }

  await pool.query(
    'DELETE FROM custom_asset_categories WHERE id = $1 AND user_id = $2',
    [existing.id, userId]
  );

  return { id: existing.id, message: 'Category deleted successfully.' };
}

module.exports = {
  SYSTEM_CATEGORIES,
  SUPPORTED_FIELD_TYPES,
  normalizeKey,
  checkForbiddenIdentifier,
  listCustomCategories,
  getCustomCategory,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
};
