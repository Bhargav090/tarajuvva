/** Resolve image src for <img> — base64 and https pass through; legacy /uploads/ still supported. */
export function uploadUrl(path) {
  if (!path) return '';
  if (/^data:image\//i.test(path)) return path;
  if (/^https?:\/\//i.test(path)) return path;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
