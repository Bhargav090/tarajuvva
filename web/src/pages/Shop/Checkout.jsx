import { useEffect, useLayoutEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, CheckCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useOrderSubmit } from '../../hooks/useOrderSubmit';
import CheckoutOrderSummary from '../../components/cart/CheckoutOrderSummary';
import { Input, Textarea } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import SuccessNav from '../../components/ui/SuccessNav';
import { Spinner } from '../../components/ui/Skeleton';

export default function Checkout() {
  const { items, total, totalItems, removeItem, updateQty, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/checkout' } });
    }
  }, [user, authLoading, navigate]);
  const { form, onChange, onSubmit, loading, done, placedOrderId, successMessage, paymentMethod, setPaymentMethod } = useOrderSubmit({
    items, total,
    user,
    // Clear cart only — do not navigate away: a delayed navigate('/') was firing
    // after users opened "My Orders" and pulled them back to the home page.
    onSuccess: () => clearCart(),
  });

  useLayoutEffect(() => {
    if (done) window.scrollTo({ top: 0, left: 0 });
  }, [done]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

  if (items.length === 0 && !done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-5">
        <ShoppingBag size={48} className="text-[#241621]/20" />
        <p className="text-[#241621] font-display font-bold text-xl">Your cart is empty.</p>
        <SuccessNav
          actions={[
            { to: '/shop', label: 'Shop Now', variant: 'primary' },
            { to: '/', label: 'Back to Home', variant: 'outline' },
          ]}
          className="mt-0"
        />
      </div>
    );
  }

  if (done) {
    return (
      <div className="w-full min-h-[calc(100dvh-var(--nav-h))] bg-white flex flex-col items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md mx-auto text-center"
        >
          <div className="w-20 h-20 bg-[#a8c74a]/12 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-[#a8c74a]" />
          </div>
          <h2 className="text-3xl font-black text-[#241621] font-display mb-3">Order Placed!</h2>
          <p className="text-[#241621]/60 font-body text-sm leading-relaxed">
            {successMessage || 'Thank you for shopping with Tarajuvva. Your order is being processed and will be dispatched soon.'}
          </p>
          <SuccessNav
            actions={[
              { to: '/', label: 'Back to Home', variant: 'outline' },
              { to: '/shop', label: 'Continue Shopping', variant: 'primary' },
              ...(user && placedOrderId
                ? [{ to: `/profile/orders/${placedOrderId}`, label: 'View order', variant: 'outline-green' }]
                : []),
              ...(user
                ? [{ to: '/profile/orders', label: 'My Orders', variant: 'outline' }]
                : []),
            ]}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] pt-2 sm:pt-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-black/55 hover:text-[#0a0a0a] font-display mb-6 transition-colors">
          <ArrowLeft size={15} /> Back to Shop
        </Link>
        <h1 className="text-3xl font-black text-[#0a0a0a] font-display mb-2">Checkout</h1>
        <p className="text-sm text-black/50 font-body mb-8">Review your bag and complete payment.</p>

        <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
          <form onSubmit={onSubmit} className="bg-white border border-black p-6 sm:p-8 space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-black/45 font-display">
              Shipping details
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Full Name"    name="user_name"  value={form.user_name}  onChange={onChange} required />
              <Input label="Phone"        name="user_phone" value={form.user_phone} onChange={onChange} required type="tel" />
            </div>
            <Input label="Email" name="user_email" value={form.user_email} onChange={onChange} type="email" />
            <Textarea label="Delivery Address" name="address" value={form.address} onChange={onChange} required rows={3} />
            <Textarea label="Order Notes (optional)" name="notes" value={form.notes} onChange={onChange} rows={2} />
            <div className="border border-black/10 p-4 space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-black/45 font-display">
                Payment method
              </p>
              <label className={`flex items-start gap-3 cursor-pointer p-3 border transition-colors ${
                paymentMethod === 'razorpay' ? 'border-black bg-[var(--tj-shop)]/15' : 'border-black/10 hover:border-black/25'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1 accent-[#a8c74a]"
                />
                <span>
                  <span className="text-sm font-semibold text-[#0a0a0a] font-display block">Pay online (Razorpay)</span>
                  <span className="text-xs text-black/55 font-body">UPI, cards, netbanking — secure checkout</span>
                </span>
              </label>
              <label className={`flex items-start gap-3 cursor-pointer p-3 border transition-colors ${
                paymentMethod === 'cod' ? 'border-black bg-[var(--tj-shop)]/15' : 'border-black/10 hover:border-black/25'
              }`}>
                <input
                  type="radio"
                  name="payment_method"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1 accent-[#a8c74a]"
                />
                <span>
                  <span className="text-sm font-semibold text-[#0a0a0a] font-display block">Cash on delivery</span>
                  <span className="text-xs text-black/55 font-body">Pay when your order arrives</span>
                </span>
              </label>
            </div>
            <Button type="submit" variant="primary" size="xl" fullWidth loading={loading} icon={ShoppingBag}>
              {paymentMethod === 'razorpay' ? `Pay ₹${total.toLocaleString('en-IN')}` : `Place Order — ₹${total.toLocaleString('en-IN')}`}
            </Button>
          </form>

          <CheckoutOrderSummary
            items={items}
            total={total}
            totalItems={totalItems}
            onRemove={removeItem}
            onUpdateQty={updateQty}
          />
        </div>
      </div>
    </div>
  );
}
