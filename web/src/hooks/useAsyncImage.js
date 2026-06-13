import { useState, useEffect, useRef, useCallback } from 'react';

export const IMAGE_LOAD_TIMEOUT_MS = 15000;

/**
 * Tracks remote image load state with a timeout fallback.
 * Pair with <img onLoad={onLoad} onError={onError} ref={checkComplete} />.
 */
export function useAsyncImage(src, { timeoutMs = IMAGE_LOAD_TIMEOUT_MS } = {}) {
  const [status, setStatus] = useState(() => (src ? 'loading' : 'idle'));
  const timeoutRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!src) {
      setStatus('idle');
      clearTimer();
      return undefined;
    }

    setStatus('loading');
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setStatus((current) => (current === 'loading' ? 'timeout' : current));
    }, timeoutMs);

    return clearTimer;
  }, [src, timeoutMs, clearTimer]);

  const onLoad = useCallback(() => {
    clearTimer();
    setStatus('loaded');
  }, [clearTimer]);

  const onError = useCallback(() => {
    clearTimer();
    setStatus('error');
  }, [clearTimer]);

  const checkComplete = useCallback(
    (img) => {
      if (img?.complete && img.naturalWidth > 0) onLoad();
    },
    [onLoad],
  );

  const isLoading = status === 'loading';
  const isFailed = status === 'error' || status === 'timeout';

  return { status, isLoading, isFailed, onLoad, onError, checkComplete };
}
