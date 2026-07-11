import { productHeroImage } from '../../utils/productImage';
import AsyncImage from '../ui/AsyncImage';
import ImageLightbox from '../ui/ImageLightbox';
import { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Single order line with thumbnail (click → full view) and link to product.
 */
export default function OrderItemLine({ item, className = '', compact = false }) {
  const [lightbox, setLightbox] = useState(null);
  const src = productHeroImage(item.image ? [item.image] : item.images);
  const lineTotal = (item.price * item.qty).toLocaleString('en-IN');
  const thumbClass = compact ? 'w-12 h-14' : 'w-16 h-20';

  return (
    <div className={`flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-black/[0.03] transition-colors group ${className}`}>
      <button
        type="button"
        onClick={() => src && setLightbox(src)}
        disabled={!src}
        className={`relative ${thumbClass} shrink-0 overflow-hidden bg-[#f5f5f5] border border-black/10 cursor-zoom-in disabled:cursor-default`}
        aria-label={`View ${item.name} full size`}
      >
        <AsyncImage
          src={src}
          alt={item.name}
          fill
          imgClassName="object-cover object-center group-hover:scale-105 transition-transform duration-300"
          loadingClassName="bg-black/5 animate-pulse"
        />
      </button>
      <Link to={`/shop/${item.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
        <p className="text-sm font-semibold text-[#0a0a0a] font-display leading-snug line-clamp-2">
          {item.name}
        </p>
        <p className="text-xs text-black/45 font-body mt-0.5">
          Qty {item.qty}
          {item.size ? ` · Size ${item.size}` : ''}
        </p>
      </Link>
      <span className="text-sm font-bold text-[#0a0a0a] font-display shrink-0">
        ₹{lineTotal}
      </span>
      <ImageLightbox src={lightbox} alt={item.name} onClose={() => setLightbox(null)} />
    </div>
  );
}
