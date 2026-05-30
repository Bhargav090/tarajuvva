import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X, User, LogOut, ChevronDown, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../utils/constants';
import UserAvatar from '../ui/UserAvatar';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function Header({ hasTicker = false }) {
  const { totalItems, openCart } = useCart();
  const { user, logout }         = useAuth();
  const navigate                  = useNavigate();
  const [open, setOpen]           = useState(false);
  const [userMenu, setUserMenu]   = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const confirmLogout = () => {
    logout();
    setUserMenu(false);
    setOpen(false);
    navigate('/');
    toast.success('Signed out.');
  };

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium tracking-wide transition-colors ${
      isActive ? 'text-black' : 'text-black/60 hover:text-black'
    }`;

  return (
    <>
      <header
        className="fixed left-0 right-0 z-50 bg-white/85 backdrop-blur-xl border-b border-black/10"
        style={{ top: hasTicker ? 'var(--ticker-h)' : 0 }}
      >
        <div className="tj-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-0.5" onClick={() => setOpen(false)}>
              <span className="font-display font-extrabold tracking-tighter text-2xl text-[#0a0a0a]">
                tarajuvva<span className="text-[var(--tj-shop-deep)]">.</span>
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
                className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full border border-black/15 text-sm font-medium text-[#0a0a0a] hover:border-black/30 transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag size={18} />
                <span className="font-display">{totalItems > 9 ? '9+' : totalItems}</span>
              </button>

              {/* User menu */}
              {user ? (
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setUserMenu(p => !p)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#241621]/6 transition-colors"
                  >
                    <UserAvatar
                      src={user.avatar}
                      name={user.name}
                      className="w-7 h-7 rounded-full"
                      fallbackClassName="bg-[#a8c74a] text-[#241621] text-xs font-bold"
                    />
                    <ChevronDown size={14} className="text-[#241621]/50" />
                  </button>
                  <AnimatePresence>
                    {userMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#241621]/8 overflow-hidden"
                        onMouseLeave={() => setUserMenu(false)}
                      >
                        <div className="px-4 py-3 border-b border-[#241621]/8">
                          <p className="text-sm font-bold text-[#241621] font-display truncate">{user.name}</p>
                          <p className="text-xs text-[#241621]/50 font-body truncate">{user.email}</p>
                        </div>
                        <Link to="/profile" onClick={() => setUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#241621] hover:bg-gray-50 transition-colors font-body">
                          <User size={15} /> My Profile
                        </Link>
                        <Link to="/profile/orders" onClick={() => setUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#241621] hover:bg-gray-50 transition-colors font-body">
                          <Package size={15} /> My Orders
                        </Link>
                        <button
                          type="button"
                          onClick={() => setLogoutOpen(true)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#e34334] hover:bg-[#e34334]/5 transition-colors font-body"
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
                  className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#a8c74a] border-2 border-[#a8c74a] rounded-xl hover:bg-[#a8c74a] hover:text-[#241621] transition-all duration-200 font-display"
                >
                  <User size={14} /> Sign In
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setOpen(p => !p)}
                className="md:hidden p-2 rounded-xl text-[#241621] hover:bg-[#241621]/6 transition-colors"
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
              className="fixed inset-0 bg-black/30 z-[56] md:hidden"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="fixed right-0 top-0 h-full w-4/5 max-w-xs z-[57] bg-white flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#241621]/10">
                <span className="font-black text-lg text-[#241621] font-display">Menu</span>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-[#241621]/6">
                  <X size={20} className="text-[#241621]" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
                {NAV_LINKS.map(l => (
                  <NavLink
                    key={l.to} to={l.to} onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-3 rounded-xl text-base font-semibold font-display transition-colors ${
                        isActive ? 'bg-[#a8c74a] text-[#241621]' : 'text-[#241621] hover:bg-[#241621]/6'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
                <div className="pt-4 border-t border-[#241621]/10 mt-4">
                  {user ? (
                    <>
                      <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <UserAvatar
                          src={user.avatar}
                          name={user.name}
                          className="w-9 h-9 rounded-full"
                          fallbackClassName="bg-[#a8c74a] text-[#241621] font-bold text-sm"
                        />
                        <div>
                          <p className="font-bold text-sm text-[#241621] font-display">{user.name}</p>
                          <p className="text-xs text-[#241621]/50 font-body">{user.email}</p>
                        </div>
                      </div>
                      <NavLink to="/profile" onClick={() => setOpen(false)}
                        className="block px-4 py-3 rounded-xl text-sm font-semibold font-display text-[#241621] hover:bg-[#241621]/6">
                        My Profile
                      </NavLink>
                      <NavLink to="/profile/orders" onClick={() => setOpen(false)}
                        className="block px-4 py-3 rounded-xl text-sm font-semibold font-display text-[#241621] hover:bg-[#241621]/6">
                        My Orders
                      </NavLink>
                      <button type="button" onClick={() => setLogoutOpen(true)}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm font-semibold font-display text-[#e34334] hover:bg-[#e34334]/6">
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <Link to="/login" onClick={() => setOpen(false)}
                      className="block px-4 py-3 rounded-xl text-sm font-bold font-display bg-[#a8c74a] text-[#241621] text-center">
                      Sign In / Register
                    </Link>
                  )}
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Sign out?"
        message="You will need to sign in again to access your account and orders."
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        confirmVariant="red"
        onConfirm={confirmLogout}
      />
    </>
  );
}
