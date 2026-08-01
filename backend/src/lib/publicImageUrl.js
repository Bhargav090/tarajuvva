const { all } = require('../db/database');
const { isS3Ref, mediaReadMode, cdnUrl } = require('./s3Storage');

/** Map of s3://key → old_ref, loaded when MEDIA_READ=legacy */
let legacyMap = null;
let legacyLoadPromise = null;

async function loadLegacyMap() {
  if (legacyMap) return legacyMap;
  if (legacyLoadPromise) return legacyLoadPromise;
  legacyLoadPromise = (async () => {
    const map = new Map();
    try {
      const rows = await all(
        `SELECT new_ref, old_ref FROM media_migrations
         WHERE reverted_at IS NULL`
      );
      for (const row of rows || []) {
        if (row.new_ref && row.old_ref) map.set(String(row.new_ref), String(row.old_ref));
      }
    } catch (e) {
      // Table may not exist yet during first boot before initializeDatabase finishes.
      console.warn('[media] legacy journal load skipped:', e.message);
    }
    legacyMap = map;
    return map;
  })();
  return legacyLoadPromise;
}

/** Call after migrate/revert so the panic switch stays fresh without restart. */
function invalidateLegacyMap() {
  legacyMap = null;
  legacyLoadPromise = null;
}

/**
 * Map any stored image ref to a browser-usable URL.
 * - s3:// → CDN URL (or journal old_ref when MEDIA_READ=legacy)
 * - https://, /uploads/, data:, /api/media/ → unchanged
 */
function publicImageUrl(ref) {
  const v = String(ref || '').trim();
  if (!v) return null;

  if (isS3Ref(v)) {
    if (mediaReadMode() === 'legacy' && legacyMap?.has(v)) {
      return legacyMap.get(v);
    }
    // Fail closed: never hand raw s3:// to browsers
    return cdnUrl(v) || null;
  }

  return v;
}

async function publicImageUrlAsync(ref) {
  if (isS3Ref(ref) && mediaReadMode() === 'legacy') {
    await loadLegacyMap();
  }
  return publicImageUrl(ref);
}

function mapImageList(refs) {
  if (!Array.isArray(refs)) return [];
  return refs.map((r) => publicImageUrl(r)).filter(Boolean);
}

module.exports = {
  publicImageUrl,
  publicImageUrlAsync,
  mapImageList,
  loadLegacyMap,
  invalidateLegacyMap,
};
