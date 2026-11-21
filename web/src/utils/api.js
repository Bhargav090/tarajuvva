import axios from 'axios';
import { decodeJwtPayload, emitSessionExpired } from './session';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  // Large product payloads (base64 images) can exceed default timeouts.
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  if (cfg.data instanceof FormData) {
    // Axios 1.x uses AxiosHeaders - delete() is required so the browser sets multipart boundary.
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
  // Only attach customer token here - admin routes set Authorization explicitly.
  // Falling back to admin_token caused shop orders to use an admin id and hit FK errors.
  const userToken = localStorage.getItem('user_token');
  if (userToken) cfg.headers['Authorization'] = `Bearer ${userToken}`;
  return cfg;
});

function bearerToken(config) {
  const headers = config?.headers;
  if (!headers) return '';
  const raw = typeof headers.get === 'function'
    ? (headers.get('Authorization') || headers.get('authorization'))
    : (headers.Authorization || headers.authorization);
  const match = String(raw || '').match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function sessionKind(token) {
  if (!token) return null;
  if (token === localStorage.getItem('admin_token')) return 'admin';
  if (token === localStorage.getItem('user_token')) return 'user';
  const role = decodeJwtPayload(token)?.role;
  if (role === 'admin') return 'admin';
  if (role) return 'user';
  return null;
}

function isSessionAuthFailure(error) {
  const status = error?.response?.status;
  if (status !== 401 && status !== 403) return false;
  const url = String(error.config?.url || '');
  if (/\/auth\/(login|google|register)(\?|$)/.test(url)) return false;
  if (url.includes('/auth/admin/password')) return false;
  const data = error.response?.data || {};
  if (data.code === 'TOKEN_EXPIRED' || data.code === 'TOKEN_INVALID') return true;
  const message = String(data.message || '');
  if (/^(Invalid token|Session expired)$/i.test(message)) return true;
  if (status === 401 && /account not found|sign in again/i.test(message)) return true;
  if (url.includes('/auth/verify') && (status === 401 || status === 403)) return true;
  return false;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isSessionAuthFailure(error)) {
      const kind = sessionKind(bearerToken(error.config));
      if (kind === 'admin') localStorage.removeItem('admin_token');
      if (kind === 'user') {
        localStorage.removeItem('user_token');
        delete api.defaults.headers.common['Authorization'];
      }
      if (kind) emitSessionExpired(kind);
    }
    return Promise.reject(error);
  },
);

export default api;
