import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { REIMAGINE_PRESETS } from '../../utils/constants';

const LOOP_HIGHLIGHT =
  'border border-black transition-all duration-300 hover:scale-[1.02] hover:shadow-[6px_6px_0_0_#000] focus-visible:scale-[1.02] focus-visible:shadow-[6px_6px_0_0_#000] focus-visible:outline-none';

const BULLETS = [
  '12 ready-made presets across sarees, kurtis, shirts and pants',
  'Something else in mind? Let\'s design it together from ₹299.',
  'Ready in 14 days, with updates along the way',
];

export default function ReimaginePreview() {
  return (
    <section
      className="tj-section bg-[var(--tj-reimagine)] text-white border-y border-black overflow-hidden relative"
      data-testid="reimagine-highlight"
    >
      <div className="tj-blob bg-[var(--tj-shop)] w-[360px] h-[360px] -top-24 -right-20 opacity-25" />

      <div className="tj-container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <p className="tj-eyebrow !text-white/60">02 · Reimagine</p>
            <h2 className="tj-h2 mt-2 text-white leading-tight">
              Old clothes. New stories.
            </h2>
            <p className="text-white/60 text-base leading-relaxed mb-8 mt-5">
              That saree your mum doesn&apos;t wear anymore. The shirt your ex left behind. The jeans you can&apos;t seem to let go of. We upcycle old clothes into custom pieces you&apos;ll actually wear again.
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
              <Sparkles size={16} /> Start your upcycle
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 lg:gap-4 auto-rows-fr w-full max-w-md lg:max-w-none mx-auto lg:mx-0 lg:w-full">
            {REIMAGINE_PRESETS.map((p, i) => (
              <Link
                key={p.from}
                to={`/reimagine?step=1&garment=${encodeURIComponent(p.from)}`}
                className="block h-full min-w-0"
              >
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={`group h-full w-full flex flex-col gap-2 lg:gap-3 rounded-none p-3 sm:p-3.5 lg:p-5 cursor-pointer bg-white/10 ${LOOP_HIGHLIGHT}`}
                >
                  <span className="text-3xl sm:text-4xl lg:text-5xl leading-none">{p.emoji}</span>
                  <p className="font-bold text-[11px] sm:text-xs lg:text-sm font-display text-white leading-snug min-w-0">
                    {p.from}{' '}
                    <span className="text-[var(--tj-shop)]">→</span>{' '}
                    {p.to}
                  </p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
