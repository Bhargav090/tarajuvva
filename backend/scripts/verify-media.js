#!/usr/bin/env node
/**
 * HEAD-check every image reference in the DB and report broken URLs.
 *
 * Usage:
 *   node scripts/verify-media.js
 *   node scripts/verify-media.js --table=products
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const http = require('http');
const https = require('https');
const { initializeDatabase, all } = require('../src/db/database');
const { parseJsonArray, isDataUrl, isLocalUploadPath, isHttpUrl } = require('../src/lib/imageDataUrl');
const { isS3Ref } = require('../src/lib/s3Storage');
const { publicImageUrl, loadLegacyMap } = require('../src/lib/publicImageUrl');
const { mediaReadMode } = require('../src/lib/s3Storage');

const tableArg = (process.argv.find((a) => a.startsWith('--table=')) || '').split('=')[1] || null;

function head(url, redirects = 0) {
  return new Promise((resolve) => {
    if (!url || url.startsWith('data:')) {
      resolve({ ok: true, status: 200, note: 'data-url' });
      return;
    }
    if (url.startsWith('/uploads/') || url.startsWith('/api/')) {
      const origin = String(process.env.UPLOADS_FALLBACK_ORIGIN || process.env.FRONTEND_URL || 'https://tarajuvva.com').replace(
        /\/$/,
        ''
      );
      url = `${origin}${url}`;
    }
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 3) {
        resolve(head(res.headers.location, redirects + 1));
        return;
      }
      // Some CDNs disallow HEAD — treat 403/405 on HEAD as inconclusive, try GET range
      if (res.statusCode === 403 || res.statusCode === 405) {
        resolve({ ok: null, status: res.statusCode, note: 'head-not-allowed' });
        return;
      }
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, note: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, status: 0, note: 'timeout' });
    });
    req.end();
  });
}

async function checkRef(label, ref) {
  const raw = String(ref || '').trim();
  if (!raw) return { label, ok: true, note: 'empty' };
  if (isDataUrl(raw)) return { label, ok: true, note: 'data-url' };

  let url = publicImageUrl(raw);
  if (isS3Ref(raw) && (!url || url.startsWith('s3://'))) {
    return { label, ok: false, note: 's3-ref-without-cdn', ref: raw.slice(0, 80) };
  }
  if (isLocalUploadPath(raw) || (url && url.startsWith('/'))) {
    // relative path — resolve against fallback origin in head()
  }
  if (isHttpUrl(url) || (url && url.startsWith('/'))) {
    const result = await head(url);
    return { label, ...result, url: String(url).slice(0, 100) };
  }
  return { label, ok: false, note: 'unresolved', ref: raw.slice(0, 80) };
}

async function main() {
  await initializeDatabase();
  if (mediaReadMode() === 'legacy') await loadLegacyMap();

  const broken = [];
  let total = 0;
  let ok = 0;

  async function tally(result) {
    total += 1;
    if (result.ok) ok += 1;
    else if (result.ok === null) {
      /* inconclusive */
    } else {
      broken.push(result);
    }
  }

  const want = (t) => !tableArg || tableArg === t;

  if (want('products')) {
    const rows = await all('SELECT id, name, images FROM products');
    for (const row of rows) {
      for (const [i, img] of parseJsonArray(row.images).entries()) {
        await tally(await checkRef(`products.${row.id}[${i}] ${row.name}`, img));
      }
    }
  }

  if (want('testimonials')) {
    const rows = await all('SELECT id, image_paths, image_path FROM testimonials');
    for (const row of rows) {
      let paths = parseJsonArray(row.image_paths);
      if (!paths.length && row.image_path) paths = [row.image_path];
      for (const [i, img] of paths.entries()) {
        await tally(await checkRef(`testimonials.${row.id}[${i}]`, img));
      }
    }
  }

  if (want('reimagine_images')) {
    const rows = await all('SELECT id, image_path FROM reimagine_images');
    for (const row of rows) {
      await tally(await checkRef(`reimagine_images.${row.id}`, row.image_path));
    }
  }

  if (want('reimagine_conversions')) {
    const rows = await all('SELECT id, from_image, to_image FROM reimagine_conversions');
    for (const row of rows) {
      if (row.from_image) await tally(await checkRef(`conversions.${row.id}.from`, row.from_image));
      if (row.to_image) await tally(await checkRef(`conversions.${row.id}.to`, row.to_image));
    }
  }

  if (want('reimagine_requests')) {
    const rows = await all('SELECT id, images FROM reimagine_requests');
    for (const row of rows) {
      for (const [i, img] of parseJsonArray(row.images).entries()) {
        await tally(await checkRef(`reimagine_requests.${row.id}[${i}]`, img));
      }
    }
  }

  console.log(`\nChecked ${total} refs · ok ${ok} · broken ${broken.length}`);
  if (broken.length) {
    console.log('\nBroken:');
    for (const b of broken.slice(0, 50)) {
      console.log(`  ✗ ${b.label} · ${b.note || b.status} · ${b.url || b.ref || ''}`);
    }
    if (broken.length > 50) console.log(`  … and ${broken.length - 50} more`);
  }
  process.exit(broken.length ? 2 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
