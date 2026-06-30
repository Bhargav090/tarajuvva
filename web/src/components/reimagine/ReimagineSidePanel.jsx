import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function ReimagineRemakeCard({ garmentLabel, transformLabel, blurb, fromImage, toImage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="relative overflow-hidden border border-black bg-white shadow-[4px_4px_0_0_rgba(122,6,60,0.75)]"
    >
      <div className="relative grid grid-cols-[1fr_auto_1fr] h-44 md:h-52 overflow-hidden">
        <div className="min-w-0 flex items-center justify-center bg-[#ebe6e6] h-full p-2 overflow-hidden">
          <img
            src={fromImage}
            alt={garmentLabel}
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        </div>
        <div className="flex items-center justify-center px-2.5 bg-[var(--tj-reimagine)] text-white shrink-0">
          <ArrowRight size={16} strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex items-center justify-center bg-[#ebe6e6] h-full p-2 overflow-hidden">
          <img
            src={toImage}
            alt={transformLabel}
            className="max-w-full max-h-full w-auto h-auto object-contain"
          />
        </div>
      </div>

      <div className="relative z-10 p-4 md:p-5 bg-[#e8e2e2] border-t border-black/15">
        <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.2em] text-[var(--tj-reimagine)] font-bold">
          Your remake
        </p>
        <p className="font-display text-lg md:text-xl font-extrabold text-[#0a0a0a] mt-1.5 leading-snug">
          {garmentLabel} <span className="text-[var(--tj-reimagine)]">→</span> {transformLabel}
        </p>
        <p className="text-sm text-[#0a0a0a]/75 mt-2 leading-relaxed font-medium">{blurb}</p>
      </div>
    </motion.div>
  );
}

export function ReimagineCustomizeCard({ price, feature, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.08 }}
      className="relative overflow-hidden border border-black bg-white shadow-[4px_4px_0_0_rgba(122,6,60,0.75)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#fdf4f5] via-white to-white pointer-events-none" />

      <div className="relative p-4 md:p-5">
        <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.2em] text-[var(--tj-reimagine)]">
          Consultation
        </p>
        <p className="font-display text-3xl md:text-4xl font-extrabold text-[#0a0a0a] mt-1.5">
          ₹{Number(price || 199).toLocaleString('en-IN')}
        </p>
        <div className="mt-4 pt-4 border-t border-black/10">
          <p className="font-display font-bold text-base text-[#0a0a0a]">{feature}</p>
          <p className="text-sm text-black/65 mt-2 leading-relaxed">{description}</p>
        </div>
      </div>
    </motion.div>
  );
}
