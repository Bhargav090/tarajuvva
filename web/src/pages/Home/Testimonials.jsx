import { motion } from 'framer-motion';
import { TESTIMONIALS } from '../../utils/constants';

export default function Testimonials() {
  return (
    <section className="tj-section border-y border-black bg-white" data-testid="social-proof">
      <div className="tj-container">
        <div className="grid md:grid-cols-3 gap-px bg-black border border-black">
          {TESTIMONIALS.map((t, i) => (
            <motion.blockquote
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              viewport={{ once: true }}
              className="bg-white p-8 md:p-10"
            >
              <p className="text-lg text-black/80 leading-relaxed">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-6 text-sm font-display">
                <p className="font-bold text-[#0a0a0a]">{t.name}</p>
                <p className="text-black/50 font-mono-tj text-xs uppercase tracking-wider mt-1">{t.city}</p>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
