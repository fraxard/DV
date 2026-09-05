const nomineeService = require('../services/nominee.service');

const listNominees = async (req, res) => {
  const nominees = await nomineeService.listNominees(req.user.id);
  return res.status(200).json({ nominees });
};

const getDashboardSummary = async (req, res) => {
  const summary = await nomineeService.getNomineeDashboardSummary(req.user.id);
  return res.status(200).json(summary);
};

const getNomineeStats = async (req, res) => {
  const stats = await nomineeService.getNomineeStats(req.user.id);
  return res.status(200).json(stats);
};

const getNominee = async (req, res) => {
  const { id } = req.params;
  const nominee = await nomineeService.getNominee(req.user.id, id);
  return res.status(200).json({ nominee });
};

const createNominee = async (req, res) => {
  const nominee = await nomineeService.createNominee(req.user.id, req.body);
  return res.status(201).json({ nominee });
};

const updateNominee = async (req, res) => {
  const { id } = req.params;
  const nominee = await nomineeService.updateNominee(req.user.id, id, req.body);
  return res.status(200).json({ nominee });
};

const deleteNominee = async (req, res) => {
  const { id } = req.params;
  await nomineeService.deleteNominee(req.user.id, id);
  return res.status(200).json({ message: 'Nominee deleted successfully.' });
};

module.exports = {
  listNominees,
  getDashboardSummary,
  getNomineeStats,
  getNominee,
  createNominee,
  updateNominee,
  deleteNominee,
};
