/** Hero image upload requirements — shared by admin UI and client-side validation. */
export const HERO_IMAGE_REQUIREMENTS = {
  aspectRatios: ['8:7'],
  aspectTolerance: 0.04,
  minWidth: 1280,
  minHeight: 1120,
  displayWidth: 640,
  displayHeight: 560,
  maxFileSizeMb: 8,
  formats: ['image/jpeg', 'image/png', 'image/webp'],
  formatLabels: ['JPEG', 'PNG', 'WebP'],
};

const RATIO_SPECS = [{ label: '8:7', ratio: 8 / 7 }];

export function matchHeroAspect(width, height) {
  if (!width || !height) return null;
  const actual = width / height;
  for (const spec of RATIO_SPECS) {
    const delta = Math.abs(actual - spec.ratio) / spec.ratio;
    if (delta <= HERO_IMAGE_REQUIREMENTS.aspectTolerance) return spec.label;
  }
  return null;
}

/** Validate a File before upload; returns error string or null if OK. */
export function validateHeroImageFile(file) {
  if (!file) return 'No file selected.';
  if (!HERO_IMAGE_REQUIREMENTS.formats.includes(file.type)) {
    return `Invalid format. Use ${HERO_IMAGE_REQUIREMENTS.formatLabels.join(', ')} only.`;
  }
  if (file.size > HERO_IMAGE_REQUIREMENTS.maxFileSizeMb * 1024 * 1024) {
    return `File too large. Max ${HERO_IMAGE_REQUIREMENTS.maxFileSizeMb}MB.`;
  }
  return null;
}

/** Load image dimensions from a File via browser Image API. */
export function readImageDimensionsFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image.'));
    };
    img.src = url;
  });
}

/** Full client-side validation including aspect ratio and min dimensions. */
export async function validateHeroImageDimensions(file) {
  const basic = validateHeroImageFile(file);
  if (basic) return basic;

  let dims;
  try {
    dims = await readImageDimensionsFromFile(file);
  } catch {
    return 'Could not read image dimensions.';
  }

  const { width, height } = dims;
  const { minWidth, minHeight, aspectRatios } = HERO_IMAGE_REQUIREMENTS;

  if (width < minWidth || height < minHeight) {
    return `Image too small (${width}×${height}px). Minimum ${minWidth}×${minHeight}px.`;
  }

  const aspect = matchHeroAspect(width, height);
  if (!aspect) {
    return `Invalid aspect ratio (${width}×${height}px). Required portrait ${aspectRatios.join(' or ')} (±4%).`;
  }

  return null;
}
