import { Link } from 'react-router-dom';
import { productHeroImage } from '../../utils/productImage';
import AsyncImage from '../ui/AsyncImage';

/**
 * Single order line with thumbnail linking to the product page.
 */
export default function OrderItemLine({ item, className = '', compact = false }) {
  const src = productHeroImage(item.image ? [item.image] : item.images);
  const lineTotal = (item.price * item.qty).toLocaleString('en-IN');
  const thumbClass = compact ? 'w-12 h-14' : 'w-16 h-20';

  return (
    <Link
      to={`/shop/${item.id}`}
      className={`flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-black/[0.03] transition-colors group ${className}`}
    >
      <div className={`relative ${thumbClass} shrink-0 overflow-hidden bg-[#f5f5f5] border border-black/10`}>
        <AsyncImage
          src={src}
          alt={item.name}
          fill
          imgClassName="object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loadingClassName="bg-black/5 animate-pulse"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0a0a0a] font-display leading-snug line-clamp-2">
          {item.name}
        </p>
        <p className="text-xs text-black/45 font-body mt-0.5">
          Qty {item.qty}
          {item.size ? ` · Size ${item.size}` : ''}
        </p>
      </div>
      <span className="text-sm font-bold text-[#0a0a0a] font-display shrink-0">
        ₹{lineTotal}
      </span>
    </Link>
  );
}
