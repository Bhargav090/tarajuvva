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

router.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await all('SELECT id FROM products ORDER BY featured DESC, created_at DESC');
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...STATIC_PATHS.map((path) => urlEntry(`${SITE}${path === '/' ? '/' : path}`)),
      ...products.map((product) => urlEntry(`${SITE}/shop/${product.id}`)),
      '</urlset>',
      '',
    ].join('\n');
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(body);
  } catch (err) {
    console.error(err);
    res.status(500).type('text/plain').send('Sitemap unavailable');
  }
});

module.exports = router;
