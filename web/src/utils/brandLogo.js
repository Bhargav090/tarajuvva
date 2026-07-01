import logoOnDarkBg from '../assets/icons/Artboard 2 copy 2@2x-8.png';
import logoOnLightBg from '../assets/icons/Artboard 3@2x-8.png';

/** True when foreground is light — use the white wordmark. */
export function isLightForeground(color) {
  if (!color) return false;
  const c = String(color).trim().toLowerCase();
  return c === '#ffffff' || c === '#fff' || c === 'white';
}

/** Pick wordmark for a section background / text palette. */
export function brandLogoForForeground(foregroundColor) {
  return isLightForeground(foregroundColor) ? logoOnDarkBg : logoOnLightBg;
}

export { logoOnDarkBg, logoOnLightBg };
