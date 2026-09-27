import { useState } from 'react';
import { Ticket, Gift, X } from 'lucide-react';

function rupees(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function formatDay(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function AppliedChip({ icon: Icon, code, amount, label, onRemove, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-black bg-[var(--tj-shop)]/15 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Icon size={15} className="shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-display font-bold text-[#0a0a0a] truncate">{code}</p>
          <p className="text-[11px] text-black/55 font-body">
            {label} · saves {rupees(amount)}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-[11px] font-display font-semibold uppercase tracking-wider text-black/55 hover:text-black disabled:opacity-40"
      >
        <X size={13} /> Remove
      </button>
    </div>
  );
}

function CodeField({ value, onChange, onApply, placeholder, buttonLabel, loading }) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onApply();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className="flex-1 min-w-0 px-3 py-2.5 border border-black/20 text-sm font-display uppercase tracking-wider outline-none focus:border-black bg-white"
      />
      <button
        type="button"
        onClick={onApply}
        disabled={loading || !value.trim()}
        className="px-4 py-2.5 border border-black bg-black text-white text-xs font-display font-bold uppercase tracking-wider hover:bg-black/85 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

export default function CheckoutPromotions({
  couponCode,
  giftCardCode,
  couponDiscount,
  giftCardDiscount,
  availableGiftCards = [],
  promoLoading,
  onApplyCoupon,
  onRemoveCoupon,
  onApplyGiftCard,
  onRemoveGiftCard,
}) {
  const [couponInput, setCouponInput] = useState('');
  const [giftInput, setGiftInput] = useState('');
  const [showGiftCode, setShowGiftCode] = useState(false);

  const appliedGiftInList = availableGiftCards.some((g) => g.code === giftCardCode);

  const submitCoupon = async () => {
    if (await onApplyCoupon(couponInput)) setCouponInput('');
  };

  const submitGiftCode = async () => {
    if (await onApplyGiftCard(giftInput)) {
      setGiftInput('');
      setShowGiftCode(false);
    }
  };

  return (
    <div className="border border-black/10 p-4 space-y-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45 font-display">
        Coupons &amp; gift cards
      </p>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#0a0a0a] font-display flex items-center gap-2">
          <Ticket size={15} /> Coupon
        </p>
        {couponCode ? (
          <AppliedChip
            icon={Ticket}
            code={couponCode}
            amount={couponDiscount}
            label="Coupon applied"
            onRemove={onRemoveCoupon}
            disabled={promoLoading}
          />
        ) : (
          <CodeField
            value={couponInput}
            onChange={setCouponInput}
            onApply={submitCoupon}
            placeholder="Enter coupon code"
            buttonLabel="Apply"
            loading={promoLoading}
          />
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#0a0a0a] font-display flex items-center gap-2">
          <Gift size={15} /> Gift card
        </p>

        {giftCardCode && !appliedGiftInList && (
          <AppliedChip
            icon={Gift}
            code={giftCardCode}
            amount={giftCardDiscount}
            label="Gift card redeemed"
            onRemove={onRemoveGiftCard}
            disabled={promoLoading}
          />
        )}

        {availableGiftCards.length > 0 && (
          <div className="space-y-2">
            {availableGiftCards.map((card) => {
              const applied = card.code === giftCardCode;
              return (
                <div
                  key={card.code}
                  className={`flex items-center justify-between gap-3 border px-3 py-2.5 ${
                    applied ? 'border-black bg-[var(--tj-shop)]/15' : 'border-black/15'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-display font-bold text-[#0a0a0a]">
                      {rupees(card.value)} gift card
                    </p>
                    <p className="text-[11px] text-black/55 font-body">
                      {card.code} · {card.remaining_uses} {card.remaining_uses === 1 ? 'use' : 'uses'} left
                      {card.min_cart_value > 0 ? ` · min cart ${rupees(card.min_cart_value)}` : ''}
                      {card.expires_at ? ` · valid till ${formatDay(card.expires_at)}` : ''}
                    </p>
                    {applied && (
                      <p className="text-[11px] font-semibold text-[#0a0a0a] font-body mt-0.5">
                        Saves {rupees(giftCardDiscount)} on this order
                      </p>
                    )}
                  </div>
                  {applied ? (
                    <button
                      type="button"
                      onClick={onRemoveGiftCard}
                      disabled={promoLoading}
                      className="inline-flex items-center gap-1 text-[11px] font-display font-semibold uppercase tracking-wider text-black/55 hover:text-black disabled:opacity-40"
                    >
                      <X size={13} /> Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onApplyGiftCard(card.code)}
                      disabled={promoLoading}
                      className="px-3 py-2 border border-black text-xs font-display font-bold uppercase tracking-wider hover:bg-black hover:text-white disabled:opacity-40"
                    >
                      Redeem
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!giftCardCode && (
          showGiftCode ? (
            <CodeField
              value={giftInput}
              onChange={setGiftInput}
              onApply={submitGiftCode}
              placeholder="Enter gift card code"
              buttonLabel="Redeem"
              loading={promoLoading}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowGiftCode(true)}
              className="text-xs font-semibold text-black/55 hover:text-black font-display underline underline-offset-2"
            >
              {availableGiftCards.length ? 'Have a different gift card code?' : 'Have a gift card code?'}
            </button>
          )
        )}
      </div>
    </div>
  );
}
