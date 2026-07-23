import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  // Rehydrate from stored token
  useEffect(() => {
    const token = localStorage.getItem('user_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.data.user) { setUser(r.data.user); api.defaults.headers.common['Authorization'] = `Bearer ${token}`; } })
      .catch(() => localStorage.removeItem('user_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token, userData) => {
    localStorage.setItem('user_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    try {
      // Avoid leaking another user's half-filled Reimagine draft on a shared browser
      sessionStorage.removeItem('tj_reimagine_customize_draft');
      sessionStorage.removeItem('tj_reimagine_remake_draft');
    } catch {
      // ignore
    }
  }, []);

  const updateUser = useCallback((updates) => setUser(prev => ({ ...prev, ...updates })), []);

  const value = useMemo(
    () => ({ user, loading, login, logout, updateUser }),
    [user, loading, login, logout, updateUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
