import { createContext, useContext, useReducer, useEffect, useState } from 'react';

const CartCtx = createContext(null);

/** Stable identity key — same product but different size = separate line. */
const ck = (id, size) => `${id}|${size || ''}`;

const initial = () => {
  try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; }
};

function reducer(state, { type, payload }) {
  switch (type) {
    case 'ADD': {
      const key = ck(payload.id, payload.size);
      const exists = state.find(i => i.ck === key);
      return exists
        ? state.map(i => i.ck === key ? { ...i, qty: i.qty + 1 } : i)
        : [...state, { ...payload, qty: 1, ck: key }];
    }
    case 'REMOVE':  return state.filter(i => i.ck !== payload);
    case 'UPDATE':  return state.map(i => i.ck === payload.ck ? { ...i, qty: Math.max(1, payload.qty) } : i);
    case 'CLEAR':   return [];
    default:        return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, [], initial);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)); }, [items]);

  /** @param {object} product — full product object
   *  @param {string} [size]  — selected size label, e.g. 'M' */
  const addItem    = (product, size) => {
    dispatch({ type: 'ADD', payload: { ...product, size: size || null } });
    setIsOpen(true);
  };
  const removeItem = (cartKey) => dispatch({ type: 'REMOVE', payload: cartKey });
  const updateQty  = (cartKey, qty) =>
    qty < 1
      ? dispatch({ type: 'REMOVE', payload: cartKey })
      : dispatch({ type: 'UPDATE', payload: { ck: cartKey, qty } });
  const clearCart  = () => dispatch({ type: 'CLEAR' });

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const total      = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartCtx.Provider value={{
      items, totalItems, total,
      addItem, removeItem, updateQty, clearCart,
      isOpen,
      openCart:  () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
    }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
