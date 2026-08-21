import { useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import mainLogo from '../../assets/mainlogo-removebg-preview.png';

export default function Register() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const onGoogleSuccess = useCallback(async (response) => {
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      if (data.success) {
        login(data.token, data.user);
        toast.success(`Welcome to Tarajuvva, ${data.user.name}!`);
        navigate('/');
      }
    } catch {
      toast.error('Google sign-in failed');
    }
  }, [login, navigate]);

  useEffect(() => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback: onGoogleSuccess,
    });
    window.__tarajuvvaGsiInitialized = true;
    const btn = document.getElementById('google-register-btn');
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
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16 relative">
      <Link
        to="/"
        className="fixed top-5 left-5 sm:top-6 sm:left-6 z-20 inline-flex items-center gap-2 rounded-full border border-[#241621]/12 bg-white/95 px-3.5 py-2 text-sm font-semibold text-[#241621] shadow-sm backdrop-blur-sm transition-colors hover:border-[#241621]/25 hover:bg-white font-display"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to Home
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center mb-10">
          <img
            src={mainLogo}
            alt="Tarajuvva"
            className="h-12 w-auto max-w-[200px] object-contain object-left"
          />
        </Link>

        <h2 className="text-3xl font-black text-[#241621] font-display mb-2">Sign in</h2>
        <p className="text-[#241621]/55 font-body text-sm mb-8">
          Track orders, save your bag, and check out faster.
        </p>

        <div id="google-register-btn" className="w-full flex justify-center min-h-[44px]" />
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
  );
}
