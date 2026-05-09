import { createContext, useContext, useReducer, useEffect, useState } from 'react';

const CartCtx = createContext(null);

const initial = () => {
  try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; }
};

function reducer(state, { type, payload }) {
  switch (type) {
    case 'ADD': {
      const exists = state.find(i => i.id === payload.id);
      return exists
        ? state.map(i => i.id === payload.id ? { ...i, qty: i.qty + 1 } : i)
        : [...state, { ...payload, qty: 1 }];
    }
    case 'REMOVE':  return state.filter(i => i.id !== payload);
    case 'UPDATE':  return state.map(i => i.id === payload.id ? { ...i, qty: Math.max(1, payload.qty) } : i);
    case 'CLEAR':   return [];
    default:        return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, [], initial);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)); }, [items]);

  const addItem    = p => { dispatch({ type: 'ADD', payload: p }); setIsOpen(true); };
  const removeItem = id => dispatch({ type: 'REMOVE', payload: id });
  const updateQty  = (id, qty) => qty < 1 ? dispatch({ type: 'REMOVE', payload: id }) : dispatch({ type: 'UPDATE', payload: { id, qty } });
  const clearCart  = () => dispatch({ type: 'CLEAR' });

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const total      = items.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartCtx.Provider value={{ items, totalItems, total, addItem, removeItem, updateQty, clearCart, isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false) }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
