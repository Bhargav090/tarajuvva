import { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { FONT_STACK } from './utils/fontStack';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import Ticker from './components/layout/Ticker';
import WhatsAppFloat from './components/layout/WhatsAppFloat';

import Home       from './pages/Home';
import Shop       from './pages/Shop';
import ProductPage from './pages/Shop/ProductPage';
import Checkout   from './pages/Shop/Checkout';
import Reimagine  from './pages/Reimagine';
import Repair     from './pages/Repair';
import Donate     from './pages/Donate';
import About      from './pages/About';
import Help       from './pages/Help';
import Admin      from './pages/Admin';
import Login      from './pages/Auth/Login';
import Register   from './pages/Auth/Register';
import Profile    from './pages/Profile';
import OrderDetail from './pages/Profile/OrderDetail';

/** Must match fixed ticker band height on the landing page (px). */
const TICKER_BAR_PX = 32;

/** Reset window scroll on forward navigations (PUSH/REPLACE). POP keeps browser scroll restore. */
function ScrollToTop() {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();
  useLayoutEffect(() => {
    if (navType === 'POP') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search, navType]);
  return null;
}

function Layout({ children }) {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const isAuth  = pathname === '/login' || pathname === '/register';
  const isHome    = pathname === '/';

  if (isAdmin || isAuth) return <>{children}</>;

  return (
    <div
      className="[--nav-h:7rem] md:[--nav-h:4.25rem]"
      style={{
        '--ticker-h': isHome ? `${TICKER_BAR_PX}px` : '0px',
      }}
    >
      {isHome && <Ticker />}
      <Header hasTicker={isHome} />
      {/* Reserve space for fixed ticker + nav so page content is not covered */}
      <div
        aria-hidden
        className="shrink-0 h-[calc(var(--ticker-h)+var(--nav-h))]"
      />
      <CartDrawer />
      <main>{children}</main>
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <WishlistProvider>
        <CartProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#241621',
                color: '#eef4d1',
                fontFamily: FONT_STACK,
                fontSize: 13,
                border: '1px solid rgba(238,244,209,0.12)',
                borderRadius: 12,
              },
              success: { iconTheme: { primary: '#c8ff2e', secondary: '#eef4d1' } },
              error:   { iconTheme: { primary: '#e34334', secondary: '#eef4d1' } },
            }}
          />
          <Layout>
            <Routes>
              <Route path="/"                  element={<Home />} />
              <Route path="/shop"              element={<Shop />} />
              <Route path="/shop/:id"          element={<ProductPage />} />
              <Route path="/checkout"          element={<Checkout />} />
              <Route path="/reimagine"         element={<Reimagine />} />
              <Route path="/repair"            element={<Repair />} />
              <Route path="/donate"            element={<Donate />} />
              <Route path="/about"             element={<About />} />
              <Route path="/help"              element={<Help />} />
              <Route path="/login"             element={<Login />} />
              <Route path="/register"          element={<Register />} />
              <Route path="/profile"                    element={<Profile />} />
              <Route path="/profile/orders/:orderId" element={<OrderDetail />} />
              <Route path="/profile/:section"         element={<Profile />} />
              <Route path="/admin"             element={<Admin />} />
              <Route path="*" element={
                <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
                  <p className="text-8xl font-black text-[#241621]/10 font-display">404</p>
                  <p className="text-xl font-bold text-[#241621] font-display">Page not found</p>
                  <a href="/" className="text-[#a8e000] font-semibold hover:underline font-display">Go Home →</a>
                </div>
              } />
            </Routes>
          </Layout>
        </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
