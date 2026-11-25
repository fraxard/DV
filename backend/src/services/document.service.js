const crypto = require('crypto');
const path = require('path');
const pool = require('../db');
const storage = require('../storage');
const { Errors } = require('../utils/errors');
const { logActivity } = require('./activity.service');

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

  // 1. Save binary to storage provider with original filename metadata
  await storage.save(storageKey, file.buffer, file.mimetype, {
    originalName: file.originalname.trim(),
  });

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

    const created = result.rows[0];
    logActivity({
      userId,
      action: 'document_uploaded',
      title: `${created.name} uploaded`,
      category: 'documents',
      metadata: { documentId: created.id, name: created.name, fileName: file.originalname.trim() },
    }).catch(() => {});

    return created;
  } catch (err) {
    // Compensating transaction: clean up stored file if DB insertion fails
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
  return result.rows.map(formatDocument);
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
        d.storage_key,
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

/**
 * Generate a short-lived presigned download URL for a document.
 * Verifies document ownership before issuing URL.
 */
const getDocumentDownloadUrl = async (userId, documentId, options = {}) => {
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
  const expiresIn = options.expiresIn || 900; // 15 minutes

  const presignedUrl = await storage.getSignedDownloadUrl(document.storage_key, {
    fileName: document.file_name,
    mimeType: document.mime_type,
    expiresIn,
  });

  return {
    document: formatDocument(document),
    downloadUrl: presignedUrl || `/api/documents/${documentId}/download`,
    expiresIn,
  };
};

const updateDocument = async (userId, documentId, data, newFile = null) => {
  // Check existence & ownership first
  const existing = await getDocument(userId, documentId);

  const name = data.name !== undefined ? data.name.trim() : existing.name;
  if (!name) {
    throw Errors.badRequest('Document name is required.');
  }

  const description = data.description !== undefined
    ? (data.description ? data.description.trim() : null)
    : existing.description;

  let assetId = existing.asset_id;
  if (data.assetId !== undefined) {
    if (data.assetId === null || data.assetId === '') {
      assetId = null;
    } else {
      // Verify asset belongs to user
      const assetCheck = await pool.query(
        `SELECT id FROM assets WHERE id = $1 AND user_id = $2`,
        [data.assetId, userId]
      );
      if (assetCheck.rows.length === 0) {
        throw Errors.badRequest('Asset does not exist or access is denied.');
      }
      assetId = assetCheck.rows[0].id;
    }
  }

  let newStorageKey = null;
  let fileName = existing.file_name;
  let mimeType = existing.mime_type;
  let fileSize = existing.file_size;
  let storageKey = existing.storage_key;

  // Handle optional replacement file upload
  if (newFile && newFile.buffer) {
    const ext = path.extname(newFile.originalname || '').toLowerCase();
    const newDocId = crypto.randomUUID();
    newStorageKey = `users/${userId}/${newDocId}${ext}`;

    await storage.save(newStorageKey, newFile.buffer, newFile.mimetype, {
      originalName: newFile.originalname.trim(),
    });

    fileName = newFile.originalname.trim();
    mimeType = newFile.mimetype.toLowerCase();
    fileSize = newFile.size;
    storageKey = newStorageKey;
  }

  try {
    const result = await pool.query(
      `
        UPDATE documents
        SET
          name = $1,
          description = $2,
          asset_id = $3,
          file_name = $4,
          mime_type = $5,
          file_size = $6,
          storage_key = $7,
          updated_at = current_timestamp
        WHERE id = $8
          AND user_id = $9
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
      [name, description, assetId, fileName, mimeType, fileSize, storageKey, documentId, userId]
    );

    const updated = result.rows[0];

    // If replacement succeeded, safely clean up old file from storage
    if (newStorageKey && existing.storage_key) {
      await storage.delete(existing.storage_key).catch((err) => {
        console.warn(`Failed to delete replaced document file '${existing.storage_key}':`, err.message);
      });
    }

    logActivity({
      userId,
      action: 'document_updated',
      title: `${updated.name} updated`,
      category: 'documents',
      metadata: { documentId: updated.id, name: updated.name },
    }).catch(() => {});

    return updated;
  } catch (err) {
    // If replacement DB update failed, clean up the newly saved file
    if (newStorageKey) {
      await storage.delete(newStorageKey).catch(() => {});
    }
    throw err;
  }
};

const deleteDocument = async (userId, documentId) => {
  const existing = await getDocument(userId, documentId);

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

  logActivity({
    userId,
    action: 'document_deleted',
    title: `${existing.name} removed`,
    category: 'documents',
    metadata: { documentId, name: existing.name },
  }).catch(() => {});

  return { id: deleted.id };
};

module.exports = {
  createDocument,
  listDocuments,
  getDocument,
  getDocumentForDownload,
  getDocumentDownloadUrl,
  updateDocument,
  deleteDocument,
};
