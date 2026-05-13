import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Button from '../../components/ui/Button';

export default function Login() {
  const { login, user }    = useAuth();
  const navigate            = useNavigate();
  const location            = useLocation();
  const from                = location.state?.from || '/';

  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate(from, { replace: true }); }, [user]);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      if (data.success) {
        // Admin login returns { admin } instead of { user }
        if (data.admin) {
          localStorage.setItem('admin_token', data.token);
          toast.success(`Welcome back, ${data.admin.username}! 👋`);
          navigate('/admin', { replace: true });
          return;
        }

        login(data.token, data.user);
        toast.success(`Welcome back, ${data.user.name}! 👋`);
        navigate(from, { replace: true });
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = async (response) => {
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      if (data.success) {
        login(data.token, data.user);
        toast.success(`Welcome, ${data.user.name}! 🎉`);
        navigate(from, { replace: true });
      }
    } catch (err) {
      toast.error('Google sign-in failed');
    }
  };

  useEffect(() => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback: onGoogleSuccess,
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'outline', size: 'large', width: 340, logo_alignment: 'center' }
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#eef4d1] flex">
      {/* Left visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#a8c74a] flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, #eef4d1 0%, transparent 60%)' }} />
        <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7 }}>
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-[#eef4d1] flex items-center justify-center">
              <span className="text-[#a8c74a] font-black text-lg font-display">T</span>
            </div>
            <span className="text-[#241621] font-black text-xl font-display">Tarajuvva</span>
          </Link>
          <h1 className="font-display font-black text-[#241621] leading-tight mb-6" style={{ fontSize: 'clamp(2.2rem, 4vw, 3.5rem)' }}>
            Your wardrobe,
            <br />
            <span className="text-[#4c1b1b]">reimagined.</span>
          </h1>
          <p className="text-[#241621]/70 font-body text-lg">
            Sign in to track your orders, manage reimagine requests, and shop your next favourite piece.
          </p>
          <div className="mt-12 space-y-4">
            {['Track all your orders in one place','Manage reimagine requests easily','Save your address for faster checkout'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-[#e2a3c9]/20 border border-[#e2a3c9]/40 flex items-center justify-center text-[#e2a3c9] text-xs font-bold">✓</span>
                <span className="text-[#241621]/75 text-sm font-body">{f}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 sm:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-[#a8c74a] flex items-center justify-center">
              <span className="text-[#241621] font-black text-sm font-display">T</span>
            </div>
            <span className="text-xl font-black text-[#241621] font-display">Tarajuvva</span>
          </Link>

          <h2 className="text-3xl font-black text-[#241621] font-display mb-2">Welcome back</h2>
          <p className="text-[#241621]/55 font-body text-sm mb-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#a8c74a] font-semibold hover:underline">Sign up free</Link>
          </p>

          {/* Google SSO */}
          <div id="google-signin-btn" className="mb-6 flex justify-center" />
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#241621]/12" />
            <span className="text-[#241621]/40 text-xs font-body">or continue with email</span>
            <div className="flex-1 h-px bg-[#241621]/12" />
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#241621] mb-1.5 font-display">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#241621]/35" />
                <input
                  name="email" type="email" value={form.email} onChange={onChange} required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#241621]/12 rounded-xl text-[#241621] placeholder:text-[#241621]/35 font-body text-sm outline-none focus:border-[#a8c74a] focus:ring-2 focus:ring-[#a8c74a]/12"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#241621] mb-1.5 font-display">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#241621]/35" />
                <input
                  name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={onChange} required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-3 bg-white border border-[#241621]/12 rounded-xl text-[#241621] placeholder:text-[#241621]/35 font-body text-sm outline-none focus:border-[#a8c74a] focus:ring-2 focus:ring-[#a8c74a]/12"
                />
                <button type="button" onClick={() => setShowPw(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#241621]/40 hover:text-[#241621]">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} icon={ArrowRight} iconPosition="right">
              Sign In
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-[#241621]/40 font-body">
            By signing in you agree to our{' '}
            <a href="#" className="underline hover:text-[#241621]">Terms</a> &{' '}
            <a href="#" className="underline hover:text-[#241621]">Privacy Policy</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
