import toast from 'react-hot-toast';

export const SESSION_EXPIRED_EVENT = 'tj:session-expired';

const MAX_TIMEOUT = 2147483647;
const lastEmit = { user: 0, admin: 0 };
let lastNotice = 0;

export function decodeJwtPayload(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function tokenExpiresInMs(token) {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== 'number') return null;
  return exp * 1000 - Date.now();
}

export function isTokenExpired(token) {
  const ms = tokenExpiresInMs(token);
  return ms != null && ms <= 0;
}

/** Fire at JWT exp. Chains timeouts so delays longer than ~24.8 days still run. */
export function scheduleTokenExpiry(token, onExpire) {
  let timer;
  let stopped = false;

  const arm = () => {
    if (stopped) return;
    const ms = tokenExpiresInMs(token);
    if (ms == null) return;
    if (ms <= 0) {
      onExpire();
      return;
    }
    timer = setTimeout(arm, Math.min(ms, MAX_TIMEOUT));
  };

  arm();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}

export function emitSessionExpired(kind) {
  if (kind !== 'user' && kind !== 'admin') return;
  const now = Date.now();
  if (now - lastEmit[kind] < 1500) return;
  lastEmit[kind] = now;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { kind } }));
}

export function notifySessionExpired() {
  const now = Date.now();
  if (now - lastNotice < 4000) return;
  lastNotice = now;
  toast.error('Your session has expired. Please sign in again.');
}
