import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  // Prefer user token; fall back to admin token
  const userToken  = localStorage.getItem('user_token');
  const adminToken = localStorage.getItem('admin_token');
  const token = userToken || adminToken;
  if (token) cfg.headers['Authorization'] = `Bearer ${token}`;
  return cfg;
});

export default api;
