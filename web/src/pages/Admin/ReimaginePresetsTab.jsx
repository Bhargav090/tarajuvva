import { useRef } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useAdminReimagineImages } from '../../hooks/useReimagineImages';
import { GARMENTS, TRANSFORMATIONS, getTransformationMeta } from '../../utils/constants';
import { uploadUrl } from '../../utils/uploadUrl';
import { Spinner } from '../../components/ui/Skeleton';

function SlotCard({ slot, uploading, onUpload, onRemove }) {
  const fileRef = useRef(null);
  const isUploading = uploading;

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      toast.error('Use JPEG, PNG, or WebP');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Max 8MB per image');
      return;
    }
    const result = await onUpload(slot.garment_type, slot.transformation || '', file);
    if (result.ok) toast.success(`${slot.label} image updated`);
    else toast.error(result.message);
  };

  const src = slot.image_path ? uploadUrl(slot.image_path) : null;

  return (
    <div className="border border-[#241621]/10 rounded-xl overflow-hidden bg-white">
      <div className="aspect-square bg-[#241621]/4 relative">
        {src ? (
          <img src={src} alt={slot.label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#241621]/25 text-xs font-body px-3 text-center">
            No image — upload square photo
          </div>
        )}
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <Spinner size={24} />
          </div>
        )}
      </div>
      <div className="p-3 border-t border-[#241621]/8">
        <p className="text-xs font-bold text-[#241621] font-display truncate">{slot.label}</p>
        <div className="flex gap-1.5 mt-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onFile} />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase tracking-wide bg-[#0b4722] text-white hover:bg-[#0b4722]/90 disabled:opacity-50"
          >
            {src ? <Upload size={11} /> : <ImagePlus size={11} />}
            {src ? 'Replace' : 'Upload'}
          </button>
          {src && (
            <button
              type="button"
              disabled={isUploading}
              onClick={async () => {
                const result = await onRemove(slot.garment_type, slot.transformation || '');
                if (result.ok) toast.success('Image removed');
                else toast.error(result.message);
              }}
              className="px-2 py-1.5 text-[#e34334] border border-[#e34334]/25 hover:bg-[#e34334]/8 disabled:opacity-50"
              aria-label="Remove image"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReimaginePresetsTab() {
  const { garments, presets, loading, uploadingKey, upload, remove } = useAdminReimagineImages();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const garmentSlots =
    garments.length > 0
      ? garments
      : GARMENTS.map((g) => ({
          garment_type: g.id,
          transformation: '',
          label: g.label,
          kind: 'garment',
          image_path: null,
        }));

  const presetsByGarment = GARMENTS.map((g) => ({
    garment: g,
    slots:
      presets.filter((p) => p.garment_type === g.id).length > 0
        ? presets.filter((p) => p.garment_type === g.id)
        : (TRANSFORMATIONS[g.id] || []).map((t) => ({
            garment_type: g.id,
            transformation: t,
            label: getTransformationMeta(t).display,
            kind: 'preset',
            image_path: null,
          })),
  }));

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-black text-[#241621] font-display mb-1">Reimagine images</h1>
      <p className="text-sm text-[#241621]/55 font-body mb-8">
        Upload images shown on the Reimagine flow — base garments (step 1) and transformation presets (step 2).
        Square photos work best. JPEG, PNG, or WebP · max 8MB.
      </p>

      <section className="mb-12">
        <h2 className="text-lg font-black text-[#241621] font-display mb-4">Step 1 · Base garments</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {garmentSlots.map((slot) => (
            <SlotCard
              key={slot.garment_type}
              slot={slot}
              uploading={uploadingKey === `${slot.garment_type}|`}
              onUpload={upload}
              onRemove={remove}
            />
          ))}
        </div>
      </section>

      {presetsByGarment.map(({ garment, slots }) => (
        <section key={garment.id} className="mb-12">
          <h2 className="text-lg font-black text-[#241621] font-display mb-1">
            Step 2 · {garment.label} presets
          </h2>
          <p className="text-xs text-[#241621]/45 font-body mb-4">
            Shown when a customer picks &ldquo;{garment.label}&rdquo; as their base garment.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {slots.map((slot) => (
              <SlotCard
                key={`${slot.garment_type}-${slot.transformation}`}
                slot={slot}
                uploading={uploadingKey === `${slot.garment_type}|${slot.transformation}`}
                onUpload={upload}
                onRemove={remove}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
