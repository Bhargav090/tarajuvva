import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import DropZone from '../ui/DropZone';
import { REIMAGINE_FORM_CARD } from './formCardStyles';

const FIELD =
  'w-full px-3.5 py-2.5 border border-black bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm';

const LABEL = 'block text-[0.65rem] font-mono-tj uppercase tracking-[0.16em] text-black/45 mb-1.5';

/**
 * Short section slides (same pattern as before the one-field experiment):
 * 1) name / email / phone  2) address / pincode  3) photos  4) notes / pickup
 */
export const REIMAGINE_FORM_STEPS = [
  { key: 'identity', label: 'Who should we contact?', type: 'identity', required: true },
  { key: 'delivery', label: 'Where do we pick up?', type: 'delivery', required: true },
  { key: 'photos', label: 'Upload garment photos', type: 'photos', required: true },
  { key: 'garment_notes', label: 'Notes & pickup', type: 'garment_notes', required: true },
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
      /^\d{6}$/.test(String(details.pincode || '').trim())
  );
}

function contactComplete(details) {
  return identityComplete(details) && deliveryComplete(details);
}

function stepHint(type) {
  if (type === 'identity') return ' · You';
  if (type === 'delivery') return ' · Address';
  if (type === 'photos') return ' · Photos';
  if (type === 'garment_notes') return ' · Details';
  return '';
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
  submitLabel = 'Submit remake request',
  steps = REIMAGINE_FORM_STEPS,
  completeLabel = 'Continue',
  preferGarmentStep = false,
}) {
  const lastIdx = Math.max(0, steps.length - 1);
  const [cardStep, setCardStep] = useState(() => {
    if (preferGarmentStep && contactComplete(details) && lastIdx > 0) return lastIdx;
    return 0;
  });
  const step = steps[cardStep];
  const isLast = cardStep === lastIdx;

  const valueFor = (key) => details[key] ?? '';
  const setField = (key) => (e) => setDetails((p) => ({ ...p, [key]: e.target.value }));

  const canNext = () => {
    if (!step) return false;
    if (step.type === 'identity') return identityComplete(details);
    if (step.type === 'delivery') return deliveryComplete(details);
    if (step.type === 'photos') return Array.isArray(files) && files.length > 0;
    if (step.type === 'garment_notes') {
      return (
        String(valueFor('notes')).trim().length > 0 &&
        String(valueFor('pickup_date')).trim().length > 0
      );
    }
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
            </div>
          ) : step.type === 'photos' ? (
            <div className="space-y-2">
              <p className="text-xs text-black/50">At least one photo is required.</p>
              <DropZone files={files} onAdd={addFiles} onRemove={removeFile} variant="compact" />
            </div>
          ) : step.type === 'garment_notes' ? (
            <div className="space-y-3">
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
              <div>
                <label className={LABEL}>Preferred pickup date *</label>
                <input
                  type="date"
                  name="pickup_date"
                  value={valueFor('pickup_date')}
                  onChange={setField('pickup_date')}
                  required
                  min={new Date().toISOString().slice(0, 10)}
                  className={`${FIELD} max-w-[12rem]`}
                />
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
