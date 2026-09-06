const customCategoryService = require('../services/customCategory.service');

const listCustomCategories = async (req, res) => {
  const categories = await customCategoryService.listCustomCategories(req.user.id);
  res.json({ categories });
};

const getCustomCategory = async (req, res) => {
  const { id } = req.params;
  const category = await customCategoryService.getCustomCategory(req.user.id, id);
  res.json({ category });
};

const createCustomCategory = async (req, res) => {
  const { name, description, fields } = req.body;
  const category = await customCategoryService.createCustomCategory(req.user.id, {
    name,
    description,
    fields,
  });
  res.status(201).json({ category });
};

const updateCustomCategory = async (req, res) => {
  const { id } = req.params;
  const { name, description, fields } = req.body;
  const category = await customCategoryService.updateCustomCategory(req.user.id, id, {
    name,
    description,
    fields,
  });
  res.json({ category });
};

const deleteCustomCategory = async (req, res) => {
  const { id } = req.params;
  const result = await customCategoryService.deleteCustomCategory(req.user.id, id);
  res.json(result);
};

module.exports = {
  listCustomCategories,
  getCustomCategory,
  createCustomCategory,
  updateCustomCategory,
  deleteCustomCategory,
};
