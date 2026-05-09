import { useState, useEffect } from 'react';
import api from '../utils/api';

// ── Admin Auth ─────────────────────────────────────────────────────────────────
export function useAdminAuth() {
  const [token, setToken]   = useState(localStorage.getItem('admin_token'));
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem('admin_token');
    setToken(t);
    setIsLoaded(true);
  }, []);

  const login = async (username, password) => {
    try {
      const { data } = await api.post('/auth/login', { username, password });
      if (data.success && data.admin) {
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        return null;
      }
      return data.message || 'Invalid credentials';
    } catch (err) {
      return err.response?.data?.message || 'Login failed';
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  return { token, login, logout, isLoaded };
}

// ── Admin Stats ────────────────────────────────────────────────────────────────
export function useAdminStats() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats', { headers: { Authorization: `Bearer ${localStorage.getItem('admin_token')}` } })
      .then(r => setStats(r.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

// ── Admin Orders ───────────────────────────────────────────────────────────────
export function useAdminOrders() {
  const [orders, setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  useEffect(() => {
    api.get('/shop/orders', { headers: authHeader })
      .then(r => setOrders(r.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/shop/orders/${id}/status`, { status }, { headers: authHeader });
    setOrders(p => p.map(o => o.id === id ? { ...o, status } : o));
  };

  return { orders, loading, updateStatus };
}

// ── Admin Reimagine ────────────────────────────────────────────────────────────
export function useAdminReimagine() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  useEffect(() => {
    api.get('/reimagine/requests', { headers: authHeader })
      .then(r => setRequests(r.data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/reimagine/requests/${id}/status`, { status }, { headers: authHeader });
    setRequests(p => p.map(r => r.id === id ? { ...r, status } : r));
  };

  return { requests, loading, updateStatus };
}

// ── Admin Waitlist ─────────────────────────────────────────────────────────────
export function useAdminWaitlist() {
  const [repair, setRepair]   = useState([]);
  const [donate, setDonate]   = useState([]);
  const [loading, setLoading] = useState(true);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  useEffect(() => {
    Promise.all([
      api.get('/waitlist?type=repair', { headers: authHeader }),
      api.get('/waitlist?type=donate', { headers: authHeader }),
    ])
      .then(([r, d]) => { setRepair(r.data.entries || []); setDonate(d.data.entries || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { repair, donate, loading };
}
