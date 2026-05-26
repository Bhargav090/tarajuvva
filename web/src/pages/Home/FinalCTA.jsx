import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';

export default function FinalCTA() {
  return (
    <section className="py-24 sm:py-32 px-4 bg-[#a8c74a] overflow-hidden relative">
      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[#e2a3c9] text-sm font-bold uppercase tracking-widest font-display mb-6"
        >
          — Start now
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-display font-black text-[#241621] leading-tight"
          style={{ fontSize: 'clamp(2.2rem, 6vw, 5rem)' }}
        >
          Start with what you
          <br />
          already have.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-5 text-[#241621]/70 font-display text-base sm:text-lg max-w-xl mx-auto"
        >
          Your wardrobe is already full of possibilities. Let's unlock them.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.32 }}
          className="mt-10 flex flex-wrap gap-4 justify-center"
        >
          <Link to="/reimagine">
            <Button variant="burgundy" size="xl" icon={Sparkles}>
              Reimagine Your Clothes
            </Button>
          </Link>
          <Link to="/shop">
            <Button
              size="xl"
              icon={ArrowRight} iconPosition="right"
              className="!bg-white !text-[#a8c74a] hover:!bg-gray-50 font-bold font-display"
            >
              Shop Collection
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
