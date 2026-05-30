import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { REIMAGINE_PRESETS } from '../../utils/constants';

const LOOP_HIGHLIGHT =
  'border border-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[6px_6px_0_0_#000] focus-visible:scale-[1.02] focus-visible:shadow-[6px_6px_0_0_#000] focus-visible:outline-none';

const BULLETS = [
  '12 ready-made presets across saree / kurti / shirt / pant',
  'Custom designs from ₹199 consultation',
  '14-day turnaround. Tracked. Documented.',
];

export default function ReimaginePreview() {
  return (
    <section
      className="tj-section bg-[var(--tj-reimagine)] text-white border-y border-black overflow-hidden relative"
      data-testid="reimagine-highlight"
    >
      <div className="tj-blob bg-[var(--tj-shop)] w-[360px] h-[360px] -top-24 -right-20 opacity-25" />

      <div className="tj-container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="tj-eyebrow !text-white/60">02 · Reimagine</p>
            <h2 className="tj-h2 mt-4 text-white leading-tight">
              Send us your old.
              <br />
              <span className="italic font-light">Get back your new.</span>
            </h2>
            <p className="text-white/60 text-base leading-relaxed mb-8 mt-5">
              That saree your mum doesn&apos;t drape anymore. The shirt your ex left. The jeans you can&apos;t part with. We turn them into something you&apos;ll actually wear.
            </p>
            <ul className="space-y-3 mb-10">
              {BULLETS.map(item => (
                <li key={item} className="text-sm text-white/75 flex gap-2">
                  <span className="text-[var(--tj-shop)]">↳</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/reimagine" className="tj-btn-shop inline-flex">
              <Sparkles size={16} /> Start a remake
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {REIMAGINE_PRESETS.map((p, i) => (
              <Link key={p.from} to="/reimagine" className="block">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={`group rounded-none p-5 cursor-pointer bg-white/10 ${LOOP_HIGHLIGHT}`}
                >
                  <span className="text-3xl block mb-3">{p.emoji}</span>
                  <p className="text-white/50 text-xs font-display mb-1">{p.from}</p>
                  <div className="flex items-center gap-1">
                    <ArrowRight size={12} className="text-[var(--tj-shop)]" />
                    <p className="font-bold text-sm font-display text-white">{p.to}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
