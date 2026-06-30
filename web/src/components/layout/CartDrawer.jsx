import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import CartLineItem from '../cart/CartLineItem';

export default function CartDrawer() {
  const { isOpen, closeCart, items, removeItem, updateQty, total, totalItems } = useCart();
  const { user } = useAuth();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={closeCart}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-[61] bg-white border-l border-black flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-black">
              <h2 className="text-lg font-display font-bold text-[#0a0a0a]">
                Your bag · {totalItems}
              </h2>
              <button
                onClick={closeCart}
                className="p-2 text-black/60 hover:text-black transition-colors"
                aria-label="Close cart"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ShoppingBag size={40} className="text-black/15 mb-4" />
                  <p className="text-black/60 font-display">It&apos;s empty.</p>
                  <p className="text-black/45 text-sm font-display mt-2">
                    Go pick something that does six jobs.
                  </p>
                  <Link
                    to="/shop"
                    onClick={closeCart}
                    className="tj-btn-shop mt-8 inline-flex"
                  >
                    Shop the drop <ArrowRight size={16} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map(item => (
                    <CartLineItem
                      key={item.ck}
                      item={item}
                      onRemove={removeItem}
                      onUpdateQty={updateQty}
                    />
                  ))}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-black space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-black/60 text-sm font-display">Subtotal</span>
                  <span className="font-display font-bold text-xl">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <Link
                  to={user ? '/checkout' : '/login'}
                  state={user ? undefined : { from: '/checkout' }}
                  onClick={closeCart}
                  className="tj-btn-ink w-full flex"
                >
                  {user ? 'Checkout' : 'Sign in to checkout'} <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
