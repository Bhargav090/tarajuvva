import { productHeroImage } from '../../utils/productImage';
import AsyncImage from '../ui/AsyncImage';
import ImageLightbox from '../ui/ImageLightbox';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

/**
 * Single order line with thumbnail (click → full view) and link to product.
 * @param {boolean} openInNewTab — open product page in a new tab (admin review)
 */
export default function OrderItemLine({ item, className = '', compact = false, openInNewTab = false }) {
  const [lightbox, setLightbox] = useState(null);
  const src = productHeroImage(item.image ? [item.image] : item.images);
  const lineTotal = (item.price * item.qty).toLocaleString('en-IN');
  const thumbClass = compact ? 'w-12 h-14' : 'w-16 h-20';
  const productPath = item.id ? `/shop/${item.id}` : null;

  const nameBlock = (
    <>
      <p className="text-sm font-semibold text-[#0a0a0a] font-display leading-snug line-clamp-2 group-hover/link:underline underline-offset-2">
        {item.name}
        {openInNewTab && productPath ? (
          <ExternalLink size={12} className="inline ml-1.5 opacity-40 align-[-1px]" />
        ) : null}
      </p>
      <p className="text-xs text-black/45 font-body mt-0.5">
        Qty {item.qty}
        {item.size ? ` · Size ${item.size}` : ''}
        {item.price != null ? ` · ₹${Number(item.price).toLocaleString('en-IN')} each` : ''}
      </p>
    </>
  );

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
      {productPath ? (
        openInNewTab ? (
          <a
            href={productPath}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 group/link hover:opacity-90 transition-opacity"
          >
            {nameBlock}
          </a>
        ) : (
          <Link to={productPath} className="flex-1 min-w-0 group/link hover:opacity-80 transition-opacity">
            {nameBlock}
          </Link>
        )
      ) : (
        <div className="flex-1 min-w-0">{nameBlock}</div>
      )}
      <span className="text-sm font-bold text-[#0a0a0a] font-display shrink-0">
        ₹{lineTotal}
      </span>
      <ImageLightbox src={lightbox} alt={item.name} onClose={() => setLightbox(null)} />
    </div>
  );
}
