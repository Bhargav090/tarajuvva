import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Calendar, Clock, PhoneCall } from 'lucide-react';
import DropZone from '../ui/DropZone';
import { useConsultationSlotDates, useConsultationSlotsForDate } from '../../hooks/useConsultationSlots';
import { toISODateString, formatDateLabel, formatTimeLabel } from '../../utils/dates';

const FIELD =
  'w-full px-4 py-3 border border-black bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm';

const STEPS = [
  { key: 'user_name', label: 'Full name', type: 'text', required: true, placeholder: 'Your name' },
  { key: 'user_email', label: 'Email', type: 'email', required: false, placeholder: 'you@inbox.com' },
  { key: 'user_phone', label: 'Phone', type: 'tel', required: true, placeholder: '+91 …' },
  {
    key: 'address',
    label: 'Pickup / delivery address',
    type: 'textarea',
    required: true,
    placeholder: 'House / flat, street, area, city, state',
  },
  {
    key: 'pincode',
    label: 'Pincode',
    type: 'pincode',
    required: true,
    placeholder: '6-digit PIN',
  },
  {
    key: 'consultation_schedule',
    label: 'Book a consultation slot',
    type: 'schedule',
    required: true,
  },
  { key: 'photos', label: 'Upload a photo of the garment', type: 'dropzone', required: false },
  {
    key: 'notes',
    label: 'Notes (optional)',
    type: 'textarea',
    required: false,
    placeholder: 'References, fit preferences, sentimental details…',
  },
];

export default function CustomizeFormWizard({
  details,
  setDetails,
  files,
  addFiles,
  removeFile,
  onSubmit,
  loading,
  submitLabel = 'Submit customize request',
}) {
  const [cardStep, setCardStep] = useState(0);
  const step = STEPS[cardStep];
  const isLast = cardStep === STEPS.length - 1;
  const { dates, loading: datesLoading } = useConsultationSlotDates();
  const selectedDate = details.consultation_date || '';
  const { slots, loading: slotsLoading } = useConsultationSlotsForDate(selectedDate);
  const requestCallback = Boolean(details.request_callback);

  const valueFor = (key) => details[key] ?? '';

  useEffect(() => {
    if (step.key !== 'consultation_schedule' || requestCallback) return;
    if (!selectedDate) return;
    const selectedIso = toISODateString(selectedDate);
    if (!dates.includes(selectedIso)) {
      setDetails((p) => ({
        ...p,
        consultation_date: '',
        consultation_slot_id: '',
        consultation_time: '',
        consultation_slot_label: '',
      }));
      return;
    }
    if (!details.consultation_slot_id) return;
    const stillValid = slots.some((s) => s.id === details.consultation_slot_id);
    if (!stillValid) {
      setDetails((p) => ({
        ...p,
        consultation_slot_id: '',
        consultation_time: '',
        consultation_slot_label: '',
      }));
    }
  }, [slots, selectedDate, details.consultation_slot_id, step.key, setDetails, requestCallback, dates]);

  const scheduleComplete = () =>
    requestCallback || Boolean(valueFor('consultation_slot_id'));

  const canNext = () => {
    if (!step.required) return true;
    if (step.key === 'photos') return true;
    if (step.key === 'consultation_schedule') return scheduleComplete();
    const val = String(valueFor(step.key)).trim();
    if (step.key === 'pincode') return /^\d{6}$/.test(val);
    return val.length > 0;
  };

  const goNext = () => {
    if (!canNext()) return;
    if (isLast) return;
    setCardStep((s) => s + 1);
  };

  const goBack = () => setCardStep((s) => Math.max(0, s - 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canNext()) return;
    onSubmit(e);
  };

  const selectDate = (iso) => {
    setDetails((p) => ({
      ...p,
      request_callback: false,
      consultation_date: iso,
      consultation_slot_id: '',
      consultation_time: '',
      consultation_slot_label: '',
    }));
  };

  const selectSlot = (slot) => {
    setDetails((p) => ({
      ...p,
      request_callback: false,
      consultation_slot_id: slot.id,
      consultation_time: slot.slot_time,
      consultation_slot_label: slot.label,
    }));
  };

  const enableCallback = () => {
    setDetails((p) => ({
      ...p,
      request_callback: true,
      consultation_date: '',
      consultation_slot_id: '',
      consultation_time: '',
      consultation_slot_label: '',
    }));
  };

  const clearCallback = () => {
    setDetails((p) => ({ ...p, request_callback: false }));
  };

  return (
    <form onSubmit={handleSubmit} className="tj-card p-5 md:p-6 w-full shadow-[4px_4px_0_0_rgba(0,0,0,0.06)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={step.key}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          <label className="block text-xs font-mono-tj uppercase tracking-[0.16em] text-black/60 mb-3">
            {step.label}{step.required && ' *'}
          </label>

          {step.type === 'dropzone' ? (
            <DropZone files={files} onAdd={addFiles} onRemove={removeFile} variant="compact" />
          ) : step.type === 'schedule' ? (
            <div className="space-y-4">
              {requestCallback ? (
                <div className="rounded-xl border border-[#de78a4]/35 bg-[#fdf0f5] p-4">
                  <p className="font-display font-bold text-[#0a0a0a]">We&apos;ll call you back</p>
                  <p className="text-sm text-black/65 mt-1 leading-relaxed">
                    Our team will contact you within 24 hours on your phone or email to find a consultation time that works.
                  </p>
                  <button
                    type="button"
                    onClick={clearCallback}
                    className="mt-3 text-xs font-mono-tj uppercase tracking-[0.14em] text-[#de78a4] hover:text-[#c45d8a] underline"
                  >
                    Pick a slot instead
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.16em] text-black/45 mb-2">
                      Available dates
                    </p>
                    {datesLoading ? (
                      <p className="text-sm text-black/50">Loading available dates…</p>
                    ) : dates.length === 0 ? (
                      <p className="text-sm text-black/55 leading-relaxed">
                        No open slots right now. Use the button below and we&apos;ll reach out to schedule with you.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {dates.map((raw) => {
                          const iso = toISODateString(raw);
                          const selected = toISODateString(selectedDate) === iso;
                          return (
                            <button
                              key={iso}
                              type="button"
                              onClick={() => selectDate(iso)}
                              className={`text-left px-3 py-3 border text-sm transition-colors rounded-lg ${
                                selected
                                  ? 'border-black bg-black text-white'
                                  : 'border-black/20 hover:border-black bg-white'
                              }`}
                            >
                              <Calendar size={14} className="mb-1 opacity-70" />
                              <span className="block font-medium">{formatDateLabel(iso)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedDate && (
                    <div>
                      <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.16em] text-black/45 mb-2">
                        Times on {formatDateLabel(selectedDate)}
                      </p>
                      {slotsLoading ? (
                        <p className="text-sm text-black/50">Loading time slots…</p>
                      ) : slots.length === 0 ? (
                        <p className="text-sm text-black/55">
                          No times left on this date — try another date or request a callback below.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                          {slots.map((slot) => {
                            const selected = valueFor('consultation_slot_id') === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => selectSlot(slot)}
                                className={`px-3 py-2.5 border text-sm transition-colors rounded-lg ${
                                  selected
                                    ? 'border-[var(--tj-reimagine)] bg-[var(--tj-reimagine)] text-white'
                                    : 'border-black/20 hover:border-black bg-white'
                                }`}
                              >
                                <Clock size={13} className="inline mr-1 opacity-70" />
                                {formatTimeLabel(slot.slot_time)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {valueFor('consultation_slot_label') && (
                    <p className="text-xs font-mono-tj uppercase tracking-[0.14em] text-[var(--tj-reimagine)]">
                      Selected: {valueFor('consultation_slot_label')}
                    </p>
                  )}
                </>
              )}

              {!requestCallback && (
                <div className="pt-2 border-t border-black/8">
                  <button
                    type="button"
                    onClick={enableCallback}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[#de78a4]/50 rounded-xl text-sm font-display font-semibold text-[#0a0a0a] bg-[#fdf8fa] hover:border-[#de78a4] hover:bg-[#fdf0f5] transition-colors"
                  >
                    <PhoneCall size={16} className="text-[#de78a4]" />
                    Can&apos;t find a slot? Request a callback
                  </button>
                  <p className="text-[0.65rem] text-black/45 mt-2 text-center leading-relaxed">
                    Our team will contact you to arrange a consultation time.
                  </p>
                </div>
              )}
            </div>
          ) : step.type === 'textarea' ? (
            <textarea
              name={step.key}
              value={valueFor(step.key)}
              onChange={(e) => setDetails((p) => ({ ...p, [step.key]: e.target.value }))}
              required={step.required}
              rows={step.key === 'address' ? 4 : 3}
              placeholder={step.placeholder}
              className={`${FIELD} resize-none`}
            />
          ) : step.type === 'pincode' ? (
            <input
              name={step.key}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={valueFor(step.key)}
              onChange={(e) => setDetails((p) => ({ ...p, [step.key]: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              required={step.required}
              placeholder={step.placeholder}
              className={FIELD}
            />
          ) : (
            <input
              name={step.key}
              type={step.type}
              value={valueFor(step.key)}
              onChange={(e) => setDetails((p) => ({ ...p, [step.key]: e.target.value }))}
              required={step.required}
              placeholder={step.placeholder}
              className={FIELD}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex items-center gap-3">
        {cardStep > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-black/20 text-xs font-mono-tj uppercase tracking-[0.16em] hover:border-black"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext()}
            className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white text-xs font-mono-tj uppercase tracking-[0.16em] disabled:opacity-40"
          >
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || !canNext()}
            className="ml-auto flex-1 tj-btn-reimagine justify-center disabled:opacity-60"
          >
            {loading ? 'Submitting…' : submitLabel}
          </button>
        )}
      </div>

      {isLast && (
        <p className="text-xs text-black/45 mt-3 text-center">
          {requestCallback
            ? 'We&apos;ll reach out within 24 hours to schedule your call.'
            : 'We&apos;ll confirm your consultation slot within 24 hours.'}
        </p>
      )}
    </form>
  );
}
