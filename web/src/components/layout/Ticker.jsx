import { TICKER_MESSAGES } from '../../utils/constants';

const msgs = [...TICKER_MESSAGES, ...TICKER_MESSAGES];

/** Fixed marquee band at the very top of the landing page. */
export default function Ticker() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] border-b border-black bg-black text-white py-3 overflow-hidden select-none">
      <div className="flex tj-marquee whitespace-nowrap gap-12">
        {msgs.map((msg, i) => (
          <span
            key={i}
            className="inline-flex items-center font-display text-2xl font-extrabold tracking-tighter"
          >
            {msg}
            <span className="text-[var(--tj-shop)] mx-4">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
