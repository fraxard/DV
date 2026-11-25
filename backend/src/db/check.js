require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = require('./index');

async function checkDatabase() {
  try {
    const result = await pool.query(
      'SELECT NOW() AS now, current_database() AS db, current_user AS user, version()'
    );

    console.log('PostgreSQL connection successful.');
    console.log('Database name:', result.rows[0].db);
    console.log('Database user:', result.rows[0].user);
    console.log('Database time:', result.rows[0].now);
  } catch (error) {
    // Never print database passwords or sensitive connection strings
    console.error('PostgreSQL connection failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

checkDatabase();
