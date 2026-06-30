import { Minus, Plus, X } from 'lucide-react';
import { productHeroImage } from '../../utils/productImage';
import AsyncImage from '../ui/AsyncImage';

/**
 * Single cart row — thumbnail, qty controls, remove. Used in bag drawer & checkout.
 */
export default function CartLineItem({ item, onRemove, onUpdateQty }) {
  return (
    <div className="flex gap-3 p-3 border border-black/15 bg-white">
      <div className="relative w-[68px] h-[82px] shrink-0 overflow-hidden bg-[#f5f5f5]">
        <AsyncImage
          src={productHeroImage(item.images)}
          alt={item.name}
          fill
          imgClassName="object-cover object-center"
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-display font-bold text-sm leading-snug line-clamp-2 text-[#0a0a0a]">
              {item.name}
            </p>
            {item.size && (
              <span className="inline-block mt-1 text-[10px] font-bold font-display uppercase tracking-wider bg-black text-white px-2 py-0.5">
                Size {item.size}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.ck)}
            className="shrink-0 p-1 text-black/35 hover:text-black transition-colors"
            aria-label={`Remove ${item.name}`}
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="font-display font-bold text-sm text-[#0a0a0a]">
            ₹{(item.price * item.qty).toLocaleString('en-IN')}
            {item.qty > 1 && (
              <span className="text-[10px] font-normal text-black/40 ml-1">
                (₹{item.price.toLocaleString('en-IN')} each)
              </span>
            )}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateQty(item.ck, item.qty - 1)}
              className="w-7 h-7 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </button>
            <span className="font-display font-semibold text-sm w-5 text-center tabular-nums">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQty(item.ck, item.qty + 1)}
              className="w-7 h-7 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
