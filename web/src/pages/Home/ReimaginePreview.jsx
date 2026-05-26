import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { REIMAGINE_PRESETS } from '../../utils/constants';
import Button from '../../components/ui/Button';

const LOOP_HIGHLIGHT =
  'border-2 border-[#241621] transition-all duration-300 hover:scale-[1.02] hover:shadow-[6px_6px_0_0_#000] focus-visible:scale-[1.02] focus-visible:shadow-[6px_6px_0_0_#000] focus-visible:outline-none';

export default function ReimaginePreview() {
  return (
    <section className="section bg-[#241621]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-display mb-6"
              style={{ background: '#4c1b1b25', color: '#e2a3c9', border: '1px solid #4c1b1b40' }}
            >
              02 · Reimagine
            </span>
            <h2
              className="font-display font-black text-[#eef4d1] leading-tight mb-5"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}
            >
              Send us your old.
              <br />
              <span style={{ color: '#e2a3c9' }}>Get back your new.</span>
            </h2>
            <p className="text-[#eef4d1]/55 font-display text-base leading-relaxed mb-8">
              That saree your mum doesn&apos;t drape anymore. The shirt your ex left. The jeans you can&apos;t part with. We turn them into something you&apos;ll actually wear.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/reimagine">
                <Button variant="burgundy" size="lg" icon={Sparkles}>
                  Start a remake
                </Button>
              </Link>
              <Link to="/reimagine">
                <Button
                  variant="outline"
                  size="lg"
                  className="!border-[#eef4d1]/20 !text-[#eef4d1]/70 hover:!text-[#eef4d1]"
                >
                  Book Consultation — ₹199
                </Button>
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {REIMAGINE_PRESETS.map((p, i) => (
              <Link key={p.from} to="/reimagine" className="block">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className={`group rounded-2xl p-5 cursor-pointer ${LOOP_HIGHLIGHT}`}
                  style={{ background: `${p.color}20` }}
                >
                  <span className="text-3xl block mb-3">{p.emoji}</span>
                  <p className="text-[#eef4d1]/50 text-xs font-display mb-1">{p.from}</p>
                  <div className="flex items-center gap-1">
                    <ArrowRight size={12} style={{ color: p.color }} />
                    <p className="font-bold text-sm font-display" style={{ color: '#eef4d1' }}>
                      {p.to}
                    </p>
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
