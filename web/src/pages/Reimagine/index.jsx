import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import ReimagineStepBar from '../../components/ui/ReimagineStepBar';
import DropZone from '../../components/ui/DropZone';
import {
  GARMENTS,
  TRANSFORMATIONS,
  REIMAGINE_STEP_HEADINGS,
  getTransformationMeta,
} from '../../utils/constants';
import { useReimagineSubmit } from '../../hooks/useReimagineSubmit';

const FIELD =
  'w-full px-4 py-3 border border-black bg-white focus:outline-none focus:ring-2 focus:ring-black text-sm';

function FieldWrap({ label, required, children }) {
  return (
    <div>
      {label && (
        <label className="block text-xs font-mono-tj uppercase tracking-[0.18em] text-black/60 mb-2">
          {label}{required && ' *'}
        </label>
      )}
      {children}
    </div>
  );
}

function displayStepNum(step) {
  if (step === 0) return '01';
  if (step === 1) return '02';
  if (step === 3) return '03';
  return '01';
}

export default function Reimagine() {
  const {
    step, setStep,
    garment, setGarment,
    transformation, setTransformation,
    details, setDetails,
    files, addFiles, removeFile,
    onSubmit, loading, done,
  } = useReimagineSubmit();

  const garmentLabel = GARMENTS.find(g => g.id === garment)?.label ?? '';
  const transformMeta = getTransformationMeta(transformation);

  if (done) {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center px-4 border-b border-black">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 border border-black flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-[var(--tj-reimagine)]" />
          </div>
          <h2 className="tj-h2 text-3xl text-[#0a0a0a]">Request sent.</h2>
          <p className="text-black/60 mt-4 leading-relaxed">
            Thank you for reimagining with Tarajuvva. We&apos;ll review your request and get back within 24 hours.
          </p>
        </motion.div>
      </div>
    );
  }

  const stepHeading =
    step === 1
      ? `How to transform your ${garmentLabel}?`
      : step !== 3
        ? REIMAGINE_STEP_HEADINGS[step]
        : null;

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-black bg-[var(--tj-reimagine)] text-white" data-testid="reimagine-hero">
        <div className="tj-container py-14 md:py-20 lg:py-24">
          <p className="tj-eyebrow text-white/60">02 · Reimagine</p>
          <h1 className="tj-h1 mt-3 text-white">
            Send the old.
            <br />
            <span className="italic font-light">Get the new.</span>
          </h1>
          <p className="text-white/75 text-lg md:text-xl max-w-2xl mt-6 leading-relaxed">
            Pick a base. Pick a transformation. We do the cutting, sewing, and slight emotional labour.
          </p>
        </div>
      </section>

      <ReimagineStepBar currentStep={step} />

      <section className="border-b border-black bg-white">
        <div className="tj-container py-12 md:py-16 lg:py-20 pb-20">
          {step !== 3 && (
            <>
              <p className="tj-eyebrow mb-3">Step {displayStepNum(step)}</p>
              {stepHeading && (
                <h2 className="tj-h2 text-[#0a0a0a] mb-10 md:mb-12 max-w-3xl">
                  {stepHeading}
                </h2>
              )}
            </>
          )}

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5"
              >
                {GARMENTS.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    data-testid={`segment-${g.id}`}
                    onClick={() => { setGarment(g.id); setStep(1); }}
                    className="text-left tj-card group hover:-translate-y-1 transition-transform overflow-hidden"
                  >
                    <div className="aspect-square overflow-hidden bg-[var(--tj-bg-soft)]">
                      <img
                        src={g.image}
                        alt={g.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 md:p-5 border-t border-black">
                      <p className="font-display text-xl md:text-2xl font-extrabold text-[#0a0a0a] leading-tight">
                        {g.label}
                      </p>
                      <p className="text-sm text-black/60 mt-1 leading-snug">{g.desc}</p>
                      <span className="mt-3 md:mt-4 inline-flex items-center gap-1 text-xs font-mono-tj uppercase tracking-[0.18em] text-black/70 group-hover:text-black">
                        Pick this <ArrowRight size={12} />
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
              >
                <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
                  {(TRANSFORMATIONS[garment] || []).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTransformation(t); setStep(3); }}
                      className={`flex items-center justify-between p-5 border text-left transition-all hover:-translate-y-0.5 ${
                        transformation === t
                          ? 'border-black bg-black text-white'
                          : 'border-black/20 hover:border-black'
                      }`}
                    >
                      <span className="font-display font-bold">
                        {getTransformationMeta(t).display}
                      </span>
                      <ArrowRight size={16} className="opacity-40" />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="mt-8 inline-flex items-center gap-2 text-xs font-mono-tj uppercase tracking-[0.18em] text-black/60 hover:text-black"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start"
              >
                {/* Left — context */}
                <div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-sm text-black/55 hover:text-black transition-colors"
                  >
                    <ArrowLeft size={14} /> Change preset
                  </button>
                  <p className="tj-eyebrow mt-8 mb-3">Step 03</p>
                  <h2 className="tj-h2 text-[#0a0a0a]">Tell us where to send it.</h2>
                  <div className="tj-card p-5 md:p-6 mt-8">
                    <p className="text-xs font-mono-tj uppercase tracking-[0.18em] text-[var(--tj-reimagine)]">
                      Your remake
                    </p>
                    <p className="font-display text-xl md:text-2xl font-extrabold text-[#0a0a0a] mt-2 leading-snug">
                      {garmentLabel} → {transformMeta.display}
                    </p>
                    <p className="text-sm text-black/60 mt-2">{transformMeta.blurb}</p>
                  </div>
                </div>

                {/* Right — form */}
                <form onSubmit={onSubmit} className="space-y-5">
                  <FieldWrap label="Full name" required>
                    <input
                      name="user_name"
                      value={details.user_name}
                      onChange={e => setDetails(p => ({ ...p, user_name: e.target.value }))}
                      required
                      className={FIELD}
                    />
                  </FieldWrap>
                  <FieldWrap label="Email">
                    <input
                      name="user_email"
                      type="email"
                      value={details.user_email}
                      onChange={e => setDetails(p => ({ ...p, user_email: e.target.value }))}
                      className={FIELD}
                    />
                  </FieldWrap>
                  <FieldWrap label="Phone" required>
                    <input
                      name="user_phone"
                      type="tel"
                      value={details.user_phone}
                      onChange={e => setDetails(p => ({ ...p, user_phone: e.target.value }))}
                      required
                      className={FIELD}
                    />
                  </FieldWrap>
                  <FieldWrap label="Pickup / delivery address" required>
                    <textarea
                      name="address"
                      value={details.address}
                      onChange={e => setDetails(p => ({ ...p, address: e.target.value }))}
                      required
                      rows={2}
                      className={`${FIELD} resize-none`}
                    />
                  </FieldWrap>
                  <FieldWrap label="Upload a photo of the garment">
                    <DropZone
                      files={files}
                      onAdd={addFiles}
                      onRemove={removeFile}
                      variant="compact"
                    />
                  </FieldWrap>
                  <FieldWrap label="Notes (optional)">
                    <textarea
                      name="notes"
                      value={details.notes}
                      onChange={e => setDetails(p => ({ ...p, notes: e.target.value }))}
                      rows={4}
                      placeholder="Any specifics? Sentimental value? Don't touch the buttons?"
                      className={`${FIELD} resize-none`}
                    />
                  </FieldWrap>
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full tj-btn-reimagine justify-center disabled:opacity-60"
                    >
                      {loading ? 'Submitting…' : 'Submit remake request'}
                    </button>
                    <p className="text-xs text-black/45 mt-3 text-center">
                      We&apos;ll respond within 24 hours with a quote and timeline.
                    </p>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
