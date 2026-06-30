export const SIDE_ASPECT_WIDTH = {
  '4/3': 480,
  '16/9': 560,
  '2/1': 520,
  '3/4': 380,
  '4/5': 360,
};

/** Larger side visuals for full-height waitlist heroes (Repair / Donate). */
export const TALL_SIDE_ASPECT_WIDTH = {
  '3/4': 480,
  '4/5': 400,
};

export function aspectHeight(width, ratio) {
  if (!ratio) return null;
  const [rw, rh] = ratio.split('/').map(Number);
  return Math.round((width * rh) / rw);
}

export function sideWidthForAspect(aspectRatio) {
  return SIDE_ASPECT_WIDTH[aspectRatio] ?? 440;
}
