import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import mainLogo from '../../assets/mainlogo-removebg-preview.png';

function getSafeLoginRedirect(from) {
  const target = typeof from === 'string' && from.startsWith('/') ? from : '/';
  if (target === '/login' || target === '/register' || target === '/admin' || target.startsWith('/admin/')) {
    return '/';
  }
  return target;
}

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const didRedirect = useRef(false);

  const redirectAfterAuth = useCallback((fromPath) => {
    if (didRedirect.current) return;
    didRedirect.current = true;
    navigate(getSafeLoginRedirect(fromPath), { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      didRedirect.current = false;
      return;
    }
    redirectAfterAuth(from);
  }, [user, from, redirectAfterAuth]);

  const onGoogleSuccess = useCallback(async (response) => {
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      if (data.success) {
        login(data.token, data.user);
        toast.success(`Welcome, ${data.user.name}!`);
        redirectAfterAuth(from);
      }
    } catch {
      toast.error('Google sign-in failed');
    }
  }, [login, redirectAfterAuth, from]);

  useEffect(() => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback: onGoogleSuccess,
    });
    window.__tarajuvvaGsiInitialized = true;
    const btn = document.getElementById('google-signin-btn');
    if (!btn) return;
    btn.innerHTML = '';
    const width = Math.min(400, btn.parentElement?.clientWidth || 340);
    window.google.accounts.id.renderButton(btn, {
      theme: 'outline',
      size: 'large',
      width,
      logo_alignment: 'left',
      text: 'continue_with',
      shape: 'rectangular',
    });
    return () => {
      window.google.accounts.id.cancel();
    };
  }, [onGoogleSuccess]);

  return (
    <div className="min-h-screen bg-white flex relative">
      <Link
        to="/"
        className="fixed top-5 left-5 sm:top-6 sm:left-6 z-20 inline-flex items-center gap-2 rounded-full border border-[#241621]/12 bg-white/95 px-3.5 py-2 text-sm font-semibold text-[#241621] shadow-sm backdrop-blur-sm transition-colors hover:border-[#241621]/25 hover:bg-white font-display"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to Home
      </Link>

      <div className="hidden lg:flex lg:w-1/2 bg-[var(--tj-shop)] flex-col justify-center px-16 py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #ffffff 0%, transparent 60%)' }} />
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
          <Link to="/" className="flex items-center mb-5">
            <img
              src={mainLogo}
              alt="Tarajuvva"
              className="h-[6.5rem] xl:h-[7.5rem] w-auto max-w-[440px] xl:max-w-[520px] object-contain object-left"
            />
          </Link>
          <h1 className="font-display font-black text-[#241621] leading-tight mb-4" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.5rem)' }}>
            Your wardrobe,
            <br />
            <span className="text-[#7A063C]">reimagined.</span>
          </h1>
          <p className="text-[#241621]/70 font-body text-lg max-w-md">
            Sign in to track orders, manage Reimagine requests, and check out faster.
          </p>
          <div className="mt-8 space-y-3">
            {['Track all your orders in one place', 'Manage Reimagine requests easily', 'Save your address for faster checkout'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[#e2a3c9]/20 border border-[#e2a3c9]/40 flex items-center justify-center text-[#e2a3c9] text-xs font-bold">✓</span>
                <span className="text-[#241621]/75 text-sm font-body">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-16 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center mb-4 lg:hidden">
            <img
              src={mainLogo}
              alt="Tarajuvva"
              className="h-[5.75rem] w-auto max-w-[403px] object-contain object-left"
            />
          </Link>

          <h2 className="text-3xl font-black text-[#241621] font-display mb-2">Sign in</h2>
          <p className="text-[#241621]/55 font-body text-sm mb-8">
            Track orders, save your bag, and check out faster.
          </p>

          <div id="google-signin-btn" className="w-full flex justify-center min-h-[44px]" />
          <p className="mt-3 text-center text-xs text-[#241621]/45 font-body">
            Fastest way · No password needed
          </p>

          <p className="mt-10 text-center text-xs text-[#241621]/40 font-body">
            By continuing, you agree to our{' '}
            <a
              href="https://tarajuvva.com/help#terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#241621]"
            >
              Terms
            </a>
            {' '}and{' '}
            <a
              href="https://tarajuvva.com/help"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[#241621]"
            >
              Privacy Policy
            </a>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
