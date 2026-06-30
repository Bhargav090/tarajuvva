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
          <p className="tj-eyebrow">No sustainability buzzwords</p>
          <h2 className="tj-h2 mt-4 text-[#0a0a0a]">
            We&apos;re not here to save the planet.
            <br />
            We&apos;re here to{' '}
            <span className="bg-[#c8ff2e] px-2">fix fashion&apos;s waste problem.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="md:col-span-7 md:pl-10 border-l border-black/10 space-y-6"
        >
          <p className="text-lg text-black/70 leading-relaxed">
            Every piece is made to last + we provide pathways for repair, remaking, or responsible redirection when needed. This isn&apos;t a trend. It&apos;s a circular fashion system built to make garments last longer.
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
