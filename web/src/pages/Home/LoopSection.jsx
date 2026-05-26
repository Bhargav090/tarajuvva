import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ArrowRight } from 'lucide-react';
import FashionLoop, {
  LOOP_VERTICALS,
  useLoopVerticalState,
} from '../../components/home/FashionLoop';

export default function LoopSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.15 });
  const {
    activeIndex,
    setActiveIndex,
    hoverIndex,
    setHoverIndex,
    active,
  } = useLoopVerticalState(0);

  return (
    <section ref={ref} className="section bg-white border-y border-[#241621]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.55 }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-display mb-5 bg-[#a8c74a]/10 text-[#a8c74a] border border-[#a8c74a]/20">
              The system
            </span>
            <h2 className="font-display font-black text-3xl sm:text-4xl lg:text-[2.75rem] text-[#241621] leading-[1.1] mb-4">
              Four verticals.
              <br />
              One closed loop.
            </h2>
            <p className="text-[#241621]/55 font-display text-base leading-relaxed mb-8 max-w-md">
              Tarajuvva isn&apos;t a clothing brand pretending to care. It&apos;s an operating system: every garment can be bought, remade, fixed, or donated. No exit. No landfill.
            </p>

            <motion.div
              key={active.action}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border-2 border-[#241621] p-6 sm:p-8 mb-8 min-h-[200px] flex flex-col justify-between"
              style={{ background: active.color, color: active.textOnColor }}
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest font-display mb-3 opacity-90">
                  {active.num} · {active.action}
                </p>
                <p className="font-display font-black text-xl sm:text-2xl leading-snug">
                  {active.headline}
                </p>
                {active.subline && (
                  <p className="mt-3 text-sm font-display opacity-80 leading-relaxed">
                    {active.subline}
                  </p>
                )}
              </div>
              <Link
                to={active.to}
                className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest font-display underline underline-offset-4 hover:opacity-80 transition-opacity"
              >
                {active.cta}
                <ArrowRight size={14} />
              </Link>
            </motion.div>

            <div className="flex flex-wrap gap-2">
              {LOOP_VERTICALS.map((v, i) => {
                const isPinned = activeIndex === i && hoverIndex === null;
                const isHover = hoverIndex === i;
                return (
                  <button
                    key={v.action}
                    type="button"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                    onFocus={() => setHoverIndex(i)}
                    onBlur={() => setHoverIndex(null)}
                    onClick={() => setActiveIndex(i)}
                    className="rounded-lg px-3.5 py-2 text-xs font-bold font-display border-2 border-[#241621] transition-colors duration-200"
                    style={{
                      background: isPinned || isHover ? '#241621' : 'transparent',
                      color: isPinned || isHover ? '#eef4d1' : '#241621',
                    }}
                  >
                    {v.num} {v.action}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="flex justify-center lg:justify-end"
          >
            <FashionLoop
              activeIndex={activeIndex}
              onActiveChange={setActiveIndex}
              hoverIndex={hoverIndex}
              onHoverChange={setHoverIndex}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
