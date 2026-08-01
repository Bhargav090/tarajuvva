#!/usr/bin/env node
/**
 * Migrate image refs from disk (/uploads/...) and base64 data URLs → s3:// keys.
 *
 * SAFETY:
 * - Refuses MYSQL_DATABASE=tarajuvva unless --allow-production is passed
 * - Never deletes disk files or S3 objects
 * - Journals every rewrite in media_migrations for exact --revert
 * - Optimistic re-read so concurrent admin saves are not clobbered
 *
 * Usage (from backend/):
 *   node scripts/migrate-images-to-s3.js --dry-run
 *   node scripts/migrate-images-to-s3.js --table=testimonials
 *   node scripts/migrate-images-to-s3.js --table=products --limit=5
 *   node scripts/migrate-images-to-s3.js --revert --table=testimonials
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const { initializeDatabase, getPool, all, get, run } = require('../src/db/database');
const {
  isDataUrl,
  isLocalUploadPath,
  isHttpUrl,
  parseDataUrl,
  parseJsonArray,
} = require('../src/lib/imageDataUrl');
const { isS3Ref, uploadBuffer, sha256, mediaStorageIsS3, cdnUrl } = require('../src/lib/s3Storage');
const { findExistingBySha } = require('../src/lib/mediaJournal');
const { invalidateLegacyMap } = require('../src/lib/publicImageUrl');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const revert = args.includes('--revert');
const allowProduction = args.includes('--allow-production');
const includeRemote = args.includes('--include-remote');
const tableArg = (args.find((a) => a.startsWith('--table=')) || '').split('=')[1] || null;
const limitArg = Number((args.find((a) => a.startsWith('--limit=')) || '').split('=')[1] || 0) || null;
const batchSize = Number((args.find((a) => a.startsWith('--batch=')) || '').split('=')[1] || 25) || 25;
const sleepMs = Number((args.find((a) => a.startsWith('--sleep=')) || '').split('=')[1] || 100) || 100;

const TABLES = [
  'testimonials',
  'reimagine_images',
  'reimagine_conversions',
  'products',
  'reimagine_requests',
  'orders',
];

const stats = {
  migrated: 0,
  skipped: 0,
  failed: 0,
  missing: 0,
  reverted: 0,
  raced: 0,
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assertSafeDatabase() {
  const db = String(process.env.MYSQL_DATABASE || 'tarajuvva');
  if (db === 'tarajuvva' && !allowProduction) {
    console.error(`
REFUSING to run against production database "${db}".

Local/staging should use MYSQL_DATABASE=tarajuvva_staging.
If you truly intend to migrate production, pass --allow-production
and run this on the server inside tmux, after a mysqldump backup.
`);
    process.exit(1);
  }
  console.log(`Database: ${db}${dryRun ? ' (dry-run)' : ''}${revert ? ' (revert)' : ''}`);
}

async function resolveBytes(ref) {
  const v = String(ref || '').trim();
  if (!v) return null;
  if (isS3Ref(v)) return { skip: true, reason: 'already-s3' };
  if (isDataUrl(v)) {
    const parsed = parseDataUrl(v);
    if (!parsed) return { error: 'bad-data-url' };
    return { buffer: parsed.buffer, mime: parsed.mime };
  }
  if (isLocalUploadPath(v)) {
    const relative = v.replace(/^\/uploads\//i, '').replace(/^\/+/, '');
    const full = path.normalize(path.join(UPLOADS_DIR, relative));
    if (full.startsWith(UPLOADS_DIR) && fs.existsSync(full)) {
      const buffer = fs.readFileSync(full);
      const ext = path.extname(full).toLowerCase();
      const mime =
        ext === '.png'
          ? 'image/png'
          : ext === '.webp'
            ? 'image/webp'
            : ext === '.gif'
              ? 'image/gif'
              : 'image/jpeg';
      return { buffer, mime };
    }
    // Staging/laptop often lacks disk copies — pull bytes from production origin.
    const origin = String(process.env.UPLOADS_FALLBACK_ORIGIN || '').replace(/\/$/, '');
    if (origin) {
      try {
        const res = await fetch(`${origin}${v.startsWith('/') ? v : `/${v}`}`);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const mime = res.headers.get('content-type') || 'image/jpeg';
          return { buffer, mime, fetched: true };
        }
      } catch (e) {
        return { error: `fallback-fetch: ${e.message}` };
      }
    }
    return { missing: true };
  }
  if (isHttpUrl(v)) {
    if (!includeRemote) return { skip: true, reason: 'remote-url' };
    const res = await fetch(v);
    if (!res.ok) return { error: `fetch-${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return { buffer: buf, mime };
  }
  return { skip: true, reason: 'unknown-format' };
}

async function prepareRef(oldRef, prefix) {
  const resolved = await resolveBytes(oldRef);
  if (!resolved) return { unchanged: true, ref: oldRef };
  if (resolved.skip) return { unchanged: true, ref: oldRef, reason: resolved.reason };
  if (resolved.missing) {
    stats.missing += 1;
    console.warn(`  missing file: ${String(oldRef).slice(0, 80)}`);
    return { unchanged: true, ref: oldRef, missing: true };
  }
  if (resolved.error) {
    stats.failed += 1;
    console.warn(`  failed: ${resolved.error} for ${String(oldRef).slice(0, 60)}`);
    return { unchanged: true, ref: oldRef, error: resolved.error };
  }

  const hash = sha256(resolved.buffer);
  const existing = await findExistingBySha(hash);
  let newRef = existing?.new_ref || null;

  if (!newRef) {
    if (dryRun) {
      newRef = `s3://${prefix}/dry-run-${hash.slice(0, 12)}.jpg`;
    } else {
      newRef = await uploadBuffer(resolved.buffer, resolved.mime, prefix);
    }
  }

  return { unchanged: false, ref: newRef, oldRef, hash };
}

/**
 * Atomically journal + update a scalar column with optimistic concurrency.
 */
async function commitScalarMigration({ tableName, rowId, columnName, expectedOld, newRef, oldRef, hash }) {
  if (dryRun) {
    stats.migrated += 1;
    return true;
  }
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT \`${columnName}\` AS v FROM \`${tableName}\` WHERE id = ? FOR UPDATE`,
      [rowId]
    );
    const current = rows[0]?.v;
    if (String(current || '') !== String(expectedOld || '')) {
      await conn.rollback();
      stats.raced += 1;
      console.warn(`  race skipped ${tableName}.${rowId}.${columnName}`);
      return false;
    }
    await conn.execute(
      `INSERT INTO media_migrations
        (id, table_name, row_id, column_name, array_index, old_ref, new_ref, sha256)
       VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`,
      [require('uuid').v4(), tableName, String(rowId), columnName, String(oldRef), String(newRef), String(hash)]
    );
    await conn.execute(`UPDATE \`${tableName}\` SET \`${columnName}\` = ? WHERE id = ?`, [newRef, rowId]);
    await conn.commit();
    stats.migrated += 1;
    invalidateLegacyMap();
    return true;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * Atomically journal array-index rewrites + update JSON column.
 * entries: [{ index, oldRef, newRef, hash }]
 */
async function commitArrayMigration({ tableName, rowId, columnName, expectedOldJson, nextJson, entries }) {
  if (dryRun) {
    stats.migrated += entries.length;
    return true;
  }
  const pool = getPool();
  const conn = await pool.getConnection();
  const { v4: uuidv4 } = require('uuid');
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT \`${columnName}\` AS v FROM \`${tableName}\` WHERE id = ? FOR UPDATE`,
      [rowId]
    );
    const current = rows[0]?.v;
    if (String(current || '') !== String(expectedOldJson || '')) {
      await conn.rollback();
      stats.raced += 1;
      console.warn(`  race skipped ${tableName}.${rowId}.${columnName}`);
      return false;
    }
    for (const e of entries) {
      await conn.execute(
        `INSERT INTO media_migrations
          (id, table_name, row_id, column_name, array_index, old_ref, new_ref, sha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          tableName,
          String(rowId),
          columnName,
          e.index,
          String(e.oldRef),
          String(e.newRef),
          String(e.hash),
        ]
      );
    }
    await conn.execute(`UPDATE \`${tableName}\` SET \`${columnName}\` = ? WHERE id = ?`, [
      nextJson,
      rowId,
    ]);
    await conn.commit();
    stats.migrated += entries.length;
    invalidateLegacyMap();
    return true;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function migrateTestimonials() {
  const rows = await all('SELECT id, image_path, image_paths FROM testimonials');
  let n = 0;
  for (const row of rows) {
    if (limitArg && n >= limitArg) break;
    let paths = parseJsonArray(row.image_paths);
    if (!paths.length && row.image_path) paths = [row.image_path];
    if (!paths.length) {
      stats.skipped += 1;
      continue;
    }
    const next = [];
    const entries = [];
    for (let i = 0; i < paths.length; i += 1) {
      const prepared = await prepareRef(paths[i], 'testimonials');
      if (prepared.unchanged) {
        stats.skipped += 1;
        next.push(prepared.ref);
      } else {
        next.push(prepared.ref);
        entries.push({
          index: i,
          oldRef: prepared.oldRef,
          newRef: prepared.ref,
          hash: prepared.hash,
        });
      }
    }
    if (entries.length) {
      await commitArrayMigration({
        tableName: 'testimonials',
        rowId: row.id,
        columnName: 'image_paths',
        expectedOldJson: row.image_paths,
        nextJson: JSON.stringify(next),
        entries,
      });
      if (!dryRun) {
        await run('UPDATE testimonials SET image_path = NULL WHERE id = ?', [row.id]);
      }
    }
    n += 1;
    if (n % batchSize === 0) await sleep(sleepMs);
  }
}

async function migrateReimagineImages() {
  const rows = await all('SELECT id, image_path FROM reimagine_images');
  let n = 0;
  for (const row of rows) {
    if (limitArg && n >= limitArg) break;
    const prepared = await prepareRef(row.image_path, 'reimagine');
    if (prepared.unchanged) stats.skipped += 1;
    else {
      await commitScalarMigration({
        tableName: 'reimagine_images',
        rowId: row.id,
        columnName: 'image_path',
        expectedOld: row.image_path,
        newRef: prepared.ref,
        oldRef: prepared.oldRef,
        hash: prepared.hash,
      });
    }
    n += 1;
    if (n % batchSize === 0) await sleep(sleepMs);
  }
}

async function migrateConversions() {
  const rows = await all('SELECT id, from_image, to_image FROM reimagine_conversions');
  let n = 0;
  for (const row of rows) {
    if (limitArg && n >= limitArg) break;
    for (const col of ['from_image', 'to_image']) {
      const old = row[col];
      if (!old) continue;
      const prepared = await prepareRef(old, 'conversions');
      if (prepared.unchanged) stats.skipped += 1;
      else {
        await commitScalarMigration({
          tableName: 'reimagine_conversions',
          rowId: row.id,
          columnName: col,
          expectedOld: old,
          newRef: prepared.ref,
          oldRef: prepared.oldRef,
          hash: prepared.hash,
        });
      }
    }
    n += 1;
    if (n % batchSize === 0) await sleep(sleepMs);
  }
}

async function migrateProducts() {
  const rows = await all('SELECT id, images FROM products');
  let n = 0;
  for (const row of rows) {
    if (limitArg && n >= limitArg) break;
    const paths = parseJsonArray(row.images);
    const next = [];
    const entries = [];
    for (let i = 0; i < paths.length; i += 1) {
      const prepared = await prepareRef(paths[i], 'products');
      if (prepared.unchanged) {
        stats.skipped += 1;
        next.push(prepared.ref);
      } else {
        next.push(prepared.ref);
        entries.push({
          index: i,
          oldRef: prepared.oldRef,
          newRef: prepared.ref,
          hash: prepared.hash,
        });
      }
    }
    if (entries.length) {
      await commitArrayMigration({
        tableName: 'products',
        rowId: row.id,
        columnName: 'images',
        expectedOldJson: row.images,
        nextJson: JSON.stringify(next),
        entries,
      });
    }
    n += 1;
    if (n % batchSize === 0) await sleep(sleepMs);
  }
}

async function migrateReimagineRequests() {
  const rows = await all('SELECT id, images FROM reimagine_requests');
  let n = 0;
  for (const row of rows) {
    if (limitArg && n >= limitArg) break;
    const paths = parseJsonArray(row.images);
    if (!paths.length) {
      stats.skipped += 1;
      continue;
    }
    const next = [];
    const entries = [];
    for (let i = 0; i < paths.length; i += 1) {
      const prepared = await prepareRef(paths[i], 'requests');
      if (prepared.unchanged) {
        stats.skipped += 1;
        next.push(prepared.ref);
      } else {
        next.push(prepared.ref);
        entries.push({
          index: i,
          oldRef: prepared.oldRef,
          newRef: prepared.ref,
          hash: prepared.hash,
        });
      }
    }
    if (entries.length) {
      await commitArrayMigration({
        tableName: 'reimagine_requests',
        rowId: row.id,
        columnName: 'images',
        expectedOldJson: row.images,
        nextJson: JSON.stringify(next),
        entries,
      });
    }
    n += 1;
    if (n % batchSize === 0) await sleep(sleepMs);
  }
}

async function migrateOrders() {
  const rows = await all('SELECT id, items FROM orders');
  let n = 0;
  for (const row of rows) {
    if (limitArg && n >= limitArg) break;
    let items;
    try {
      items = JSON.parse(row.items || '[]');
    } catch {
      stats.skipped += 1;
      continue;
    }
    if (!Array.isArray(items)) {
      stats.skipped += 1;
      continue;
    }
    const entries = [];
    for (let i = 0; i < items.length; i += 1) {
      const old = items[i]?.image;
      if (!old) continue;
      const prepared = await prepareRef(old, 'orders');
      if (prepared.unchanged) stats.skipped += 1;
      else {
        // Persist public CDN URL on order snapshots (matches pickStorableImage).
        const stored = cdnUrl(prepared.ref) || prepared.ref;
        items[i] = { ...items[i], image: stored };
        entries.push({
          index: i,
          oldRef: prepared.oldRef,
          newRef: stored,
          hash: prepared.hash,
        });
      }
    }
    if (entries.length) {
      await commitArrayMigration({
        tableName: 'orders',
        rowId: row.id,
        columnName: 'items',
        expectedOldJson: row.items,
        nextJson: JSON.stringify(items),
        entries,
      });
    }
    n += 1;
    if (n % batchSize === 0) await sleep(sleepMs);
  }
}

async function revertTable(tableName) {
  const rows = await all(
    `SELECT * FROM media_migrations
     WHERE table_name = ? AND reverted_at IS NULL
     ORDER BY created_at DESC`,
    [tableName]
  );
  console.log(`Reverting ${rows.length} journal entries for ${tableName}…`);

  // Group by row + column
  const byRow = new Map();
  for (const j of rows) {
    const key = `${j.row_id}::${j.column_name}`;
    if (!byRow.has(key)) byRow.set(key, []);
    byRow.get(key).push(j);
  }

  for (const [, entries] of byRow) {
    const sample = entries[0];
    const row = await get(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [sample.row_id]);
    if (!row) {
      stats.failed += 1;
      continue;
    }

    if (sample.column_name === 'items' || sample.column_name === 'images' || sample.column_name === 'image_paths') {
      let arr;
      try {
        arr = JSON.parse(row[sample.column_name] || '[]');
      } catch {
        arr = [];
      }
      if (sample.column_name === 'items') {
        for (const e of entries) {
          if (arr[e.array_index] && arr[e.array_index].image === e.new_ref) {
            arr[e.array_index] = { ...arr[e.array_index], image: e.old_ref };
          }
        }
      } else {
        for (const e of entries) {
          if (e.array_index != null && arr[e.array_index] === e.new_ref) {
            arr[e.array_index] = e.old_ref;
          }
        }
      }
      if (!dryRun) {
        await run(`UPDATE \`${tableName}\` SET \`${sample.column_name}\` = ? WHERE id = ?`, [
          JSON.stringify(arr),
          sample.row_id,
        ]);
      }
    } else {
      // scalar column — restore the most recent journal old_ref matching current new_ref
      const e = entries.find((x) => row[x.column_name] === x.new_ref) || entries[0];
      if (!dryRun) {
        await run(`UPDATE \`${tableName}\` SET \`${e.column_name}\` = ? WHERE id = ?`, [
          e.old_ref,
          e.row_id,
        ]);
      }
    }

    for (const e of entries) {
      if (!dryRun) {
        await run('UPDATE media_migrations SET reverted_at = CURRENT_TIMESTAMP WHERE id = ?', [e.id]);
      }
      stats.reverted += 1;
    }
  }
  invalidateLegacyMap();
}

async function main() {
  assertSafeDatabase();

  if (!dryRun && !revert && !process.env.S3_BUCKET) {
    console.error('S3_BUCKET is not set. Configure AWS env vars before a real migrate.');
    process.exit(1);
  }

  await initializeDatabase();

  const targets = tableArg ? [tableArg] : TABLES.filter((t) => t !== 'orders');
  // orders only when explicitly requested
  if (tableArg === 'orders') targets.splice(0, targets.length, 'orders');

  for (const t of targets) {
    if (!TABLES.includes(t)) {
      console.error(`Unknown table: ${t}`);
      process.exit(1);
    }
  }

  console.log(`Tables: ${targets.join(', ')}`);
  if (!revert && mediaStorageIsS3()) {
    console.log('Note: MEDIA_STORAGE=s3 (new uploads already go to S3)');
  }

  for (const t of targets) {
    console.log(`\n==> ${revert ? 'revert' : 'migrate'} ${t}`);
    if (revert) {
      await revertTable(t);
      continue;
    }
    if (t === 'testimonials') await migrateTestimonials();
    else if (t === 'reimagine_images') await migrateReimagineImages();
    else if (t === 'reimagine_conversions') await migrateConversions();
    else if (t === 'products') await migrateProducts();
    else if (t === 'reimagine_requests') await migrateReimagineRequests();
    else if (t === 'orders') await migrateOrders();
  }

  console.log('\nSummary:', stats);
  process.exit(stats.failed > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
