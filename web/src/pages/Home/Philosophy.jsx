import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

export default function Philosophy() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.4 });

  return (
    <section ref={ref} className="py-24 sm:py-32 px-4 bg-white overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        {/* Decorative lines */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="h-px flex-1 max-w-[80px] bg-[#241621]/15" />
          <span className="text-lg">🧵</span>
          <div className="h-px flex-1 max-w-[80px] bg-[#241621]/15" />
        </div>

        <motion.blockquote
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="font-display font-black text-[#241621] leading-tight"
          style={{ fontSize: 'clamp(1.8rem, 5vw, 4rem)' }}
        >
          "Most wardrobes don't have a
          <span style={{ color: '#a8e000' }}> clothing problem.</span>
          <br />
          They have a
          <span style={{ color: '#7A063C' }}> usage problem.</span>"
        </motion.blockquote>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 text-[#241621]/50 font-display text-base sm:text-lg leading-relaxed max-w-2xl mx-auto"
        >
          The average wardrobe has 77 items. Most people regularly wear only 20% of them.
          We exist to close that gap — through better buying, creative reimagining, and honest repurposing.
        </motion.p>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-14 grid grid-cols-3 gap-6 sm:gap-10 max-w-md mx-auto"
        >
          {[
            { v: '77', l: 'items avg. wardrobe' },
            { v: '20%', l: 'regularly worn' },
            { v: '60%', l: 'never worn again' },
          ].map(s => (
            <div key={s.l}>
              <p className="text-2xl sm:text-3xl font-black text-[#a8e000] font-display">{s.v}</p>
              <p className="text-xs text-[#241621]/45 font-display mt-1 leading-tight">{s.l}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
