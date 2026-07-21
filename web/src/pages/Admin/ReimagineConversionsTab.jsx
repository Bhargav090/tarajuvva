import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Pencil, Plus, ImagePlus, Upload, X } from 'lucide-react';
import api from '../../utils/api';
import { Input, Select } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Skeleton';
import { uploadUrl } from '../../utils/uploadUrl';
import ZoomableImage from '../../components/ui/ZoomableImage';

const CREATE_NEW = '__create_new__';

const emptyForm = () => ({
  fromMode: '', // '' | existing label | CREATE_NEW
  from_label: '',
  to_label: '',
  from_image: '',
  to_image: '',
  price: '299',
  sort_order: '0',
  active: true,
});

const emptyImageSlot = () => ({
  existingPath: null,
  file: null,
  preview: null,
  cleared: false,
});

function revokePreview(preview) {
  if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
}

function ConversionImageField({ label, slot, onPick, onClear, onUrlChange, urlValue, fileRef, hint }) {
  const preview = slot.preview || (slot.existingPath && !slot.cleared ? uploadUrl(slot.existingPath) : null);

  return (
    <div className="space-y-2">
      <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.16em] text-black/45">{label}</p>
      {hint ? <p className="text-xs text-[#241621]/45 font-body -mt-1">{hint}</p> : null}
      <div className="border border-[#241621]/12 rounded-xl overflow-hidden bg-[#fafafa]">
        <div className="aspect-[4/3] bg-[#241621]/4 relative">
          {preview ? (
            <ZoomableImage
              src={preview}
              alt={label}
              wrapperClassName="absolute inset-0 w-full h-full"
              imgClassName="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-[#241621]/30 text-xs font-body px-3 text-center">
              <ImagePlus size={20} />
              Upload or paste a URL
            </div>
          )}
        </div>
        <div className="p-3 space-y-2 border-t border-[#241621]/8">
          <div className="flex gap-1.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={onPick}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-wide bg-[#c8ff2e] text-[#0a0a0a] border border-black hover:bg-[#a8e000]"
            >
              {preview ? <Upload size={12} /> : <ImagePlus size={12} />}
              {preview ? 'Replace' : 'Upload'}
            </button>
            {preview && (
              <button
                type="button"
                onClick={onClear}
                className="px-2.5 py-2 text-[#e34334] border border-[#e34334]/30 hover:bg-[#e34334]/8"
                aria-label={`Clear ${label}`}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Input
            label="Or image URL"
            name={`${label}-url`}
            value={urlValue}
            onChange={onUrlChange}
            placeholder="https://… or /uploads/…"
          />
        </div>
      </div>
    </div>
  );
}

function applyImageSlot(path) {
  return {
    existingPath: path || null,
    file: null,
    preview: path ? uploadUrl(path) : null,
    cleared: false,
  };
}

/** URL field only for http(s) /uploads — hide huge data: URLs from the text input. */
function isEditableUrl(value) {
  const s = String(value || '').trim();
  return /^https?:\/\//i.test(s) || s.startsWith('/uploads/');
}

function urlFieldValue(stored) {
  return isEditableUrl(stored) ? stored : '';
}

/** Only send short refs the API accepts — never /api/media or data: URLs. */
function retainableImageRef(value) {
  const s = String(value || '').trim();
  if (/^https?:\/\//i.test(s) || s.startsWith('/uploads/')) return s;
  return null;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default function ReimagineConversionsTab() {
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
  const fromFileRef = useRef(null);
  const toFileRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [fromSlot, setFromSlot] = useState(emptyImageSlot);
  const [toSlot, setToSlot] = useState(emptyImageSlot);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const formTopRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reimagine/admin/conversions', { headers: authHeader });
      setRows(data.conversions || []);
    } catch {
      toast.error('Could not load conversions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Unique from-sections with a representative image (first with an image). */
  const fromSections = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.from_label;
      if (!map.has(key)) {
        map.set(key, { label: key, image: row.from_image || null, count: 1 });
      } else {
        const s = map.get(key);
        s.count += 1;
        if (!s.image && row.from_image) s.image = row.from_image;
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const groupedRows = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const key = row.from_label || 'Untitled';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  const isCreatingFrom = form.fromMode === CREATE_NEW;
  const resolvedFromLabel = isCreatingFrom ? form.from_label.trim() : form.fromMode;

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const clearImageSlots = () => {
    setFromSlot((prev) => {
      revokePreview(prev.preview);
      return emptyImageSlot();
    });
    setToSlot((prev) => {
      revokePreview(prev.preview);
      return emptyImageSlot();
    });
    if (fromFileRef.current) fromFileRef.current.value = '';
    if (toFileRef.current) toFileRef.current.value = '';
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
    clearImageSlots();
  };

  const scrollToForm = () => {
    requestAnimationFrame(() => {
      formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const startAddToSection = (fromLabel) => {
    reset();
    const section = fromSections.find((s) => s.label === fromLabel);
    const img = section?.image || '';
    setForm({
      ...emptyForm(),
      fromMode: fromLabel,
      from_label: fromLabel,
      from_image: isEditableUrl(img) ? img : '',
      sort_order: String((section?.count || 0) + 1),
    });
    setFromSlot(applyImageSlot(img || null));
    scrollToForm();
  };

  const startCreateSection = () => {
    reset();
    setForm({ ...emptyForm(), fromMode: CREATE_NEW });
    scrollToForm();
  };

  const onFromModeChange = (e) => {
    const value = e.target.value;
    if (value === CREATE_NEW) {
      setForm((p) => ({
        ...p,
        fromMode: CREATE_NEW,
        from_label: '',
        from_image: '',
      }));
      setFromSlot((prev) => {
        revokePreview(prev.preview);
        return emptyImageSlot();
      });
      return;
    }
    if (!value) {
      setForm((p) => ({ ...p, fromMode: '', from_label: '', from_image: '' }));
      setFromSlot((prev) => {
        revokePreview(prev.preview);
        return emptyImageSlot();
      });
      return;
    }
    const section = fromSections.find((s) => s.label === value);
    const img = section?.image || '';
    setForm((p) => ({
      ...p,
      fromMode: value,
      from_label: value,
      from_image: urlFieldValue(img),
    }));
    setFromSlot(applyImageSlot(img || null));
  };

  const startEdit = (row) => {
    clearImageSlots();
    const known = fromSections.some((s) => s.label === row.from_label);
    setEditingId(row.id);
    setForm({
      fromMode: known ? row.from_label : CREATE_NEW,
      from_label: row.from_label || '',
      to_label: row.to_label || '',
      from_image: urlFieldValue(row.from_image),
      to_image: urlFieldValue(row.to_image),
      price: String(row.price ?? 299),
      sort_order: String(row.sort_order ?? 0),
      active: !!row.active,
    });
    setFromSlot(applyImageSlot(row.from_image || null));
    setToSlot(applyImageSlot(row.to_image || null));
    scrollToForm();
  };

  const pickImage = (side, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      toast.error('Use JPEG, PNG, WebP, or GIF');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Max 2MB per image (try 1200×1200 or 1200×1500 px)');
      return;
    }
    const setter = side === 'from' ? setFromSlot : setToSlot;
    setter((prev) => {
      revokePreview(prev.preview);
      return {
        existingPath: null,
        file,
        preview: URL.createObjectURL(file),
        cleared: false,
      };
    });
    setForm((p) => ({ ...p, [side === 'from' ? 'from_image' : 'to_image']: '' }));
  };

  const clearImage = (side) => {
    const setter = side === 'from' ? setFromSlot : setToSlot;
    setter((prev) => {
      revokePreview(prev.preview);
      return { existingPath: null, file: null, preview: null, cleared: true };
    });
    setForm((p) => ({ ...p, [side === 'from' ? 'from_image' : 'to_image']: '' }));
    if (side === 'from' && fromFileRef.current) fromFileRef.current.value = '';
    if (side === 'to' && toFileRef.current) toFileRef.current.value = '';
  };

  const onUrlChange = (side, e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [side === 'from' ? 'from_image' : 'to_image']: value }));
    const setter = side === 'from' ? setFromSlot : setToSlot;
    setter((prev) => {
      if (prev.file) revokePreview(prev.preview);
      const trimmed = value.trim();
      return {
        existingPath: trimmed || null,
        file: null,
        preview: trimmed ? uploadUrl(trimmed) : null,
        cleared: !trimmed,
      };
    });
  };

  const onSave = async (e) => {
    e.preventDefault();
    const fromLabel = resolvedFromLabel;
    if (!fromLabel) {
      toast.error('Choose an existing from section or create a new one');
      return;
    }
    if (!form.to_label.trim()) {
      toast.error('To style is required');
      return;
    }
    if (fromLabel.length > 128 || form.to_label.trim().length > 128) {
      toast.error('From and to names must be 128 characters or fewer');
      return;
    }
    if (isCreatingFrom && !fromSlot.file && !form.from_image.trim() && !fromSlot.existingPath) {
      toast.error('Add a from image for the new section');
      return;
    }

    setSaving(true);
    const headers = { ...authHeader };

    const retainedFrom =
      fromSlot.file || fromSlot.cleared
        ? null
        : retainableImageRef(form.from_image) || retainableImageRef(fromSlot.existingPath);
    const retainedTo =
      toSlot.file || toSlot.cleared
        ? null
        : retainableImageRef(form.to_image) || retainableImageRef(toSlot.existingPath);

    const inheritFromImage =
      !editingId &&
      !isCreatingFrom &&
      !fromSlot.file &&
      !fromSlot.cleared &&
      !retainedFrom &&
      Boolean(form.fromMode);

    const needsMultipart = Boolean(
      fromSlot.file ||
        toSlot.file ||
        fromSlot.cleared ||
        toSlot.cleared ||
        retainedFrom ||
        retainedTo ||
        inheritFromImage
    );

    try {
      if (needsMultipart) {
        const fd = new FormData();
        fd.append('from_label', fromLabel);
        fd.append('to_label', form.to_label.trim());
        fd.append('price', String(Math.max(0, parseInt(form.price, 10) || 0)));
        fd.append('sort_order', String(Math.max(0, parseInt(form.sort_order, 10) || 0)));
        fd.append('active', form.active ? '1' : '0');

        if (fromSlot.file) fd.append('from_file', fromSlot.file);
        else if (fromSlot.cleared) fd.append('clear_from_image', '1');
        else if (retainedFrom) fd.append('from_image', retainedFrom);
        else if (inheritFromImage) fd.append('inherit_from_image', '1');

        if (toSlot.file) fd.append('to_file', toSlot.file);
        else if (toSlot.cleared) fd.append('clear_to_image', '1');
        else if (retainedTo) fd.append('to_image', retainedTo);

        if (editingId) {
          await api.put(`/reimagine/admin/conversions/${editingId}`, fd, { headers });
          toast.success('Conversion updated');
        } else {
          await api.post('/reimagine/admin/conversions', fd, { headers });
          toast.success(isCreatingFrom ? 'New section created' : 'Transformation added');
        }
      } else {
        const payload = {
          from_label: fromLabel,
          to_label: form.to_label.trim(),
          price: Math.max(0, parseInt(form.price, 10) || 0),
          sort_order: Math.max(0, parseInt(form.sort_order, 10) || 0),
          active: !!form.active,
        };
        if (editingId) {
          await api.put(`/reimagine/admin/conversions/${editingId}`, payload, { headers });
          toast.success('Conversion updated');
        } else {
          await api.post('/reimagine/admin/conversions', payload, { headers });
          toast.success(isCreatingFrom ? 'New section created' : 'Transformation added');
        }
      }
      reset();
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/reimagine/admin/conversions/${deleteId}`, { headers: authHeader });
      toast.success('Deleted');
      setDeleteId(null);
      if (editingId === deleteId) reset();
      await load();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#241621] font-display">Reimagine conversions</h1>
          <p className="text-sm text-[#241621]/55 font-body mt-1 max-w-xl">
            From sections are the garment cards on Reimagine. Pick an existing section to add a transformation, or create a new section.
          </p>
        </div>
        <Button type="button" variant="outline-green" size="sm" icon={Plus} onClick={startCreateSection}>
          New from section
        </Button>
      </div>

      <form
        ref={formTopRef}
        onSubmit={onSave}
        className="bg-white border border-[#241621]/10 rounded-2xl p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-[#241621]">
            {editingId
              ? 'Edit conversion'
              : isCreatingFrom
                ? 'Create new from section'
                : form.fromMode
                  ? `Add transformation to ${form.fromMode}`
                  : 'Add conversion'}
          </h2>
          {(editingId || form.fromMode) && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>

        {/* From section picker */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Select
            label="From section"
            name="fromMode"
            value={form.fromMode}
            onChange={onFromModeChange}
            required
          >
            <option value="">Select a from section…</option>
            {fromSections.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label} ({s.count} transformation{s.count === 1 ? '' : 's'})
              </option>
            ))}
            <option value={CREATE_NEW}>+ Create new from section</option>
          </Select>

          {isCreatingFrom ? (
            <Input
              label="New section name"
              name="from_label"
              value={form.from_label}
              onChange={onChange}
              required
              placeholder="e.g. Dupatta, Jacket"
            />
          ) : (
            <Input
              label="To style / transformation"
              name="to_label"
              value={form.to_label}
              onChange={onChange}
              required
              placeholder="e.g. Dress, Crop Top"
              disabled={!form.fromMode}
            />
          )}
        </div>

        {isCreatingFrom && (
          <Input
            label="First transformation (to style)"
            name="to_label"
            value={form.to_label}
            onChange={onChange}
            required
            placeholder="e.g. Dress — every section needs at least one to-style"
          />
        )}

        {form.fromMode ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <ConversionImageField
                label="From image"
                hint={
                  isCreatingFrom
                    ? '4:5 ratio recommended — 1200×1500 px, under 2MB.'
                    : 'Shared look for this section — change only if you want to update it.'
                }
                slot={fromSlot}
                fileRef={fromFileRef}
                urlValue={form.from_image}
                onPick={(e) => pickImage('from', e)}
                onClear={() => clearImage('from')}
                onUrlChange={(e) => onUrlChange('from', e)}
              />
              <ConversionImageField
                label="To image"
                hint="1:1 ratio recommended — 1200×1200 px, under 2MB."
                slot={toSlot}
                fileRef={toFileRef}
                urlValue={form.to_image}
                onPick={(e) => pickImage('to', e)}
                onClear={() => clearImage('to')}
                onUrlChange={(e) => onUrlChange('to', e)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Price (₹)" name="price" type="number" min="0" step="1" value={form.price} onChange={onChange} required />
              <Input label="Sort order" name="sort_order" type="number" min="0" step="1" value={form.sort_order} onChange={onChange} />
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-body text-[#241621]">
              <input type="checkbox" name="active" checked={form.active} onChange={onChange} />
              Active (visible on site)
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" loading={saving} icon={editingId ? Pencil : Plus}>
                {editingId ? 'Update' : isCreatingFrom ? 'Create section' : 'Add transformation'}
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-[#241621]/50 font-body">
            Select an existing from section above, or choose <span className="font-semibold text-[#241621]">Create new from section</span>.
          </p>
        )}
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : groupedRows.length === 0 ? (
        <p className="text-center text-[#241621]/40 font-body py-10">
          No conversions yet. Create your first from section to get started.
        </p>
      ) : (
        <div className="space-y-6">
          {groupedRows.map(([fromLabel, items]) => {
            const cover = items.find((r) => r.from_image)?.from_image;
            return (
              <section key={fromLabel} className="bg-white border border-[#241621]/10 rounded-2xl overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#241621]/8 bg-[#fafafa]">
                  <div className="flex items-center gap-3 min-w-0">
                    {cover ? (
                      <ZoomableImage
                        src={uploadUrl(cover)}
                        alt={fromLabel}
                        wrapperClassName="w-10 h-10 rounded-lg overflow-hidden border border-[#241621]/10 shrink-0"
                        imgClassName="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#241621]/6 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-display font-bold text-[#241621] truncate">{fromLabel}</p>
                      <p className="text-[11px] font-mono-tj uppercase tracking-[0.14em] text-[#241621]/40">
                        {items.length} transformation{items.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="outline-green" size="sm" icon={Plus} onClick={() => startAddToSection(fromLabel)}>
                    Add transformation
                  </Button>
                </div>

                <div className="divide-y divide-[#241621]/6">
                  {items
                    .slice()
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.to_label.localeCompare(b.to_label))
                    .map((row) => (
                      <div key={row.id} className="p-4 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          {row.to_image ? (
                            <ZoomableImage
                              src={uploadUrl(row.to_image)}
                              alt={row.to_label}
                              wrapperClassName="w-12 h-12 rounded-lg overflow-hidden border border-[#241621]/10 shrink-0"
                              imgClassName="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#241621]/5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-display font-bold text-[#241621]">
                              {fromLabel} → {row.to_label}
                            </p>
                            <p className="text-xs text-[#241621]/50 font-body">
                              ₹{Number(row.price).toLocaleString('en-IN')}
                              {!row.active && ' · inactive'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline-green" size="sm" icon={Pencil} onClick={() => startEdit(row)}>
                            Edit
                          </Button>
                          <Button type="button" variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteId(row.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={onDelete}
        title="Delete conversion?"
        message="This removes that from → to option from the Reimagine flow."
        confirmLabel="Delete"
      />
    </div>
  );
}
