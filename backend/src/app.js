// Must be first — patches async route handlers to propagate errors to errorHandler
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const corsOptions = require('./config/cors');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes/index');

const app = express();

// ── Security headers ───────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Request logging ───────────────────────────────────────────────────────
// 'dev' format: METHOD /path statusCode responseTime ms
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── API routes ────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 handler for unknown API routes ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: { message: `Route ${req.method} ${req.path} not found` } });
});

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

module.exports = app;