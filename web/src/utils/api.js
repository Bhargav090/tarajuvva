import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  // Large product payloads (base64 images) can exceed default timeouts.
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  if (cfg.data instanceof FormData) {
    // Axios 1.x uses AxiosHeaders — delete() is required so the browser sets multipart boundary.
    if (cfg.headers && typeof cfg.headers.delete === 'function') {
      cfg.headers.delete('Content-Type');
    } else if (cfg.headers) {
      delete cfg.headers['Content-Type'];
    }
  }
  // Caller may set Authorization (e.g. admin hooks). Do not overwrite.
  const h = cfg.headers;
  const hasExplicitAuth =
    (typeof h?.get === 'function' && h.get('Authorization')) ||
    h?.Authorization ||
    h?.authorization;
  if (hasExplicitAuth) return cfg;
  // Only attach customer token here — admin routes set Authorization explicitly.
  // Falling back to admin_token caused shop orders to use an admin id and hit FK errors.
  const userToken = localStorage.getItem('user_token');
  if (userToken) cfg.headers['Authorization'] = `Bearer ${userToken}`;
  return cfg;
});

export default api;
