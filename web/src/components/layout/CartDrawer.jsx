import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import Button from '../ui/Button';

export default function CartDrawer() {
  const { isOpen, closeCart, items, removeItem, updateQty, total, clearCart } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={closeCart}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-[61] bg-[#341631] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#eef4d1]/10">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={18} className="text-[#e7a3c9]" />
                <h2 className="text-lg font-black text-[#eef4d1] font-display">Your Cart</h2>
                {items.length > 0 && (
                  <span className="bg-[#e34334] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center font-display">
                    {items.length}
                  </span>
                )}
              </div>
              <button onClick={closeCart} className="p-2 rounded-xl text-[#eef4d1]/60 hover:text-[#eef4d1] hover:bg-[#eef4d1]/8 transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag size={48} className="text-[#eef4d1]/20 mb-4" />
                  <p className="text-[#eef4d1]/60 font-body text-sm">Your cart is empty.</p>
                  <button onClick={closeCart} className="mt-4 text-[#e7a3c9] text-sm font-semibold font-display hover:text-[#eef4d1]">
                    Continue shopping →
                  </button>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="flex gap-4 p-4 bg-[#eef4d1]/6 rounded-2xl border border-[#eef4d1]/8">
                    <img
                      src={item.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=100&q=80'}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[#eef4d1] font-semibold text-sm leading-tight font-display truncate">{item.name}</p>
                      <p className="text-[#e7a3c9] font-black text-sm mt-1 font-display">₹{item.price.toLocaleString('en-IN')}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => updateQty(item.id, item.qty - 1)}
                          className="w-7 h-7 rounded-lg border border-[#eef4d1]/20 flex items-center justify-center text-[#eef4d1]/70 hover:border-[#eef4d1]/50 hover:text-[#eef4d1] transition-all">
                          <Minus size={12} />
                        </button>
                        <span className="text-[#eef4d1] font-semibold text-sm w-5 text-center font-display">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)}
                          className="w-7 h-7 rounded-lg border border-[#eef4d1]/20 flex items-center justify-center text-[#eef4d1]/70 hover:border-[#eef4d1]/50 hover:text-[#eef4d1] transition-all">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <button onClick={() => removeItem(item.id)}
                      className="text-[#eef4d1]/30 hover:text-[#e34334] transition-colors self-start mt-1">
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-[#eef4d1]/10 space-y-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[#eef4d1]/60 text-sm font-body">Subtotal</span>
                  <span className="text-[#eef4d1] font-black text-xl font-display">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[#eef4d1]/35 text-xs font-body">Shipping calculated at checkout</p>
                <Link to="/checkout" onClick={closeCart} className="block">
                  <Button variant="primary" size="lg" fullWidth icon={ArrowRight} iconPosition="right">
                    Checkout — ₹{total.toLocaleString('en-IN')}
                  </Button>
                </Link>
                <button
                  onClick={clearCart}
                  className="w-full text-center text-xs text-[#eef4d1]/35 hover:text-[#e34334] transition-colors font-body py-1"
                >
                  Clear cart
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
