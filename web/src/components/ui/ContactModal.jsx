import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X } from 'lucide-react';
import ContactForm from './ContactForm';

/**
 * Responsive Get in Touch popup — bottom sheet on mobile, centered card on sm+.
 */
export default function ContactModal({ open, onClose }) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="contact-overlay"
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close get in touch"
            className="absolute inset-0 bg-black/45"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-[1] w-full sm:max-w-lg md:max-w-xl bg-white shadow-2xl
              rounded-t-2xl sm:rounded-2xl
              max-h-[92dvh] sm:max-h-[85vh]
              flex flex-col overflow-hidden
              border border-black/10"
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag hint */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-1" aria-hidden>
              <span className="block h-1 w-10 rounded-full bg-black/15" />
            </div>

            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-2 sm:pt-5 pb-3 border-b border-black/10">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="shrink-0 text-[#0a0a0a]" aria-hidden />
                  <h2
                    id={titleId}
                    className="font-display font-black text-lg sm:text-xl text-[#0a0a0a] tracking-tight"
                  >
                    Get in Touch
                  </h2>
                </div>
                <p className="mt-1 text-sm text-black/55 font-body leading-snug">
                  Leave your details and we&apos;ll reach out soon.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 p-2 -mr-1 rounded-lg hover:bg-black/5 text-black/50 hover:text-black transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-4 sm:py-5 overflow-y-auto overscroll-contain flex-1">
              <ContactForm
                onSuccess={() => {
                  onClose?.();
                }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
