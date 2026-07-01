import LeadCapture from '../../components/ui/LeadCapture';
import BrandLogo from '../../components/ui/BrandLogo';

const BLOCKS = [
  {
    num: '03',
    action: 'Repair',
    accent: 'var(--tj-repair)',
    bg: 'var(--tj-repair)',
    text: '#ffffff',
    headline: 'The mend is the mood.',
    subline: "Coming soon: send in any garment, we'll mend it back to life. Visible repairs encouraged.",
    type: 'repair',
    testId: 'lead-repair-landing',
  },
  {
    num: '04',
    action: 'Donate',
    accent: 'var(--tj-donate)',
    bg: 'var(--tj-donate)',
    text: '#241621',
    headline: "When it's done with you.",
    subline: 'Coming soon: every donated piece finds a next person, a next project, or a next purpose.',
    type: 'donate',
    testId: 'lead-donate-landing',
  },
];

export default function WaitlistPreview() {
  return (
    <section className="tj-section bg-[var(--tj-bg-soft)] border-y border-black">
      <div className="tj-container grid md:grid-cols-2 gap-px bg-black border border-black">
        {BLOCKS.map(block => (
          <div key={block.action} className="p-10 md:p-14" style={{ background: block.bg, color: block.text }}>
            <p className="tj-eyebrow" style={{ color: block.text === '#ffffff' ? 'rgba(255,255,255,0.75)' : '#241621' }}>
              {block.num} · {block.action}
            </p>
            <h3 className="tj-h2 mt-3 text-3xl md:text-4xl" style={{ color: block.text }}>
              {block.headline}
            </h3>
            <p
              className="mt-3 max-w-md leading-relaxed"
              style={{ color: block.text === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(36,22,33,0.75)' }}
            >
              {block.subline}
            </p>
            <div className="mt-6">
              <LeadCapture type={block.type} testId={block.testId} />
            </div>
            <div
              className="mt-10 pt-6"
              style={{
                borderTop: `1px solid ${
                  block.text === '#ffffff' ? 'rgba(255,255,255,0.22)' : 'rgba(36,22,33,0.12)'
                }`,
              }}
            >
              <BrandLogo
                foreground={block.text}
                className="h-11 sm:h-12 md:h-14 w-auto max-w-[200px] object-contain object-left opacity-95"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
