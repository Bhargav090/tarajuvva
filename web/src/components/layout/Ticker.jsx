import { TICKER_MESSAGES } from '../../utils/constants';

const msgs = [...TICKER_MESSAGES, ...TICKER_MESSAGES];

/** Fixed marquee band at the very top of the landing page. */
export default function Ticker() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[var(--ticker-h,32px)] flex items-center border-b border-black bg-black text-white overflow-hidden select-none">
      <div className="flex tj-marquee whitespace-nowrap gap-8">
        {msgs.map((msg, i) => (
          <span
            key={i}
            className="inline-flex items-center font-display text-[11px] sm:text-xs font-bold uppercase tracking-widest"
          >
            {msg}
            <span className="text-[var(--tj-shop)] mx-3 text-[10px]">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
