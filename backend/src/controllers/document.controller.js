const documentService = require('../services/document.service');
const { Errors } = require('../utils/errors');

const uploadDocument = async (req, res) => {
  if (!req.file) {
    throw Errors.badRequest('File is required.');
  }

  const { name, description, assetId, asset_id } = req.body;
  const resolvedAssetId = assetId !== undefined ? assetId : asset_id;

  if (name !== undefined && typeof name === 'string' && name.trim().length > 255) {
    throw Errors.badRequest('Document name cannot exceed 255 characters.');
  }

  const document = await documentService.createDocument({
    userId: req.user.id,
    name,
    description,
    assetId: resolvedAssetId || null,
    file: req.file,
  });

  return res.status(201).json({ document });
};

const listDocuments = async (req, res) => {
  const { assetId, asset_id } = req.query;
  const resolvedAssetId = assetId !== undefined ? assetId : asset_id;

  const documents = await documentService.listDocuments(req.user.id, {
    assetId: resolvedAssetId || null,
  });

  return res.status(200).json({ documents });
};

const getDocument = async (req, res) => {
  const { id } = req.params;
  const document = await documentService.getDocument(req.user.id, id);
  return res.status(200).json({ document });
};

const downloadDocument = async (req, res) => {
  const { id } = req.params;
  const { document, stream } = await documentService.getDocumentForDownload(req.user.id, id);

  // Set appropriate headers for streaming file download
  res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(document.file_name)}"`
  );
  if (document.file_size) {
    res.setHeader('Content-Length', document.file_size);
  }

  stream.on('error', (err) => {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to stream document.' });
    }
  });

  stream.pipe(res);
};

const updateDocument = async (req, res) => {
  const { id } = req.params;
  const { name, description, assetId, asset_id } = req.body;
  const resolvedAssetId = assetId !== undefined ? assetId : asset_id;

  if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
    throw Errors.badRequest('Document name cannot be empty.');
  }

  if (name && name.trim().length > 255) {
    throw Errors.badRequest('Document name cannot exceed 255 characters.');
  }

  const document = await documentService.updateDocument(req.user.id, id, {
    name,
    description,
    assetId: resolvedAssetId,
  });

  return res.status(200).json({ document });
};

const deleteDocument = async (req, res) => {
  const { id } = req.params;
  await documentService.deleteDocument(req.user.id, id);
  return res.status(200).json({ message: 'Document deleted successfully.' });
};

module.exports = {
  uploadDocument,
  listDocuments,
  getDocument,
  downloadDocument,
  updateDocument,
  deleteDocument,
};
