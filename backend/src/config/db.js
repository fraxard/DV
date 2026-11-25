// Re-export the shared PostgreSQL pool to avoid duplicate pools across the application
const pool = require('../db');

module.exports = pool;
