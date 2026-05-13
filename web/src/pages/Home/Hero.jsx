import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { HERO_STATS } from '../../utils/constants';

const SLIDES = [
  'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=900&q=80',
  'https://images.unsplash.com/photo-1594938298603-c8148c4b4a18?w=900&q=80',
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=900&q=80',
];

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-[#a8c422] flex flex-col lg:flex-row overflow-hidden">
      {/* Left — Text */}
      <div className="relative z-10 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-24 lg:py-0 lg:w-[55%] order-2 lg:order-1">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex w-fit items-center gap-2 bg-[#341631]/8 border border-[#341631]/12 rounded-full px-4 py-2 mb-8"
        >
          <Sparkles size={13} className="text-[#6c0b20]" />
          <span className="text-[#341631]/80 text-xs font-semibold font-display uppercase tracking-widest">
            Circular Fashion
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display font-black leading-[1.0] tracking-tighter text-[#341631]"
          style={{ fontSize: 'clamp(2.6rem, 6vw, 5.5rem)' }}
        >
          Wear more.
          <br />
          <span style={{ color: '#6c0b20' }}>Buy less.</span>
          <br />
          Fix what you
          <br />
          already own.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 text-[#341631]/70 font-display text-base sm:text-lg leading-relaxed max-w-lg"
        >
          A circular fashion system built around your wardrobe. Shop thoughtfully, reimagine boldly, repair lovingly.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.38 }}
          className="mt-10 flex flex-wrap gap-4"
        >
          <Link
            to="/shop"
            className="inline-flex items-center gap-2.5 bg-[#341631] text-[#eef4d1] font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-[#341631]/90 transition-all hover:shadow-xl font-display"
          >
            Shop Collection <ArrowRight size={16} />
          </Link>
          <Link
            to="/reimagine"
            className="inline-flex items-center gap-2.5 border-2 border-[#6c0b20] text-[#6c0b20] font-bold text-sm px-7 py-3.5 rounded-xl hover:bg-[#6c0b20] hover:text-[#eef4d1] transition-all font-display"
          >
            <Sparkles size={16} /> Reimagine Yours
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.55 }}
          className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6"
        >
          {HERO_STATS.map(s => (
            <div key={s.label}>
              <p className="text-2xl font-black text-[#341631] font-display">{s.value}</p>
              <p className="text-[#341631]/55 text-xs font-display mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right — Floating image collage */}
      <div className="lg:w-[45%] relative order-1 lg:order-2 min-h-[50vw] lg:min-h-0">
        {/* Main image */}
        <motion.div
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}
          className="absolute inset-4 sm:inset-6 lg:inset-8 lg:left-0"
        >
          <img
            src={SLIDES[0]}
            alt="Fashion"
            className="w-full h-full object-cover rounded-3xl"
            style={{ filter: 'brightness(0.92)' }}
          />
        </motion.div>
        {/* Floating badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.6 }}
          className="absolute bottom-10 left-4 sm:left-10 lg:-left-6 bg-[#341631] rounded-2xl px-5 py-4 shadow-2xl border border-[#eef4d1]/10"
        >
          <p className="text-[#e7a3c9] font-black text-xl font-display">7M tonnes</p>
          <p className="text-[#eef4d1]/60 text-xs font-display">of textile waste every year</p>
        </motion.div>
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.75 }}
          className="absolute top-10 right-4 sm:right-10 lg:-right-4 bg-[#eef4d1] rounded-2xl px-4 py-3 shadow-xl"
        >
          <p className="text-[#a8c422] font-black text-sm font-display">✦ 500+ Reimagined</p>
        </motion.div>
      </div>
    </section>
  );
}
