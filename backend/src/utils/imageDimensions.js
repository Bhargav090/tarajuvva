/** Read width/height from JPEG or PNG buffer (no extra deps). */
function readImageDimensions(buffer) {
  if (!buffer || buffer.length < 24) return null;

  // PNG
  if (buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (length < 2) break;
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  // WebP (RIFF)
  if (
    buffer.length >= 30 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff,
      };
    }
    if (chunk === 'VP8L' && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      };
    }
    if (chunk === 'VP8X' && buffer.length >= 30) {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
  }

  return null;
}

/** Accepted hero aspect ratios (width ÷ height). */
const HERO_ASPECT_RATIOS = [
  { label: '4:5', ratio: 4 / 5, tolerance: 0.04 },
  { label: '3:4', ratio: 3 / 4, tolerance: 0.04 },
];

const MIN_HERO_WIDTH = 800;
const MIN_HERO_HEIGHT = 1000;

function matchHeroAspect(width, height) {
  if (!width || !height) return null;
  const actual = width / height;
  for (const spec of HERO_ASPECT_RATIOS) {
    const delta = Math.abs(actual - spec.ratio) / spec.ratio;
    if (delta <= spec.tolerance) return spec.label;
  }
  return null;
}

function validateHeroImage(buffer) {
  const dims = readImageDimensions(buffer);
  if (!dims) {
    return { ok: false, message: 'Could not read image dimensions. Use JPEG, PNG, or WebP.' };
  }

  const { width, height } = dims;
  if (width < MIN_HERO_WIDTH || height < MIN_HERO_HEIGHT) {
    return {
      ok: false,
      message: `Image too small. Minimum ${MIN_HERO_WIDTH}×${MIN_HERO_HEIGHT}px (got ${width}×${height}px).`,
    };
  }

  const aspectLabel = matchHeroAspect(width, height);
  if (!aspectLabel) {
    const actual = (width / height).toFixed(3);
    return {
      ok: false,
      message: `Invalid aspect ratio (${width}×${height}, ≈${actual}). Only portrait 4:5 or 3:4 accepted (±4%).`,
      width,
      height,
    };
  }

  return { ok: true, width, height, aspectLabel };
}

module.exports = {
  readImageDimensions,
  HERO_ASPECT_RATIOS,
  MIN_HERO_WIDTH,
  MIN_HERO_HEIGHT,
  validateHeroImage,
};
