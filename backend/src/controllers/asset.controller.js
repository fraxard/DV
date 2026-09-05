const assetService = require('../services/asset.service');
const { Errors } = require('../utils/errors');

const FORBIDDEN_METADATA_KEYS = [
  'password',
  'passwd',
  'private_key',
  'privatekey',
  'secret',
  'secret_key',
  'secretkey',
  'seed',
  'seed_phrase',
  'seedphrase',
  'mnemonic',
  'api_key',
  'apikey',
];

const checkForbiddenKeys = (obj) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
  for (const key of Object.keys(obj)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
    for (const forbidden of FORBIDDEN_METADATA_KEYS) {
      if (normalizedKey.includes(forbidden.replace(/[-_]/g, ''))) {
        throw Errors.badRequest(
          "Metadata key '" + key + "' is disallowed. Plaintext credentials, private keys, and seed phrases cannot be stored in asset metadata."
        );
      }
    }
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      checkForbiddenKeys(obj[key]);
    }
  }
};

const validateAssetData = ({ name, category, estimatedValue, valuationDate, metadata }, isUpdate = false) => {
  if (!isUpdate || name !== undefined) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw Errors.badRequest('Asset name is required.');
    }
    if (name.trim().length > 255) {
      throw Errors.badRequest('Asset name cannot exceed 255 characters.');
    }
  }

  if (!isUpdate || category !== undefined) {
    if (!category || typeof category !== 'string' || !category.trim()) {
      throw Errors.badRequest('Asset category is required.');
    }
    if (category.trim().length > 50) {
      throw Errors.badRequest('Asset category cannot exceed 50 characters.');
    }
  }

  if (estimatedValue !== undefined && estimatedValue !== null && estimatedValue !== '') {
    const num = Number(estimatedValue);
    if (isNaN(num) || num < 0) {
      throw Errors.badRequest('Estimated value must be a non-negative number.');
    }
  }

  if (valuationDate) {
    const date = new Date(valuationDate);
    if (isNaN(date.getTime())) {
      throw Errors.badRequest('Valuation date must be a valid date.');
    }
  }

  if (metadata !== undefined && metadata !== null) {
    if (typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw Errors.badRequest('Metadata must be a valid JSON object.');
    }
    checkForbiddenKeys(metadata);
  }
};

const listAssets = async (req, res) => {
  const assets = await assetService.listAssets(req.user.id);
  return res.status(200).json({ assets });
};

const getAsset = async (req, res) => {
  const { id } = req.params;
  const asset = await assetService.getAsset(req.user.id, id);
  return res.status(200).json({ asset });
};

const createAsset = async (req, res) => {
  const {
    name,
    category,
    subcategory,
    description,
    estimatedValue,
    estimated_value,
    currency,
    valuationDate,
    valuation_date,
    metadata,
  } = req.body;

  const resolvedValue = estimatedValue !== undefined ? estimatedValue : estimated_value;
  const resolvedDate = valuationDate !== undefined ? valuationDate : valuation_date;

  validateAssetData({
    name,
    category,
    estimatedValue: resolvedValue,
    valuationDate: resolvedDate,
    metadata,
  }, false);

  const asset = await assetService.createAsset(req.user.id, {
    name,
    category,
    subcategory,
    description,
    estimatedValue: resolvedValue,
    currency,
    valuationDate: resolvedDate,
    metadata,
  });

  return res.status(201).json({ asset });
};

const updateAsset = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    category,
    subcategory,
    description,
    estimatedValue,
    estimated_value,
    currency,
    valuationDate,
    valuation_date,
    metadata,
  } = req.body;

  const resolvedValue = estimatedValue !== undefined ? estimatedValue : estimated_value;
  const resolvedDate = valuationDate !== undefined ? valuationDate : valuation_date;

  validateAssetData({
    name,
    category,
    estimatedValue: resolvedValue,
    valuationDate: resolvedDate,
    metadata,
  }, true);

  const asset = await assetService.updateAsset(req.user.id, id, {
    name,
    category,
    subcategory,
    description,
    estimatedValue: resolvedValue,
    currency,
    valuationDate: resolvedDate,
    metadata,
  });

  return res.status(200).json({ asset });
};

const deleteAsset = async (req, res) => {
  const { id } = req.params;
  await assetService.deleteAsset(req.user.id, id);
  return res.status(200).json({ message: 'Asset deleted successfully.' });
};

module.exports = {
  listAssets,
  getAsset,
  createAsset,
  updateAsset,
  deleteAsset,
};
