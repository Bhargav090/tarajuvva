const express = require('express');
const { all } = require('../db/database');

const router = express.Router();

const SITE = 'https://tarajuvva.com';

const STATIC_PATHS = ['/', '/shop', '/reimagine', '/repair', '/donate', '/about', '/help'];

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc) {
  return `  <url><loc>${xmlEscape(loc)}</loc></url>`;
}

function buildSitemapXml(productIds = []) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...STATIC_PATHS.map((path) => urlEntry(`${SITE}${path === '/' ? '/' : path}`)),
    ...productIds.map((id) => urlEntry(`${SITE}/shop/${id}`)),
    '</urlset>',
    '',
  ].join('\n');
}

router.get('/sitemap.xml', async (req, res) => {
  let productIds = [];
  try {
    // Only select columns that exist on products (id / featured / created_at).
    // Avoid updated_at — that column is not on this table and previously 500'd the sitemap.
    const products = await all('SELECT id FROM products ORDER BY featured DESC, created_at DESC');
    productIds = products.map((product) => product.id).filter(Boolean);
  } catch (err) {
    // Crawlers should still get the public static pages even if the catalog query fails.
    console.error('Sitemap catalog query failed; serving static paths only:', err.message || err);
  }

  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.status(200).send(buildSitemapXml(productIds));
});

module.exports = router;
