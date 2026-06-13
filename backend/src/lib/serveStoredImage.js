const path = require('path');
const fs = require('fs');
const {
  isDataUrl,
  isLocalUploadPath,
  isHttpUrl,
  mimeFromExt,
  parseDataUrl,
} = require('./imageDataUrl');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function resolveStoredImage(ref) {
  const v = String(ref || '').trim();
  if (!v) return null;

  if (isDataUrl(v)) {
    const parsed = parseDataUrl(v);
    if (!parsed) return null;
    return { mime: parsed.mime, buffer: parsed.buffer };
  }

  if (isLocalUploadPath(v)) {
    const full = path.join(UPLOADS_DIR, path.basename(v));
    if (!fs.existsSync(full)) return null;
    const buffer = fs.readFileSync(full);
    return { mime: mimeFromExt(path.extname(full)), buffer };
  }

  if (isHttpUrl(v)) {
    return { redirect: v };
  }

  return null;
}

/**
 * Stream a stored image reference with long-lived cache headers.
 * ETag is a stable id (not the blob) so 304 checks are instant.
 */
function sendStoredImage(req, res, ref, etag) {
  const asset = resolveStoredImage(ref);
  if (!asset) {
    return res.status(404).json({ success: false, message: 'Image not found.' });
  }

  if (asset.redirect) {
    return res.redirect(302, asset.redirect);
  }

  res.type(asset.mime);
  return res.send(asset.buffer);
}

module.exports = { resolveStoredImage, sendStoredImage, UPLOADS_DIR };
