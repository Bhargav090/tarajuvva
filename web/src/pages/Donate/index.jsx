import { Heart } from 'lucide-react';
import WaitlistForm from '../../components/ui/WaitlistForm';
import { useWaitlist } from '../../hooks/useWaitlist';
import { WAITLIST_CONFIGS } from '../../utils/constants';

export default function Donate() {
  const config = WAITLIST_CONFIGS.donate;
  const { form, onChange, onSubmit, loading, success } = useWaitlist(config.type);

  return (
    <div className="min-h-screen bg-white pt-2 sm:pt-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-display mb-6"
              style={{ background: '#1b4e8115', color: '#1b4e81', border: '1px solid #1b4e8125' }}>
              <Heart size={11} /> {config.badge}
            </span>
            <h1 className="font-display font-black text-[#241621] leading-tight mb-5"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
              {config.headline[0]}
              <br />
              <span style={{ color: config.accentColor }}>{config.headline[1]}</span>
            </h1>
            <p className="text-[#241621]/60 font-body text-lg mb-10">{config.subtext}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {config.stats.map(s => (
                <div key={s.label} className="text-center p-4 bg-white rounded-2xl border border-[#241621]/8">
                  <p className="text-2xl font-black font-display" style={{ color: config.accentColor }}>{s.value}</p>
                  <p className="text-[10px] text-[#241621]/45 font-body mt-1 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#241621]/8">
            <h2 className="text-xl font-black text-[#241621] font-display mb-1">Join the waitlist</h2>
            <p className="text-[#241621]/50 text-sm font-body mb-6">Be first to donate when the program launches.</p>
            <WaitlistForm config={config} form={form} onChange={onChange} onSubmit={onSubmit} loading={loading} success={success} />
          </div>
        </div>
      </div>
    </div>
  );
}
