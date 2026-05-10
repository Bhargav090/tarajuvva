/**
 * One-time copy: backend/data/tarajuvva.db (SQLite) → MySQL (same credentials as .env).
 * Replaces all rows in the MySQL tarajuvva tables. Run from backend/: npm run migrate:sqlite
 *
 * Requires: npm install (devDependency better-sqlite3)
 * Safety: pass --force or set MIGRATE_SQLITE_FORCE=1 to confirm.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { initializeDatabase, getPool } = require('../src/db/database');

const SQLITE_PATH = path.join(__dirname, '..', 'data', 'tarajuvva.db');

const TRUNCATE_ORDER = ['waitlist', 'reimagine_requests', 'orders', 'products', 'users', 'admins'];
const INSERT_ORDER = ['users', 'products', 'orders', 'reimagine_requests', 'waitlist', 'admins'];

function sqliteTableColumns(sqlite, table) {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function sqliteHasTable(sqlite, table) {
  const row = sqlite
    .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table);
  return !!row;
}

async function migrate() {
  const force =
    process.argv.includes('--force') ||
    process.env.MIGRATE_SQLITE_FORCE === '1' ||
    process.env.MIGRATE_SQLITE_FORCE === 'true';

  if (!force) {
    console.error(
      'This will TRUNCATE MySQL tables and replace them with SQLite data.\n' +
        'Run: MIGRATE_SQLITE_FORCE=1 npm run migrate:sqlite\n' +
        '  or: npm run migrate:sqlite -- --force'
    );
    process.exit(1);
  }

  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`SQLite file not found: ${SQLITE_PATH}`);
    process.exit(1);
  }

  console.log('Initializing MySQL schema…');
  await initializeDatabase();
  const pool = getPool();

  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  for (const table of INSERT_ORDER) {
    if (!sqliteHasTable(sqlite, table)) {
      console.warn(`Skipping missing SQLite table: ${table}`);
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of TRUNCATE_ORDER) {
      await conn.query(`TRUNCATE TABLE \`${t}\``);
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    for (const table of INSERT_ORDER) {
      if (!sqliteHasTable(sqlite, table)) continue;

      const columns = sqliteTableColumns(sqlite, table);
      if (columns.length === 0) continue;

      const colList = columns.map((c) => `\`${c}\``).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO \`${table}\` (${colList}) VALUES (${placeholders})`;

      const selectSql = `SELECT ${columns.join(', ')} FROM "${table}"`;
      const rows = sqlite.prepare(selectSql).all();

      for (const row of rows) {
        const values = columns.map((c) => {
          const v = row[c];
          if (v === undefined) return null;
          return v;
        });
        await conn.execute(insertSql, values);
      }
      console.log(`✓ ${table}: ${rows.length} row(s)`);
    }
  } finally {
    conn.release();
    sqlite.close();
  }

  console.log('\nDone. MySQL now matches the previous SQLite database.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
