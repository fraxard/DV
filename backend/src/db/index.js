const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const isNeon = Boolean(
  connectionString &&
    (connectionString.includes('neon.tech') ||
      connectionString.includes('sslmode=require'))
);

const isProduction = process.env.NODE_ENV === 'production';

// Neon requires SSL. In production or when connecting to Neon, enable TLS.
// rejectUnauthorized: false ensures compatibility across environments without
// certificate chain rejection issues while maintaining TLS encryption.
const ssl = isNeon || isProduction ? { rejectUnauthorized: false } : false;

// Enable SCRAM-SHA-256-PLUS channel binding when connecting to Neon or when requested in connectionString
const hasChannelBinding = Boolean(
  connectionString && connectionString.includes('channel_binding=require')
);
const enableChannelBinding = isNeon || hasChannelBinding;

const pool = new Pool({
  connectionString,
  ssl,
  enableChannelBinding,
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONN_TIMEOUT || '10000', 10),
});

// Pool-level idle client error handling to prevent unhandled process termination
pool.on('error', (err) => {
  // Never log passwords or complete connection strings
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

module.exports = pool;
