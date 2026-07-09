import { TICKER_MESSAGES } from '../../utils/constants';

function TickerTrack({ msgs, ariaHidden }) {
  return (
    <div className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={ariaHidden || undefined}>
      {msgs.map((msg) => (
        <span
          key={msg}
          className="inline-flex items-center font-display text-[11px] sm:text-xs font-bold uppercase tracking-widest"
        >
          {msg}
          <span className="text-[var(--tj-shop)] mx-3 text-[10px]" aria-hidden>
            ✦
          </span>
        </span>
      ))}
    </div>
  );
}

/** Fixed marquee band at the very top of the landing page — seamless infinite loop. */
export default function Ticker() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-[var(--ticker-h,32px)] flex items-center border-b border-black bg-black text-white overflow-hidden select-none">
      <div className="flex w-max tj-marquee">
        <TickerTrack msgs={TICKER_MESSAGES} />
        <TickerTrack msgs={TICKER_MESSAGES} ariaHidden />
      </div>
    </div>
  );
}
