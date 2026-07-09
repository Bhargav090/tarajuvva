import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, CalendarClock } from 'lucide-react';
import { Input, Textarea } from '../../components/ui/FormField';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';
import { useAdminReimagineCustomizeSettings } from '../../hooks/useReimagineCustomize';
import { useAdminConsultationSlots } from '../../hooks/useConsultationSlots';
import { toISODateString, formatDateHeading, formatTimeLabel } from '../../utils/dates';

function groupByDate(slots) {
  return slots.reduce((acc, slot) => {
    const key = toISODateString(slot.slot_date);
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});
}

export default function ReimagineCustomizeTab() {
  const { settings, loading, submitting, save } = useAdminReimagineCustomizeSettings();
  const { slots: savedSlots, loading: slotsLoading, submitting: slotsSubmitting, preview, create, remove, bulkDelete } =
    useAdminConsultationSlots();

  const [form, setForm] = useState(null);
  const [generator, setGenerator] = useState({
    from_date: '',
    to_date: '',
    start_time: '09:00',
    end_time: '18:00',
    interval_minutes: '20',
  });
  const [previewSlots, setPreviewSlots] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [bulkRange, setBulkRange] = useState({ from_date: '', to_date: '' });

  if (loading && !form) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size={32} />
      </div>
    );
  }

  const values = form || {
    price: String(settings.price ?? 299),
    feature: settings.feature || '',
    description: settings.description || '',
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...(p || values), [name]: value }));
  };

  const onGeneratorChange = (e) => {
    const { name, value } = e.target;
    setGenerator((p) => ({ ...p, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const result = await save({
      price: parseInt(values.price, 10) || 0,
      feature: values.feature.trim(),
      description: values.description.trim(),
    });
    if (result.ok) {
      toast.success('Customize settings saved');
      setForm(null);
    } else {
      toast.error(result.message);
    }
  };

  const onGenerate = async () => {
    setGenerating(true);
    const result = await preview({
      from_date: generator.from_date,
      to_date: generator.to_date,
      start_time: generator.start_time,
      end_time: generator.end_time,
      interval_minutes: Number(generator.interval_minutes) || 20,
    });
    setGenerating(false);
    if (result.ok) {
      setPreviewSlots(result.slots);
      toast.success(`Generated ${result.slots.length} slots`);
    } else {
      toast.error(result.message);
    }
  };

  const removePreviewSlot = (key) => {
    setPreviewSlots((prev) => prev.filter((s) => s.key !== key));
  };

  const onCreateSlots = async () => {
    if (!previewSlots.length) {
      toast.error('Generate slots first');
      return;
    }
    const result = await create(
      previewSlots.map(({ slot_date, slot_time }) => ({ slot_date, slot_time }))
    );
    if (result.ok) {
      toast.success(`Created ${result.created} slots (${result.skipped} already existed)`);
      setPreviewSlots([]);
    } else {
      toast.error(result.message);
    }
  };

  const onBulkDeleteRange = async () => {
    if (!bulkRange.from_date || !bulkRange.to_date) {
      toast.error('Select from and to dates');
      return;
    }
    const result = await bulkDelete({
      from_date: bulkRange.from_date,
      to_date: bulkRange.to_date,
    });
    if (result.ok) {
      toast.success(`Deleted ${result.deleted} unbooked slot(s)`);
    } else {
      toast.error(result.message);
    }
  };

  const onBulkDeleteUnbooked = async () => {
    const ids = savedSlots.filter((s) => !s.is_booked).map((s) => s.id);
    if (!ids.length) {
      toast.error('No unbooked slots to delete');
      return;
    }
    const result = await bulkDelete({ slot_ids: ids });
    if (result.ok) {
      toast.success(`Deleted ${result.deleted} slot(s)${result.skipped ? `, ${result.skipped} booked skipped` : ''}`);
    } else {
      toast.error(result.message);
    }
  };

  const previewGrouped = groupByDate(previewSlots);
  const savedGrouped = groupByDate(savedSlots);

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-black text-[#241621] font-display mb-1">Reimagine · Customize</h1>
        <p className="text-sm text-[#241621]/55 font-body">
          Set consultation price, copy, and bookable time slots for the Customize flow.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-[#241621]/8 space-y-5">
        <h2 className="text-lg font-bold text-[#241621] font-display">Pricing & copy</h2>
        <Input
          label="Consultation price (₹)"
          name="price"
          type="number"
          min="0"
          value={values.price}
          onChange={onChange}
          required
          placeholder="299"
        />
        <Input
          label="Feature title"
          name="feature"
          value={values.feature}
          onChange={onChange}
          required
          placeholder="15 min consultation call"
        />
        <Textarea
          label="Feature description"
          name="description"
          rows={5}
          value={values.description}
          onChange={onChange}
          required
          placeholder="What the customer gets with this consultation…"
        />
        <Button type="submit" variant="primary" loading={submitting}>
          Save settings
        </Button>
      </form>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#241621]/8 space-y-5">
        <div className="flex items-center gap-2">
          <CalendarClock size={20} className="text-[#7A063C]" />
          <h2 className="text-lg font-bold text-[#241621] font-display">Generate consultation slots</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="From date"
            name="from_date"
            type="date"
            value={generator.from_date}
            onChange={onGeneratorChange}
            required
          />
          <Input
            label="To date"
            name="to_date"
            type="date"
            value={generator.to_date}
            onChange={onGeneratorChange}
            required
          />
          <Input
            label="Start time"
            name="start_time"
            type="time"
            value={generator.start_time}
            onChange={onGeneratorChange}
            required
          />
          <Input
            label="End time"
            name="end_time"
            type="time"
            value={generator.end_time}
            onChange={onGeneratorChange}
            required
          />
          <Input
            label="Interval (minutes)"
            name="interval_minutes"
            type="number"
            min="5"
            step="5"
            value={generator.interval_minutes}
            onChange={onGeneratorChange}
            required
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={onGenerate} loading={generating}>
            Generate preview
          </Button>
          {previewSlots.length > 0 && (
            <Button type="button" variant="primary" onClick={onCreateSlots} loading={slotsSubmitting}>
              Create {previewSlots.length} slots
            </Button>
          )}
        </div>

        {previewSlots.length > 0 && (
          <div className="border border-[#241621]/10 rounded-xl p-4 space-y-4 max-h-80 overflow-y-auto">
            <p className="text-xs font-mono-tj uppercase tracking-wider text-[#241621]/50">
              Preview — click × to remove before creating
            </p>
            {Object.entries(previewGrouped).map(([date, daySlots]) => (
              <div key={date}>
                <p className="text-sm font-semibold text-[#241621] mb-2">{formatDateHeading(date)}</p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <span
                      key={slot.key}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#241621]/5 border border-[#241621]/10 text-xs rounded-lg"
                    >
                      {formatTimeLabel(slot.slot_time)}
                      <button
                        type="button"
                        onClick={() => removePreviewSlot(slot.key)}
                        className="text-[#241621]/40 hover:text-[#e34334]"
                        aria-label="Remove slot"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#241621]/8">
        <h2 className="text-lg font-bold text-[#241621] font-display mb-4">Saved slots</h2>
        <div className="flex flex-wrap gap-3 mb-5 pb-5 border-b border-[#241621]/8">
          <Input
            label="Bulk delete from"
            name="bulk_from"
            type="date"
            value={bulkRange.from_date}
            onChange={(e) => setBulkRange((p) => ({ ...p, from_date: e.target.value }))}
          />
          <Input
            label="To"
            name="bulk_to"
            type="date"
            value={bulkRange.to_date}
            onChange={(e) => setBulkRange((p) => ({ ...p, to_date: e.target.value }))}
          />
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" loading={slotsSubmitting} onClick={onBulkDeleteRange}>
              Delete range
            </Button>
            <Button type="button" variant="outline" loading={slotsSubmitting} onClick={onBulkDeleteUnbooked}>
              Delete all unbooked
            </Button>
          </div>
        </div>
        {slotsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size={24} />
          </div>
        ) : savedSlots.length === 0 ? (
          <p className="text-sm text-[#241621]/45">No slots created yet.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(savedGrouped).map(([date, daySlots]) => (
              <div key={date}>
                <p className="text-sm font-semibold text-[#241621] mb-2">{formatDateHeading(date)}</p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map((slot) => (
                    <span
                      key={slot.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border ${
                        slot.is_booked
                          ? 'bg-[#241621]/10 border-[#241621]/20 text-[#241621]/50 line-through'
                          : 'bg-white border-[#241621]/15'
                      }`}
                    >
                      {formatTimeLabel(slot.slot_time)}
                      {slot.is_booked ? (
                        <span className="text-[10px] uppercase">booked</span>
                      ) : (
                        <button
                          type="button"
                          onClick={async () => {
                            const r = await remove(slot.id);
                            if (r.ok) toast.success('Slot removed');
                            else toast.error(r.message);
                          }}
                          className="text-[#241621]/40 hover:text-[#e34334]"
                          aria-label="Delete slot"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
