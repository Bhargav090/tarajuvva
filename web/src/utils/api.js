import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  // Large product payloads (base64 images) can exceed default timeouts.
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  // Caller may set Authorization (e.g. admin hooks). Do not overwrite.
  const h = cfg.headers;
  const hasExplicitAuth =
    (typeof h?.get === 'function' && h.get('Authorization')) ||
    h?.Authorization ||
    h?.authorization;
  if (hasExplicitAuth) return cfg;
  const userToken = localStorage.getItem('user_token');
  const adminToken = localStorage.getItem('admin_token');
  const token = userToken || adminToken;
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

export default api;
