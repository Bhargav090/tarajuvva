import { useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Ticker from './components/layout/Ticker';
import CartDrawer from './components/layout/CartDrawer';

import Home       from './pages/Home';
import Shop       from './pages/Shop';
import ProductPage from './pages/Shop/ProductPage';
import Checkout   from './pages/Shop/Checkout';
import Reimagine  from './pages/Reimagine';
import Repair     from './pages/Repair';
import Donate     from './pages/Donate';
import About      from './pages/About';
import Admin      from './pages/Admin';
import Login      from './pages/Auth/Login';
import Register   from './pages/Auth/Register';
import Profile    from './pages/Profile';

const TICKER_H = 32; // px

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

  if (isAdmin || isAuth) return <>{children}</>;

  return (
    <>
      {/* Ticker strip */}
      <div style={{ height: TICKER_H }}>
        <Ticker />
      </div>
      {/* Sticky header sits below ticker */}
      <div style={{ '--ticker-h': `${TICKER_H}px` }}>
        <Header />
      </div>
      <CartDrawer />
      <main>{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <CartProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#341631',
                color: '#eef4d1',
                fontFamily: 'Poppins, sans-serif',
                fontSize: 13,
                border: '1px solid rgba(238,244,209,0.12)',
                borderRadius: 12,
              },
              success: { iconTheme: { primary: '#0b4722', secondary: '#eef4d1' } },
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
              <Route path="/login"             element={<Login />} />
              <Route path="/register"          element={<Register />} />
              <Route path="/profile"           element={<Profile />} />
              <Route path="/profile/:section"  element={<Profile />} />
              <Route path="/admin"             element={<Admin />} />
              <Route path="*" element={
                <div className="min-h-screen bg-[#eef4d1] flex flex-col items-center justify-center gap-4">
                  <p className="text-8xl font-black text-[#341631]/10 font-[Outfit]">404</p>
                  <p className="text-xl font-bold text-[#341631] font-[Outfit]">Page not found</p>
                  <a href="/" className="text-[#0b4722] font-semibold hover:underline font-[Outfit]">Go Home →</a>
                </div>
              } />
            </Routes>
          </Layout>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
