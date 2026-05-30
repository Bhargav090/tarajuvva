import { MANIFESTO_LINES } from '../../utils/constants';

const FOUNDER_IMAGE =
  'https://images.unsplash.com/photo-1727859452051-cc042ba1609a?crop=entropy&cs=srgb&fm=jpg&w=900&q=80';

export default function About() {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="border-b border-black" data-testid="about-page">
        <div className="tj-container py-16 md:py-24">
          <p className="tj-eyebrow">About</p>
          <h1 className="tj-h1 mt-3 max-w-4xl text-[#0a0a0a]">
            We started Tarajuvva because
            <br />
            <span className="italic font-light bg-[var(--tj-shop)] px-3">
              we were tired of pretending.
            </span>
          </h1>
        </div>
      </section>

      {/* Founders */}
      <section className="tj-section">
        <div className="tj-container grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <img
              src={FOUNDER_IMAGE}
              alt="Founders"
              className="w-full aspect-[4/5] object-cover border border-black"
            />
            <p className="tj-eyebrow mt-3">The founders · Bengaluru, India</p>
          </div>
          <div className="md:col-span-7 space-y-6 text-lg text-black/75 leading-relaxed">
            <p>
              We grew up in homes where a saree got 30 years of love and three afterlives. Then fashion told
              us this stuff was old-fashioned, and that we needed eight new outfits per Diwali.
            </p>
            <p>
              We tried that. It was exhausting and expensive and our wardrobes still felt empty. So we built
              Tarajuvva — a system, not a brand — that takes the way our grandmothers thought about
              clothes and gives it a sharp, modern, slightly cheeky edge.
            </p>
            <p className="font-display text-2xl md:text-3xl font-extrabold text-black tracking-tight">
              We don&apos;t do &quot;sustainable fashion.&quot; We do fashion that doesn&apos;t end.
            </p>
            <p>
              Every piece you buy from us is built with four exits in mind: wear it, remake it, repair it, donate it.
              The garment outlives the trend. The customer outgrows nothing.
            </p>
            <p>
              We&apos;re a tiny team. We make our own pieces. We answer our own DMs. We argue about button
              placements. We hope you stick around.
            </p>
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section className="tj-section bg-[var(--tj-bg-soft)] border-y border-black">
        <div className="tj-container">
          <p className="tj-eyebrow">Manifesto</p>
          <h2 className="tj-h2 mt-3 max-w-3xl text-[#0a0a0a]">
            Five lines we won&apos;t compromise on.
          </h2>
          <div className="grid md:grid-cols-2 gap-px bg-black border border-black mt-10">
            {MANIFESTO_LINES.map(line => (
              <div key={line.title} className="bg-white p-8">
                <p className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-[#0a0a0a]">
                  {line.title}
                </p>
                <p className="text-black/60 mt-2">{line.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
