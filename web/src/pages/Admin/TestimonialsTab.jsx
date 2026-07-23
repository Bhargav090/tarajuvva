import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Pencil, ImagePlus } from 'lucide-react';
import { useAdminTestimonials } from '../../hooks/useTestimonials';
import { TESTIMONIALS } from '../../utils/constants';
import { uploadUrl } from '../../utils/uploadUrl';
import { Input, Textarea, Select } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Skeleton';
import ZoomableImage, { ZoomableImageRow } from '../../components/ui/ZoomableImage';

const MAX_REVIEW_IMAGES = 3;

const emptyForm = () => ({
  name: '',
  city: '',
  quote: '',
  vertical: 'reimagine',
  google_review_url: '',
  sort_order: '0',
  is_active: true,
});

const emptySlots = () => Array.from({ length: MAX_REVIEW_IMAGES }, () => ({ existingPath: null, file: null, preview: null }));

function initials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function revokePreview(preview) {
  if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
}

export default function TestimonialsTab() {
  const { testimonials, loading, submitting, save, remove } = useAdminTestimonials();
  const fileRefs = useRef([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [imageSlots, setImageSlots] = useState(emptySlots);
  const [deleteId, setDeleteId] = useState(null);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const clearSlots = () => {
    imageSlots.forEach((slot) => revokePreview(slot.preview));
    setImageSlots(emptySlots());
    fileRefs.current.forEach((ref) => {
      if (ref) ref.value = '';
    });
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    clearSlots();
  };

  const pathsFromTestimonial = (t) => {
    if (Array.isArray(t.image_paths) && t.image_paths.length) return t.image_paths;
    if (t.image_path) return [t.image_path];
    return [];
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      city: t.city,
      quote: t.quote,
      vertical: t.vertical === 'shop' ? 'shop' : 'reimagine',
      google_review_url: t.google_review_url || '',
      sort_order: String(t.sort_order ?? 0),
      is_active: !!t.is_active,
    });
    clearSlots();
    const paths = pathsFromTestimonial(t);
    setImageSlots(
      Array.from({ length: MAX_REVIEW_IMAGES }, (_, i) => ({
        existingPath: paths[i] || null,
        file: null,
        preview: paths[i] ? uploadUrl(paths[i]) : null,
      }))
    );
  };

  const onFilePick = (slotIndex, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      toast.error('Use JPEG, PNG, or WebP');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Max 4MB per image');
      return;
    }
    setImageSlots((prev) => {
      const next = [...prev];
      revokePreview(next[slotIndex].preview);
      next[slotIndex] = {
        existingPath: null,
        file,
        preview: URL.createObjectURL(file),
      };
      return next;
    });
  };

  const removeSlotImage = (slotIndex) => {
    setImageSlots((prev) => {
      const next = [...prev];
      revokePreview(next[slotIndex].preview);
      next[slotIndex] = { existingPath: null, file: null, preview: null };
      return next;
    });
    if (fileRefs.current[slotIndex]) fileRefs.current[slotIndex].value = '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.quote.trim()) {
      toast.error('Name, city, and quote are required');
      return;
    }

    const compactSlots = [];
    for (const slot of imageSlots) {
      if (slot.file || slot.existingPath) compactSlots.push(slot);
    }

    const result = await save(
      {
        name: form.name.trim(),
        city: form.city.trim(),
        quote: form.quote.trim(),
        vertical: form.vertical === 'shop' ? 'shop' : 'reimagine',
        google_review_url: form.google_review_url.trim(),
        sort_order: parseInt(form.sort_order, 10) || 0,
        is_active: form.is_active,
      },
      { id: editingId, imageSlots: compactSlots }
    );
    if (result.ok) {
      toast.success(editingId ? 'Testimonial updated' : 'Testimonial added');
      resetForm();
    } else {
      toast.error(result.message);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    const result = await remove(deleteId);
    if (result.ok) toast.success('Removed');
    else toast.error(result.message);
    if (editingId === deleteId) resetForm();
    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black text-[#241621] font-display mb-1">Testimonials</h1>
      <p className="text-sm text-[#241621]/55 font-body mb-8">
        Manage homepage testimonials. Initials show by the reviewer name — add up to{' '}
        <strong>3 review photos</strong> (screenshots, outfit shots, product pics) that appear below the quote on the homepage.
      </p>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-[#241621]/8 mb-10 space-y-5">
        {editingId && (
          <div className="flex items-center justify-between pb-3 border-b border-[#241621]/8">
            <span className="text-sm font-bold text-[#241621] font-display flex items-center gap-2">
              <Pencil size={14} className="text-[#a8e000]" /> Editing testimonial
            </span>
            <button type="button" onClick={resetForm} className="text-xs text-[#e34334] font-semibold hover:underline">
              Cancel edit
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          <Input label="Name" name="name" value={form.name} onChange={onChange} required placeholder="Ananya R." />
          <Input label="City" name="city" value={form.city} onChange={onChange} required placeholder="Bengaluru" />
        </div>
        <Select label="Vertical" name="vertical" value={form.vertical} onChange={onChange}>
          <option value="shop">Shop</option>
          <option value="reimagine">Reimagine</option>
        </Select>
        <Textarea
          label="Quote"
          name="quote"
          rows={4}
          value={form.quote}
          onChange={onChange}
          required
          placeholder="What they said about Tarajuvva…"
        />
        <Input
          label="Google review link (optional)"
          name="google_review_url"
          value={form.google_review_url}
          onChange={onChange}
          placeholder="https://…"
        />
        <Input
          label="Sort order (lower = first)"
          name="sort_order"
          type="number"
          value={form.sort_order}
          onChange={onChange}
        />

        <div>
          <span className="block text-sm font-semibold text-[#341631] mb-1 font-display">
            Review images <span className="text-xs font-normal text-[#341631]/50">(optional, up to 3)</span>
          </span>
          <p className="text-xs text-[#341631]/45 font-body mb-3">
            Shown below the quote on the homepage — not as profile avatars.
          </p>
          <div className="space-y-3">
            {imageSlots.map((slot, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#341631]/45 w-16 shrink-0">
                    Photo {i + 1}
                  </span>
                  <input
                    ref={(el) => {
                      fileRefs.current[i] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => onFilePick(i, e)}
                  />
                  {slot.preview ? (
                    <ZoomableImage
                      src={slot.preview}
                      alt={`Review photo ${i + 1}`}
                      wrapperClassName="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#241621]/15 bg-white shrink-0"
                      imgClassName="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-[#241621]/25 flex items-center justify-center text-[10px] font-bold font-display text-[#241621]/35 uppercase">
                      Empty
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline-green"
                    size="sm"
                    icon={ImagePlus}
                    onClick={() => fileRefs.current[i]?.click()}
                  >
                    {slot.preview ? 'Change' : 'Add'}
                  </Button>
                  {slot.preview && (
                    <button
                      type="button"
                      onClick={() => removeSlotImage(i)}
                      className="text-xs text-[#e34334] font-semibold hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" name="is_active" checked={form.is_active} onChange={onChange} className="rounded border-[#341631]/30" />
          <span className="text-sm font-semibold text-[#341631] font-display">Show on homepage</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" loading={submitting}>
            {editingId ? 'Update' : 'Add testimonial'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <h2 className="text-lg font-black text-[#241621] font-display mb-2">
        In database ({testimonials.length})
      </h2>
      {testimonials.length === 0 ? (
        <div className="rounded-xl border border-[#241621]/10 bg-[#eef4d1]/30 p-5 text-sm text-[#241621]/70 font-body">
          No admin testimonials yet — homepage uses {TESTIMONIALS.length} built-in defaults.
        </div>
      ) : (
        <div className="space-y-2">
          {testimonials.map((t) => {
            const paths = pathsFromTestimonial(t);
            return (
              <div key={t.id} className="bg-white rounded-xl border border-[#241621]/8 px-4 py-3 flex gap-3 items-start">
                <div className="w-12 h-12 rounded-full bg-[#241621]/5 flex items-center justify-center shrink-0 text-xs font-bold font-display">
                  {initials(t.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#241621] font-display">
                    {t.name} · {t.city}
                    {!t.is_active && <span className="ml-2 text-[10px] uppercase text-[#e34334]">Hidden</span>}
                    {paths.length > 0 && (
                      <span className="ml-2 text-[10px] uppercase text-[#a8e000]">{paths.length} photo{paths.length > 1 ? 's' : ''}</span>
                    )}
                  </p>
                  <p className="text-xs text-[#241621]/55 font-body line-clamp-2 mt-0.5">&ldquo;{t.quote}&rdquo;</p>
                  {paths.length > 0 && (
                    <ZoomableImageRow
                      images={paths}
                      getSrc={(p) => uploadUrl(p)}
                      getAlt={(_, i) => `Review photo ${i + 1}`}
                      className="mt-2"
                      thumbClassName="w-10 h-10 rounded-lg object-cover border border-[#241621]/10"
                    />
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => startEdit(t)} className="p-2 rounded-lg hover:bg-[#a8e000]/10 text-[#a8e000]" aria-label="Edit">
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => setDeleteId(t.id)} className="p-2 rounded-lg hover:bg-[#e34334]/10 text-[#e34334]" aria-label="Delete">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete this testimonial?"
        message="It will be removed from the database. If no active testimonials remain, defaults show on the homepage."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="red"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
