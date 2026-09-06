const taskService = require('../services/task.service');
const { Errors } = require('../utils/errors');

const listTasks = async (req, res) => {
  const { startDate, endDate, status } = req.query;

  if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw Errors.badRequest('Invalid startDate format (YYYY-MM-DD required).');
  }
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw Errors.badRequest('Invalid endDate format (YYYY-MM-DD required).');
  }
  if (startDate && endDate && startDate > endDate) {
    throw Errors.badRequest('startDate cannot be after endDate.');
  }

  const tasks = await taskService.listTasks(req.user.id, {
    startDate,
    endDate,
    status,
  });

  res.json({ tasks });
};

const getTask = async (req, res) => {
  const { id } = req.params;
  const task = await taskService.getTask(req.user.id, id);
  res.json({ task });
};

const createTask = async (req, res) => {
  const { title, description, dueDate, due_date, dueTime, due_time, assetId, asset_id } = req.body;
  const task = await taskService.createTask(req.user.id, {
    title,
    description,
    dueDate: dueDate !== undefined ? dueDate : due_date,
    dueTime: dueTime !== undefined ? dueTime : due_time,
    assetId: assetId !== undefined ? assetId : asset_id,
  });
  res.status(201).json({ task });
};

const updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate, due_date, dueTime, due_time, assetId, asset_id } = req.body;
  const task = await taskService.updateTask(req.user.id, id, {
    title,
    description,
    dueDate: dueDate !== undefined ? dueDate : due_date,
    dueTime: dueTime !== undefined ? dueTime : due_time,
    assetId: assetId !== undefined ? assetId : asset_id,
  });
  res.json({ task });
};

const updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    throw Errors.badRequest('Status is required in request body.');
  }
  const task = await taskService.updateTaskStatus(req.user.id, id, status);
  res.json({ task });
};

const deleteTask = async (req, res) => {
  const { id } = req.params;
  const result = await taskService.deleteTask(req.user.id, id);
  res.json(result);
};

module.exports = {
  listTasks,
  getTask,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
};
