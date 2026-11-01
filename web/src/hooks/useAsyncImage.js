import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export const IMAGE_LOAD_TIMEOUT_MS = 15000;

function normalizeSources(src, sources) {
  const list = Array.isArray(sources) && sources.length > 0 ? sources : [src];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const v = typeof item === 'string' ? item.trim() : '';
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

/**
 * Tracks remote image load state with a timeout fallback.
 * Supports an ordered source list — on error/timeout, advances to the next URL.
 * Pair with <img onLoad={onLoad} onError={onError} /> and checkComplete(imgRef).
 */
export function useAsyncImage(src, { timeoutMs = IMAGE_LOAD_TIMEOUT_MS, sources } = {}) {
  const candidates = useMemo(() => normalizeSources(src, sources), [src, sources]);
  const candidatesKey = candidates.join('\n');
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState(() => (candidates.length ? 'loading' : 'idle'));
  const timeoutRef = useRef(null);
  const indexRef = useRef(0);

  const activeSrc = candidates[index] || '';

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const advanceOrFail = useCallback(
    (failStatus) => {
      const next = indexRef.current + 1;
      if (next < candidates.length) {
        indexRef.current = next;
        setIndex(next);
        setStatus('loading');
        return;
      }
      setStatus(failStatus);
    },
    [candidates.length],
  );

  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    setStatus(candidates.length ? 'loading' : 'idle');
  }, [candidatesKey, candidates.length]);

  useEffect(() => {
    if (!activeSrc) {
      clearTimer();
      return undefined;
    }

    setStatus('loading');
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      advanceOrFail('timeout');
    }, timeoutMs);

    return clearTimer;
  }, [activeSrc, timeoutMs, clearTimer, advanceOrFail]);

  const onLoad = useCallback(() => {
    clearTimer();
    setStatus('loaded');
  }, [clearTimer]);

  const onError = useCallback(() => {
    clearTimer();
    advanceOrFail('error');
  }, [clearTimer, advanceOrFail]);

  const checkComplete = useCallback(
    (img) => {
      if (img?.complete && img.naturalWidth > 0) onLoad();
    },
    [onLoad],
  );

  const isLoading = status === 'loading';
  const isFailed = status === 'error' || status === 'timeout';

  return { src: activeSrc, status, isLoading, isFailed, onLoad, onError, checkComplete };
}
