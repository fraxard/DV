require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Client, Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function maskUrl(url) {
  if (!url) return '<not set>';
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '********';
    }
    return parsed.toString();
  } catch {
    return url.replace(/:\/\/[^:]+:[^@]+@/, '://[user]:[password]@');
  }
}

async function verifyNeon() {
  console.log('====================================================');
  console.log('       DigiVirasat — Neon Integration Check         ');
  console.log('====================================================\n');

  const pooledUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DATABASE_URL_DIRECT;

  console.log(`[Config] DATABASE_URL (Pooled):        ${maskUrl(pooledUrl)}`);
  console.log(`[Config] DATABASE_URL_DIRECT (Direct):  ${maskUrl(directUrl)}\n`);

  if (!pooledUrl || pooledUrl.includes('YOUR_') || pooledUrl.includes('localhost')) {
    console.warn('[!] DATABASE_URL does not appear to contain fresh Neon credentials.');
  }

  let directClient = null;
  let pool = null;

  try {
    // 1. Direct Connection Test (for Migrations & Admin)
    console.log('── Step 1: Testing Direct Connection (DATABASE_URL_DIRECT) ──');
    if (!directUrl || directUrl.includes('YOUR_')) {
      console.warn('⚠️  DATABASE_URL_DIRECT is not configured with valid credentials. Skipping direct connection check.');
    } else {
      directClient = new Client({
        connectionString: directUrl,
        ssl: { rejectUnauthorized: false },
        enableChannelBinding: true,
      });

      await directClient.connect();
      const directRes = await directClient.query(
        'SELECT NOW() AS now, current_database() AS db, current_user AS user, version()'
      );
      const row = directRes.rows[0];
      console.log('✓ Direct connection successful.');
      console.log(`  Database Name: ${row.db} ${row.db === 'neondb' ? '(MATCH: neondb)' : '(WARNING: not neondb)'}`);
      console.log(`  Current User:  ${row.user} ${row.user === 'neondb_owner' ? '(MATCH: neondb_owner)' : ''}`);
      console.log(`  Server Time:   ${row.now}`);
      console.log(`  Engine:        ${row.version.split(' on ')[0]}\n`);
    }

    // 2. Pooled Connection Test (for Application Queries)
    console.log('── Step 2: Testing Application Pool Connection (DATABASE_URL) ──');
    if (!pooledUrl || pooledUrl.includes('YOUR_') || pooledUrl.includes('localhost')) {
      console.warn('⚠️  DATABASE_URL is not configured with Neon credentials. Skipping pooled connection check.');
    } else {
      pool = new Pool({
        connectionString: pooledUrl,
        ssl: { rejectUnauthorized: false },
        enableChannelBinding: true,
        max: 2,
      });

      const poolRes = await pool.query(
        'SELECT NOW() AS now, current_database() AS db, current_user AS user'
      );
      const row = poolRes.rows[0];
      console.log('✓ Pooled connection successful.');
      console.log(`  Database Name: ${row.db} ${row.db === 'neondb' ? '(MATCH: neondb)' : ''}`);
      console.log(`  Current User:  ${row.user} ${row.user === 'neondb_owner' ? '(MATCH: neondb_owner)' : ''}`);
      console.log(`  Server Time:   ${row.now}\n`);
    }

    // 3. Inspect Schema & Migration History
    const inspector = directClient || pool;
    if (inspector) {
      console.log('── Step 3: Inspecting Existing Schema & Migrations ──');
      const tablesRes = await inspector.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      const existingTables = tablesRes.rows.map((r) => r.table_name);
      console.log(`Found ${existingTables.length} table(s) in 'public' schema:`);
      if (existingTables.length > 0) {
        console.log(`  Tables: ${existingTables.join(', ')}`);
      } else {
        console.log('  Database is currently empty (0 tables).');
      }

      // Check migration table
      const hasMigrationTable = existingTables.includes('pgmigrations');
      if (hasMigrationTable) {
        const migRes = await inspector.query('SELECT id, name, run_on FROM pgmigrations ORDER BY id ASC;');
        console.log(`\nFound ${migRes.rows.length} applied migration(s) in 'pgmigrations':`);
        migRes.rows.forEach((m) => {
          console.log(`  - [${m.id}] ${m.name} (run on: ${m.run_on})`);
        });
      } else {
        console.log('\nMigration table "pgmigrations" does not exist yet.');
      }

      // Compare with repo migrations
      const migrationsDir = path.resolve(__dirname, '../../migrations');
      const repoMigrations = fs.existsSync(migrationsDir)
        ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort()
        : [];

      console.log(`\nRepository migrations count: ${repoMigrations.length}`);

      // 4. Test Sample Application Queries if tables exist
      if (existingTables.includes('users')) {
        console.log('\n── Step 4: Testing Non-Destructive Application Queries ──');
        const userCount = await inspector.query('SELECT count(*) FROM users');
        console.log(`  Users count:     ${userCount.rows[0].count}`);

        if (existingTables.includes('assets')) {
          const assetCount = await inspector.query('SELECT count(*) FROM assets');
          console.log(`  Assets count:    ${assetCount.rows[0].count}`);
        }
        if (existingTables.includes('documents')) {
          const docCount = await inspector.query('SELECT count(*) FROM documents');
          console.log(`  Documents count: ${docCount.rows[0].count}`);
        }
        if (existingTables.includes('nominees')) {
          const nomCount = await inspector.query('SELECT count(*) FROM nominees');
          console.log(`  Nominees count:  ${nomCount.rows[0].count}`);
        }
        if (existingTables.includes('tasks')) {
          const taskCount = await inspector.query('SELECT count(*) FROM tasks');
          console.log(`  Tasks count:     ${taskCount.rows[0].count}`);
        }
        console.log('✓ Application queries executed successfully.');
      }
    }

    console.log('\n====================================================');
    console.log('              Verification Complete                 ');
    console.log('====================================================\n');
  } catch (error) {
    console.error('\n❌ Verification encountered an error:');
    console.error(`   Message: ${error.message}`);
    if (error.code) console.error(`   Code:    ${error.code}`);
    process.exitCode = 1;
  } finally {
    if (directClient) await directClient.end().catch(() => {});
    if (pool) await pool.end().catch(() => {});
  }
}

verifyNeon();
