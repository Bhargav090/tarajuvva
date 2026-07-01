import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Button from '../../components/ui/Button';
import mainLogo from '../../assets/mainlogo-removebg-preview.png';

export default function Register() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirmPw: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.confirmPw) return toast.error('Passwords do not match');
    if (form.password.length < 6)        return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name: form.name, email: form.email, password: form.password });
      if (data.success) {
        login(data.token, data.user);
        toast.success(`Welcome to Tarajuvva, ${data.user.name}! 🎉`);
        navigate('/');
      } else {
        toast.error(data.message || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = useCallback(async (response) => {
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      if (data.success) {
        login(data.token, data.user);
        toast.success(`Welcome, ${data.user.name}! 🎉`);
      }
    } catch { toast.error('Google sign-in failed'); }
  }, [login]);

  useEffect(() => {
    if (!window.google) return;
    if (!window.__tarajuvvaGsiInitialized) {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: onGoogleSuccess,
      });
      window.__tarajuvvaGsiInitialized = true;
    }
    const btn = document.getElementById('google-register-btn');
    if (!btn) return;
    btn.innerHTML = '';
    window.google.accounts.id.renderButton(
      btn,
      { theme: 'outline', size: 'large', width: 340, logo_alignment: 'center' }
    );
    return () => {
      window.google.accounts.id.cancel();
    };
  }, [onGoogleSuccess]);

  const fields = [
    { name: 'name',      label: 'Full Name',        type: 'text',     icon: User,  placeholder: 'Your full name' },
    { name: 'email',     label: 'Email',             type: 'email',    icon: Mail,  placeholder: 'you@example.com' },
    { name: 'password',  label: 'Password',          type: 'password', icon: Lock,  placeholder: '6+ characters' },
    { name: 'confirmPw', label: 'Confirm Password',  type: 'password', icon: Lock,  placeholder: 'Re-enter password' },
  ];

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
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center mb-10">
          <img
            src={mainLogo}
            alt="Tarajuvva"
            className="h-12 w-auto max-w-[200px] object-contain object-left"
          />
        </Link>

        <h2 className="text-3xl font-black text-[#241621] font-display mb-2">Create account</h2>
        <p className="text-[#241621]/55 font-body text-sm mb-8">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--tj-shop-deep)] font-semibold hover:underline">Sign in</Link>
        </p>

        {/* Google SSO */}
        <div id="google-register-btn" className="mb-6 flex justify-center" />
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[#241621]/12" />
          <span className="text-[#241621]/40 text-xs font-body">or with email</span>
          <div className="flex-1 h-px bg-[#241621]/12" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {fields.map(f => (
            <div key={f.name}>
              <label className="block text-sm font-semibold text-[#241621] mb-1.5 font-display">{f.label}</label>
              <div className="relative">
                <f.icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#241621]/35" />
                <input
                  name={f.name}
                  type={f.type === 'password' ? (showPw ? 'text' : 'password') : f.type}
                  value={form[f.name]} onChange={onChange} required
                  placeholder={f.placeholder}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#241621]/12 rounded-xl text-[#241621] placeholder:text-[#241621]/35 font-body text-sm outline-none focus:border-[var(--tj-shop)] focus:ring-2 focus:ring-[var(--tj-shop)]/20"
                />
                {f.type === 'password' && (
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#241621]/40 hover:text-[#241621]">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} icon={ArrowRight} iconPosition="right">
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-[#241621]/40 font-body">
          By signing up you agree to our{' '}
          <a href="#" className="underline">Terms</a> &{' '}
          <a href="#" className="underline">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
}
