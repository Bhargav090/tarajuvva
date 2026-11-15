/**
 * Small 1200x630 JPEG share previews for product pages (og:image / twitter:image).
 * Product originals can be 3-4 MB camera files, which WhatsApp and other link previewers skip.
 * The whole first photo is fitted over a blurred copy of itself, so nothing is cropped.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { SITE } = require('./site');
const { cardSiblingPath } = require('../lib/imageVariants');

const WIDTH = 1200;
const HEIGHT = 630;
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const CACHE_LIMIT = 100;
const cache = new Map(); // key: product id + source url → jpeg buffer

function firstImage(product) {
  return (product?.images || []).find((src) => typeof src === 'string' && src && !src.startsWith('data:')) || null;
}

/** Short version tag so link previewers refetch when the first photo changes. */
function imageVersion(src) {
  return crypto.createHash('sha1').update(String(src)).digest('hex').slice(0, 10);
}

function shareImageUrl(product) {
  const src = firstImage(product);
  if (!src || !product?.id) return null;
  return `${SITE}/api/seo/share/${encodeURIComponent(product.id)}.jpg?v=${imageVersion(src)}`;
}

/** Prefer the small card WebP the shop grid already uses (~30-80 KB); fall back to the original. */
async function loadSource(src) {
  const card = cardSiblingPath(src);
  if (card && card !== src) {
    try {
      return await loadFile(card);
    } catch {
      // No card variant for this image (older upload): use the original.
    }
  }
  return loadFile(src);
}

async function loadFile(src) {
  if (src.startsWith('/uploads/')) {
    const local = path.join(UPLOADS_DIR, path.normalize(src.slice('/uploads/'.length)).replace(/^(\.\.[/\\])+/, ''));
    if (local.startsWith(UPLOADS_DIR) && fs.existsSync(local)) return fs.promises.readFile(local);
  }
  const url = /^https?:\/\//i.test(src) ? src : `${SITE}${src.startsWith('/') ? '' : '/'}${src}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'manual' });
  if (!res.ok) throw new Error(`share image source ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function renderShareImage(buffer) {
  const base = sharp(buffer, { failOn: 'none' }).rotate();
  const background = await base
    .clone()
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .blur(28)
    .modulate({ brightness: 0.85 })
    .toBuffer();
  const foreground = await base.clone().resize(WIDTH, HEIGHT, { fit: 'inside' }).toBuffer();
  return sharp(background)
    .composite([{ input: foreground, gravity: 'centre' }])
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

async function getShareImage(product) {
  const src = firstImage(product);
  if (!src) return null;
  const key = `${product.id}|${src}`;
  if (cache.has(key)) return cache.get(key);
  const jpeg = await renderShareImage(await loadSource(src));
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
  cache.set(key, jpeg);
  return jpeg;
}

/** Build every product's preview in the background after boot, so the first share isn't slow. */
async function warmShareImages(products) {
  let made = 0;
  for (const product of products || []) {
    try {
      if (await getShareImage(product)) made += 1;
    } catch (err) {
      console.warn('[seo] share image warm-up skipped:', product?.id, err.message || err);
    }
  }
  console.log(`[seo] share images ready: ${made}`);
}

module.exports = { shareImageUrl, getShareImage, warmShareImages, SHARE_WIDTH: WIDTH, SHARE_HEIGHT: HEIGHT };
