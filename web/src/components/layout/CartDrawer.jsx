import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { productHeroImage } from '../../utils/productImage';

export default function CartDrawer() {
  const { isOpen, closeCart, items, removeItem, updateQty, total, totalItems } = useCart();

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
                <div className="space-y-4">
                  {items.map(item => (
                    <div key={item.id} className="flex gap-4 p-3 border border-black">
                      <img
                        src={productHeroImage(item.images)}
                        alt={item.name}
                        className="w-16 h-20 object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm leading-tight truncate">{item.name}</p>
                        <p className="font-display font-bold text-sm mt-1">₹{item.price.toLocaleString('en-IN')}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty - 1)}
                            className="w-7 h-7 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="font-display font-semibold text-sm w-5 text-center">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.id, item.qty + 1)}
                            className="w-7 h-7 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-black/30 hover:text-black transition-colors self-start"
                      >
                        <X size={16} />
                      </button>
                    </div>
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
                <Link to="/checkout" onClick={closeCart} className="tj-btn-ink w-full flex">
                  Checkout <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
