/**
 * Resolve a /shop/<key> URL to a product. <key> may be the current slug, the product id
 * (legacy UUID links) or a retired slug — the last two must 301 to the current slug.
 */
const { get, all, run } = require('../db/database');
const { slugify, uniqueSlug } = require('./slug');
const { mapImageList } = require('../lib/publicImageUrl');

function parseJsonArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Light version of routes/shop.js parseProduct — just the fields the SEO pages render. */
function parseCatalogRow(row) {
  if (!row) return null;
  return {
    ...row,
    images: mapImageList(parseJsonArray(row.images)),
    ways_to_wear: parseJsonArray(row.ways_to_wear),
    tags: parseJsonArray(row.tags),
    sizes: parseJsonArray(row.sizes),
    similar_product_ids: parseJsonArray(row.similar_product_ids).map(String),
    custom_sizing: row.custom_sizing == null ? true : Boolean(Number(row.custom_sizing)),
  };
}

/** @returns {Promise<{ row: object, isCanonical: boolean } | null>} */
async function findProductRowByKey(key) {
  const k = String(key || '').trim();
  if (!k) return null;

  const bySlug = await get('SELECT * FROM products WHERE slug = ?', [k]);
  if (bySlug) return { row: bySlug, isCanonical: true };

  const byId = await get('SELECT * FROM products WHERE id = ?', [k]);
  if (byId) return { row: byId, isCanonical: !byId.slug };

  const alias = await get(
    'SELECT p.* FROM product_slug_aliases a JOIN products p ON p.id = a.product_id WHERE a.slug = ?',
    [k.toLowerCase()]
  );
  if (alias) return { row: alias, isCanonical: false };
  return null;
}

async function isSlugTaken(slug, excludeProductId = null) {
  const owner = await get('SELECT id FROM products WHERE slug = ?', [slug]);
  if (owner && String(owner.id) !== String(excludeProductId)) return true;
  const alias = await get('SELECT product_id FROM product_slug_aliases WHERE slug = ?', [slug]);
  if (alias && String(alias.product_id) !== String(excludeProductId)) return true;
  // A slug must never shadow another product's id (ids are also valid /shop/<key> URLs).
  const idClash = await get('SELECT id FROM products WHERE id = ?', [slug]);
  return Boolean(idClash && String(idClash.id) !== String(excludeProductId));
}

async function generateSlug(name, excludeProductId = null) {
  return uniqueSlug(slugify(name), (candidate) => isSlugTaken(candidate, excludeProductId));
}

/**
 * Point a product at `newSlug`, keeping the old slug as a redirecting alias.
 * Reclaiming one of the product's own retired slugs removes that alias.
 */
async function changeProductSlug(productId, oldSlug, newSlug) {
  if (!newSlug || newSlug === oldSlug) return;
  await run('DELETE FROM product_slug_aliases WHERE slug = ? AND product_id = ?', [newSlug, productId]);
  await run('UPDATE products SET slug = ? WHERE id = ?', [newSlug, productId]);
  if (oldSlug) {
    await run(
      'INSERT IGNORE INTO product_slug_aliases (slug, product_id) VALUES (?, ?)',
      [oldSlug, productId]
    );
  }
}

async function listCatalog() {
  const rows = await all('SELECT * FROM products ORDER BY featured DESC, created_at DESC');
  return rows.map(parseCatalogRow);
}

module.exports = {
  parseCatalogRow,
  findProductRowByKey,
  isSlugTaken,
  generateSlug,
  changeProductSlug,
  listCatalog,
};
