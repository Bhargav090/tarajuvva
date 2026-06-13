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
    <section
      ref={ref}
      className="relative tj-section overflow-hidden bg-[#f9f9f9] border-y border-black"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="tj-loop-blob tj-loop-blob-green" />
        <div className="tj-loop-blob tj-loop-blob-orange" />
      </div>

      <div className="tj-container relative">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 lg:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.55 }}
            className="order-1 lg:col-span-5 lg:col-start-1 lg:row-start-1"
          >
            <p className="tj-eyebrow">The system</p>
            <h2 className="tj-h2 mt-4 text-[#0a0a0a]">
              Four verticals.
              <br />
              <span className="italic font-light">One closed loop.</span>
            </h2>
            <p className="text-black/55 text-base leading-relaxed max-w-md mt-4">
              Tarajuvva isn&apos;t a clothing brand pretending to care. It&apos;s an operating system: every garment can be bought, remade, fixed, or donated. No exit. No landfill.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="order-2 lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2 flex justify-center lg:justify-end"
          >
            <FashionLoop
              activeIndex={activeIndex}
              onActiveChange={setActiveIndex}
              hoverIndex={hoverIndex}
              onHoverChange={setHoverIndex}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="order-3 lg:col-span-5 lg:col-start-1 lg:row-start-2"
          >
            <motion.div
              key={active.action}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="p-6 sm:p-8 mb-8 min-h-[200px] flex flex-col justify-between"
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
                  <p className="mt-3 text-sm opacity-80 leading-relaxed">
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
                    className="px-3.5 py-2 text-xs font-bold font-display border transition-colors duration-200"
                    style={{
                      background: isPinned || isHover ? '#0a0a0a' : '#ffffff',
                      color: isPinned || isHover ? '#ffffff' : 'rgba(10, 10, 10, 0.45)',
                      borderColor: isPinned || isHover ? '#0a0a0a' : 'rgba(10, 10, 10, 0.15)',
                    }}
                  >
                    {v.num} {v.action}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
