#!/usr/bin/env node
/**
 * Generate .card.webp siblings for existing product images (disk or S3).
 *
 * SAFETY: Refuses MYSQL_DATABASE=tarajuvva unless --allow-production.
 *
 * Usage (from backend/):
 *   node scripts/generate-product-card-images.js --dry-run
 *   node scripts/generate-product-card-images.js
 *   node scripts/generate-product-card-images.js --limit=5
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { initializeDatabase, all } = require('../src/db/database');
const { parseJsonArray, isDataUrl, parseDataUrl, isLocalUploadPath } = require('../src/lib/imageDataUrl');
const {
  isS3Ref,
  s3Key,
  cdnUrl,
  s3RefFromPublicUrl,
  uploadBufferAtKey,
  objectExists,
  getClient,
  requireBucket,
} = require('../src/lib/s3Storage');
const { toCardWebp, cardSiblingPath } = require('../src/lib/imageVariants');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const allowProduction = args.includes('--allow-production');
const limitArg = Number((args.find((a) => a.startsWith('--limit=')) || '').split('=')[1] || 0) || null;

const stats = { created: 0, skipped: 0, failed: 0, missing: 0 };

function assertSafeDatabase() {
  const db = String(process.env.MYSQL_DATABASE || 'tarajuvva');
  if (db === 'tarajuvva' && !allowProduction) {
    console.error(`
REFUSING to run against production database "${db}".
Use MYSQL_DATABASE=tarajuvva_staging, or pass --allow-production.
`);
    process.exit(1);
  }
  console.log(`Database: ${db}${dryRun ? ' (dry-run)' : ''}`);
}

async function streamToBuffer(body) {
  if (!body) return null;
  if (Buffer.isBuffer(body)) return body;
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray());
  }
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function loadBuffer(ref) {
  const v = String(ref || '').trim();
  if (!v) return null;

  if (isDataUrl(v)) {
    const parsed = parseDataUrl(v);
    return parsed?.buffer || null;
  }

  const asS3 = isS3Ref(v) ? v : s3RefFromPublicUrl(v);
  if (asS3) {
    // Prefer public CDN/HTTPS fetch — works even if IAM GetObject is denied.
    const url = cdnUrl(asS3);
    if (url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CDN fetch ${res.status} for ${url}`);
      return Buffer.from(await res.arrayBuffer());
    }
    const key = s3Key(asS3);
    const out = await getClient().send(
      new GetObjectCommand({ Bucket: requireBucket(), Key: key })
    );
    return streamToBuffer(out.Body);
  }

  if (isLocalUploadPath(v) || v.startsWith('/uploads/')) {
    const rel = v.replace(/^\/+/, '');
    const abs = path.join(UPLOADS_DIR, rel.replace(/^uploads\//, ''));
    // v is /uploads/products/x.jpg → UPLOADS_DIR/products/x.jpg
    const candidate = path.join(__dirname, '..', rel);
    const filePath = fs.existsSync(candidate) ? candidate : abs;
    if (!fs.existsSync(filePath)) {
      // try fallback origin
      const origin = String(process.env.UPLOADS_FALLBACK_ORIGIN || '').replace(/\/$/, '');
      if (origin) {
        const url = `${origin}${v.startsWith('/') ? v : `/${v}`}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return Buffer.from(await res.arrayBuffer());
      }
      return null;
    }
    return fs.readFileSync(filePath);
  }

  if (/^https?:\/\//i.test(v)) {
    const res = await fetch(v);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  return null;
}

async function cardExists(originalRef) {
  const v = String(originalRef || '').trim();
  const asS3 = isS3Ref(v) ? v : s3RefFromPublicUrl(v);
  if (asS3) {
    const key = s3Key(asS3);
    const cardKey = cardSiblingPath(key);
    if (!cardKey) return true;
    return objectExists(cardKey);
  }
  if (v.startsWith('/uploads/products/')) {
    const cardRel = cardSiblingPath(v);
    if (!cardRel) return true;
    const abs = path.join(__dirname, '..', cardRel.replace(/^\//, ''));
    return fs.existsSync(abs);
  }
  // Unknown storage — skip
  return true;
}

async function writeCard(originalRef, buffer) {
  const cardBuf = await toCardWebp(buffer);
  const v = String(originalRef || '').trim();
  const asS3 = isS3Ref(v) ? v : s3RefFromPublicUrl(v);

  if (asS3) {
    const key = s3Key(asS3);
    const cardKey = cardSiblingPath(key);
    if (!cardKey) return null;
    if (dryRun) return `s3://${cardKey}`;
    await uploadBufferAtKey(cardBuf, 'image/webp', cardKey);
    return `s3://${cardKey}`;
  }

  if (v.startsWith('/uploads/products/')) {
    const cardRel = cardSiblingPath(v);
    if (!cardRel) return null;
    const abs = path.join(__dirname, '..', cardRel.replace(/^\//, ''));
    if (dryRun) return cardRel;
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, cardBuf);
    return cardRel;
  }

  return null;
}

function normalizeProductRef(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  if (/\.card\.webp$/i.test(v)) return null;
  if (isS3Ref(v) || isDataUrl(v) || v.startsWith('/uploads/') || /^https?:\/\//i.test(v)) {
    return v;
  }
  return null;
}

async function main() {
  assertSafeDatabase();
  await initializeDatabase();

  const rows = await all('SELECT id, name, images FROM products');
  const refs = [];
  for (const row of rows || []) {
    const images = parseJsonArray(row.images);
    for (const img of images) {
      const ref = normalizeProductRef(img);
      if (ref) refs.push({ productId: row.id, ref });
    }
  }

  const work = limitArg ? refs.slice(0, limitArg) : refs;
  console.log(`Product image refs: ${refs.length} · processing ${work.length}`);

  for (const item of work) {
    try {
      if (await cardExists(item.ref)) {
        stats.skipped += 1;
        continue;
      }
      const buf = await loadBuffer(item.ref);
      if (!buf?.length) {
        console.warn(`  missing: ${item.ref}`);
        stats.missing += 1;
        continue;
      }
      const out = await writeCard(item.ref, buf);
      console.log(`  ${dryRun ? 'would create' : 'created'}: ${out} (${Math.round(buf.length / 1024)}KB → card)`);
      stats.created += 1;
    } catch (e) {
      console.error(`  failed: ${item.ref} — ${e.message}`);
      stats.failed += 1;
    }
  }

  console.log('\nSummary:', stats);
  if (stats.failed > 0) process.exitCode = 1;
  process.exit();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
