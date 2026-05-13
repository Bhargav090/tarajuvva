import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ShoppingBag, Sparkles, Wrench, Heart } from 'lucide-react';

const EMOJI_DATA = ['👗','👖','🧥','👕','🧣','👗','🥻','👔'];

function FallingGarment({ emoji, index }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: -40, rotate: -20 }}
      animate={{ opacity: 1, y: 0, rotate: [0, 8, -4, 0] }}
      transition={{ duration: 0.8, delay: index * 0.12, type: 'spring', stiffness: 80 }}
      className="text-3xl sm:text-4xl select-none"
    >
      {emoji}
    </motion.span>
  );
}

const CTAS = [
  { label: 'Buy Smarter',  to: '/shop',      icon: ShoppingBag, color: '#a8c422' },
  { label: 'Reimagine',    to: '/reimagine', icon: Sparkles,    color: '#6c0b20' },
  { label: 'Repair',       to: '/repair',    icon: Wrench,      color: '#e34334' },
  { label: 'Donate',       to: '/donate',    icon: Heart,       color: '#015395' },
];

export default function TextileWaste() {
  const { ref: inViewRef, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section ref={inViewRef} className="section bg-[#341631] overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Step 1 */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-[#eef4d1]/50 font-display text-base sm:text-lg mb-6"
        >
          Every year, India discards…
        </motion.p>

        {/* Falling garments */}
        {inView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8"
          >
            {EMOJI_DATA.map((e, i) => <FallingGarment key={i} emoji={e} index={i} />)}
          </motion.div>
        )}

        {/* Big number */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.8 }}
        >
          <p
            className="font-display font-black text-[#eef4d1] leading-none"
            style={{ fontSize: 'clamp(4rem, 14vw, 10rem)' }}
          >
            7M
          </p>
          <p className="text-[#e7a3c9] font-bold text-xl sm:text-2xl font-display -mt-2 mb-3">
            tonnes of textile waste.
          </p>
        </motion.div>

        {/* Pause line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="text-[#eef4d1]/60 font-display text-base sm:text-lg mb-12"
        >
          Most of it didn't need to be thrown away.
        </motion.p>

        {/* CTA grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          {CTAS.map(c => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to} to={c.to}
                className="group flex flex-col items-center gap-2.5 p-5 rounded-2xl border border-[#eef4d1]/10 hover:border-opacity-30 transition-all duration-300 hover:-translate-y-1"
                style={{ background: c.color + '20', borderColor: c.color + '30' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: c.color + '30' }}>
                  <Icon size={20} style={{ color: c.color }} />
                </div>
                <span className="font-bold text-sm font-display" style={{ color: c.color }}>{c.label}</span>
              </Link>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
