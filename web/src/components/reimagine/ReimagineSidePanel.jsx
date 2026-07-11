import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import ImageLightbox from '../ui/ImageLightbox';
import { REIMAGINE_SIDE_CARD } from './formCardStyles';

function PanelImage({ src, alt, fallback, onOpen }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="font-display text-sm md:text-base font-bold text-black/40 px-3 text-center leading-snug">
        {fallback || alt}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen?.(src)}
      className="absolute inset-0 cursor-zoom-in"
      aria-label={`View ${alt} full size`}
    >
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </button>
  );
}

export function ReimagineRemakeCard({ garmentLabel, transformLabel, blurb, fromImage, toImage }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className={REIMAGINE_SIDE_CARD}
    >
      <div className="relative grid grid-cols-[1fr_auto_1fr] flex-1 min-h-[12rem] overflow-hidden">
        <div className="relative min-w-0 bg-[#ebe6e6] flex items-center justify-center overflow-hidden">
          <PanelImage
            src={fromImage}
            alt={garmentLabel}
            fallback={garmentLabel}
            onOpen={setLightboxSrc}
          />
        </div>
        <div className="relative z-10 flex items-center justify-center px-2.5 bg-[var(--tj-reimagine)] text-white shrink-0">
          <ArrowRight size={16} strokeWidth={2.5} />
        </div>
        <div className="relative min-w-0 bg-[#ebe6e6] flex items-center justify-center overflow-hidden">
          <PanelImage
            src={toImage}
            alt={transformLabel}
            fallback={transformLabel}
            onOpen={setLightboxSrc}
          />
        </div>
      </div>

      <div className="relative z-10 p-4 md:p-5 bg-[#e8e2e2] border-t border-black/15 shrink-0">
        <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.2em] text-[var(--tj-reimagine)] font-bold">
          Your remake
        </p>
        <p className="font-display text-lg md:text-xl font-extrabold text-[#0a0a0a] mt-1.5 leading-snug">
          {garmentLabel} <span className="text-[var(--tj-reimagine)]">→</span> {transformLabel}
        </p>
        {blurb ? (
          <p className="text-sm text-[#0a0a0a]/75 mt-2 leading-relaxed font-medium">{blurb}</p>
        ) : null}
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </motion.div>
  );
}

export function ReimagineCustomizeCard({ price, feature, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className={REIMAGINE_SIDE_CARD}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#fdf4f5] via-white to-white pointer-events-none" />

      <div className="relative p-4 md:p-5 flex-1 flex flex-col justify-center">
        <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.2em] text-[var(--tj-reimagine)]">
          Consultation
        </p>
        <p className="font-display text-3xl md:text-4xl font-extrabold text-[#0a0a0a] mt-1.5">
          ₹{Number(price || 299).toLocaleString('en-IN')}
        </p>
        <div className="mt-4 pt-4 border-t border-black/10">
          <p className="font-display font-bold text-base text-[#0a0a0a]">{feature}</p>
          <p className="text-sm text-black/65 mt-2 leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
