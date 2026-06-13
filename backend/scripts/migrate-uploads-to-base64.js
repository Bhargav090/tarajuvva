#!/usr/bin/env node
/**
 * One-time migration: convert /uploads/... disk paths in MySQL to base64 data URLs.
 * External https:// URLs and existing data URLs are left unchanged.
 *
 * Usage (from backend/):
 *   node scripts/migrate-uploads-to-base64.js
 *   node scripts/migrate-uploads-to-base64.js --dry-run
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { initializeDatabase, get, all, run } = require('../src/db/database');
const {
  isDataUrl,
  isLocalUploadPath,
  pathRefToDataUrl,
  parseJsonArray,
} = require('../src/lib/imageDataUrl');

const uploadsDir = path.join(__dirname, '../uploads');
const dryRun = process.argv.includes('--dry-run');

const stats = {
  hero_images: { updated: 0, skipped: 0, missing: 0 },
  reimagine_images: { updated: 0, skipped: 0, missing: 0 },
  testimonials: { updated: 0, skipped: 0, missing: 0 },
  reimagine_requests: { updated: 0, skipped: 0, missing: 0 },
  products: { updated: 0, skipped: 0, missing: 0 },
  orders: { updated: 0, skipped: 0, missing: 0 },
};

function convertRef(ref) {
  if (!ref) return { value: ref, changed: false };
  if (isDataUrl(ref)) return { value: ref, changed: false };
  if (!isLocalUploadPath(ref)) return { value: ref, changed: false };

  const dataUrl = pathRefToDataUrl(ref, uploadsDir);
  if (!dataUrl) return { value: ref, changed: false, missing: true };
  return { value: dataUrl, changed: true };
}

function convertArray(paths) {
  let changed = false;
  let missing = false;
  const out = paths.map((p) => {
    const r = convertRef(p);
    if (r.missing) missing = true;
    if (r.changed) changed = true;
    return r.value;
  });
  return { out, changed, missing };
}

async function widenColumns() {
  const alters = [
    'ALTER TABLE hero_images MODIFY COLUMN image_path LONGTEXT NOT NULL',
    'ALTER TABLE reimagine_images MODIFY COLUMN image_path LONGTEXT NOT NULL',
    'ALTER TABLE testimonials MODIFY COLUMN image_path LONGTEXT NULL',
    'ALTER TABLE testimonials MODIFY COLUMN image_paths LONGTEXT NULL',
    'ALTER TABLE reimagine_requests MODIFY COLUMN images LONGTEXT NULL',
  ];
  for (const sql of alters) {
    try {
      if (!dryRun) await run(sql);
      console.log(`  ✓ ${sql.split('MODIFY')[0].trim()}…`);
    } catch (e) {
      console.warn(`  ⚠ skipped: ${e.message}`);
    }
  }
}

async function migrateHeroImages() {
  const rows = await all('SELECT id, image_path FROM hero_images');
  for (const row of rows) {
    const r = convertRef(row.image_path);
    if (r.missing) stats.hero_images.missing += 1;
    else if (!r.changed) stats.hero_images.skipped += 1;
    else {
      stats.hero_images.updated += 1;
      if (!dryRun) await run('UPDATE hero_images SET image_path = ? WHERE id = ?', [r.value, row.id]);
    }
  }
}

async function migrateReimagineImages() {
  const rows = await all('SELECT id, image_path FROM reimagine_images');
  for (const row of rows) {
    const r = convertRef(row.image_path);
    if (r.missing) stats.reimagine_images.missing += 1;
    else if (!r.changed) stats.reimagine_images.skipped += 1;
    else {
      stats.reimagine_images.updated += 1;
      if (!dryRun) await run('UPDATE reimagine_images SET image_path = ? WHERE id = ?', [r.value, row.id]);
    }
  }
}

async function migrateTestimonials() {
  const rows = await all('SELECT id, image_path, image_paths FROM testimonials');
  for (const row of rows) {
    const paths = parseJsonArray(row.image_paths, row.image_path ? JSON.stringify([row.image_path]) : '[]');
    const { out, changed, missing } = convertArray(paths);
    if (missing) stats.testimonials.missing += 1;
    if (!changed) {
      stats.testimonials.skipped += 1;
      continue;
    }
    stats.testimonials.updated += 1;
    if (!dryRun) {
      await run('UPDATE testimonials SET image_paths = ?, image_path = NULL WHERE id = ?', [
        JSON.stringify(out),
        row.id,
      ]);
    }
  }
}

async function migrateReimagineRequests() {
  const rows = await all('SELECT id, images FROM reimagine_requests WHERE images IS NOT NULL');
  for (const row of rows) {
    const paths = parseJsonArray(row.images);
    const { out, changed, missing } = convertArray(paths);
    if (missing) stats.reimagine_requests.missing += 1;
    if (!changed) {
      stats.reimagine_requests.skipped += 1;
      continue;
    }
    stats.reimagine_requests.updated += 1;
    if (!dryRun) await run('UPDATE reimagine_requests SET images = ? WHERE id = ?', [JSON.stringify(out), row.id]);
  }
}

async function migrateProducts() {
  const rows = await all('SELECT id, images FROM products');
  for (const row of rows) {
    const paths = parseJsonArray(row.images);
    const hasLocal = paths.some(isLocalUploadPath);
    if (!hasLocal) {
      stats.products.skipped += 1;
      continue;
    }
    const { out, changed, missing } = convertArray(paths);
    if (missing) stats.products.missing += 1;
    if (!changed) {
      stats.products.skipped += 1;
      continue;
    }
    stats.products.updated += 1;
    if (!dryRun) await run('UPDATE products SET images = ? WHERE id = ?', [JSON.stringify(out), row.id]);
  }
}

async function migrateOrders() {
  const rows = await all('SELECT id, items FROM orders WHERE items IS NOT NULL');
  for (const row of rows) {
    let items;
    try {
      items = JSON.parse(row.items || '[]');
    } catch {
      continue;
    }
    if (!Array.isArray(items)) continue;

    let changed = false;
    let missing = false;
    const next = items.map((item) => {
      if (!item?.image || !isLocalUploadPath(item.image)) return item;
      const r = convertRef(item.image);
      if (r.missing) missing = true;
      if (r.changed) changed = true;
      return { ...item, image: r.value };
    });

    if (missing) stats.orders.missing += 1;
    if (!changed) {
      stats.orders.skipped += 1;
      continue;
    }
    stats.orders.updated += 1;
    if (!dryRun) await run('UPDATE orders SET items = ? WHERE id = ?', [JSON.stringify(next), row.id]);
  }
}

async function main() {
  console.log(dryRun ? '\n[dry-run] migrate uploads → base64\n' : '\nMigrating uploads → base64…\n');

  if (!fs.existsSync(uploadsDir)) {
    console.warn(`Uploads folder not found (${uploadsDir}) — will only update rows already convertible.`);
  }

  await initializeDatabase();
  console.log('Widening image columns…');
  await widenColumns();

  console.log('Migrating tables…');
  await migrateHeroImages();
  await migrateReimagineImages();
  await migrateTestimonials();
  await migrateReimagineRequests();
  await migrateProducts();
  await migrateOrders();

  console.log('\nResults:');
  for (const [table, s] of Object.entries(stats)) {
    console.log(`  ${table}: ${s.updated} updated, ${s.skipped} unchanged, ${s.missing} missing file(s)`);
  }

  if (dryRun) {
    console.log('\nDry run complete — no rows written. Re-run without --dry-run to apply.\n');
  } else {
    console.log('\nMigration complete. New uploads are stored as base64 in the database.\n');
    console.log('You may archive backend/uploads/ after verifying the site.\n');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
