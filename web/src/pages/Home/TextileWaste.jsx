import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

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

export default function TextileWaste() {
  const { ref: inViewRef, inView } = useInView({ triggerOnce: true, threshold: 0.3 });

  return (
    <section ref={inViewRef} className="section min-h-[70vh] bg-[#241621] overflow-hidden flex items-center">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Step 1 */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-[#eef4d1]/80 font-display text-base sm:text-lg mb-6"
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
          <p className="text-[#f0bdd8] font-bold text-xl sm:text-2xl font-display -mt-2 mb-3">
            tonnes of textile waste.
          </p>
        </motion.div>

        {/* Pause line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="text-[#eef4d1]/90 font-display text-base sm:text-lg mb-12 max-w-xl mx-auto"
        >
          Most of it didn't need to be thrown away.
        </motion.p>

        {/* CTA grid */}
        {/* <motion.div
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
                className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl border border-[#eef4d1]/20 bg-white/10 hover:bg-white/14 hover:border-[#eef4d1]/35 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/25"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md ring-2 ring-[#eef4d1]/20"
                  style={{ background: c.color }}
                >
                  <Icon size={22} className="text-[#eef4d1]" strokeWidth={2.25} />
                </div>
                <span className="font-bold text-sm sm:text-base font-display text-[#eef4d1]">{c.label}</span>
              </Link>
            );
          })}
        </motion.div> */}
      </div>
    </section>
  );
}
