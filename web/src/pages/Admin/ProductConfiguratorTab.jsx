import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trash2, ExternalLink, ImagePlus, X } from 'lucide-react';
import api from '../../utils/api';
import { Input, Textarea, Select } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Skeleton';
import { SHOP_CATEGORIES } from '../../utils/constants';

const CATEGORIES = SHOP_CATEGORIES.filter((c) => c !== 'All');

/** ~6MB file before base64 expansion keeps payload reasonable for JSON + LONGTEXT. */
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGES = 12;

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

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Could not read file'));
    r.readAsDataURL(file);
  });
}

export default function ProductConfiguratorTab() {
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(emptyForm);
  const [imageDataUrls, setImageDataUrls] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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

    const remaining = MAX_IMAGES - imageDataUrls.length;
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
      const urls = [];
      for (const f of toRead) {
        const dataUrl = await readFileAsDataUrl(f);
        if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(dataUrl)) {
          toast.error(`${f.name}: unsupported image type`);
          return;
        }
        urls.push(dataUrl);
      }
      setImageDataUrls((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) added as base64`);
    } catch {
      toast.error('Could not read one or more files');
    } finally {
      setUploadingImages(false);
    }
  };

  const resetAll = () => {
    setForm(emptyForm());
    setImageDataUrls([]);
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
    if (imageDataUrls.length === 0) return toast.error('Add at least one image (uploaded as base64)');

    setSubmitting(true);
    try {
      await api.post(
        '/shop/products',
        {
          name: form.name.trim(),
          price,
          original_price: original,
          category: form.category.trim(),
          description: form.description.trim() || null,
          ways_to_wear,
          images: imageDataUrls,
          tags,
          stock: stock || 100,
          featured: !!form.featured,
        },
        { headers: authHeader }
      );
      toast.success('Product created');
      resetAll();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create product');
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
      <h1 className="text-2xl font-black text-[#341631] font-display mb-2">Product configurator</h1>
      <p className="text-sm text-[#341631]/55 font-body mb-8 max-w-2xl">
        Fill in the fields below and publish to the <code className="text-xs bg-white px-1 rounded">products</code> table.
        Images are read in the browser and sent as <strong>base64 data URLs</strong> (<code className="text-xs">data:image/…;base64,…</code>) in the JSON payload, then stored in the database. Legacy catalog items that still use https URLs continue to work in the shop.
      </p>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-[#341631]/8 mb-10 space-y-5 max-w-3xl">
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
              disabled={imageDataUrls.length >= MAX_IMAGES}
              onClick={() => fileInputRef.current?.click()}
            >
              Add images
            </Button>
            {imageDataUrls.length > 0 && (
              <span className="text-xs text-[#341631]/50 font-body">
                {imageDataUrls.length} / {MAX_IMAGES} — first is the shop thumbnail
              </span>
            )}
          </div>
          <p className="text-xs text-[#341631]/45 font-body mt-2">
            JPEG, PNG, WebP, or GIF · up to 6MB per file · stored as base64 in MySQL (large payloads may take a few seconds).
          </p>
          {imageDataUrls.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3">
              {imageDataUrls.map((url, i) => (
                <li key={`${i}-${url.slice(0, 48)}`} className="relative group w-28 h-36 rounded-xl overflow-hidden border border-[#341631]/12 bg-gray-50">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageDataUrls((prev) => prev.filter((_, j) => j !== i))}
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
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input type="checkbox" name="featured" checked={form.featured} onChange={onChange} className="rounded border-[#341631]/30 text-[#0b4722] focus:ring-[#0b4722]" />
          <span className="text-sm font-semibold text-[#341631] font-display">Featured product</span>
        </label>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" variant="primary" loading={submitting}>
            Save to catalog
          </Button>
          <Button type="button" variant="ghost" onClick={resetAll}>
            Reset form
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
            <div key={p.id} className="bg-white rounded-xl px-4 py-3 border border-[#341631]/8 flex flex-wrap items-center gap-3 justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-[#341631] font-display text-sm truncate">{p.name}</p>
                <p className="text-xs text-[#341631]/45 font-body">
                  {p.category} · ₹{Number(p.price).toLocaleString('en-IN')}
                  {p.stock != null && ` · Stock ${p.stock}`}
                  {p.featured ? ' · Featured' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
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
