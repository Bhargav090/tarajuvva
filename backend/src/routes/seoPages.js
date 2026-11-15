/**
 * Server-rendered HTML for public pages (nginx proxies these paths here; see deploy/nginx).
 * Any failure answers 503 so nginx falls back to the plain SPA shell instead of an error page.
 */
const express = require('express');
const { STATIC_PAGES, STATIC_PATHS } = require('../seo/site');
const { buildProductSeo, categorySlug } = require('../seo/productSeo');
const { findProductRowByKey, parseCatalogRow, listCatalog } = require('../seo/productLookup');
const {
  loadTemplate,
  templateHasMarkers,
  renderStaticPage,
  renderProductPage,
  renderNotFound,
  renderSitemapPage,
  canonicalFor,
} = require('../seo/render');

const router = express.Router();

const CACHE_CONTROL = 'public, max-age=300';

function queryString(req) {
  const i = req.originalUrl.indexOf('?');
  return i === -1 ? '' : req.originalUrl.slice(i);
}

function sendHtml(res, status, html) {
  res.status(status).set('Cache-Control', CACHE_CONTROL).type('html').send(html);
}

/** Template or a response already sent (503 / unmarked template passthrough). */
function templateOr(res) {
  const template = loadTemplate();
  if (!template) {
    res.sendStatus(503);
    return null;
  }
  if (!templateHasMarkers(template)) {
    // Old build without SEO markers (mid-deploy): serve it as the plain SPA.
    res.status(200).type('html').send(template);
    return null;
  }
  return template;
}

function relatedProducts(product, catalog, limit = 4) {
  const byId = new Map(catalog.map((p) => [String(p.id), p]));
  const picked = (product.similar_product_ids || []).map((id) => byId.get(String(id))).filter(Boolean);
  for (const p of catalog) {
    if (picked.length >= limit) break;
    if (String(p.id) === String(product.id) || picked.includes(p)) continue;
    if (p.category === product.category) picked.push(p);
  }
  return picked.slice(0, limit);
}

router.get(STATIC_PATHS, async (req, res) => {
  try {
    const pathname = STATIC_PATHS.find((p) => p === req.path) || req.path.replace(/\/+$/, '') || '/';
    if (req.path !== pathname) return res.redirect(301, `${pathname}${queryString(req)}`);
    const page = STATIC_PAGES[pathname];
    const template = templateOr(res);
    if (!template) return undefined;
    const needsProducts = page.productListByCategory || page.productListHeading;
    const products = needsProducts ? await listCatalog() : [];
    return sendHtml(res, 200, renderStaticPage(template, pathname, page, products));
  } catch (err) {
    console.error('SEO page render failed:', req.path, err.message || err);
    return res.sendStatus(503);
  }
});

async function isCategorySlug(segment) {
  const catalog = await listCatalog();
  return catalog.some((p) => categorySlug(p.category) === String(segment).toLowerCase());
}

// Canonical product URL is /shop/<type>/<slug>. /shop/<slug-or-id> and a wrong <type> still resolve
// (old links, products moved to another type) and 301 to the canonical one.
router.get(['/shop/:category/:key', '/shop/:key'], async (req, res) => {
  try {
    // /shop/bottoms on its own is a product type, not a product: send it to the shop.
    if (!req.params.category && (await isCategorySlug(req.params.key))) {
      return res.redirect(301, `/shop${queryString(req)}`);
    }
    const found = await findProductRowByKey(req.params.key);
    if (!found) {
      const template = templateOr(res);
      if (!template) return undefined;
      return sendHtml(res, 404, renderNotFound(template, req.path));
    }
    const product = parseCatalogRow(found.row);
    const seo = buildProductSeo(product);
    // Legacy UUID links, retired slugs and trailing slashes all collapse to one URL.
    if (req.path !== seo.path) return res.redirect(301, `${seo.path}${queryString(req)}`);

    const template = templateOr(res);
    if (!template) return undefined;
    const catalog = await listCatalog();
    return sendHtml(res, 200, renderProductPage(template, product, relatedProducts(product, catalog)));
  } catch (err) {
    console.error('SEO product render failed:', req.path, err.message || err);
    return res.sendStatus(503);
  }
});

router.get('/sitemap.html', async (req, res) => {
  try {
    const template = templateOr(res);
    if (!template) return undefined;
    return sendHtml(res, 200, renderSitemapPage(template, await listCatalog()));
  } catch (err) {
    console.error('SEO sitemap render failed:', err.message || err);
    return res.sendStatus(503);
  }
});

/** Title/description/canonical for client-side navigations (components/seo/SeoMeta.jsx). */
router.get('/api/seo/meta', async (req, res) => {
  const pathname = String(req.query.path || '/').split('?')[0].replace(/\/+$/, '') || '/';
  const page = STATIC_PAGES[pathname];
  if (page) {
    return res.json({ success: true, title: page.title, description: page.description, canonical: canonicalFor(pathname) });
  }
  const m = pathname.match(/^\/shop\/(?:[^/]+\/)?([^/]+)$/);
  if (m) {
    try {
      const found = await findProductRowByKey(decodeURIComponent(m[1]));
      if (found) {
        const seo = buildProductSeo(parseCatalogRow(found.row));
        return res.json({ success: true, title: seo.title, description: seo.description, canonical: seo.canonical, path: seo.path });
      }
    } catch (err) {
      console.error('SEO meta lookup failed:', err.message || err);
    }
  }
  return res.status(404).json({ success: false });
});

module.exports = router;
