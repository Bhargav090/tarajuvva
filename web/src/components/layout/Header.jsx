import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X, User, LogOut, ChevronDown, Package } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../utils/constants';

export default function Header() {
  const { totalItems, openCart } = useCart();
  const { user, logout }         = useAuth();
  const navigate                  = useNavigate();
  const [open, setOpen]           = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const [userMenu, setUserMenu]   = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // Prevent body scroll when mobile nav open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navLinkClass = ({ isActive }) =>
    `text-sm font-semibold font-[Outfit] transition-colors tracking-wide ${
      isActive ? 'text-[#0b4722]' : 'text-[#341631]/70 hover:text-[#0b4722]'
    }`;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#eef4d1]/95 backdrop-blur-md shadow-sm border-b border-[#341631]/8'
            : 'bg-[#eef4d1]'
        }`}
        style={{ top: 'var(--ticker-h, 32px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setOpen(false)}>
              <div className="w-8 h-8 rounded-lg bg-[#0b4722] flex items-center justify-center">
                <span className="text-[#eef4d1] font-black text-sm font-[Outfit]">T</span>
              </div>
              <span className="text-lg font-black text-[#341631] tracking-tight font-[Outfit] group-hover:text-[#0b4722] transition-colors">
                Tarajuvva
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map(l => (
                <NavLink key={l.to} to={l.to} className={navLinkClass}>{l.label}</NavLink>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Cart */}
              <button
                onClick={openCart}
                className="relative p-2 rounded-xl text-[#341631] hover:bg-[#341631]/6 transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag size={20} />
                {totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-0.5 -right-0.5 bg-[#e34334] text-white text-[9px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center font-[Outfit]"
                    style={{ width: 17, height: 17 }}
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </motion.span>
                )}
              </button>

              {/* User menu */}
              {user ? (
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setUserMenu(p => !p)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#341631]/6 transition-colors"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#0b4722] flex items-center justify-center text-[#eef4d1] text-xs font-bold font-[Outfit]">
                        {user.name?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <ChevronDown size={14} className="text-[#341631]/50" />
                  </button>
                  <AnimatePresence>
                    {userMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#341631]/8 overflow-hidden"
                        onMouseLeave={() => setUserMenu(false)}
                      >
                        <div className="px-4 py-3 border-b border-[#341631]/8">
                          <p className="text-sm font-bold text-[#341631] font-[Outfit] truncate">{user.name}</p>
                          <p className="text-xs text-[#341631]/50 font-[Poppins] truncate">{user.email}</p>
                        </div>
                        <Link to="/profile" onClick={() => setUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#341631] hover:bg-[#eef4d1] transition-colors font-[Poppins]">
                          <User size={15} /> My Profile
                        </Link>
                        <Link to="/profile/orders" onClick={() => setUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#341631] hover:bg-[#eef4d1] transition-colors font-[Poppins]">
                          <Package size={15} /> My Orders
                        </Link>
                        <button
                          onClick={() => { logout(); setUserMenu(false); navigate('/'); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#e34334] hover:bg-[#e34334]/5 transition-colors font-[Poppins]"
                        >
                          <LogOut size={15} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#0b4722] border-2 border-[#0b4722] rounded-xl hover:bg-[#0b4722] hover:text-[#eef4d1] transition-all duration-200 font-[Outfit]"
                >
                  <User size={14} /> Sign In
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setOpen(p => !p)}
                className="md:hidden p-2 rounded-xl text-[#341631] hover:bg-[#341631]/6 transition-colors"
                aria-label="Menu"
              >
                {open ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-40 md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="fixed right-0 top-0 h-full w-4/5 max-w-xs z-50 bg-[#eef4d1] flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#341631]/10">
                <span className="font-black text-lg text-[#341631] font-[Outfit]">Menu</span>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-[#341631]/6">
                  <X size={20} className="text-[#341631]" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
                {NAV_LINKS.map(l => (
                  <NavLink
                    key={l.to} to={l.to} onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded-xl text-base font-semibold font-[Outfit] transition-colors ${
                        isActive ? 'bg-[#0b4722] text-[#eef4d1]' : 'text-[#341631] hover:bg-[#341631]/6'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
                <div className="pt-4 border-t border-[#341631]/10 mt-4">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#0b4722] flex items-center justify-center text-[#eef4d1] font-bold font-[Outfit]">
                            {user.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm text-[#341631] font-[Outfit]">{user.name}</p>
                          <p className="text-xs text-[#341631]/50 font-[Poppins]">{user.email}</p>
                        </div>
                      </div>
                      <NavLink to="/profile" onClick={() => setOpen(false)}
                        className="block px-4 py-3 rounded-xl text-sm font-semibold font-[Outfit] text-[#341631] hover:bg-[#341631]/6">
                        My Profile
                      </NavLink>
                      <NavLink to="/profile/orders" onClick={() => setOpen(false)}
                        className="block px-4 py-3 rounded-xl text-sm font-semibold font-[Outfit] text-[#341631] hover:bg-[#341631]/6">
                        My Orders
                      </NavLink>
                      <button onClick={() => { logout(); setOpen(false); navigate('/'); }}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold font-[Outfit] text-[#e34334] hover:bg-[#e34334]/6">
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link to="/login" onClick={() => setOpen(false)}
                      className="block px-4 py-3 rounded-xl text-sm font-bold font-[Outfit] bg-[#0b4722] text-[#eef4d1] text-center">
                      Sign In / Register
                    </Link>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
