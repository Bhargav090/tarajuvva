import { useRef, useEffect } from 'react';
import { ImageOff } from 'lucide-react';
import { useAsyncImage, IMAGE_LOAD_TIMEOUT_MS } from '../../hooks/useAsyncImage';
import { Spinner } from './Skeleton';

export default function AsyncImage({
  src,
  alt = '',
  className = '',
  imgClassName = '',
  fill = false,
  width,
  height,
  timeoutMs = IMAGE_LOAD_TIMEOUT_MS,
  fallbackSrc,
  showSpinner = false,
  loadingClassName = 'bg-[var(--tj-bg-soft)] animate-pulse',
  brokenClassName = 'bg-black/5',
  onLoad,
  onError,
  ...rest
}) {
  const imgRef = useRef(null);
  const { status, isLoading, isFailed, onLoad: markLoaded, onError: markError, checkComplete } =
    useAsyncImage(src, { timeoutMs });

  useEffect(() => {
    checkComplete(imgRef.current);
  }, [src, checkComplete]);

  const shellClass = fill ? 'absolute inset-0 w-full h-full' : 'relative w-full h-full';
  const imgClass = fill ? 'absolute inset-0 w-full h-full' : 'w-full h-full';

  const handleLoad = (event) => {
    markLoaded();
    onLoad?.(event);
  };

  const handleError = (event) => {
    markError();
    onError?.(event);
  };

  const showPrimary = Boolean(src) && !isFailed;
  const showFallback = isFailed && Boolean(fallbackSrc);

  return (
    <div className={`${shellClass} overflow-hidden ${className}`}>
      {isLoading && (
        <div
          className={`absolute inset-0 z-[1] flex items-center justify-center ${loadingClassName}`}
          aria-hidden={!showSpinner}
          role={showSpinner ? 'status' : undefined}
          aria-label={showSpinner ? 'Loading image' : undefined}
        >
          {showSpinner && <Spinner size={20} />}
        </div>
      )}

      {isFailed && !showFallback && (
        <div
          className={`absolute inset-0 z-[1] flex flex-col items-center justify-center gap-1.5 text-black/35 ${brokenClassName}`}
          role="img"
          aria-label={alt || 'Image unavailable'}
        >
          <ImageOff size={20} strokeWidth={1.75} aria-hidden />
        </div>
      )}

      {showPrimary && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          className={`${imgClass} object-cover transition-opacity duration-300 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
          onLoad={handleLoad}
          onError={handleError}
          {...rest}
        />
      )}

      {showFallback && (
        <img
          src={fallbackSrc}
          alt={alt}
          width={width}
          height={height}
          className={`${imgClass} object-cover opacity-70 ${imgClassName}`}
        />
      )}
    </div>
  );
}
