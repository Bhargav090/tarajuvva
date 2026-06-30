import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User, LogOut, ChevronDown, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../utils/constants';
import UserAvatar from '../ui/UserAvatar';
import ConfirmDialog from '../ui/ConfirmDialog';
import mainLogo from '../../assets/mainlogo-removebg-preview.png';
import MobileNavScroll from './MobileNavScroll';

const VERTICAL_NAV_COLORS = {
  Shop: 'var(--tj-shop-deep)',
  Reimagine: '#7A063C',
  Repair: 'var(--tj-repair)',
  Donate: 'var(--tj-donate)',
};

export default function Header({ hasTicker = false }) {
  const { totalItems, openCart } = useCart();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenu, setUserMenu] = useState(false);
  const [mobileUserMenu, setMobileUserMenu] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const confirmLogout = () => {
    logout();
    setUserMenu(false);
    setMobileUserMenu(false);
    navigate('/');
    toast.success('Signed out.');
  };

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium tracking-wide transition-colors ${
      isActive ? 'text-black' : 'text-black/60 hover:text-black'
    }`;

  return (
    <>
      <header
        className="fixed left-0 right-0 z-50 bg-white border-b border-black/10"
        style={{ top: hasTicker ? 'var(--ticker-h)' : 0 }}
      >
        <div className="tj-container">
          <div className="flex items-center justify-between min-h-[4.5rem] sm:min-h-[5rem] py-1.5">
            <Link to="/" className="flex items-center shrink-0 min-w-0">
              <img
                src={mainLogo}
                alt="Tarajuvva"
                className="tj-header-logo"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              {NAV_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={navLinkClass}
                  style={({ isActive }) => {
                    const c = VERTICAL_NAV_COLORS[l.label];
                    if (!c) return undefined;
                    return { color: isActive ? c : `color-mix(in srgb, ${c} 68%, #000 32%)` };
                  }}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              {user ? (
                <>
                  <div className="relative hidden md:block">
                    <button
                      type="button"
                      onClick={() => setUserMenu((p) => !p)}
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
                          <Link
                            to="/profile"
                            onClick={() => setUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#241621] hover:text-[#a8c74a] hover:bg-gray-50 transition-colors font-body"
                          >
                            <User size={15} /> My Profile
                          </Link>
                          <Link
                            to="/profile/orders"
                            onClick={() => setUserMenu(false)}
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#241621] hover:text-[#a8c74a] hover:bg-gray-50 transition-colors font-body"
                          >
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

                  <div className="relative md:hidden">
                    <button
                      type="button"
                      onClick={() => setMobileUserMenu((p) => !p)}
                      className="p-1.5 rounded-xl hover:bg-[#241621]/6 transition-colors"
                      aria-label="Account menu"
                    >
                      <UserAvatar
                        src={user.avatar}
                        name={user.name}
                        className="w-8 h-8 rounded-full"
                        fallbackClassName="bg-[#a8c74a] text-[#241621] text-xs font-bold"
                      />
                    </button>
                    <AnimatePresence>
                      {mobileUserMenu && (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-[51] md:hidden"
                            aria-label="Close account menu"
                            onClick={() => setMobileUserMenu(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-[#241621]/8 overflow-hidden z-[52]"
                          >
                            <div className="px-4 py-3 border-b border-[#241621]/8">
                              <p className="text-sm font-bold text-[#241621] font-display truncate">{user.name}</p>
                              <p className="text-xs text-[#241621]/50 font-body truncate">{user.email}</p>
                            </div>
                            <Link
                              to="/profile"
                              onClick={() => setMobileUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#241621] hover:text-[#a8c74a] hover:bg-gray-50 transition-colors font-body"
                            >
                              <User size={15} /> My Profile
                            </Link>
                            <Link
                              to="/profile/orders"
                              onClick={() => setMobileUserMenu(false)}
                              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#241621] hover:text-[#a8c74a] hover:bg-gray-50 transition-colors font-body"
                            >
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
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center p-2 rounded-xl text-[#241621]/70 hover:text-[#241621] hover:bg-[#241621]/6 transition-colors md:px-4 md:py-2 md:text-sm md:font-semibold md:text-[#241621] md:border-2 md:border-[#241621] md:rounded-xl md:hover:bg-[#a8c74a] md:hover:border-[#a8c74a] md:hover:text-[#241621] font-display"
                  aria-label="Sign in"
                >
                  <User size={20} className="md:hidden" />
                  <span className="hidden md:inline-flex items-center gap-1.5">
                    <User size={14} /> Sign In
                  </span>
                </Link>
              )}

              <button
                type="button"
                onClick={openCart}
                className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full border border-black/15 text-sm font-medium text-[#0a0a0a] hover:border-black/30 transition-colors shrink-0"
                aria-label="Cart"
              >
                <ShoppingBag size={18} />
                <span className="font-display">{totalItems > 9 ? '9+' : totalItems}</span>
              </button>
            </div>
          </div>
        </div>

        <MobileNavScroll />
      </header>

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
