const assetNomineeService = require('../services/assetNominee.service');

const listAssetNominees = async (req, res) => {
  const { id: assetId } = req.params;
  const result = await assetNomineeService.listAssetNominees(req.user.id, assetId);
  return res.status(200).json(result);
};

const assignNominee = async (req, res) => {
  const { id: assetId } = req.params;
  const assignment = await assetNomineeService.assignNomineeToAsset(req.user.id, assetId, req.body);
  return res.status(201).json({ assignment });
};

const updateNomineeAllocation = async (req, res) => {
  const { id: assetId, nomineeId } = req.params;
  const assignment = await assetNomineeService.updateAssetNomineeAllocation(
    req.user.id,
    assetId,
    nomineeId,
    req.body
  );
  return res.status(200).json({ assignment });
};

const removeNominee = async (req, res) => {
  const { id: assetId, nomineeId } = req.params;
  await assetNomineeService.removeNomineeFromAsset(req.user.id, assetId, nomineeId);
  return res.status(200).json({ message: 'Nominee unassigned from asset.' });
};

module.exports = {
  listAssetNominees,
  assignNominee,
  updateNomineeAllocation,
  removeNominee,
};
