import LeadCapture from '../../components/ui/LeadCapture';

const BLOCKS = [
  {
    num: '03',
    action: 'Repair',
    accent: 'var(--tj-repair)',
    headline: 'The mend is the mood.',
    subline: "Coming soon: send in any garment, we'll mend it back to life. Visible repairs encouraged.",
    type: 'repair',
    testId: 'lead-repair-landing',
  },
  {
    num: '04',
    action: 'Donate',
    accent: 'var(--tj-donate)',
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
          <div key={block.action} className="bg-white p-10 md:p-14">
            <p className="tj-eyebrow" style={{ color: block.accent }}>
              {block.num} · {block.action}
            </p>
            <h3 className="tj-h2 mt-3 text-3xl md:text-4xl text-[#0a0a0a]">
              {block.headline}
            </h3>
            <p className="text-black/65 mt-3 max-w-md leading-relaxed">
              {block.subline}
            </p>
            <div className="mt-6">
              <LeadCapture type={block.type} testId={block.testId} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
