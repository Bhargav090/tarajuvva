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

/** Uses admin token explicitly (not user token) — see `api.js` interceptor. */
export async function changeAdminPassword(currentPassword, newPassword) {
  const adminToken = localStorage.getItem('admin_token');
  const { data } = await api.put(
    '/auth/admin/password',
    { currentPassword, newPassword },
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return data;
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
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/shop/orders', { headers: authHeader, params: { page, limit: 10 } })
      .then((r) => {
        if (cancelled) return;
        setOrders(r.data.orders || []);
        setPagination(r.data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const updateStatus = async (id, status, extra = {}) => {
    const { data } = await api.patch(
      `/shop/orders/${id}/status`,
      { status, ...extra },
      { headers: authHeader }
    );
    const next = data?.order;
    setOrders((p) =>
      p.map((o) =>
        o.id === id
          ? next
            ? { ...o, ...next, items: o.items }
            : { ...o, status, ...(extra.tracking_url ? { tracking_url: extra.tracking_url } : {}) }
          : o
      )
    );
  };

  return { orders, loading, updateStatus, pagination, page, setPage };
}

// ── Admin Reimagine ────────────────────────────────────────────────────────────
export function useAdminReimagine({ kind = 'orders' } = {}) {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/reimagine/requests', {
        headers: authHeader,
        params: { page, limit: 10, kind: kind === 'consultations' ? 'consultations' : 'orders' },
      })
      .then((r) => {
        if (cancelled) return;
        setRequests(r.data.requests || []);
        setPagination(r.data.pagination || { page, limit: 10, total: 0, totalPages: 1 });
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, kind]);

  const updateStatus = async (id, status) => {
    await api.patch(`/reimagine/requests/${id}/status`, { status }, { headers: authHeader });
    setRequests((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return { requests, loading, updateStatus, pagination, page, setPage };
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
