/**
 * Product SEO schema + backfills, run from initializeDatabase(). All steps are idempotent.
 */

function isDupError(e, codes, errnos) {
  return codes.includes(e.code) || errnos.includes(e.errno);
}

async function ensureProductSeoSchema(pool) {
  const alters = [
    'ALTER TABLE products ADD COLUMN slug VARCHAR(100) NULL AFTER name',
    'ALTER TABLE products ADD COLUMN meta_description VARCHAR(300) NULL AFTER description',
  ];
  for (const sql of alters) {
    try {
      await pool.execute(sql);
    } catch (e) {
      if (!isDupError(e, ['ER_DUP_FIELDNAME'], [1060])) {
        console.warn('[db] products SEO column add skipped:', e.message);
      }
    }
  }
  try {
    await pool.execute('ALTER TABLE products ADD UNIQUE KEY uq_products_slug (slug)');
  } catch (e) {
    if (!isDupError(e, ['ER_DUP_KEYNAME'], [1061])) {
      console.warn('[db] products.slug unique key skipped:', e.message);
    }
  }
  const aliasColumns = `
      slug VARCHAR(100) PRIMARY KEY,
      product_id VARCHAR(36) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_product_slug_aliases_product (product_id)`;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS product_slug_aliases (${aliasColumns},
        CONSTRAINT fk_product_slug_aliases_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (e) {
    // e.g. products.id migrated with a different collation: keep the server booting without the FK.
    console.warn('[db] product_slug_aliases FK skipped:', e.message);
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS product_slug_aliases (${aliasColumns}
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}

/** Give every product without a slug one derived from its name (oldest products first). */
async function backfillProductSlugs() {
  const { all, run } = require('../db/database');
  const { generateSlug } = require('./productLookup');
  const rows = await all("SELECT id, name FROM products WHERE slug IS NULL OR slug = '' ORDER BY created_at ASC");
  for (const row of rows) {
    const slug = await generateSlug(row.name, row.id);
    await run('UPDATE products SET slug = ? WHERE id = ?', [slug, row.id]);
  }
  if (rows.length) console.log(`[db] product slugs backfilled: ${rows.length}`);
}

async function runProductSeoMigrations(pool) {
  await ensureProductSeoSchema(pool);
  await backfillProductSlugs();
}

module.exports = { runProductSeoMigrations };
