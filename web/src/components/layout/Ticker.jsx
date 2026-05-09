import { motion } from 'framer-motion';
import { TICKER_MESSAGES } from '../../utils/constants';

const msgs = [...TICKER_MESSAGES, ...TICKER_MESSAGES];

export default function Ticker() {
  return (
    <div className="w-full overflow-hidden bg-[#0b4722] py-2 select-none" style={{ zIndex: 51 }}>
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
      >
        {msgs.map((msg, i) => (
          <span key={i} className="inline-block px-8 text-[11px] sm:text-xs font-semibold text-[#eef4d1] tracking-widest uppercase font-[Outfit]">
            {msg}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
