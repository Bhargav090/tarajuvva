import { useSearchParams } from 'react-router-dom';
import { BarChart3, Ticket, Gift } from 'lucide-react';
import PromotionStats from './promotions/PromotionStats';
import CouponsPanel from './promotions/CouponsPanel';
import GiftCardsPanel from './promotions/GiftCardsPanel';

const SECTIONS = [
  { id: 'coupons', label: 'Coupons', icon: Ticket },
  { id: 'gift-cards', label: 'Gift cards', icon: Gift },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
];

export default function PromotionsTab() {
  const [params, setParams] = useSearchParams();
  const sectionParam = params.get('section');
  const section = SECTIONS.some((s) => s.id === sectionParam) ? sectionParam : 'coupons';

  const go = (id) => {
    const next = new URLSearchParams(params);
    next.set('section', id);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#241621] font-display">Coupons & gift cards</h1>
        <p className="text-sm text-[#241621]/50 font-body mt-1">
          Create discount codes and gift cards, choose who can use them, and track how they perform.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[#241621]/10">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 -mb-px border-b-2 text-sm font-display font-semibold transition-colors ${
              section === s.id
                ? 'border-[#241621] text-[#241621]'
                : 'border-transparent text-[#241621]/45 hover:text-[#241621]'
            }`}
          >
            <s.icon size={15} />
            {s.label}
          </button>
        ))}
      </div>

      {section === 'coupons' && <CouponsPanel />}
      {section === 'gift-cards' && <GiftCardsPanel />}
      {section === 'stats' && <PromotionStats />}
    </div>
  );
}
