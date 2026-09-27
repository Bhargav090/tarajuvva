import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Power, X, Shuffle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { Input, Textarea, Select } from '../../../components/ui/FormField';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { adminHeaders, rupees, todayIST, formatDay, formatDateTime, apiError, countEmails } from './promoUtils';
import { StatusPill, CopyCode, Toggle, RadioCards } from './PromoUi';

const EMPTY_FORM = {
  code: '',
  description: '',
  discount_type: 'percent',
  discount_value: '',
  max_discount: '',
  min_cart_value: '',
  audience: 'all',
  emails: '',
  usage_limit: '',
  per_user_limit: '1',
  starts_at: '',
  expires_at: '',
  active: true,
};

function couponToForm(c) {
  return {
    code: c.code,
    description: c.description || '',
    discount_type: c.discount_type,
    discount_value: String(c.discount_value ?? ''),
    max_discount: c.max_discount == null ? '' : String(c.max_discount),
    min_cart_value: c.min_cart_value ? String(c.min_cart_value) : '',
    audience: c.audience,
    emails: (c.allowed_emails || []).join('\n'),
    usage_limit: c.usage_limit == null ? '' : String(c.usage_limit),
    per_user_limit: c.per_user_limit == null ? '' : String(c.per_user_limit),
    starts_at: c.starts_at || '',
    expires_at: c.expires_at || '',
    active: c.active,
  };
}

function couponStatus(c) {
  const today = todayIST();
  if (!c.active) return 'Inactive';
  if (c.expires_at && c.expires_at < today) return 'Expired';
  if (c.starts_at && c.starts_at > today) return 'Scheduled';
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return 'Limit reached';
  return 'Active';
}

function discountLabel(c) {
  if (c.discount_type === 'percent') {
    return `${c.discount_value}% off${c.max_discount ? ` (up to ${rupees(c.max_discount)})` : ''}`;
  }
  return `${rupees(c.discount_value)} off`;
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'TJ';
  for (let i = 0; i < 6; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function CouponForm({ initial, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(initial);
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };
  const emailCount = countEmails(form.emails);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="bg-white rounded-2xl border border-[#241621]/10 p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-[#241621] font-display">
          {initial.code ? `Edit coupon ${initial.code}` : 'New coupon'}
        </h3>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-[#241621]/40 hover:bg-[#241621]/5">
          <X size={18} />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Input
            label="Coupon code"
            name="code"
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
            placeholder="e.g. WELCOME10"
            maxLength={32}
          />
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, code: randomCode() }))}
            className="inline-flex items-center gap-1 text-xs text-[#241621]/55 hover:text-[#241621] font-body"
          >
            <Shuffle size={12} /> Generate a code
          </button>
        </div>
        <Input
          label="Description (shown to customers)"
          name="description"
          value={form.description}
          onChange={onChange}
          placeholder="e.g. 10% off your first order"
          maxLength={255}
        />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Select label="Discount type" name="discount_type" value={form.discount_type} onChange={onChange}>
          <option value="percent">Percentage (%)</option>
          <option value="flat">Flat amount (₹)</option>
        </Select>
        <Input
          label={form.discount_type === 'percent' ? 'Discount (%)' : 'Discount (₹)'}
          name="discount_value"
          type="number"
          min="0.01"
          max={form.discount_type === 'percent' ? '100' : undefined}
          step="0.01"
          required
          value={form.discount_value}
          onChange={onChange}
        />
        {form.discount_type === 'percent' ? (
          <Input
            label="Max discount ₹ (optional)"
            name="max_discount"
            type="number"
            min="0"
            step="1"
            value={form.max_discount}
            onChange={onChange}
            placeholder="No cap"
          />
        ) : (
          <div />
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Input
          label="Minimum cart value ₹"
          name="min_cart_value"
          type="number"
          min="0"
          step="1"
          value={form.min_cart_value}
          onChange={onChange}
          placeholder="0 = any cart"
        />
        <Input
          label="Total usage limit"
          name="usage_limit"
          type="number"
          min="1"
          step="1"
          value={form.usage_limit}
          onChange={onChange}
          placeholder="Unlimited"
        />
        <Input
          label="Uses per customer"
          name="per_user_limit"
          type="number"
          min="1"
          step="1"
          value={form.per_user_limit}
          onChange={onChange}
          placeholder="Unlimited"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Start date (optional)" name="starts_at" type="date" value={form.starts_at} onChange={onChange} />
        <Input label="Expiry date (optional)" name="expires_at" type="date" value={form.expires_at} onChange={onChange} />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#241621] font-display">Who can use it</p>
        <RadioCards
          name="audience"
          value={form.audience}
          onChange={onChange}
          options={[
            { value: 'all', label: 'All customers', hint: 'Anyone signed in can apply this code' },
            { value: 'specific', label: 'Specific customers', hint: 'Only the emails you list below' },
          ]}
        />
        {form.audience === 'specific' && (
          <div>
            <Textarea
              label={`Customer emails${emailCount ? ` (${emailCount})` : ''}`}
              name="emails"
              rows={4}
              value={form.emails}
              onChange={onChange}
              placeholder="One per line, or separated by commas"
            />
          </div>
        )}
      </div>

      <Toggle label="Active" name="active" checked={form.active} onChange={onChange} />

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" variant="dark" loading={saving}>
          {initial.code ? 'Save changes' : 'Create coupon'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/admin/promotions/coupons', { headers: adminHeaders() })
      .then(({ data }) => !cancelled && setCoupons(data.coupons || []))
      .catch((err) => !cancelled && toast.error(apiError(err, 'Could not load coupons')))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    if (filter === 'all') return coupons;
    return coupons.filter((c) => {
      const s = couponStatus(c);
      if (filter === 'active') return s === 'Active';
      if (filter === 'inactive') return s !== 'Active';
      return true;
    });
  }, [coupons, filter]);

  const upsert = (coupon) =>
    setCoupons((list) => {
      const idx = list.findIndex((c) => c.id === coupon.id);
      if (idx === -1) return [coupon, ...list];
      const next = [...list];
      next[idx] = coupon;
      return next;
    });

  const save = async (form) => {
    setSaving(true);
    try {
      const payload = { ...form };
      const isEdit = Boolean(editing?.id);
      const { data } = isEdit
        ? await api.put(`/admin/promotions/coupons/${editing.id}`, payload, { headers: adminHeaders() })
        : await api.post('/admin/promotions/coupons', payload, { headers: adminHeaders() });
      upsert(data.coupon);
      toast.success(isEdit ? 'Coupon updated' : 'Coupon created');
      setEditing(null);
    } catch (err) {
      toast.error(apiError(err, 'Could not save coupon'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    setBusyId(c.id);
    try {
      const { data } = await api.patch(
        `/admin/promotions/coupons/${c.id}/active`,
        { active: !c.active },
        { headers: adminHeaders() }
      );
      upsert(data.coupon);
      toast.success(data.coupon.active ? 'Coupon activated' : 'Coupon deactivated');
    } catch (err) {
      toast.error(apiError(err, 'Could not update coupon'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    const c = toDelete;
    setToDelete(null);
    if (!c) return;
    setBusyId(c.id);
    try {
      await api.delete(`/admin/promotions/coupons/${c.id}`, { headers: adminHeaders() });
      setCoupons((list) => list.filter((x) => x.id !== c.id));
      toast.success('Coupon deleted');
    } catch (err) {
      toast.error(apiError(err, 'Could not delete coupon'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {editing ? (
        <CouponForm
          key={editing.id || 'new'}
          initial={editing.id ? couponToForm(editing) : EMPTY_FORM}
          saving={saving}
          onCancel={() => setEditing(null)}
          onSubmit={save}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1">
            {[
              ['all', 'All'],
              ['active', 'Live'],
              ['inactive', 'Not live'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-display font-semibold ${
                  filter === id ? 'bg-[#241621] text-white' : 'text-[#241621]/55 hover:bg-[#241621]/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="dark" size="sm" icon={Plus} onClick={() => setEditing({})}>
            New coupon
          </Button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#241621]/15 p-10 text-center">
          <p className="text-sm text-[#241621]/50 font-body">
            {coupons.length === 0 ? 'No coupons yet. Create your first one.' : 'No coupons match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((c) => {
            const status = couponStatus(c);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-[#241621]/8 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-[#241621] font-mono-tj tracking-wide">{c.code}</span>
                      <StatusPill status={status} />
                      <CopyCode value={c.code} />
                    </div>
                    <p className="text-sm text-[#241621] font-body">
                      <span className="font-semibold">{discountLabel(c)}</span>
                      {c.min_cart_value > 0 ? ` · min cart ${rupees(c.min_cart_value)}` : ' · any cart value'}
                      {' · '}
                      {c.audience === 'all'
                        ? 'All customers'
                        : `${c.allowed_emails.length} specific customer${c.allowed_emails.length === 1 ? '' : 's'}`}
                    </p>
                    {c.description && <p className="text-xs text-[#241621]/55 font-body">{c.description}</p>}
                    <p className="text-xs text-[#241621]/45 font-body">
                      {c.starts_at ? `From ${formatDay(c.starts_at)}` : 'Starts now'}
                      {c.expires_at ? ` · until ${formatDay(c.expires_at)}` : ' · no expiry'}
                      {c.per_user_limit ? ` · ${c.per_user_limit} use${c.per_user_limit === 1 ? '' : 's'} per customer` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button variant="ghost" size="sm" icon={Pencil} onClick={() => setEditing(c)} disabled={busyId === c.id}>
                      Edit
                    </Button>
                    <Button
                      variant={c.active ? 'outline' : 'outline-green'}
                      size="sm"
                      onClick={() => toggleActive(c)}
                      icon={Power}
                      loading={busyId === c.id}
                    >
                      {c.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setToDelete(c)}
                      disabled={busyId === c.id}
                      className="p-2 rounded-lg text-[#e34334]/70 hover:bg-[#e34334]/10 disabled:opacity-40"
                      title="Delete coupon"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-[#241621]/6 pt-3">
                  <div>
                    <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/40">Used</p>
                    <p className="text-sm font-bold text-[#241621] font-display">
                      {c.used_count}
                      {c.usage_limit != null ? ` / ${c.usage_limit}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/40">Customers</p>
                    <p className="text-sm font-bold text-[#241621] font-display">{c.unique_customers}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/40">Discount given</p>
                    <p className="text-sm font-bold text-[#241621] font-display">{rupees(c.total_discount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/40">Order revenue</p>
                    <p className="text-sm font-bold text-[#241621] font-display">{rupees(c.revenue)}</p>
                    {c.last_used_at && (
                      <p className="text-[11px] text-[#241621]/45 font-body">last {formatDateTime(c.last_used_at)}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete coupon?"
        message={
          toDelete?.used_count
            ? 'This coupon has been used, so it cannot be deleted. Deactivate it instead.'
            : `Delete ${toDelete?.code}? Customers will no longer be able to use it.`
        }
        confirmLabel="Delete"
        confirmVariant="red"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
