import { useCallback, useState } from 'react';
import ImageLightbox from './ImageLightbox';

/**
 * Click any image to open a full-size lightbox.
 * Use for uploads, order/reimagine thumbs, admin previews, etc.
 */
export default function ZoomableImage({
  src,
  alt = '',
  className = '',
  imgClassName = 'w-full h-full object-cover',
  wrapperClassName = '',
  as = 'button',
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  if (!src) return null;

  const openPreview = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setOpen(true);
  };

  const img = <img src={src} alt={alt} className={`${imgClassName || className}`.trim()} />;

  return (
    <>
      {as === 'div' ? (
        <div
          role="button"
          tabIndex={0}
          onClick={openPreview}
          onKeyDown={(e) => e.key === 'Enter' && openPreview(e)}
          className={`cursor-zoom-in block ${wrapperClassName}`.trim()}
          aria-label={alt ? `View ${alt} full size` : 'View image full size'}
        >
          {img}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPreview}
          className={`cursor-zoom-in block p-0 border-0 bg-transparent ${wrapperClassName}`.trim()}
          aria-label={alt ? `View ${alt} full size` : 'View image full size'}
        >
          {img}
        </button>
      )}
      <ImageLightbox src={open ? src : null} alt={alt} onClose={close} />
    </>
  );
}

/** Multiple thumbs sharing one lightbox. */
export function ZoomableImageRow({ images = [], getSrc = (x) => x, getAlt = () => '', className = '', thumbClassName = 'w-14 h-14 rounded-lg object-cover border border-black/10' }) {
  const [active, setActive] = useState(null);
  const list = (images || []).map((item, i) => ({
    src: getSrc(item, i),
    alt: getAlt(item, i) || `Photo ${i + 1}`,
  })).filter((x) => x.src);

  if (!list.length) return null;

  return (
    <>
      <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
        {list.map((item, i) => (
          <button
            key={`${item.src}-${i}`}
            type="button"
            onClick={() => setActive(item.src)}
            className="block overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity"
            aria-label={`View ${item.alt} full size`}
          >
            <img src={item.src} alt={item.alt} className={thumbClassName} />
          </button>
        ))}
      </div>
      <ImageLightbox src={active} onClose={() => setActive(null)} />
    </>
  );
}
