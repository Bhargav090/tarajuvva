import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

function userAuthHeader() {
  const token = localStorage.getItem('user_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [ids, setIds] = useState(() => new Set());
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.role === 'admin') {
      setIds(new Set());
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/users/me/wishlist', { headers: userAuthHeader() });
      setIds(new Set(data.product_ids || []));
      setProducts(data.products || []);
    } catch {
      setIds(new Set());
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isWishlisted = useCallback((productId) => ids.has(productId), [ids]);

  const toggleWishlist = useCallback(
    async (productId) => {
      if (!user) {
        const err = new Error('Login required');
        err.response = { status: 401, data: { message: 'Login required' } };
        throw err;
      }
      const headers = userAuthHeader();
      const on = ids.has(productId);
      if (on) {
        await api.delete(`/users/me/wishlist/${productId}`, { headers });
        setIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        return false;
      }
      await api.post(`/users/me/wishlist/${productId}`, {}, { headers });
      setIds((prev) => new Set(prev).add(productId));
      await refresh();
      return true;
    },
    [user, ids, refresh]
  );

  const value = useMemo(
    () => ({
      ids,
      products,
      loading,
      refresh,
      isWishlisted,
      toggleWishlist,
    }),
    [ids, products, loading, refresh, isWishlisted, toggleWishlist]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    return {
      ids: new Set(),
      products: [],
      loading: false,
      refresh: async () => {},
      isWishlisted: () => false,
      toggleWishlist: async () => {
        throw new Error('WishlistProvider missing');
      },
    };
  }
  return ctx;
}
