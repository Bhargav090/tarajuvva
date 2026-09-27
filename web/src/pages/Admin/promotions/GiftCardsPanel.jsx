import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, X, Send, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import PaginationBar from '../../../components/ui/PaginationBar';
import { Input, Textarea, Select } from '../../../components/ui/FormField';
import { TableSkeleton } from '../../../components/ui/Skeleton';
import { adminHeaders, rupees, todayIST, formatDay, apiError, countEmails } from './promoUtils';
import { StatusPill, CopyCode, Toggle, RadioCards } from './PromoUi';

const EMPTY_CREATE = {
  audience: 'specific',
  emails: '',
  code: '',
  value: '',
  max_uses: '1',
  min_cart_value: '',
  expires_at: '',
  note: '',
  notify: true,
  active: true,
};

function giftCardStatus(g) {
  if (!g.active) return 'Inactive';
  if (g.remaining_uses <= 0) return 'Fully used';
  if (g.expires_at && g.expires_at < todayIST()) return 'Expired';
  return 'Active';
}

function SharedFields({ form, onChange }) {
  return (
    <>
      <div className="grid sm:grid-cols-3 gap-4">
        <Input
          label="Value per use ₹"
          name="value"
          type="number"
          min="1"
          step="1"
          required
          value={form.value}
          onChange={onChange}
        />
        <Input
          label="Number of uses"
          name="max_uses"
          type="number"
          min="1"
          step="1"
          required
          value={form.max_uses}
          onChange={onChange}
        />
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
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Expiry date (optional)" name="expires_at" type="date" value={form.expires_at} onChange={onChange} />
        <Input
          label="Note (optional, shown in the email)"
          name="note"
          value={form.note}
          onChange={onChange}
          maxLength={255}
          placeholder="e.g. Thank you for being with us"
        />
      </div>
    </>
  );
}

function CreateForm({ saving, onCancel, onSubmit }) {
  const [form, setForm] = useState(EMPTY_CREATE);
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
        <h3 className="text-lg font-black text-[#241621] font-display">Issue gift cards</h3>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-[#241621]/40 hover:bg-[#241621]/5">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-[#241621] font-display">Who gets it</p>
        <RadioCards
          name="audience"
          value={form.audience}
          onChange={onChange}
          options={[
            {
              value: 'specific',
              label: 'Specific customers',
              hint: 'Each email gets its own code, shown to them at checkout',
            },
            { value: 'all', label: 'Anyone with the code', hint: 'One shared code; uses count across all customers' },
          ]}
        />
      </div>

      {form.audience === 'specific' ? (
        <Textarea
          label={`Recipient emails${emailCount ? ` (${emailCount})` : ''}`}
          name="emails"
          rows={4}
          required
          value={form.emails}
          onChange={onChange}
          placeholder="One per line, or separated by commas. Up to 500 at a time."
        />
      ) : (
        <Input
          label="Code (optional)"
          name="code"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '') }))}
          placeholder="Leave empty to generate one"
          maxLength={32}
        />
      )}

      <SharedFields form={form} onChange={onChange} />

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Toggle label="Active" name="active" checked={form.active} onChange={onChange} />
        {form.audience === 'specific' && (
          <Toggle label="Email the code to each recipient" name="notify" checked={form.notify} onChange={onChange} />
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" variant="dark" loading={saving}>
          {form.audience === 'specific' && emailCount > 1 ? `Create ${emailCount} gift cards` : 'Create gift card'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EditForm({ card, saving, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    recipient_email: card.recipient_email || '',
    value: String(card.value),
    max_uses: String(card.max_uses),
    min_cart_value: card.min_cart_value ? String(card.min_cart_value) : '',
    expires_at: card.expires_at || '',
    note: card.note || '',
    active: card.active,
  });
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const payload = { ...form };
        if (!card.recipient_email) delete payload.recipient_email;
        onSubmit(payload);
      }}
      className="bg-white rounded-2xl border border-[#241621]/10 p-5 sm:p-6 space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-[#241621] font-display">
          Edit gift card <span className="font-mono-tj">{card.code}</span>
        </h3>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg text-[#241621]/40 hover:bg-[#241621]/5">
          <X size={18} />
        </button>
      </div>
      {card.recipient_email && (
        <Input
          label="Recipient email"
          name="recipient_email"
          type="email"
          required
          value={form.recipient_email}
          onChange={onChange}
        />
      )}
      <SharedFields form={form} onChange={onChange} />
      {card.used_count > 0 && (
        <p className="text-xs text-[#241621]/50 font-body">
          Already used {card.used_count} time{card.used_count === 1 ? '' : 's'}; uses cannot go below that.
        </p>
      )}
      <Toggle label="Active" name="active" checked={form.active} onChange={onChange} />
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="submit" variant="dark" loading={saving}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function GiftCardsPanel() {
  const [cards, setCards] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState(null);
  const [mode, setMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const queryKey = `${page}|${search}|${status}|${reloadKey}`;
  const loading = loadedKey !== queryKey;
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    api
      .get(`/admin/promotions/gift-cards?${params}`, { headers: adminHeaders() })
      .then(({ data }) => {
        if (cancelled) return;
        setCards(data.gift_cards || []);
        setPagination(data.pagination || {});
      })
      .catch((err) => !cancelled && toast.error(apiError(err, 'Could not load gift cards')))
      .finally(() => !cancelled && setLoadedKey(queryKey));
    return () => {
      cancelled = true;
    };
  }, [page, search, status, queryKey]);

  const replace = (card) => setCards((list) => list.map((c) => (c.id === card.id ? card : c)));

  const create = async (form) => {
    setSaving(true);
    try {
      const { data } = await api.post('/admin/promotions/gift-cards', form, { headers: adminHeaders() });
      const n = data.gift_cards?.length || 0;
      toast.success(n > 1 ? `${n} gift cards created` : 'Gift card created');
      setMode(null);
      if (page === 1) reload();
      else setPage(1);
    } catch (err) {
      toast.error(apiError(err, 'Could not create gift cards'));
    } finally {
      setSaving(false);
    }
  };

  const update = async (payload) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/promotions/gift-cards/${mode.card.id}`, payload, {
        headers: adminHeaders(),
      });
      replace(data.gift_card);
      toast.success('Gift card updated');
      setMode(null);
    } catch (err) {
      toast.error(apiError(err, 'Could not update gift card'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (g) => {
    setBusyId(g.id);
    try {
      const { data } = await api.patch(
        `/admin/promotions/gift-cards/${g.id}/active`,
        { active: !g.active },
        { headers: adminHeaders() }
      );
      replace(data.gift_card);
      toast.success(data.gift_card.active ? 'Gift card activated' : 'Gift card deactivated');
    } catch (err) {
      toast.error(apiError(err, 'Could not update gift card'));
    } finally {
      setBusyId(null);
    }
  };

  const resend = async (g) => {
    setBusyId(g.id);
    try {
      await api.post(`/admin/promotions/gift-cards/${g.id}/resend`, {}, { headers: adminHeaders() });
      toast.success(`Email sent to ${g.recipient_email}`);
    } catch (err) {
      toast.error(apiError(err, 'Could not send email'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    const g = toDelete;
    setToDelete(null);
    if (!g) return;
    setBusyId(g.id);
    try {
      await api.delete(`/admin/promotions/gift-cards/${g.id}`, { headers: adminHeaders() });
      toast.success('Gift card deleted');
      reload();
    } catch (err) {
      toast.error(apiError(err, 'Could not delete gift card'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {mode?.type === 'create' && <CreateForm saving={saving} onCancel={() => setMode(null)} onSubmit={create} />}
      {mode?.type === 'edit' && (
        <EditForm key={mode.card.id} card={mode.card} saving={saving} onCancel={() => setMode(null)} onSubmit={update} />
      )}

      {!mode && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#241621]/35" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search code, email or note"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#241621]/15 bg-white text-sm font-body focus:outline-none focus:border-[#241621]/40"
            />
          </div>
          <div className="w-40">
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All cards</option>
              <option value="active">Active</option>
              <option value="used">Fully used</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <Button variant="dark" size="sm" icon={Plus} onClick={() => setMode({ type: 'create' })}>
            Issue gift cards
          </Button>
        </div>
      )}

      {loading && cards.length === 0 ? (
        <TableSkeleton rows={5} cols={5} />
      ) : cards.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-[#241621]/15 p-10 text-center">
          <p className="text-sm text-[#241621]/50 font-body">
            {search || status ? 'No gift cards match your search.' : 'No gift cards yet. Issue your first batch.'}
          </p>
        </div>
      ) : (
        <div className={`bg-white rounded-2xl border border-[#241621]/8 overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
          <table className="w-full text-sm font-body min-w-[760px]">
            <thead>
              <tr className="text-left text-[10px] font-mono-tj uppercase tracking-wider text-[#241621]/40 border-b border-[#241621]/8">
                <th className="px-4 py-3 font-normal">Code</th>
                <th className="px-4 py-3 font-normal">Recipient</th>
                <th className="px-4 py-3 font-normal text-right">Value</th>
                <th className="px-4 py-3 font-normal text-right">Uses</th>
                <th className="px-4 py-3 font-normal text-right">Redeemed</th>
                <th className="px-4 py-3 font-normal">Conditions</th>
                <th className="px-4 py-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#241621]/6">
              {cards.map((g) => (
                <tr key={g.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-mono-tj text-[#241621] whitespace-nowrap">{g.code}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusPill status={giftCardStatus(g)} />
                      <CopyCode value={g.code} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#241621]/80 break-all">
                    {g.recipient_email || <span className="text-[#241621]/45">Anyone with code</span>}
                    {g.note && <p className="text-xs text-[#241621]/45 mt-0.5 break-normal">{g.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#241621] whitespace-nowrap">{rupees(g.value)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {g.used_count} / {g.max_uses}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{rupees(g.total_redeemed)}</td>
                  <td className="px-4 py-3 text-xs text-[#241621]/60 whitespace-nowrap">
                    <p>{g.min_cart_value > 0 ? `Min cart ${rupees(g.min_cart_value)}` : 'Any cart'}</p>
                    <p>{g.expires_at ? `Until ${formatDay(g.expires_at)}` : 'No expiry'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Edit" onClick={() => setMode({ type: 'edit', card: g })} disabled={busyId === g.id}>
                        <Pencil size={14} />
                      </IconBtn>
                      <IconBtn
                        title={g.active ? 'Deactivate' : 'Activate'}
                        onClick={() => toggleActive(g)}
                        disabled={busyId === g.id}
                        tone={g.active ? 'default' : 'green'}
                      >
                        <Power size={14} />
                      </IconBtn>
                      {g.recipient_email && (
                        <IconBtn title="Resend email" onClick={() => resend(g)} disabled={busyId === g.id || !g.active}>
                          <Send size={14} />
                        </IconBtn>
                      )}
                      <IconBtn title="Delete" onClick={() => setToDelete(g)} disabled={busyId === g.id} tone="red">
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar
        page={pagination.page || page}
        totalPages={pagination.totalPages || 1}
        total={pagination.total || 0}
        onPageChange={setPage}
        loading={loading}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete gift card?"
        message={
          toDelete?.used_count
            ? 'This gift card has been redeemed, so it cannot be deleted. Deactivate it instead.'
            : `Delete ${toDelete?.code}${toDelete?.recipient_email ? ` for ${toDelete.recipient_email}` : ''}?`
        }
        confirmLabel="Delete"
        confirmVariant="red"
        onConfirm={remove}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

const TONES = {
  default: 'text-[#241621]/55 hover:bg-[#241621]/6 hover:text-[#241621]',
  green: 'text-[#5a7a00] hover:bg-[#c8ff2e]/25',
  red: 'text-[#e34334]/70 hover:bg-[#e34334]/10 hover:text-[#e34334]',
};

function IconBtn({ title, onClick, disabled, tone = 'default', children }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded-lg transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}
