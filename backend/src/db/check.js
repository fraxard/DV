require('dotenv').config();

const pool = require('./index');

async function checkDatabase() {
  try {
    const result = await pool.query('SELECT NOW() AS now');

    console.log('PostgreSQL connection successful.');
    console.log('Database time:', result.rows[0].now);
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkDatabase();