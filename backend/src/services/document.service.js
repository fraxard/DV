const crypto = require('crypto');
const path = require('path');
const pool = require('../db');
const storage = require('../storage');
const { Errors } = require('../utils/errors');

/**
 * Strips internal storage key before sending document to client.
 */
const formatDocument = (row) => {
  if (!row) return row;
  const { storage_key, ...safeDoc } = row;
  return safeDoc;
};

const createDocument = async ({
  userId,
  name,
  description = null,
  assetId = null,
  file,
}) => {
  if (!file || !file.buffer) {
    throw Errors.badRequest('File is required.');
  }

  const trimmedName = name ? name.trim() : path.parse(file.originalname).name;
  if (!trimmedName) {
    throw Errors.badRequest('Document name is required.');
  }

  // If asset_id is provided, verify the asset belongs to this user
  let validAssetId = null;
  if (assetId) {
    const assetCheck = await pool.query(
      `
        SELECT id
        FROM assets
        WHERE id = $1
          AND user_id = $2
      `,
      [assetId, userId]
    );

    if (assetCheck.rows.length === 0) {
      throw Errors.badRequest('Asset does not exist or access is denied.');
    }
    validAssetId = assetCheck.rows[0].id;
  }

  // Generate secure storage key: users/<user_id>/<doc_uuid>.<ext>
  const docId = crypto.randomUUID();
  const ext = path.extname(file.originalname).toLowerCase();
  const storageKey = `users/${userId}/${docId}${ext}`;

  // 1. Save binary to storage provider
  await storage.save(storageKey, file.buffer, file.mimetype);

  // 2. Insert metadata into PostgreSQL
  try {
    const result = await pool.query(
      `
        INSERT INTO documents (
          id,
          user_id,
          asset_id,
          name,
          description,
          file_name,
          mime_type,
          file_size,
          storage_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING
          id,
          user_id,
          asset_id,
          name,
          description,
          file_name,
          mime_type,
          file_size,
          created_at,
          updated_at
      `,
      [
        docId,
        userId,
        validAssetId,
        trimmedName,
        description ? description.trim() : null,
        file.originalname.trim(),
        file.mimetype.toLowerCase(),
        file.size,
        storageKey,
      ]
    );

    return result.rows[0];
  } catch (err) {
    // Clean up stored file if DB insertion fails
    await storage.delete(storageKey).catch(() => {});
    throw err;
  }
};

const listDocuments = async (userId, { assetId = null } = {}) => {
  let query = `
    SELECT
      d.id,
      d.user_id,
      d.asset_id,
      a.name AS asset_name,
      d.name,
      d.description,
      d.file_name,
      d.mime_type,
      d.file_size,
      d.created_at,
      d.updated_at
    FROM documents d
    LEFT JOIN assets a ON a.id = d.asset_id
    WHERE d.user_id = $1
  `;
  const params = [userId];

  if (assetId) {
    query += ` AND d.asset_id = $2`;
    params.push(assetId);
  }

  query += ` ORDER BY d.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

const getDocument = async (userId, documentId) => {
  const result = await pool.query(
    `
      SELECT
        d.id,
        d.user_id,
        d.asset_id,
        a.name AS asset_name,
        d.name,
        d.description,
        d.file_name,
        d.mime_type,
        d.file_size,
        d.created_at,
        d.updated_at
      FROM documents d
      LEFT JOIN assets a ON a.id = d.asset_id
      WHERE d.id = $1
        AND d.user_id = $2
    `,
    [documentId, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('Document not found.');
  }

  return result.rows[0];
};

const getDocumentForDownload = async (userId, documentId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        user_id,
        name,
        file_name,
        mime_type,
        file_size,
        storage_key
      FROM documents
      WHERE id = $1
        AND user_id = $2
    `,
    [documentId, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('Document not found.');
  }

  const document = result.rows[0];
  const stream = await storage.getStream(document.storage_key);

  return {
    document,
    stream,
  };
};

const updateDocument = async (userId, documentId, data) => {
  // Ensure document exists and belongs to user
  const existing = await getDocument(userId, documentId);

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  if (!name) {
    throw Errors.badRequest('Document name is required.');
  }

  const description = data.description !== undefined
    ? (data.description ? data.description.trim() : null)
    : existing.description;

  let assetId = existing.asset_id;
  if (data.assetId !== undefined || data.asset_id !== undefined) {
    const rawAssetId = data.assetId !== undefined ? data.assetId : data.asset_id;
    if (rawAssetId === null || rawAssetId === '') {
      assetId = null;
    } else {
      const assetCheck = await pool.query(
        `SELECT id FROM assets WHERE id = $1 AND user_id = $2`,
        [rawAssetId, userId]
      );
      if (assetCheck.rows.length === 0) {
        throw Errors.badRequest('Asset does not exist or access is denied.');
      }
      assetId = assetCheck.rows[0].id;
    }
  }

  const result = await pool.query(
    `
      UPDATE documents
      SET
        name = $1,
        description = $2,
        asset_id = $3,
        updated_at = current_timestamp
      WHERE id = $4
        AND user_id = $5
      RETURNING
        id,
        user_id,
        asset_id,
        name,
        description,
        file_name,
        mime_type,
        file_size,
        created_at,
        updated_at
    `,
    [name, description, assetId, documentId, userId]
  );

  return result.rows[0];
};

const deleteDocument = async (userId, documentId) => {
  const result = await pool.query(
    `
      DELETE FROM documents
      WHERE id = $1
        AND user_id = $2
      RETURNING id, storage_key
    `,
    [documentId, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('Document not found.');
  }

  const deleted = result.rows[0];

  // Purge binary from physical storage
  await storage.delete(deleted.storage_key).catch((err) => {
    console.error(`Failed to delete storage file for document ${documentId}:`, err.message);
  });

  return { id: deleted.id };
};

module.exports = {
  createDocument,
  listDocuments,
  getDocument,
  getDocumentForDownload,
  updateDocument,
  deleteDocument,
};
