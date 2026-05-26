import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BRAND_VALUES } from '../../utils/constants';
import Button from '../../components/ui/Button';

export default function About() {
  return (
    <div className="min-h-screen bg-white pt-2 sm:pt-4">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-display mb-6 bg-[#a8c74a]/10 text-[#a8c74a] border border-[#a8c74a]/20">
            Our Story
          </span>
          <h1 className="font-display font-black text-[#241621] leading-tight mb-6"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
            Why Tarajuvva
            <br />
            <span className="text-[#a8c74a]">exists.</span>
          </h1>
          <p className="text-[#241621]/65 font-body text-lg sm:text-xl leading-relaxed max-w-2xl">
            We started Tarajuvva because we were tired of the same conversation: "I have nothing to wear" from wardrobes
            stuffed with clothes. That contradiction needed fixing.
          </p>
        </motion.div>
      </section>

      {/* Founder story */}
      <section className="bg-[#241621] py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black text-[#eef4d1] font-display mb-6">
                We're not here to sell you more clothes.
              </h2>
              <div className="space-y-4 text-[#eef4d1]/65 font-body leading-relaxed">
                <p>
                  Every fashion brand tells you to buy more. We're building the opposite — a system that helps you
                  extract more value from what you already own.
                </p>
                <p>
                  The average Indian wardrobe has clothes that were worn once, gifted sarees still in plastic, shirts
                  that don't fit anymore but feel too good to throw. That's not a waste problem. That's an imagination problem.
                </p>
                <p>
                  Tarajuvva is a circular fashion platform — shop better, reimagine creatively, repair before replacing,
                  donate before discarding.
                </p>
              </div>
            </div>
            <div className="bg-white/5 rounded-3xl p-8 border border-[#eef4d1]/10">
              <blockquote className="text-2xl font-black text-[#e2a3c9] font-display leading-tight mb-4">
                "A garment's story doesn't end when you're done with it."
              </blockquote>
              <p className="text-[#eef4d1]/55 font-body text-sm">— Tarajuvva Manifesto</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-black text-[#241621] font-display">What we stand for</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BRAND_VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-6 border border-[#241621]/8"
            >
              <span className="text-3xl block mb-4">{v.emoji}</span>
              <h3 className="text-lg font-black text-[#241621] font-display mb-2">{v.title}</h3>
              <p className="text-sm text-[#241621]/55 font-body leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-4xl font-black text-[#241621] font-display mb-6">
            "Wear more. Buy less. Fix what you already own."
          </p>
          <p className="text-[#241621]/55 font-body mb-8">
            This isn't a slogan. It's the only business model that makes sense in a world drowning in textile waste.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/reimagine"><Button variant="primary" size="lg">Start Reimagining</Button></Link>
            <Link to="/shop"><Button variant="outline-green" size="lg" icon={ArrowRight} iconPosition="right">Shop Now</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
