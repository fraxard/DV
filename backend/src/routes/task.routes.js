const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const taskController = require('../controllers/task.controller');

router.use(requireAuth);

router.get('/', taskController.listTasks);
router.get('/:id', taskController.getTask);
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.patch('/:id/status', taskController.updateTaskStatus);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
