import { Link } from 'react-router-dom';
import CartLineItem from './CartLineItem';
import { DELIVERY_ZONE_LABELS, isValidDeliveryZone } from '../../utils/delivery';

export default function CheckoutOrderSummary({
  items,
  total,
  totalItems,
  deliveryFee = 0,
  grandTotal,
  deliveryZone = '',
  onRemove,
  onUpdateQty,
}) {
  const scrollable = items.length > 2;
  const payable = grandTotal != null ? grandTotal : Number(total || 0) + Number(deliveryFee || 0);
  const zoneSelected = isValidDeliveryZone(deliveryZone);

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
            <span className="font-semibold text-[#0a0a0a]">₹{Number(total).toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>
              Delivery
              {zoneSelected ? (
                <span className="block text-[0.65rem] text-black/40 mt-0.5">
                  {DELIVERY_ZONE_LABELS[deliveryZone]}
                </span>
              ) : null}
            </span>
            <span className="font-semibold text-[#0a0a0a] text-right shrink-0">
              {zoneSelected
                ? `₹${Number(deliveryFee).toLocaleString('en-IN')}`
                : 'Select location'}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-baseline pt-2 border-t border-black/15">
          <span className="text-sm font-bold uppercase tracking-wider text-black/45 font-display">Total</span>
          <span className="text-2xl font-black text-[#0a0a0a] font-display">
            ₹{payable.toLocaleString('en-IN')}
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
