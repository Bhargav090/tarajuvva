import { Wrench } from 'lucide-react';
import WaitlistForm from '../../components/ui/WaitlistForm';
import { useWaitlist } from '../../hooks/useWaitlist';
import { WAITLIST_CONFIGS } from '../../utils/constants';

export default function Repair() {
  const config = WAITLIST_CONFIGS.repair;
  const { form, onChange, onSubmit, loading, success } = useWaitlist(config.type);

  return (
    <div className="min-h-screen bg-[#eef4d1] pt-2 sm:pt-4">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-display mb-6"
              style={{ background: '#e3433415', color: '#e34334', border: '1px solid #e3433425' }}>
              <Wrench size={11} /> {config.badge}
            </span>
            <h1 className="font-display font-black text-[#341631] leading-tight mb-5"
              style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)' }}>
              {config.headline[0]}
              <br />
              <span style={{ color: config.accentColor }}>{config.headline[1]}</span>
            </h1>
            <p className="text-[#341631]/60 font-body text-lg mb-10">{config.subtext}</p>

            {/* Preview */}
            <div className="bg-white rounded-2xl p-6 border border-[#341631]/8">
              <h3 className="font-bold text-[#341631] font-display mb-4">{config.preview.title}</h3>
              <ul className="space-y-2">
                {config.preview.items.map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#341631]/65 font-body">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: config.accentColor }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#341631]/8">
            <h2 className="text-xl font-black text-[#341631] font-display mb-1">Join the waitlist</h2>
            <p className="text-[#341631]/50 text-sm font-body mb-6">Be first to know when Repair goes live.</p>
            <WaitlistForm config={config} form={form} onChange={onChange} onSubmit={onSubmit} loading={loading} success={success} />
          </div>
        </div>
      </div>
    </div>
  );
}
