import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import api from '../utils/api';
import {
  SESSION_EXPIRED_EVENT,
  isTokenExpired,
  notifySessionExpired,
  scheduleTokenExpiry,
} from '../utils/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);
  const signedIn = useRef(false);

  const logout = useCallback((reason) => {
    const notify = reason === 'expired' && signedIn.current;
    signedIn.current = false;
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
    if (notify) notifySessionExpired();
  }, []);

  // Rehydrate from stored token. Drop it immediately when it is already expired.
  useEffect(() => {
    const token = localStorage.getItem('user_token');
    if (!token || isTokenExpired(token)) {
      if (token) localStorage.removeItem('user_token');
      setLoading(false);
      return;
    }
    let cancelled = false;
    api.get('/auth/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (cancelled) return;
        if (r.data.user) {
          signedIn.current = true;
          setUser(r.data.user);
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
          localStorage.removeItem('user_token');
        }
      })
      .catch(() => {
        if (!cancelled) localStorage.removeItem('user_token');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Sign out when this session's token hits exp, or the API rejects it.
  useEffect(() => {
    if (!user) return undefined;
    const token = localStorage.getItem('user_token');
    const stop = token ? scheduleTokenExpiry(token, () => logout('expired')) : () => {};
    const onExpired = (event) => {
      if (event.detail?.kind === 'user') logout('expired');
    };
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const current = localStorage.getItem('user_token');
      if (current && isTokenExpired(current)) logout('expired');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stop();
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, logout]);

  const login = useCallback((token, userData) => {
    localStorage.setItem('user_token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    signedIn.current = true;
    setUser(userData);
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
