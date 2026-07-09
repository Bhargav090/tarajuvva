import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import DropZone from '../ui/DropZone';

const FIELD =
  'w-full px-4 py-3 border border-black bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm';

export const REIMAGINE_FORM_STEPS = [
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
  { key: 'photos', label: 'Upload a photo of the garment', type: 'dropzone', required: false },
  {
    key: 'notes',
    label: 'Notes (optional)',
    type: 'textarea',
    required: false,
    placeholder: 'Any specifics? Sentimental value? Don\'t touch the buttons?',
  },
];

export default function ReimagineFormWizard({
  details,
  setDetails,
  files,
  addFiles,
  removeFile,
  onSubmit,
  loading,
  submitLabel = 'Submit remake request',
}) {
  const [cardStep, setCardStep] = useState(0);
  const step = REIMAGINE_FORM_STEPS[cardStep];
  const isLast = cardStep === REIMAGINE_FORM_STEPS.length - 1;

  const valueFor = (key) => details[key] ?? '';

  const canNext = () => {
    if (!step.required) return true;
    if (step.key === 'photos') return true;
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
          We&apos;ll respond within 24 hours with a quote and timeline.
        </p>
      )}
    </form>
  );
}
