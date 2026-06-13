/** Hero image upload requirements — shared by admin UI and client-side validation. */
const BASE_REQUIREMENTS = {
  aspectRatios: ['8:7'],
  aspectTolerance: 0.04,
  minWidth: 1280,
  minHeight: 1120,
  displayWidth: 640,
  displayHeight: 560,
  maxFileSizeMb: 8,
};

export const HERO_IMAGE_REQUIREMENTS = {
  ...BASE_REQUIREMENTS,
  formats: ['image/jpeg', 'image/png', 'image/webp'],
  formatLabels: ['JPEG', 'PNG', 'WebP'],
};

export const REIMAGINE_HERO_IMAGE_REQUIREMENTS = {
  ...BASE_REQUIREMENTS,
  formats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  formatLabels: ['JPEG', 'PNG', 'WebP', 'GIF'],
};

export function getHeroImageRequirements(context = 'home') {
  return context === 'reimagine' ? REIMAGINE_HERO_IMAGE_REQUIREMENTS : HERO_IMAGE_REQUIREMENTS;
}

const RATIO_SPECS = [{ label: '8:7', ratio: 8 / 7 }];

export function matchHeroAspect(width, height) {
  if (!width || !height) return null;
  const actual = width / height;
  for (const spec of RATIO_SPECS) {
    const delta = Math.abs(actual - spec.ratio) / spec.ratio;
    if (delta <= BASE_REQUIREMENTS.aspectTolerance) return spec.label;
  }
  return null;
}

/** Validate a File before upload; returns error string or null if OK. */
export function validateHeroImageFile(file, context = 'home') {
  const req = getHeroImageRequirements(context);
  if (!file) return 'No file selected.';
  if (!req.formats.includes(file.type)) {
    return `Invalid format. Use ${req.formatLabels.join(', ')} only.`;
  }
  if (file.size > req.maxFileSizeMb * 1024 * 1024) {
    return `File too large. Max ${req.maxFileSizeMb}MB.`;
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
export async function validateHeroImageDimensions(file, context = 'home') {
  const req = getHeroImageRequirements(context);
  const basic = validateHeroImageFile(file, context);
  if (basic) return basic;

  let dims;
  try {
    dims = await readImageDimensionsFromFile(file);
  } catch {
    return 'Could not read image dimensions.';
  }

  const { width, height } = dims;
  const { minWidth, minHeight, aspectRatios } = req;

  if (width < minWidth || height < minHeight) {
    return `Image too small (${width}×${height}px). Minimum ${minWidth}×${minHeight}px.`;
  }

  const aspect = matchHeroAspect(width, height);
  if (!aspect) {
    return `Invalid aspect ratio (${width}×${height}px). Required portrait ${aspectRatios.join(' or ')} (±4%).`;
  }

  return null;
}
