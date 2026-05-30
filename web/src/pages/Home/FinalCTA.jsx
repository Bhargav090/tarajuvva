import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="tj-section bg-white border-b border-black">
      <div className="tj-container">
        <div className="border border-black p-10 md:p-20 text-center bg-white tj-grain relative overflow-hidden">
          <div className="tj-blob bg-[var(--tj-shop)] w-[420px] h-[420px] -top-32 left-1/4 opacity-50" />

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="tj-eyebrow relative"
          >
            One last thing.
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="tj-h2 mt-4 relative text-[#0a0a0a]"
          >
            Pick a side.
            <br />
            <span className="italic font-light">Or do both.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-5 text-black/65 text-base sm:text-lg max-w-xl mx-auto relative"
          >
            A circular fashion operating system, made in India. Wear it. Remake it. Repair it. Donate it.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.32 }}
            className="mt-10 flex flex-col sm:flex-row gap-3 justify-center relative"
          >
            <Link to="/shop" className="tj-btn-shop">
              Shop the drop <ArrowRight size={16} />
            </Link>
            <Link to="/reimagine" className="tj-btn-reimagine">
              Reimagine yours <Sparkles size={16} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
