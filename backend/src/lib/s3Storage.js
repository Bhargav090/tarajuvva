const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const S3_REF_RE = /^s3:\/\//i;

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

let client;

function mediaStorageIsS3() {
  return String(process.env.MEDIA_STORAGE || 'disk').toLowerCase() === 's3';
}

function mediaReadMode() {
  const mode = String(process.env.MEDIA_READ || 's3').toLowerCase();
  return mode === 'legacy' ? 'legacy' : 's3';
}

function isS3Ref(value) {
  return S3_REF_RE.test(String(value || '').trim());
}

function s3Key(ref) {
  const v = String(ref || '').trim();
  if (!isS3Ref(v)) return null;
  return v.replace(/^s3:\/\//i, '').replace(/^\/+/, '');
}

function cdnBase() {
  return String(process.env.CDN_BASE_URL || '').replace(/\/$/, '');
}

function cdnUrl(ref) {
  const key = s3Key(ref);
  const base = cdnBase();
  if (!key || !base) return null;
  return `${base}/${key}`;
}

/** Collapse a public CDN URL back to s3://key when it matches CDN_BASE_URL. */
function s3RefFromPublicUrl(url) {
  const v = String(url || '').trim();
  if (!v) return null;
  if (isS3Ref(v)) return v.startsWith('s3://') ? v : `s3://${s3Key(v)}`;
  const base = cdnBase();
  if (!base) return null;
  if (!v.startsWith(`${base}/`)) return null;
  const key = v.slice(base.length + 1).replace(/^\/+/, '');
  if (!key || key.includes('..')) return null;
  return `s3://${key}`;
}

function getClient() {
  if (client) return client;
  const region = process.env.AWS_REGION || 'ap-south-1';
  client = new S3Client({
    region,
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
  return client;
}

function requireBucket() {
  const bucket = String(process.env.S3_BUCKET || '').trim();
  if (!bucket) {
    const err = new Error('S3_BUCKET is not configured');
    err.status = 500;
    throw err;
  }
  return bucket;
}

/**
 * Upload a buffer to S3. Returns s3://prefix/uuid.ext
 * Never overwrites an existing key (uuid collision is astronomically unlikely;
 * if HeadObject succeeds we generate a new key).
 */
async function uploadBuffer(buffer, mimetype, prefix = 'misc') {
  if (!buffer?.length) {
    const err = new Error('Empty image buffer');
    err.status = 400;
    throw err;
  }
  const bucket = requireBucket();
  const mime = String(mimetype || 'image/jpeg').toLowerCase();
  const ext = EXT_BY_MIME[mime] || '.jpg';
  const cleanPrefix = String(prefix || 'misc').replace(/^\/+|\/+$/g, '');

  let key;
  let attempts = 0;
  do {
    key = `${cleanPrefix}/${uuidv4()}${ext}`;
    attempts += 1;
    try {
      await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      // exists — try again
    } catch (e) {
      if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) break;
      // Missing credentials / bucket: surface clearly
      if (attempts === 1 && (e.name === 'CredentialsProviderError' || e.Code === 'NoSuchBucket')) {
        throw e;
      }
      if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) break;
      // For AccessDenied on Head, still try Put (IAM may lack HeadObject)
      break;
    }
  } while (attempts < 3);

  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `s3://${key}`;
}

/**
 * Upload a buffer to an explicit S3 key (used for sibling card variants).
 * Overwrites if the key already exists (idempotent backfill).
 */
async function uploadBufferAtKey(buffer, mimetype, key) {
  if (!buffer?.length) {
    const err = new Error('Empty image buffer');
    err.status = 400;
    throw err;
  }
  const cleanKey = String(key || '').replace(/^\/+/, '').trim();
  if (!cleanKey || cleanKey.includes('..')) {
    const err = new Error('Invalid S3 key');
    err.status = 400;
    throw err;
  }
  const bucket = requireBucket();
  const mime = String(mimetype || 'application/octet-stream').toLowerCase();
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: cleanKey,
      Body: buffer,
      ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );
  return `s3://${cleanKey}`;
}

async function objectExists(key) {
  const cleanKey = String(key || '').replace(/^\/+/, '').trim();
  if (!cleanKey) return false;
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: requireBucket(), Key: cleanKey }));
    return true;
  } catch (e) {
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
    // AccessDenied on Head — assume missing so Put can proceed
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
    return false;
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = {
  S3_REF_RE,
  mediaStorageIsS3,
  mediaReadMode,
  isS3Ref,
  s3Key,
  cdnUrl,
  cdnBase,
  s3RefFromPublicUrl,
  uploadBuffer,
  uploadBufferAtKey,
  objectExists,
  sha256,
  getClient,
  requireBucket,
};
