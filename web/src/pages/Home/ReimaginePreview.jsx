import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { REIMAGINE_PRESETS } from '../../utils/constants';
import Button from '../../components/ui/Button';

export default function ReimaginePreview() {
  return (
    <section className="section bg-[#341631]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-[Outfit] mb-6"
              style={{ background: '#6c0b2025', color: '#e7a3c9', border: '1px solid #6c0b2040' }}>
              Reimagine
            </span>
            <h2 className="font-[Outfit] font-black text-[#eef4d1] leading-tight mb-5"
              style={{ fontSize: 'clamp(2rem, 4.5vw, 3.5rem)' }}>
              You don't need new clothes.
              <br />
              <span style={{ color: '#e7a3c9' }}>You need new versions</span>
              <br />
              of what you have.
            </h2>
            <p className="text-[#eef4d1]/55 font-[Poppins] text-base leading-relaxed mb-8">
              Send us your old garments and our artisans will transform them into something you'll want to wear every day.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/reimagine">
                <Button variant="burgundy" size="lg" icon={Sparkles}>Start Reimagining</Button>
              </Link>
              <Link to="/reimagine">
                <Button variant="outline" size="lg" className="!border-[#eef4d1]/20 !text-[#eef4d1]/70 hover:!text-[#eef4d1]">
                  Book Consultation — ₹199
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Right presets grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {REIMAGINE_PRESETS.map((p, i) => (
              <motion.div
                key={p.from}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group rounded-2xl p-5 border border-[#eef4d1]/8 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                style={{ background: p.color + '20' }}
              >
                <span className="text-3xl block mb-3">{p.emoji}</span>
                <p className="text-[#eef4d1]/50 text-xs font-[Poppins] mb-1">{p.from}</p>
                <div className="flex items-center gap-1">
                  <ArrowRight size={12} style={{ color: p.color }} />
                  <p className="font-bold text-sm font-[Outfit]" style={{ color: '#eef4d1' }}>{p.to}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
