import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import StepIndicator from '../../components/ui/StepIndicator';
import DropZone from '../../components/ui/DropZone';
import Button from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/FormField';
import { GARMENTS, TRANSFORMATIONS, REIMAGINE_STEPS } from '../../utils/constants';
import { useReimagineSubmit } from '../../hooks/useReimagineSubmit';

export default function Reimagine() {
  const {
    step, setStep,
    garment, setGarment,
    transformation, setTransformation,
    details, setDetails,
    files, addFiles, removeFile,
    onSubmit, loading, done,
  } = useReimagineSubmit();

  if (done) return (
    <div className="min-h-screen bg-[#eef4d1] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
        <div className="w-20 h-20 bg-[#6c0b20]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-[#6c0b20]" />
        </div>
        <h2 className="text-3xl font-black text-[#341631] font-display mb-3">Request Sent!</h2>
        <p className="text-[#341631]/60 font-body text-sm leading-relaxed">
          Thank you for reimagining with Tarajuvva. We'll review your request and get back within 24 hours.
        </p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef4d1] pt-0 sm:pt-2">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {/* Page header */}
        <div className="text-center mb-4 sm:mb-5">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold uppercase tracking-widest font-display mb-3 bg-[#6c0b20]/10 text-[#6c0b20] border border-[#6c0b20]/20">
            Reimagine
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-[#341631] font-display leading-tight">
            Bored of<br />
            <span className="text-[#6c0b20]">your clothes?</span>
          </h1>
          <p className="mt-3 text-[#341631]/55 font-body">Transform them into something you'll love again.</p>
        </div>

        <StepIndicator steps={REIMAGINE_STEPS} current={step} />

        <div className="mt-4 sm:mt-5 bg-white rounded-3xl p-5 sm:p-6 border border-[#341631]/8">
          <AnimatePresence mode="wait">
            {/* Step 0 — Garment */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-black text-[#341631] font-display mb-6">Select your garment</h2>
                <div className="grid grid-cols-2 gap-3">
                  {GARMENTS.map(g => (
                    <button
                      key={g.id} onClick={() => { setGarment(g.id); setStep(1); }}
                      className={`flex flex-col items-start gap-2 p-5 rounded-2xl border-2 text-left transition-all hover:-translate-y-0.5 ${
                        garment === g.id ? 'border-[#6c0b20] bg-[#6c0b20]/5' : 'border-[#341631]/10 hover:border-[#6c0b20]/40'
                      }`}
                    >
                      <span className="text-3xl">{g.emoji}</span>
                      <div>
                        <p className="font-bold text-[#341631] font-display">{g.label}</p>
                        <p className="text-xs text-[#341631]/45 font-body">{g.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1 — Transformation */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-black text-[#341631] font-display mb-6">
                  How to transform your {GARMENTS.find(g => g.id === garment)?.label}?
                </h2>
                <div className="space-y-2">
                  {(TRANSFORMATIONS[garment] || []).map(t => (
                    <button
                      key={t} onClick={() => { setTransformation(t); setStep(2); }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                        transformation === t ? 'border-[#6c0b20] bg-[#6c0b20]/5' : 'border-[#341631]/10 hover:border-[#6c0b20]/40'
                      }`}
                    >
                      <span className="font-semibold text-[#341631] font-display">{t}</span>
                      <ArrowRight size={16} className="text-[#341631]/30" />
                    </button>
                  ))}
                </div>
                <Button variant="ghost" icon={ArrowLeft} className="mt-5" onClick={() => setStep(0)}>Back</Button>
              </motion.div>
            )}

            {/* Step 2 — Summary */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-black text-[#341631] font-display mb-6">Your transformation</h2>
                <div className="bg-[#6c0b20]/5 rounded-2xl p-6 border border-[#6c0b20]/15 mb-8">
                  <p className="text-[#341631]/55 text-sm font-body mb-2">You are converting:</p>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-[#341631] font-display">
                      {GARMENTS.find(g => g.id === garment)?.label}
                    </span>
                    <ArrowRight size={20} className="text-[#6c0b20]" />
                    <span className="text-2xl font-black text-[#6c0b20] font-display">{transformation}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)}>Back</Button>
                  <Button variant="burgundy" fullWidth icon={ArrowRight} iconPosition="right" onClick={() => setStep(3)}>
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Upload */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-black text-[#341631] font-display mb-2">Upload photos</h2>
                <p className="text-[#341631]/50 font-body text-sm mb-6">Show us the garment from multiple angles.</p>
                <DropZone files={files} onAdd={addFiles} onRemove={removeFile} />
                <Textarea
                  label="Notes (optional)"
                  name="notes"
                  value={details.notes}
                  onChange={e => setDetails(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  placeholder="Any specific requirements, fabric details, etc."
                  className="mt-5"
                />
                <div className="flex gap-3 mt-5">
                  <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(2)}>Back</Button>
                  <Button variant="burgundy" fullWidth icon={ArrowRight} iconPosition="right" onClick={() => setStep(4)}>
                    Continue
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4 — Details */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-black text-[#341631] font-display mb-6">Your details</h2>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Full Name" name="user_name" value={details.user_name} onChange={e => setDetails(p => ({ ...p, user_name: e.target.value }))} required />
                    <Input label="Phone" name="user_phone" type="tel" value={details.user_phone} onChange={e => setDetails(p => ({ ...p, user_phone: e.target.value }))} required />
                  </div>
                  <Input label="Email" name="user_email" type="email" value={details.user_email} onChange={e => setDetails(p => ({ ...p, user_email: e.target.value }))} />
                  <Textarea label="Pickup / Delivery Address" name="address" value={details.address} onChange={e => setDetails(p => ({ ...p, address: e.target.value }))} required rows={3} />
                  <div className="flex gap-3 pt-2">
                    <Button variant="ghost" icon={ArrowLeft} onClick={() => setStep(3)}>Back</Button>
                    <Button type="submit" variant="burgundy" fullWidth loading={loading}>
                      Submit Request
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
