import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShoppingBag, CheckCircle } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useOrderSubmit } from '../../hooks/useOrderSubmit';
import { Input, Textarea } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { form, onChange, onSubmit, loading, done } = useOrderSubmit({
    items, total,
    user,
    // Clear cart only — do not navigate away: a delayed navigate('/') was firing
    // after users opened "My Orders" and pulled them back to the home page.
    onSuccess: () => clearCart(),
  });

  if (items.length === 0 && !done) {
    return (
      <div className="min-h-screen bg-[#eef4d1] flex flex-col items-center justify-center gap-5">
        <ShoppingBag size={48} className="text-[#341631]/20" />
        <p className="text-[#341631] font-display font-bold text-xl">Your cart is empty.</p>
        <Link to="/shop"><Button variant="primary">Shop Now</Button></Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#eef4d1] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-[#0b4722]/12 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-[#0b4722]" />
          </div>
          <h2 className="text-3xl font-black text-[#341631] font-display mb-3">Order Placed!</h2>
          <p className="text-[#341631]/60 font-body text-sm leading-relaxed">
            Thank you for shopping with Tarajuvva. Your order is being processed and will be dispatched soon.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/shop"><Button variant="primary">Continue Shopping</Button></Link>
            {user && <Link to="/profile/orders"><Button variant="outline-green">My Orders</Button></Link>}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef4d1] pt-2 sm:pt-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-[#341631]/55 hover:text-[#0b4722] font-display mb-8 transition-colors">
          <ArrowLeft size={15} /> Back to Shop
        </Link>
        <h1 className="text-3xl font-black text-[#341631] font-display mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Form */}
          <form onSubmit={onSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-[#341631]/8 space-y-5">
            <h2 className="text-lg font-bold text-[#341631] font-display mb-2">Shipping Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Full Name"    name="user_name"  value={form.user_name}  onChange={onChange} required />
              <Input label="Phone"        name="user_phone" value={form.user_phone} onChange={onChange} required type="tel" />
            </div>
            <Input label="Email" name="user_email" value={form.user_email} onChange={onChange} type="email" />
            <Textarea label="Delivery Address" name="address" value={form.address} onChange={onChange} required rows={3} />
            <Textarea label="Order Notes (optional)" name="notes" value={form.notes} onChange={onChange} rows={2} />
            <div className="bg-[#eef4d1] rounded-xl p-4 border border-[#341631]/8">
              <p className="text-sm font-bold text-[#341631] font-display mb-1">💳 Payment Method</p>
              <p className="text-xs text-[#341631]/55 font-body">Cash on Delivery (COD) — Pay when your order arrives.</p>
            </div>
            <Button type="submit" variant="primary" size="xl" fullWidth loading={loading} icon={ShoppingBag}>
              Place Order — ₹{total.toLocaleString('en-IN')}
            </Button>
          </form>

          {/* Order summary */}
          <div className="bg-white rounded-3xl p-6 border border-[#341631]/8 h-fit">
            <h2 className="text-lg font-bold text-[#341631] font-display mb-5">Order Summary</h2>
            <div className="space-y-3 mb-5">
              {items.map(item => (
                <div key={item.id} className="flex gap-3 items-center">
                  <img src={item.images?.[0]} alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#341631] font-display truncate">{item.name}</p>
                    <p className="text-xs text-[#341631]/45 font-body">Qty {item.qty}</p>
                  </div>
                  <span className="text-sm font-bold text-[#0b4722] font-display">₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-[#341631]/8 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-[#341631]/60 font-body">
                <span>Subtotal</span><span>₹{total.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm text-[#341631]/60 font-body">
                <span>Shipping</span><span className="text-[#0b4722] font-semibold">Free</span>
              </div>
              <div className="flex justify-between text-lg font-black text-[#341631] font-display pt-2 border-t border-[#341631]/8">
                <span>Total</span><span>₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
