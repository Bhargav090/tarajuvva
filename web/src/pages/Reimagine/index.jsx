import { useLayoutEffect, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle, PhoneCall } from 'lucide-react';
import VerticalPageHero from '../../components/ui/VerticalPageHero';
import SuccessNav from '../../components/ui/SuccessNav';
import ReimagineFormWizard from '../../components/reimagine/ReimagineFormWizard';
import CustomizeFormWizard from '../../components/reimagine/CustomizeFormWizard';
import {
  ReimagineRemakeCard,
  ReimagineCustomizeCard,
} from '../../components/reimagine/ReimagineSidePanel';
import {
  GARMENTS,
  TRANSFORMATIONS,
  REIMAGINE_STEP_HEADINGS,
  getTransformationMeta,
} from '../../utils/constants';
import { useReimagineSubmit } from '../../hooks/useReimagineSubmit';
import { useAuth } from '../../context/AuthContext';
import { useReimagineImages } from '../../hooks/useReimagineImages';
import { useReimagineCustomizeSettings } from '../../hooks/useReimagineCustomize';
import reimagineVideo from '../../assets/reimagine.mov';
import { Spinner } from '../../components/ui/Skeleton';

export default function Reimagine() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const {
    step,
    isCustomize,
    goBack,
    exitCustomize,
    startCustomize,
    garment,
    setGarment,
    transformation,
    setTransformation,
    details,
    setDetails,
    files,
    addFiles,
    removeFile,
    onSubmit,
    loading,
    done,
    doneCallback,
    resetDone,
  } = useReimagineSubmit();
  const { garmentImage, presetImage } = useReimagineImages();
  const { settings: customizeSettings } = useReimagineCustomizeSettings();
  const flowRef = useRef(null);

  useLayoutEffect(() => {
    if (done) window.scrollTo({ top: 0, left: 0 });
  }, [done]);

  useEffect(() => {
    if (step > 0 || isCustomize) {
      flowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [step, isCustomize]);

  const garmentLabel = GARMENTS.find((g) => g.id === garment)?.label ?? '';
  const transformMeta = getTransformationMeta(transformation);
  const needsAuth = isCustomize || step === 3;

  useEffect(() => {
    if (authLoading || done) return;
    if (needsAuth && !user) {
      navigate('/login', {
        replace: true,
        state: { from: location.pathname + location.search },
      });
    }
  }, [authLoading, user, needsAuth, done, navigate, location.pathname, location.search]);

  if (needsAuth && !done && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size={32} />
      </div>
    );
  }

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
            {doneCallback
              ? 'Thank you! Our team will contact you within 24 hours to schedule your consultation.'
              : "Thank you for reimagining with Tarajuvva. We'll review your request and get back within 24 hours."}
          </p>
          <SuccessNav
            actions={[
              { to: '/', label: 'Back to Home', variant: 'outline' },
              { label: 'Start another request', variant: 'primary', onClick: resetDone },
              ...(user
                ? [{ to: '/profile/reimagine', label: 'My requests', variant: 'outline-burgundy' }]
                : []),
              { to: '/shop', label: 'Shop', variant: 'outline' },
            ]}
          />
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
      {step === 0 && !isCustomize && (
        <VerticalPageHero
          bgVar="--tj-reimagine"
          eyebrow="02 · Reimagine"
          headline={['Send the old.', 'Get the new.']}
          subtext="Pick a base. Pick a transformation. We do the cutting, sewing, and slight emotional labour."
          testId="reimagine-hero"
          tall
          alignTop
          heroVideo={reimagineVideo}
          visualVariant="reimagine"
          visualAspect="3/4"
          visualPosition="right"
        />
      )}

      <section ref={flowRef} className="border-b border-black bg-white scroll-mt-[calc(var(--ticker-h,0px)+var(--nav-h,4rem))]">
        <div className="tj-container py-10 md:py-14 lg:py-16">
          <AnimatePresence mode="wait">
            {isCustomize ? (
              <motion.div
                key="customize"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="max-w-5xl w-full"
              >
                <button
                  type="button"
                  onClick={exitCustomize}
                  className="inline-flex items-center gap-1.5 text-sm text-black/55 hover:text-black transition-colors"
                >
                  <ArrowLeft size={14} /> Back to presets
                </button>
                <h2 className="tj-h2 text-[#0a0a0a] mt-5 text-2xl md:text-3xl">Your vision. Our craft.</h2>
                <div className="mt-5 grid sm:grid-cols-2 gap-8 md:gap-12 lg:gap-14 items-start">
                  <ReimagineCustomizeCard
                    price={customizeSettings.price}
                    feature={customizeSettings.feature}
                    description={customizeSettings.description}
                  />
                <CustomizeFormWizard
                  details={details}
                  setDetails={setDetails}
                  files={files}
                  addFiles={addFiles}
                  removeFile={removeFile}
                  onSubmit={onSubmit}
                  loading={loading}
                  submitLabel="Submit customize request"
                />
                </div>
              </motion.div>
            ) : (
              <>
                {step !== 3 && stepHeading && (
                  <h2 className="tj-h2 text-[#0a0a0a] mb-8 md:mb-10 max-w-3xl">
                    {stepHeading}
                  </h2>
                )}

                {step === 0 && (
                  <motion.div
                    key="s0"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                      {GARMENTS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          data-testid={`segment-${g.id}`}
                          onClick={() => setGarment(g.id)}
                          className="text-left tj-card group hover:-translate-y-1 transition-transform overflow-hidden shadow-[4px_4px_0_0_rgba(0,0,0,0.08)] hover:shadow-[6px_6px_0_0_rgba(122,6,60,0.5)]"
                        >
                          <div className="aspect-[4/5] overflow-hidden bg-[var(--tj-bg-soft)]">
                            <img
                              src={garmentImage(g.id, g.image)}
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

                      <button
                        type="button"
                        data-testid="segment-custom"
                        onClick={startCustomize}
                        className="text-left tj-card group hover:-translate-y-1 transition-transform overflow-hidden shadow-[4px_4px_0_0_rgba(222,120,164,0.35)] hover:shadow-[6px_6px_0_0_rgba(222,120,164,0.65)] col-span-2 md:col-span-1"
                      >
                        <div className="aspect-[4/5] overflow-hidden bg-gradient-to-br from-[#fdf0f5] via-[#fce8ef] to-[#f6dce6] flex flex-col items-center justify-center p-6 text-center relative">
                          <div className="w-14 h-14 rounded-full border-2 border-[#de78a4]/40 bg-white flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                            <PhoneCall size={26} className="text-[#de78a4]" strokeWidth={2} />
                          </div>
                          <p className="text-[0.65rem] font-mono-tj uppercase tracking-[0.2em] text-[#de78a4] font-bold">
                            Consultation
                          </p>
                          <p className="font-display text-2xl font-extrabold text-[#0a0a0a] mt-2">
                            ₹{Number(customizeSettings.price || 299).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="p-4 md:p-5 border-t border-black bg-[#fdf8fa]">
                          <p className="font-display text-xl md:text-2xl font-extrabold text-[#0a0a0a] leading-tight">
                            Custom
                          </p>
                          <p className="text-sm text-black/60 mt-1 leading-snug">
                            {customizeSettings.feature || '15 min consultation call'} — your vision, our craft.
                          </p>
                          <span className="mt-3 md:mt-4 inline-flex items-center gap-1 text-xs font-mono-tj uppercase tracking-[0.18em] text-[#de78a4] group-hover:text-[#c45d8a]">
                            Book a slot <ArrowRight size={12} />
                          </span>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="s1"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                  >
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-4xl">
                      {(TRANSFORMATIONS[garment] || []).map((t) => {
                        const meta = getTransformationMeta(t);
                        const selected = transformation === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTransformation(t)}
                            className={`text-left tj-card group overflow-hidden transition-transform hover:-translate-y-1 ${
                              selected ? 'ring-2 ring-black ring-offset-2' : ''
                            }`}
                          >
                            <div className="aspect-square overflow-hidden bg-[var(--tj-bg-soft)] relative">
                              <img
                                src={presetImage(garment, t, meta.image)}
                                alt={meta.display}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              {selected && (
                                <span className="absolute top-3 right-3 w-7 h-7 bg-black text-white flex items-center justify-center rounded-full">
                                  <CheckCircle size={16} />
                                </span>
                              )}
                            </div>
                            <div className="p-4 md:p-5 border-t border-black">
                              <p className="font-display text-lg md:text-xl font-extrabold text-[#0a0a0a] leading-tight">
                                {meta.display}
                              </p>
                              <p className="text-sm text-black/60 mt-1 leading-snug">{meta.blurb}</p>
                              <span className="mt-3 inline-flex items-center gap-1 text-xs font-mono-tj uppercase tracking-[0.18em] text-black/70 group-hover:text-black">
                                Pick this <ArrowRight size={12} />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={goBack}
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
                    className="max-w-5xl w-full"
                  >
                    <button
                      type="button"
                      onClick={goBack}
                      className="inline-flex items-center gap-1.5 text-sm text-black/55 hover:text-black transition-colors"
                    >
                      <ArrowLeft size={14} /> Change preset
                    </button>
                    <h2 className="tj-h2 text-[#0a0a0a] mt-5 text-2xl md:text-3xl">
                      Tell us where to send it.
                    </h2>
                    <div className="mt-5 grid sm:grid-cols-2 gap-8 md:gap-12 lg:gap-14 items-start">
                      <ReimagineRemakeCard
                        garmentLabel={garmentLabel}
                        transformLabel={transformMeta.display}
                        blurb={transformMeta.blurb}
                        fromImage={garmentImage(
                          garment,
                          GARMENTS.find((g) => g.id === garment)?.image
                        )}
                        toImage={presetImage(garment, transformation, transformMeta.image)}
                      />
                      <ReimagineFormWizard
                        details={details}
                        setDetails={setDetails}
                        files={files}
                        addFiles={addFiles}
                        removeFile={removeFile}
                        onSubmit={onSubmit}
                        loading={loading}
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
