import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import Button from '../../components/ui/Button';

export default function Register() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirmPw: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate('/'); }, [user]);

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

  const onGoogleSuccess = async (response) => {
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      if (data.success) {
        login(data.token, data.user);
        toast.success(`Welcome, ${data.user.name}! 🎉`);
        navigate('/');
      }
    } catch { toast.error('Google sign-in failed'); }
  };

  useEffect(() => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback: onGoogleSuccess,
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-register-btn'),
      { theme: 'outline', size: 'large', width: 340, logo_alignment: 'center' }
    );
  }, []);

  const fields = [
    { name: 'name',      label: 'Full Name',        type: 'text',     icon: User,  placeholder: 'Your full name' },
    { name: 'email',     label: 'Email',             type: 'email',    icon: Mail,  placeholder: 'you@example.com' },
    { name: 'password',  label: 'Password',          type: 'password', icon: Lock,  placeholder: '6+ characters' },
    { name: 'confirmPw', label: 'Confirm Password',  type: 'password', icon: Lock,  placeholder: 'Re-enter password' },
  ];

  return (
    <div className="min-h-screen bg-[#eef4d1] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 rounded-lg bg-[#0b4722] flex items-center justify-center">
            <span className="text-[#eef4d1] font-black text-sm font-[Outfit]">T</span>
          </div>
          <span className="text-xl font-black text-[#341631] font-[Outfit]">Tarajuvva</span>
        </Link>

        <h2 className="text-3xl font-black text-[#341631] font-[Outfit] mb-2">Create account</h2>
        <p className="text-[#341631]/55 font-[Poppins] text-sm mb-8">
          Already have an account?{' '}
          <Link to="/login" className="text-[#0b4722] font-semibold hover:underline">Sign in</Link>
        </p>

        {/* Google SSO */}
        <div id="google-register-btn" className="mb-6 flex justify-center" />
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[#341631]/12" />
          <span className="text-[#341631]/40 text-xs font-[Poppins]">or with email</span>
          <div className="flex-1 h-px bg-[#341631]/12" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {fields.map(f => (
            <div key={f.name}>
              <label className="block text-sm font-semibold text-[#341631] mb-1.5 font-[Outfit]">{f.label}</label>
              <div className="relative">
                <f.icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#341631]/35" />
                <input
                  name={f.name}
                  type={f.type === 'password' ? (showPw ? 'text' : 'password') : f.type}
                  value={form[f.name]} onChange={onChange} required
                  placeholder={f.placeholder}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-[#341631]/12 rounded-xl text-[#341631] placeholder:text-[#341631]/35 font-[Poppins] text-sm outline-none focus:border-[#0b4722] focus:ring-2 focus:ring-[#0b4722]/12"
                />
                {f.type === 'password' && (
                  <button type="button" onClick={() => setShowPw(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#341631]/40 hover:text-[#341631]">
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

        <p className="mt-6 text-center text-xs text-[#341631]/40 font-[Poppins]">
          By signing up you agree to our{' '}
          <a href="#" className="underline">Terms</a> &{' '}
          <a href="#" className="underline">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
}
