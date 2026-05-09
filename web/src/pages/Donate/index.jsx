import { Heart } from 'lucide-react';
import WaitlistForm from '../../components/ui/WaitlistForm';
import { useWaitlist } from '../../hooks/useWaitlist';
import { WAITLIST_CONFIGS } from '../../utils/constants';

export default function Donate() {
  const config = WAITLIST_CONFIGS.donate;
  const { form, onChange, onSubmit, loading, success } = useWaitlist(config.type);

  return (
    <div className="min-h-screen bg-[#eef4d1] pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-[Outfit] mb-6"
              style={{ background: '#01539515', color: '#015395', border: '1px solid #01539525' }}>
              <Heart size={11} /> {config.badge}
            </span>
            <h1 className="font-[Outfit] font-black text-[#341631] leading-tight mb-5"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
              {config.headline[0]}
              <br />
              <span style={{ color: config.accentColor }}>{config.headline[1]}</span>
            </h1>
            <p className="text-[#341631]/60 font-[Poppins] text-lg mb-10">{config.subtext}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {config.stats.map(s => (
                <div key={s.label} className="text-center p-4 bg-white rounded-2xl border border-[#341631]/8">
                  <p className="text-2xl font-black font-[Outfit]" style={{ color: config.accentColor }}>{s.value}</p>
                  <p className="text-[10px] text-[#341631]/45 font-[Poppins] mt-1 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#341631]/8">
            <h2 className="text-xl font-black text-[#341631] font-[Outfit] mb-1">Join the waitlist</h2>
            <p className="text-[#341631]/50 text-sm font-[Poppins] mb-6">Be first to donate when the program launches.</p>
            <WaitlistForm config={config} form={form} onChange={onChange} onSubmit={onSubmit} loading={loading} success={success} />
          </div>
        </div>
      </div>
    </div>
  );
}
