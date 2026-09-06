const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const customCategoryController = require('../controllers/customCategory.controller');

router.use(requireAuth);

router.get('/', customCategoryController.listCustomCategories);
router.get('/:id', customCategoryController.getCustomCategory);
router.post('/', customCategoryController.createCustomCategory);
router.put('/:id', customCategoryController.updateCustomCategory);
router.delete('/:id', customCategoryController.deleteCustomCategory);

module.exports = router;
