import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { TESTIMONIALS } from '../../utils/constants';

const GOOGLE_REVIEWS_URL =
  import.meta.env.VITE_GOOGLE_REVIEWS_URL || 'https://www.google.com/search?q=Tarajuvva+reviews';

function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const current = TESTIMONIALS[index];
  const next = () => setIndex((p) => (p + 1) % TESTIMONIALS.length);
  const prev = () => setIndex((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <section className="tj-section border-y border-black bg-white" data-testid="social-proof">
      <div className="tj-container">
        <div className="flex items-end justify-between gap-4 mb-8 md:mb-10">
          <div>
            <p className="tj-eyebrow">Testimonials</p>
            <h2 className="tj-h2 mt-3 text-[#0a0a0a]">
              What people <span className="italic font-light">actually say.</span>
            </h2>
          </div>
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold uppercase tracking-[0.18em] border-b border-black pb-1 hover:opacity-70 transition-opacity"
          >
            Google reviews <ExternalLink size={14} />
          </a>
        </div>

        <div className="border border-black bg-[#f8f8f8] overflow-hidden">
          <div className="relative min-h-[280px] sm:min-h-[260px]">
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={current.name}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25 }}
                className="p-6 sm:p-8 md:p-10"
              >
                <div className="flex items-start gap-4 mb-6">
                  {/* Image placeholder (can be swapped with real review photo). */}
                  <div className="w-14 h-14 rounded-full border border-black/20 bg-white shrink-0 flex items-center justify-center">
                    <span className="font-display font-bold text-sm text-[#0a0a0a]">
                      {initials(current.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[#0a0a0a] font-display">{current.name}</p>
                    <p className="text-black/50 font-mono-tj text-xs uppercase tracking-wider mt-1">
                      {current.city}
                    </p>
                    <a
                      href={GOOGLE_REVIEWS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-black/60 hover:text-black"
                    >
                      View on Google <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                <p className="text-lg md:text-xl text-black/80 leading-relaxed max-w-3xl">
                  &ldquo;{current.quote}&rdquo;
                </p>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          <div className="border-t border-black bg-white px-4 sm:px-6 md:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === index ? 'w-7 bg-black' : 'w-2.5 bg-black/25 hover:bg-black/45'
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                className="w-9 h-9 rounded-full border border-black/15 inline-flex items-center justify-center hover:bg-black/5"
                aria-label="Previous testimonial"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={next}
                className="w-9 h-9 rounded-full border border-black/15 inline-flex items-center justify-center hover:bg-black/5"
                aria-label="Next testimonial"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 sm:hidden text-center">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-[0.18em] border-b border-black pb-1"
          >
            Google reviews <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </section>
  );
}
