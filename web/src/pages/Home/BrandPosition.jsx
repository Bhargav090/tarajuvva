import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ArrowRight } from 'lucide-react';

export default function BrandPosition() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 });

  return (
    <section ref={ref} className="tj-section border-b border-black bg-white">
      <div className="tj-container grid md:grid-cols-12 gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="md:col-span-5"
        >
          <p className="tj-eyebrow">No corporate sustainability talk.</p>
          <h2 className="tj-h2 mt-4 text-[#0a0a0a]">
            We&apos;re not <span className="line-through opacity-40">saving</span> the planet.
            <br />
            We&apos;re <span className="bg-[#c8ff2e] px-2">closing the loop.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="md:col-span-7 md:pl-10 border-l border-black/10 space-y-6"
        >
          <p className="text-lg text-black/70 leading-relaxed">
            Most fashion is a one-way street: buy, wear twice, throw, repeat. We built Tarajuvva because the alternative shouldn&apos;t feel like a guilt-trip Pinterest board.
          </p>
          <p className="text-lg text-black/70 leading-relaxed">
            Every piece you buy here is built to come back to us — to be remade, repaired, or redirected. It&apos;s not a moodboard. It&apos;s a system.
          </p>
          <Link
            to="/about"
            className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-[0.18em] border-b border-black pb-1 hover:opacity-70 transition-opacity"
          >
            Read our manifesto <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
