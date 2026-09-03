// Load environment variables before anything else
require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT ?? 5000;
const HOST = process.env.HOST ?? 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`\n  DigiVirasat API`);
  console.log(`  ───────────────────────────────`);
  console.log(`  Running at  http://${HOST}:${PORT}`);
  console.log(`  Environment ${process.env.NODE_ENV ?? 'development'}`);
  console.log(`  Health      http://${HOST}:${PORT}/api/health\n`);
});

// Graceful shutdown — finish in-flight requests before exiting
const shutdown = (signal) => {
  console.log(`\n  ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('  Server closed.\n');
    process.exit(0);
  });

  // Force exit if server hasn't closed within 10s
  setTimeout(() => {
    console.error('  Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));