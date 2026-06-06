import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Check, Upload } from 'lucide-react';
import { useAdminHeroImages } from '../../hooks/useHeroImage';
import { HERO_IMAGE_REQUIREMENTS, validateHeroImageDimensions } from '../../utils/heroImage';
import { uploadUrl } from '../../utils/uploadUrl';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HeroImagesTab() {
  const fileRef = useRef(null);
  const { images, loading, uploading, upload, activate } = useAdminHeroImages();
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [validating, setValidating] = useState(false);

  const { aspectRatios, minWidth, minHeight, maxFileSizeMb, formatLabels } = HERO_IMAGE_REQUIREMENTS;
  const active = images.find((img) => img.is_active);

  const clearPending = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidating(true);
    const err = await validateHeroImageDimensions(file);
    setValidating(false);

    if (err) {
      toast.error(err);
      clearPending();
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const onUpload = async () => {
    if (!pendingFile) return;
    const result = await upload(pendingFile);
    if (result.ok) {
      toast.success('Hero image uploaded');
      clearPending();
    } else {
      toast.error(result.message);
    }
  };

  const onActivate = async (id) => {
    const result = await activate(id);
    if (result.ok) toast.success('Now showing on homepage');
    else toast.error(result.message);
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-black text-[#241621] font-display mb-1">Homepage hero image</h1>
      <p className="text-sm text-[#241621]/55 font-body mb-8">
        Upload a portrait image for the hero section. Only matching aspect ratios are accepted.
      </p>

      {/* Requirements */}
      <div className="rounded-2xl border border-[#241621]/10 bg-[#eef4d1]/40 p-5 mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#241621]/45 font-display mb-3">
          Upload requirements
        </p>
        <ul className="space-y-2 text-sm text-[#241621]/75 font-body">
          <li>
            <strong className="text-[#241621]">Aspect ratio:</strong>{' '}
            Portrait <strong>{aspectRatios.join(' or ')}</strong> only (±4% tolerance)
          </li>
          <li>
            <strong className="text-[#241621]">Minimum size:</strong>{' '}
            {minWidth}×{minHeight}px
          </li>
          <li>
            <strong className="text-[#241621]">Formats:</strong> {formatLabels.join(', ')}
          </li>
          <li>
            <strong className="text-[#241621]">Max file size:</strong> {maxFileSizeMb}MB
          </li>
        </ul>
        <p className="mt-3 text-xs text-[#241621]/50 font-body">
          Tip: export at exactly 1200×1500px (4:5) or 1200×1600px (3:4) for best results.
        </p>
      </div>

      {/* Upload */}
      <div className="rounded-2xl border border-dashed border-[#241621]/20 bg-white p-6 mb-10">
        <input
          ref={fileRef}
          type="file"
          accept={HERO_IMAGE_REQUIREMENTS.formats.join(',')}
          className="hidden"
          onChange={onFilePick}
        />

        {!preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={validating || uploading}
            className="w-full flex flex-col items-center gap-3 py-10 rounded-xl border border-[#241621]/10 hover:border-[#a8c74a]/50 hover:bg-[#a8c74a]/5 transition-all"
          >
            {validating ? (
              <Spinner size={28} />
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-[#241621]/5 flex items-center justify-center">
                  <ImagePlus size={24} className="text-[#241621]/50" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-[#241621] font-display">Choose hero image</p>
                  <p className="text-xs text-[#241621]/45 font-body mt-1">
                    {aspectRatios.join(' or ')} portrait · min {minWidth}×{minHeight}px
                  </p>
                </div>
              </>
            )}
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div
              className="w-full sm:w-48 shrink-0 rounded-xl overflow-hidden border border-[#241621]/10 bg-[#241621]/5"
              style={{ aspectRatio: '4/5' }}
            >
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#241621] font-display truncate">{pendingFile?.name}</p>
              <p className="text-xs text-[#241621]/45 font-body mt-1">
                {(pendingFile?.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button onClick={onUpload} disabled={uploading}>
                  {uploading ? <Spinner size={16} color="#eef4d1" /> : <Upload size={16} />}
                  {uploading ? 'Uploading…' : 'Upload'}
                </Button>
                <button
                  type="button"
                  onClick={clearPending}
                  className="px-4 py-2 text-sm font-semibold text-[#241621]/60 hover:text-[#241621] font-display"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active preview */}
      {active && (
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#a8c74a] font-display mb-3">
            Currently live
          </p>
          <div className="flex gap-4 items-start rounded-2xl border border-[#a8c74a]/30 bg-[#a8c74a]/8 p-4">
            <div
              className="w-28 shrink-0 rounded-lg overflow-hidden border border-[#241621]/10"
              style={{ aspectRatio: '4/5' }}
            >
              <img
                src={uploadUrl(active.image_path)}
                alt="Active hero"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-semibold text-[#241621] font-display">
                {active.width}×{active.height}px · {active.aspect_label}
              </p>
              <p className="text-xs text-[#241621]/45 font-body mt-1">
                Uploaded {formatDate(active.created_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <h2 className="text-lg font-black text-[#241621] font-display mb-4">
        Image library ({images.length})
      </h2>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : images.length === 0 ? (
        <p className="text-center text-[#241621]/40 font-body py-12">
          No hero images yet. Upload one above.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className={`rounded-2xl border overflow-hidden ${
                img.is_active
                  ? 'border-[#a8c74a] ring-2 ring-[#a8c74a]/30'
                  : 'border-[#241621]/10'
              }`}
            >
              <div className="relative bg-[#241621]/5" style={{ aspectRatio: '4/5' }}>
                <img
                  src={uploadUrl(img.image_path)}
                  alt={`Hero ${img.width}×${img.height}`}
                  className="w-full h-full object-cover"
                />
                {img.is_active ? (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-[#a8c74a] text-[#241621] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full font-display">
                    <Check size={10} /> Live
                  </span>
                ) : null}
              </div>
              <div className="p-3 bg-white">
                <p className="text-xs text-[#241621]/70 font-body">
                  {img.width}×{img.height} · {img.aspect_label}
                </p>
                <p className="text-[10px] text-[#241621]/40 font-body mt-0.5">
                  {formatDate(img.created_at)}
                </p>
                {!img.is_active && (
                  <button
                    type="button"
                    onClick={() => onActivate(img.id)}
                    className="mt-2 w-full text-xs font-semibold font-display py-2 rounded-lg border border-[#241621]/15 hover:bg-[#241621] hover:text-[#eef4d1] hover:border-[#241621] transition-all"
                  >
                    Show on homepage
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
