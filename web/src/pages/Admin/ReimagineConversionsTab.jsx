import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Pencil, Plus } from 'lucide-react';
import api from '../../utils/api';
import { Input } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Spinner } from '../../components/ui/Skeleton';
import { uploadUrl } from '../../utils/uploadUrl';
import ZoomableImage from '../../components/ui/ZoomableImage';
const emptyForm = () => ({
  from_label: '',
  to_label: '',
  from_image: '',
  to_image: '',
  price: '299',
  sort_order: '0',
  active: true,
});

export default function ReimagineConversionsTab() {
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

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

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      from_label: row.from_label || '',
      to_label: row.to_label || '',
      from_image: row.from_image || '',
      to_image: row.to_image || '',
      price: String(row.price ?? 299),
      sort_order: String(row.sort_order ?? 0),
      active: !!row.active,
    });
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.from_label.trim() || !form.to_label.trim()) {
      toast.error('From and to labels are required');
      return;
    }
    setSaving(true);
    const payload = {
      from_label: form.from_label.trim(),
      to_label: form.to_label.trim(),
      from_image: form.from_image.trim() || null,
      to_image: form.to_image.trim() || null,
      price: Math.max(0, parseInt(form.price, 10) || 0),
      sort_order: Math.max(0, parseInt(form.sort_order, 10) || 0),
      active: !!form.active,
    };
    try {
      if (editingId) {
        await api.put(`/reimagine/admin/conversions/${editingId}`, payload, { headers: authHeader });
        toast.success('Conversion updated');
      } else {
        await api.post('/reimagine/admin/conversions', payload, { headers: authHeader });
        toast.success('Conversion created');
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
      await load();
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#241621] font-display">Reimagine conversions</h1>
        <p className="text-sm text-[#241621]/55 font-body mt-1">
          Configure from → to styles, images, and payment price. The public Reimagine flow reads these.
        </p>
      </div>

      <form onSubmit={onSave} className="bg-white border border-[#241621]/10 rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="font-display font-bold text-[#241621]">
          {editingId ? 'Edit conversion' : 'Add conversion'}
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="From product / style" name="from_label" value={form.from_label} onChange={onChange} required placeholder="Saree" />
          <Input label="To product / style" name="to_label" value={form.to_label} onChange={onChange} required placeholder="Dress" />
          <Input label="From image URL" name="from_image" value={form.from_image} onChange={onChange} placeholder="https://… or /uploads/…" />
          <Input label="To image URL" name="to_image" value={form.to_image} onChange={onChange} placeholder="https://… or /uploads/…" />
          <Input label="Price (₹)" name="price" type="number" min="0" step="1" value={form.price} onChange={onChange} required />
          <Input label="Sort order" name="sort_order" type="number" min="0" step="1" value={form.sort_order} onChange={onChange} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-body text-[#241621]">
          <input type="checkbox" name="active" checked={form.active} onChange={onChange} />
          Active (visible on site)
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="sm" loading={saving} icon={editingId ? Pencil : Plus}>
            {editingId ? 'Update' : 'Create'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size={28} /></div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="bg-white border border-[#241621]/10 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex -space-x-2">
                  {row.from_image && (
                    <ZoomableImage
                      src={uploadUrl(row.from_image)}
                      alt={row.from_label}
                      wrapperClassName="w-12 h-12 rounded-lg overflow-hidden border border-white shrink-0"
                      imgClassName="w-full h-full object-cover"
                    />
                  )}
                  {row.to_image && (
                    <ZoomableImage
                      src={uploadUrl(row.to_image)}
                      alt={row.to_label}
                      wrapperClassName="w-12 h-12 rounded-lg overflow-hidden border border-white shrink-0"
                      imgClassName="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-[#241621]">
                    {row.from_label} → {row.to_label}
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
          {rows.length === 0 && (
            <p className="text-center text-[#241621]/40 font-body py-10">No conversions yet.</p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={onDelete}
        title="Delete conversion?"
        message="This removes the from → to option from the Reimagine flow."
        confirmLabel="Delete"
      />
    </div>
  );
}
