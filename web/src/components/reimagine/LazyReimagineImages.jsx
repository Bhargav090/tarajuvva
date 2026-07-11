import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { ZoomableImageRow } from '../ui/ZoomableImage';
import { Spinner } from '../ui/Skeleton';
import { uploadUrl } from '../../utils/uploadUrl';

/**
 * Lazy-loads reimagine garment photos for one request (list payloads omit base64).
 */
export default function LazyReimagineImages({
  requestId,
  imageCount = 0,
  endpoint,
  useAdminAuth = false,
  thumbClassName = 'w-16 h-16 object-cover border border-[#241621]/15 rounded-lg',
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!requestId || !imageCount) {
      setImages([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    const headers = useAdminAuth
      ? { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
      : undefined;
    api
      .get(endpoint, headers ? { headers } : undefined)
      .then(({ data }) => {
        if (!cancelled) setImages(data.images || []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, imageCount, endpoint, useAdminAuth]);

  if (!imageCount) return null;

  return (
    <div className="mt-4 pt-4 border-t border-[#241621]/8">
      <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/45 mb-2">
        Garment photos ({imageCount})
      </p>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-[#241621]/45 py-2">
          <Spinner size={16} /> Loading photos…
        </div>
      )}
      {error && <p className="text-xs text-[#e34334]">Could not load photos.</p>}
      {!loading && !error && images.length > 0 && (
        <ZoomableImageRow
          images={images}
          getSrc={(img) => (String(img).startsWith('data:') || String(img).startsWith('http') ? img : uploadUrl(img))}
          getAlt={(_, i) => `Garment photo ${i + 1}`}
          thumbClassName={thumbClassName}
        />
      )}
    </div>
  );
}
