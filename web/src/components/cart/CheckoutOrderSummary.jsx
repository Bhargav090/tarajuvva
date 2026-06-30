import { Link } from 'react-router-dom';
import CartLineItem from './CartLineItem';

export default function CheckoutOrderSummary({ items, total, totalItems, onRemove, onUpdateQty }) {
  const scrollable = items.length > 2;

  return (
    <aside className="bg-white border border-black flex flex-col lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)]">
      <div className="px-5 py-4 border-b border-black/10 shrink-0">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-black/45 font-display">
          Order summary
        </h2>
        <p className="text-sm font-display font-bold text-[#0a0a0a] mt-1">
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </p>
      </div>

      <div
        className={
          scrollable
            ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3'
            : 'px-4 py-3'
        }
      >
        <div className="space-y-3">
          {items.map((item) => (
            <CartLineItem
              key={item.ck}
              item={item}
              onRemove={onRemove}
              onUpdateQty={onUpdateQty}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 px-5 py-4 border-t border-black bg-[var(--tj-shop)]/10 space-y-3">
        <div className="space-y-2 text-sm font-body text-black/55">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-[#0a0a0a]">₹{total.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping</span>
            <span className="text-[var(--tj-shop-deep)] font-semibold">Free</span>
          </div>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-black/15">
          <span className="text-sm font-bold uppercase tracking-wider text-black/45 font-display">Total</span>
          <span className="text-2xl font-black text-[#0a0a0a] font-display">
            ₹{total.toLocaleString('en-IN')}
          </span>
        </div>
        <Link
          to="/shop"
          className="block text-center text-xs font-semibold text-black/50 hover:text-black font-display pt-1 transition-colors"
        >
          + Add more items
        </Link>
      </div>
    </aside>
  );
}
