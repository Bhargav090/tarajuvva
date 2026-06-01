import { Link } from 'react-router-dom';
import { productHeroImage } from '../../utils/productImage';

/**
 * Single order line with thumbnail linking to the product page.
 */
export default function OrderItemLine({ item, className = '' }) {
  const src = productHeroImage(item.image ? [item.image] : []);
  const lineTotal = (item.price * item.qty).toLocaleString('en-IN');

  return (
    <Link
      to={`/shop/${item.id}`}
      className={`flex items-center gap-3 rounded-xl p-2 -mx-2 hover:bg-[#241621]/[0.03] transition-colors ${className}`}
    >
      <img
        src={src}
        alt={item.name}
        className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-[#241621]/8 bg-[#241621]/5"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#241621] font-display truncate">{item.name}</p>
        <p className="text-xs text-[#241621]/45 font-body">Qty {item.qty}</p>
      </div>
      <span className="text-sm font-bold text-[#241621] font-display shrink-0">₹{lineTotal}</span>
    </Link>
  );
}
