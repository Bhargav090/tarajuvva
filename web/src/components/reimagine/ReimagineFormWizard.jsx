import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import DropZone from '../ui/DropZone';
import DeliveryZonePicker from '../ui/DeliveryZonePicker';
import { REIMAGINE_FORM_CARD } from './formCardStyles';
import {
  PICKUP_PERIODS,
  REIMAGINE_LETTER_SIZES,
  HEIGHT_FEET_OPTIONS,
  HEIGHT_INCH_OPTIONS,
} from '../../utils/constants';
import { isValidDeliveryZone } from '../../utils/delivery';

const FIELD =
  'w-full px-3.5 py-2.5 border border-black bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm';

const LABEL = 'block text-[0.65rem] font-mono-tj uppercase tracking-[0.16em] text-black/45 mb-1.5';

/**
 * Remake wizard:
 * 1) identity  2) delivery  3) photos  4) fit (sizes/height/notes)  5) pickup
 */
export const REIMAGINE_FORM_STEPS = [
  { key: 'identity', label: 'Who should we contact?', type: 'identity', required: true },
  { key: 'delivery', label: 'Where do we pick up?', type: 'delivery', required: true },
  { key: 'photos', label: 'Upload garment photos', type: 'photos', required: true },
  { key: 'garment_fit', label: 'Tell us about your garment', type: 'garment_fit', required: true },
  { key: 'pickup', label: 'Schedule pickup', type: 'pickup', required: true },
];

/** @deprecated alias */
export const REIMAGINE_CONTACT_STEPS = REIMAGINE_FORM_STEPS;

function identityComplete(details) {
  return Boolean(
    String(details.user_name || '').trim() && String(details.user_phone || '').trim()
  );
}

function deliveryComplete(details) {
  return Boolean(
    String(details.address || '').trim() &&
      /^\d{6}$/.test(String(details.pincode || '').trim()) &&
      isValidDeliveryZone(details.delivery_zone)
  );
}

function fitComplete(details) {
  const ft = Number(details.height_ft);
  const inch = Number(details.height_in);
  return Boolean(
    String(details.garment_size || '').trim() &&
      String(details.transformation_size || '').trim() &&
      Number.isFinite(ft) &&
      ft >= 4 &&
      ft <= 7 &&
      Number.isFinite(inch) &&
      inch >= 0 &&
      inch <= 11 &&
      String(details.notes || '').trim()
  );
}

function pickupComplete(details) {
  return Boolean(
    String(details.pickup_date || '').trim() && String(details.pickup_period || '').trim()
  );
}

function contactComplete(details) {
  return identityComplete(details) && deliveryComplete(details);
}

function stepHint(type) {
  if (type === 'identity') return ' · You';
  if (type === 'delivery') return ' · Address';
  if (type === 'photos') return ' · Photos';
  if (type === 'garment_fit') return ' · Fit';
  if (type === 'pickup') return ' · Pickup';
  return '';
}

function SizeSelect({ label, name, value, onChange }) {
  return (
    <div className="min-w-0 flex flex-col">
      <label className={`${LABEL} min-h-[2.25rem] flex items-end`}>{label}</label>
      <select name={name} value={value} onChange={onChange} required className={`${FIELD} w-full`}>
        <option value="">Select size</option>
        {REIMAGINE_LETTER_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function ReimagineFormWizard({
  details,
  setDetails,
  files,
  addFiles,
  removeFile,
  onSubmit,
  onWizardComplete,
  loading,
  submitLabel = 'Submit upcycle order',
  steps = REIMAGINE_FORM_STEPS,
  completeLabel = 'Continue',
  preferGarmentStep = false,
  cardStep: controlledCardStep,
  onCardStepChange,
  deliveryFees,
}) {
  const lastIdx = Math.max(0, steps.length - 1);
  const isControlled = typeof controlledCardStep === 'number' && typeof onCardStepChange === 'function';
  const [uncontrolledCardStep, setUncontrolledCardStep] = useState(() => {
    if (preferGarmentStep && contactComplete(details) && lastIdx > 0) return lastIdx;
    return 0;
  });
  const cardStep = isControlled
    ? Math.min(Math.max(0, controlledCardStep), lastIdx)
    : uncontrolledCardStep;
  const setCardStep = (next) => {
    const value = typeof next === 'function' ? next(cardStep) : next;
    const clamped = Math.min(Math.max(0, value), lastIdx);
    if (isControlled) onCardStepChange(clamped);
    else setUncontrolledCardStep(clamped);
  };
  const step = steps[cardStep];
  const isLast = cardStep === lastIdx;

  const valueFor = (key) => details[key] ?? '';
  const setField = (key) => (e) => setDetails((p) => ({ ...p, [key]: e.target.value }));

  const canNext = () => {
    if (!step) return false;
    if (step.type === 'identity') return identityComplete(details);
    if (step.type === 'delivery') return deliveryComplete(details);
    if (step.type === 'photos') return Array.isArray(files) && files.length > 0;
    if (step.type === 'garment_fit') return fitComplete(details);
    if (step.type === 'pickup') return pickupComplete(details);
    return true;
  };

  const goNext = () => {
    if (!canNext() || isLast) return;
    setCardStep((s) => s + 1);
  };

  const goBack = () => setCardStep((s) => Math.max(0, s - 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLast) {
      if (canNext()) goNext();
      return;
    }
    if (!canNext()) return;
    if (onWizardComplete) {
      onWizardComplete(e);
      return;
    }
    onSubmit(e);
  };

  return (
    <form onSubmit={handleSubmit} className={REIMAGINE_FORM_CARD}>
      <div className="flex items-center gap-1.5 mb-3 shrink-0" aria-hidden>
        {steps.map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= cardStep ? 'bg-black' : 'bg-black/10'
            }`}
          />
        ))}
      </div>
      <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.16em] text-black/40 mb-3 shrink-0">
        Step {cardStep + 1} of {steps.length}
        {stepHint(step.type)}
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.18 }}
          >
            <h3 className="font-display text-base md:text-lg font-extrabold text-[#0a0a0a] mb-3">
              {step.label}
            </h3>

            {step.type === 'identity' ? (
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Full name *</label>
                  <input
                    name="user_name"
                    type="text"
                    value={valueFor('user_name')}
                    onChange={setField('user_name')}
                    required
                    placeholder="Your name"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label className={LABEL}>Email</label>
                  <input
                    name="user_email"
                    type="email"
                    value={valueFor('user_email')}
                    onChange={setField('user_email')}
                    placeholder="you@inbox.com"
                    className={FIELD}
                  />
                </div>
                <div>
                  <label className={LABEL}>Phone *</label>
                  <input
                    name="user_phone"
                    type="tel"
                    value={valueFor('user_phone')}
                    onChange={setField('user_phone')}
                    required
                    placeholder="+91 …"
                    className={FIELD}
                  />
                </div>
              </div>
            ) : step.type === 'delivery' ? (
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Pickup / delivery address *</label>
                  <textarea
                    name="address"
                    value={valueFor('address')}
                    onChange={setField('address')}
                    required
                    rows={2}
                    placeholder="House / flat, street, area, city, state"
                    className={`${FIELD} resize-none`}
                  />
                </div>
                <div>
                  <label className={LABEL}>Pincode *</label>
                  <input
                    name="pincode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={valueFor('pincode')}
                    onChange={(e) =>
                      setDetails((p) => ({
                        ...p,
                        pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                    required
                    placeholder="6-digit PIN"
                    className={`${FIELD} max-w-[9rem]`}
                  />
                </div>
                <DeliveryZonePicker
                  channel="reimagine"
                  value={valueFor('delivery_zone')}
                  onChange={(zone) => setDetails((p) => ({ ...p, delivery_zone: zone }))}
                  fees={deliveryFees}
                />
              </div>
            ) : step.type === 'photos' ? (
              <div className="space-y-2">
                <p className="text-xs text-black/50">At least one photo is required.</p>
                <DropZone files={files} onAdd={addFiles} onRemove={removeFile} variant="compact" />
              </div>
            ) : step.type === 'garment_fit' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 items-stretch">
                  <SizeSelect
                    label="Current garment size *"
                    name="garment_size"
                    value={valueFor('garment_size')}
                    onChange={setField('garment_size')}
                  />
                  <SizeSelect
                    label="Desired size after upcycle *"
                    name="transformation_size"
                    value={valueFor('transformation_size')}
                    onChange={setField('transformation_size')}
                  />
                </div>
                <div>
                  <label className={LABEL}>Your height *</label>
                  <div className="flex items-center gap-2">
                    <select
                      name="height_ft"
                      value={valueFor('height_ft')}
                      onChange={setField('height_ft')}
                      required
                      className={`${FIELD} max-w-[6.5rem]`}
                    >
                      <option value="">Ft</option>
                      {HEIGHT_FEET_OPTIONS.map((n) => (
                        <option key={n} value={String(n)}>
                          {n} ft
                        </option>
                      ))}
                    </select>
                    <select
                      name="height_in"
                      value={valueFor('height_in')}
                      onChange={setField('height_in')}
                      required
                      className={`${FIELD} max-w-[6.5rem]`}
                    >
                      <option value="">In</option>
                      {HEIGHT_INCH_OPTIONS.map((n) => (
                        <option key={n} value={String(n)}>
                          {n} in
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-[11px] text-black/45 mt-1 font-body">
                    Tailor-style height in feet and inches.
                  </p>
                </div>
                <div>
                  <label className={LABEL}>Notes / description *</label>
                  <textarea
                    name="notes"
                    value={valueFor('notes')}
                    onChange={setField('notes')}
                    required
                    rows={2}
                    placeholder="Fit preferences, sentimental details…"
                    className={`${FIELD} resize-none`}
                  />
                </div>
              </div>
            ) : step.type === 'pickup' ? (
              <div className="space-y-3">
                <div>
                  <label className={LABEL}>Preferred pickup date *</label>
                  <input
                    type="date"
                    name="pickup_date"
                    value={valueFor('pickup_date')}
                    onChange={setField('pickup_date')}
                    required
                    min={(() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      return d.toISOString().slice(0, 10);
                    })()}
                    className={`${FIELD} max-w-[12rem]`}
                  />
                  <p className="text-[10px] text-black/45 mt-1">Same-day pickup is not available.</p>
                </div>
                <div>
                  <label className={LABEL}>Preferred time of day *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PICKUP_PERIODS.map((p) => {
                      const selected = valueFor('pickup_period') === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setDetails((prev) => ({ ...prev, pickup_period: p.value }))}
                          className={`px-2 py-2.5 border text-left transition-colors ${
                            selected
                              ? 'border-black bg-black text-white'
                              : 'border-black/20 bg-white hover:border-black'
                          }`}
                        >
                          <span className="block text-[11px] font-mono-tj uppercase tracking-[0.12em]">
                            {p.label}
                          </span>
                          <span
                            className={`block text-[10px] mt-0.5 ${selected ? 'text-white/70' : 'text-black/45'}`}
                          >
                            {p.hint}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-3 border-t border-black/10 flex items-center gap-3 shrink-0">
        {cardStep > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-black/20 text-xs font-mono-tj uppercase tracking-[0.16em] hover:border-black"
          >
            <ArrowLeft size={14} /> Back
          </button>
        )}
        {!isLast ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext()}
            className="ml-auto inline-flex items-center gap-2 px-5 py-2 bg-black text-white text-xs font-mono-tj uppercase tracking-[0.16em] disabled:opacity-40"
          >
            Next <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading || !canNext()}
            className="ml-auto flex-1 tj-btn-reimagine justify-center disabled:opacity-60 min-h-[2.5rem]"
          >
            {loading ? 'Opening payment…' : onWizardComplete ? completeLabel : submitLabel}
          </button>
        )}
      </div>

      {isLast && !loading && (
        <p className="text-[0.7rem] text-black/45 mt-2 text-center leading-snug shrink-0">
          {String(completeLabel).startsWith('Pay')
            ? 'Secure checkout opens next.'
            : "We'll respond within 24 hours."}
        </p>
      )}
    </form>
  );
}
