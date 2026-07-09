import Button from '../ui/Button';

export default function ReimaginePaymentStep({
  price,
  loading,
  onPay,
  onBack,
  title = 'Complete payment',
  description = 'Secure checkout via Razorpay (UPI, cards, netbanking).',
}) {
  return (
    <div className="tj-card p-6 md:p-8 max-w-lg w-full shadow-[4px_4px_0_0_rgba(0,0,0,0.06)]">
      <h2 className="text-xl font-black text-[#0a0a0a] font-display">{title}</h2>
      <p className="text-sm text-black/60 mt-2 leading-relaxed">{description}</p>
      <p className="mt-6 font-display text-3xl font-extrabold text-[#0a0a0a]">
        ₹{Number(price || 0).toLocaleString('en-IN')}
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button type="button" variant="primary" className="flex-1" loading={loading} onClick={onPay}>
          Pay now
        </Button>
      </div>
    </div>
  );
}
