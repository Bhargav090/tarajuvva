import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Full-screen image preview (portal). */
export default function ImageLightbox({ src, alt = '', onClose }) {
  useEffect(() => {
    if (!src) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [src, onClose]);

  if (!src || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 md:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 bg-white text-black flex items-center justify-center border border-black hover:bg-[var(--tj-bg-soft)]"
        aria-label="Close preview"
      >
        <X size={20} strokeWidth={2.5} />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] w-auto h-auto object-contain shadow-2xl border border-white/20"
      />
    </div>,
    document.body
  );
}
