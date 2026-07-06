import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trash2, ExternalLink, ImagePlus, X, Plus, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import api from '../../utils/api';
import { Input, Textarea, Select } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Skeleton';
import { SHOP_CATEGORIES } from '../../utils/constants';
import { productHeroImage, resolveProductImageSrc } from '../../utils/productImage';
import { LETTER_SIZES, NUMERIC_SIZES, inferGarmentType } from '../../utils/sizeConstants';

const CATEGORIES = SHOP_CATEGORIES.filter(c => c.value).map(c => c.value);

/** Size manager — letter OR numeric presets (mutually exclusive). */
function SizeManager({ sizes, sizeType, garmentType, onSizeTypeChange, onGarmentTypeChange, onSizesChange }) {
  const [custom, setCustom] = useState('');
  const presets = sizeType === 'numeric' ? NUMERIC_SIZES : LETTER_SIZES;

  const switchType = (nextType) => {
    if (nextType === sizeType) return;
    onSizeTypeChange(nextType);
    onSizesChange([]);
    setCustom('');
  };

  const toggle = (label) => {
    const exists = sizes.find(s => s.label === label);
    if (exists) {
      onSizesChange(sizes.filter(s => s.label !== label));
    } else {
      onSizesChange([...sizes, { label, available: true }]);
    }
  };

  const addCustom = () => {
    const label = sizeType === 'numeric' ? custom.trim() : custom.trim().toUpperCase();
    if (!label) return;
    if (sizes.find(s => s.label === label)) {
      toast.error(`Size ${label} already added`);
      return;
    }
    if (sizeType === 'numeric' && !/^\d{1,2}$/.test(label)) {
      toast.error('Numeric sizes use numbers like 28, 30, 32');
      return;
    }
    onSizesChange([...sizes, { label, available: true }]);
    setCustom('');
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="block text-sm font-semibold text-[#341631] mb-2 font-display">Size system</span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'letter', label: 'Letter (XS, S, M, L, XL, XXL)' },
            { id: 'numeric', label: 'Numeric (28, 30, 32…)' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => switchType(opt.id)}
              className={`px-3.5 py-2 text-xs font-bold font-display border transition-all ${
                sizeType === opt.id
                  ? 'bg-[#0b4722] text-white border-[#0b4722]'
                  : 'bg-white text-[#341631]/60 border-[#341631]/20 hover:border-[#341631]/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#341631]/45 font-body mt-2">
          Choose one system only — letter sizes or numeric, not both. Edit measurement tables under Admin → Size charts.
        </p>
      </div>

      {sizes.length > 0 && (
        <Select
          label="Garment type (for size chart)"
          name="garment_type"
          value={garmentType || 'top'}
          onChange={(e) => onGarmentTypeChange(e.target.value)}
        >
          <option value="top">Top / Dress / Set (upper body chart)</option>
          <option value="bottom">Bottom (lower body chart)</option>
        </Select>
      )}

      <div>
        <span className="block text-sm font-semibold text-[#341631] mb-2 font-display">
          Sizes available
          <span className="text-xs font-normal text-[#341631]/50 ml-2">click to add/remove</span>
        </span>
        <div className="flex flex-wrap gap-2 mb-3">
          {presets.map(label => {
            const active = !!sizes.find(s => s.label === label);
            return (
              <button
                key={label} type="button"
                onClick={() => toggle(label)}
                className={`px-3.5 py-1.5 text-xs font-bold font-display border transition-all ${
                  active
                    ? 'bg-[#0b4722] text-white border-[#0b4722]'
                    : 'bg-white text-[#341631]/60 border-[#341631]/20 hover:border-[#341631]/50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            placeholder={sizeType === 'numeric' ? 'Custom number (e.g. 48)' : 'Custom (e.g. XXXL)'}
            className="px-3 py-2 text-xs border border-[#341631]/20 bg-white text-[#341631] placeholder:text-[#341631]/35 focus:outline-none focus:border-[#0b4722] w-48"
          />
          <button type="button" onClick={addCustom}
            className="px-3 py-2 text-xs font-bold bg-white border border-[#341631]/20 hover:border-[#341631]/50 text-[#341631] flex items-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
        {sizes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sizes.map(s => (
              <span key={s.label} className="inline-flex items-center gap-1.5 bg-[#0b4722]/8 border border-[#0b4722]/20 px-2.5 py-1 text-xs font-bold text-[#0b4722] font-display">
                {s.label}
                <button type="button" onClick={() => onSizesChange(sizes.filter(x => x.label !== s.label))} className="hover:text-[#e34334]">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Inline size availability toggle shown in the product list. */
function ProductSizeControls({ product, authHeader, onUpdate }) {
  const [sizes, setSizes] = useState(product.sizes || []);
  const [saving, setSaving] = useState(false);

  const toggle = async (label) => {
    const updated = sizes.map(s =>
      s.label === label ? { ...s, available: !s.available } : s
    );
    setSizes(updated);
    setSaving(true);
    try {
      await api.patch(`/shop/products/${product.id}/sizes`, { sizes: updated }, { headers: authHeader });
      onUpdate(product.id, updated);
      toast.success(`${label} updated`);
    } catch {
      toast.error('Could not update size');
      setSizes(sizes); // revert
    } finally {
      setSaving(false);
    }
  };

  if (sizes.length === 0) return <p className="text-xs text-[#341631]/40 font-body">No sizes set</p>;

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {saving && <Spinner size={12} />}
      {sizes.map(s => (
        <button
          key={s.label}
          type="button"
          onClick={() => toggle(s.label)}
          title={s.available ? 'Click to mark Out of Stock' : 'Click to mark Available'}
          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold font-display border transition-all ${
            s.available
              ? 'bg-[#0b4722] text-white border-[#0b4722] hover:bg-[#e34334] hover:border-[#e34334]'
              : 'bg-[#e34334]/10 text-[#e34334] border-[#e34334]/30 line-through hover:bg-[#0b4722]/10 hover:text-[#0b4722] hover:border-[#0b4722]/30 hover:no-underline'
          }`}
        >
          {s.available ? <ToggleRight size={10} /> : <ToggleLeft size={10} />}
          {s.label}
        </button>
      ))}
    </div>
  );
}

/** ~6MB per file — sent as multipart, not base64 JSON. */
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGES = 12;

function newImageKey() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function previewFromFile(file) {
  return URL.createObjectURL(file);
}

function releasePreview(preview) {
  if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview);
}

const emptyForm = () => ({
  name: '',
  price: '',
  original_price: '',
  category: CATEGORIES[0] || 'Tops',
  description: '',
  waysRaw: '',
  tagsRaw: '',
  stock: '100',
  featured: false,
  sizes: [],
});

function linesToList(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function tagsFromRaw(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildProductFormData(form, sizes, sizeType, garmentType, imageSlots) {
  const ways_to_wear = linesToList(form.waysRaw);
  const tags = tagsFromRaw(form.tagsRaw);
  const price = Number(form.price);
  const stock = Math.max(0, parseInt(String(form.stock), 10) || 0);
  const original = form.original_price === '' ? null : Number(form.original_price);

  const imageMeta = [];
  const fd = new FormData();
  let fileIndex = 0;

  imageSlots.forEach((slot) => {
    if (slot.file) {
      imageMeta.push({ type: 'file', index: fileIndex });
      fd.append('images', slot.file);
      fileIndex += 1;
    } else if (slot.retained) {
      imageMeta.push({ type: 'retain', value: slot.retained });
    }
  });

  const payload = {
    name: form.name.trim(),
    price,
    original_price: original,
    category: form.category.trim(),
    description: form.description.trim() || null,
    ways_to_wear,
    tags,
    stock: stock || 100,
    sizes,
    size_type: sizes.length ? sizeType : null,
    garment_type: sizes.length ? garmentType : null,
    featured: !!form.featured,
    imageMeta,
  };

  fd.append('data', JSON.stringify(payload));
  return fd;
}

export default function ProductConfiguratorTab() {
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
  const fileInputRef = useRef(null);
  const formRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [sizes, setSizes] = useState([]);
  const [sizeType, setSizeType] = useState('letter');
  const [garmentType, setGarmentType] = useState('top');
  const [imageSlots, setImageSlots] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data } = await api.get('/shop/products?limit=300');
      setProducts(data.products || []);
    } catch {
      toast.error('Could not load products');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const onFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - imageSlots.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images`);
      return;
    }

    const toRead = files.slice(0, remaining);
    for (const f of toRead) {
      if (!/^image\/(jpeg|png|gif|webp)$/i.test(f.type)) {
        toast.error(`${f.name}: use JPEG, PNG, GIF, or WebP`);
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is too large (max 6MB each)`);
        return;
      }
    }

    setUploadingImages(true);
    try {
      const slots = toRead.map((file) => ({
        key: newImageKey(),
        preview: previewFromFile(file),
        file,
      }));
      setImageSlots((prev) => [...prev, ...slots]);
      toast.success(`${slots.length} image(s) added`);
    } catch {
      toast.error('Could not add one or more files');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImageSlot = (key) => {
    setImageSlots((prev) => {
      const slot = prev.find((s) => s.key === key);
      if (slot) releasePreview(slot.preview);
      return prev.filter((s) => s.key !== key);
    });
  };

  const clearImageSlots = () => {
    imageSlots.forEach((slot) => releasePreview(slot.preview));
    setImageSlots([]);
  };

  const resetAll = () => {
    setEditingId(null);
    setForm(emptyForm());
    clearImageSlots();
    setSizes([]);
    setSizeType('letter');
    setGarmentType('top');
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      price: String(p.price),
      original_price: p.original_price != null ? String(p.original_price) : '',
      category: p.category,
      description: p.description || '',
      waysRaw: (p.ways_to_wear || []).join('\n'),
      tagsRaw: (p.tags || []).join(', '),
      stock: String(p.stock ?? 100),
      featured: !!p.featured,
      sizes: [],
    });
    setImageSlots((prev) => {
      prev.forEach((slot) => releasePreview(slot.preview));
      return (p.images || []).map((retained) => ({
        key: newImageKey(),
        preview: resolveProductImageSrc(retained),
        retained,
      }));
    });
    setSizes(p.sizes || []);
    setSizeType(
      p.size_type ||
        (p.sizes?.[0] && /^\d{1,2}$/.test(String(p.sizes[0].label)) ? 'numeric' : 'letter')
    );
    setGarmentType(p.garment_type || inferGarmentType(p.category));
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const ways_to_wear = linesToList(form.waysRaw);
    const tags = tagsFromRaw(form.tagsRaw);
    const price = Number(form.price);
    const stock = Math.max(0, parseInt(String(form.stock), 10) || 0);
    const original = form.original_price === '' ? null : Number(form.original_price);

    if (!form.name.trim()) return toast.error('Product name is required');
    if (Number.isNaN(price) || price < 0) return toast.error('Enter a valid price');
    if (original != null && (Number.isNaN(original) || original < 0)) return toast.error('Original price must be a valid number');
    if (imageSlots.length === 0) return toast.error('Add at least one product image');
    if (sizes.length > 0 && !garmentType) return toast.error('Select garment type for the size chart');

    setSubmitting(true);
    try {
      const fd = buildProductFormData(form, sizes, sizeType, garmentType, imageSlots);
      const config = { headers: { ...authHeader } };

      if (editingId) {
        await api.put(`/shop/products/${editingId}`, fd, config);
        toast.success('Product updated');
      } else {
        await api.post('/shop/products', fd, config);
        toast.success('Product created');
      }
      resetAll();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save product');
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/shop/products/${deleteId}`, { headers: authHeader });
      toast.success('Product removed');
      setProducts((p) => p.filter((x) => x.id !== deleteId));
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-black text-[#341631] font-display mb-8">Product configurator</h1>

      <form ref={formRef} onSubmit={onSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-[#341631]/8 mb-10 space-y-5 max-w-3xl">
        {editingId && (
          <div className="flex items-center justify-between pb-3 border-b border-[#341631]/8">
            <span className="text-sm font-bold text-[#341631] font-display flex items-center gap-2">
              <Pencil size={14} className="text-[#0b4722]" /> Editing product
            </span>
            <button type="button" onClick={resetAll} className="text-xs text-[#e34334] font-semibold hover:underline font-display">
              Cancel edit
            </button>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-5">
          <Input label="Product name" name="name" value={form.name} onChange={onChange} required placeholder="e.g. Indigo Block Print Kurta" />
          <Select label="Category" name="category" value={form.category} onChange={onChange} required>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <Input label="Price (₹)" name="price" type="number" min="0" step="1" value={form.price} onChange={onChange} required placeholder="1299" />
          <Input
            label="Original price (₹, optional)"
            name="original_price"
            type="number"
            min="0"
            step="1"
            value={form.original_price}
            onChange={onChange}
            placeholder="Leave empty if not on sale"
          />
        </div>
        <Input label="Stock count" name="stock" type="number" min="0" step="1" value={form.stock} onChange={onChange} required />
        <Textarea
          label="Description"
          name="description"
          rows={4}
          value={form.description}
          onChange={onChange}
          placeholder="Materials, fit, story…"
        />

        <div>
          <span className="block text-sm font-semibold text-[#341631] mb-1.5 font-display">
            Product images <span className="text-[#e34334]">*</span>
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
            multiple
            className="sr-only"
            onChange={onFileChange}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline-green"
              size="sm"
              icon={ImagePlus}
              loading={uploadingImages}
              disabled={imageSlots.length >= MAX_IMAGES}
              onClick={() => fileInputRef.current?.click()}
            >
              Add images
            </Button>
            {imageSlots.length > 0 && (
              <span className="text-xs text-[#341631]/50 font-body">
                {imageSlots.length} / {MAX_IMAGES} — first is the shop thumbnail
              </span>
            )}
          </div>
          <p className="text-xs text-[#341631]/45 font-body mt-2">
            JPEG, PNG, WebP, or GIF · up to 6MB per file · uploads as files (not base64) so multiple photos save reliably.
          </p>
          {imageSlots.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3">
              {imageSlots.map((slot, i) => (
                <li key={slot.key} className="relative group w-28 h-36 rounded-xl overflow-hidden border border-[#341631]/12 bg-gray-50">
                  <img src={slot.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImageSlot(slot.key)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-[#341631]/85 text-[#eef4d1] flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity"
                    aria-label={`Remove image ${i + 1}`}
                  >
                    <X size={14} />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0 inset-x-0 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-[#eef4d1] bg-[#0b4722]/90 font-display">
                      Cover
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Textarea
          label="Ways to wear (optional — one per line)"
          name="waysRaw"
          rows={4}
          value={form.waysRaw}
          onChange={onChange}
          placeholder={'Pair with palazzo pants…\nTuck into high-waisted jeans…'}
        />
        <Input label="Tags (optional, comma-separated)" name="tagsRaw" value={form.tagsRaw} onChange={onChange} placeholder="cotton, handcrafted, sustainable" />
        <SizeManager
          sizes={sizes}
          sizeType={sizeType}
          garmentType={garmentType}
          onSizeTypeChange={setSizeType}
          onGarmentTypeChange={setGarmentType}
          onSizesChange={setSizes}
        />
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" name="featured" checked={form.featured} onChange={onChange} className="rounded border-[#341631]/30 text-[#0b4722] focus:ring-[#0b4722]" />
          <span className="text-sm font-semibold text-[#341631] font-display">Featured product</span>
        </label>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" variant="primary" loading={submitting}>
            {editingId ? 'Update product' : 'Save to catalog'}
          </Button>
          <Button type="button" variant="ghost" onClick={resetAll}>
            {editingId ? 'Cancel edit' : 'Reset form'}
          </Button>
        </div>
      </form>

      <h2 className="text-lg font-black text-[#341631] font-display mb-4">Current catalog ({products.length})</h2>
      {loadingList ? (
        <div className="flex justify-center py-12">
          <Spinner size={32} />
        </div>
      ) : products.length === 0 ? (
        <p className="text-[#341631]/45 font-body text-sm">No products yet.</p>
      ) : (
        <div className="space-y-2 max-w-3xl">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-[#341631]/8 overflow-hidden">
              <div className="px-4 py-3 flex items-center gap-3">
                <img
                  src={productHeroImage(p.images)}
                  alt={p.name}
                  className="w-14 h-[4.5rem] rounded-lg object-cover border border-[#341631]/10 shrink-0 bg-[#341631]/3"
                />
                <div className="flex-1 min-w-0 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-[#341631] font-display text-sm truncate">{p.name}</p>
                  <p className="text-xs text-[#341631]/45 font-body">
                    {p.category} · ₹{Number(p.price).toLocaleString('en-IN')}
                    {p.stock != null && ` · Stock ${p.stock}`}
                    {p.featured ? ' · Featured' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="p-2 rounded-lg text-[#0b4722]/80 hover:bg-[#0b4722]/10 transition-colors"
                    aria-label="Edit product"
                  >
                    <Pencil size={15} />
                  </button>
                  <Link
                    to={`/shop/${p.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b4722] font-display hover:underline"
                  >
                    View <ExternalLink size={12} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDeleteId(p.id)}
                    className="p-2 rounded-lg text-[#e34334]/80 hover:bg-[#e34334]/10 transition-colors"
                    aria-label="Delete product"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                </div>
              </div>
              <div className="px-4 pb-3 border-t border-[#341631]/6 pt-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#341631]/40 font-display mb-2">
                  Sizes · click to toggle availability
                </p>
                <ProductSizeControls
                  product={p}
                  authHeader={authHeader}
                  onUpdate={(id, updated) =>
                    setProducts(prev =>
                      prev.map(x => x.id === id ? { ...x, sizes: updated } : x)
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete this product?"
        message="This removes the row from the database. Orders that already reference it keep their line items as stored."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="red"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
