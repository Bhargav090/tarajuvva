const fs = require('fs');
const path = require('path');

/** Max serialized length per image (matches shop product limit). */
const MAX_IMAGE_STRING = 20 * 1024 * 1024;

const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i;
const LOCAL_UPLOAD_RE = /^\/uploads\//i;
const HTTP_RE = /^https?:\/\//i;

function isDataUrl(value) {
  return DATA_URL_RE.test(String(value || '').trim());
}

function isLocalUploadPath(value) {
  return LOCAL_UPLOAD_RE.test(String(value || '').trim());
}

function isHttpUrl(value) {
  return HTTP_RE.test(String(value || '').trim());
}

function mimeFromExt(ext) {
  const e = String(ext || '').toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.webp') return 'image/webp';
  if (e === '.gif') return 'image/gif';
  return 'image/jpeg';
}

function bufferToDataUrl(buffer, mimetype) {
  const mime = mimetype || 'image/jpeg';
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
  if (dataUrl.length > MAX_IMAGE_STRING) {
    const err = new Error('Image exceeds maximum serialized size (20MB).');
    err.status = 400;
    throw err;
  }
  return dataUrl;
}

function readFileToDataUrl(filePath, mimetype) {
  const buf = fs.readFileSync(filePath);
  const mime = mimetype || mimeFromExt(path.extname(filePath));
  return bufferToDataUrl(buf, mime);
}

/**
 * Convert a stored image reference to a data URL when possible.
 * - Already base64 → returned as-is
 * - /uploads/... → read from disk and encode
 * - https://... → returned as-is (external seed URLs)
 */
function pathRefToDataUrl(ref, uploadsDir) {
  const v = String(ref || '').trim();
  if (!v) return null;
  if (isDataUrl(v)) return v;
  if (isHttpUrl(v)) return v;

  if (isLocalUploadPath(v)) {
    const relative = v.replace(/^\/uploads\//i, '').replace(/^\/+/, '');
    const full = path.normalize(path.join(uploadsDir, relative));
    if (!full.startsWith(path.normalize(uploadsDir))) return null;
    if (!fs.existsSync(full)) return null;
    return readFileToDataUrl(full);
  }

  return null;
}

function parseJsonArray(raw, fallback = '[]') {
  try {
    const v = JSON.parse(raw ?? fallback);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Parse `data:image/...;base64,...` into mime + buffer. */
function parseDataUrl(dataUrl) {
  const v = String(dataUrl || '').trim();
  const match = v.match(/^data:(image\/[^;]+);base64,([\s\S]+)$/i);
  if (!match) return null;
  try {
    return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
  } catch {
    return null;
  }
}

module.exports = {
  MAX_IMAGE_STRING,
  DATA_URL_RE,
  LOCAL_UPLOAD_RE,
  HTTP_RE,
  isDataUrl,
  isLocalUploadPath,
  isHttpUrl,
  mimeFromExt,
  bufferToDataUrl,
  readFileToDataUrl,
  pathRefToDataUrl,
  parseJsonArray,
  parseDataUrl,
};
