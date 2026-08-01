const { mediaStorageIsS3, uploadBuffer, isS3Ref, s3RefFromPublicUrl } = require('./s3Storage');
const { isDataUrl, isHttpUrl, isLocalUploadPath } = require('./imageDataUrl');

/**
 * Persist a new image buffer. Returns a storeable ref:
 * - s3://... when MEDIA_STORAGE=s3
 * - caller-supplied diskSave result when MEDIA_STORAGE=disk
 */
async function persistImageBuffer(buffer, mimetype, { prefix, diskSave }) {
  if (mediaStorageIsS3()) {
    return uploadBuffer(buffer, mimetype, prefix);
  }
  if (typeof diskSave !== 'function') {
    const err = new Error('diskSave required when MEDIA_STORAGE=disk');
    err.status = 500;
    throw err;
  }
  return diskSave(buffer, mimetype);
}

/**
 * Normalize a retained admin image value back to a storeable ref.
 * Accepts s3://, CDN URLs, /uploads/, https://, and data: (via dataSave).
 */
async function normalizeRetainRef(value, { dataSave } = {}) {
  const s = String(value || '').trim();
  if (!s) return null;

  const fromCdn = s3RefFromPublicUrl(s);
  if (fromCdn) return fromCdn;
  if (isS3Ref(s)) {
    const key = s.replace(/^s3:\/\/*/i, '');
    return `s3://${key}`;
  }
  if (isHttpUrl(s) || isLocalUploadPath(s)) return s;
  if (isDataUrl(s) && typeof dataSave === 'function') return dataSave(s);
  return null;
}

module.exports = { persistImageBuffer, normalizeRetainRef };
