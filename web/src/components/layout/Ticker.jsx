import { motion } from 'framer-motion';
import { TICKER_MESSAGES } from '../../utils/constants';

const msgs = [...TICKER_MESSAGES, ...TICKER_MESSAGES];

export default function Ticker({ barHeightPx = 40 }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[55] flex w-full items-center overflow-hidden bg-[#0b4722] select-none"
      style={{ height: barHeightPx }}
    >
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
      >
        {msgs.map((msg, i) => (
          <span key={i} className="inline-block px-8 text-[11px] sm:text-xs font-semibold text-[#eef4d1] tracking-widest uppercase font-display">
            {msg}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
