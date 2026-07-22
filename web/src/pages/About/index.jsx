import { MANIFESTO_LINES } from '../../utils/constants';
import aboutStudioImage from '../../assets/about-studio.jpeg';

const FOUNDER_IMAGE =
  'https://images.unsplash.com/photo-1727859452051-cc042ba1609a?crop=entropy&cs=srgb&fm=jpg&w=900&q=80';

export default function About() {
  return (
    <div className="bg-white min-h-screen">
      <section className="border-b border-black" data-testid="about-page">
        <div className="tj-container py-16 md:py-24">
          <p className="tj-eyebrow">About Us</p>
          <h1 className="tj-h1 mt-3 max-w-4xl text-[#0a0a0a]">
            We started Tarajuvva because
            <br />
            <span className="italic font-light bg-[var(--tj-shop)] px-3">we were tired of pretending.</span>
          </h1>
        </div>
      </section>

      <section className="tj-section">
        <div className="tj-container grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <img
              src={aboutStudioImage}
              alt="Tarajuvva founder in the studio"
              className="w-full aspect-[3/4] object-cover border border-black"
            />
            {/* <img
              src={FOUNDER_IMAGE}
              alt="Founders"
              className="w-full aspect-[4/5] object-cover border border-black" */}
            {/* /> */}
            <p className="tj-eyebrow">Founder: Anjali, Based in Hyderabad, India</p>
          </div>
          <div className="md:col-span-7 space-y-6 text-lg text-black/75 leading-relaxed font-body">
            <p className="tj-eyebrow !normal-case tracking-normal text-black/45">Our Story</p>
            <p>Fashion told us clothes had an expiry date. We weren&apos;t buying it.</p>
            <p>
              We grew up in homes where a saree got 30 years of love and three afterlives. Then fashion
              convinced us we needed eight new outfits every festive season.
            </p>
            <p>
              So we built Tarajuvva — not just to make clothes, but to keep them in motion.
            </p>

            <p className="tj-eyebrow !normal-case tracking-normal text-black/45 pt-4">
              Why Us? — Our Design Philosophy
            </p>
            <p>
              We got tired of an industry obsessed with short-lived trends and wardrobes full of beige
              basics.
            </p>
            <p>
              So we design modular clothing in colours that refuse to blend in, with thoughtful, functional
              details that let each piece evolve over time. Reversible silhouettes, adjustable features,
              pockets where you least expect them — clothes that adapt with you.
            </p>
            <p>
              And when they no longer fit your life, they don&apos;t have to end there. Repair them,
              reimagine them, or pass them on.
            </p>

            <p className="font-display text-2xl md:text-3xl font-extrabold text-black tracking-tight">
              We don&apos;t do &quot;sustainable fashion.&quot; We do fashion that doesn&apos;t end.
            </p>
          </div>
        </div>
      </section>

      <section className="tj-section border-t border-black">
        <div className="tj-container max-w-3xl space-y-6 text-lg text-black/75 leading-relaxed font-body">
          <p className="tj-eyebrow">Our Mission</p>
          <h2 className="tj-h2 text-[#0a0a0a]">Longevity over landfill.</h2>
          <p>
            Based in Hyderabad, we&apos;re here to build a fashion system that values longevity over
            landfill. Not by asking you to buy less, but by giving every garment more ways to exist.
          </p>
          <p className="tj-eyebrow pt-4">Be a Part of the Loop</p>
          <p>
            Tarajuvva only works because people allow their clothes to tell new stories. Whether you&apos;re
            shopping, repairing, reimagining, donating, or simply following along, you&apos;re helping build
            a future where fashion doesn&apos;t end at checkout.
          </p>
          <p>
            We&apos;re a tiny but mighty team. We make our own pieces. We answer our own DMs. We argue about
            button placements. We&apos;re glad you&apos;re here.
          </p>
          <p className="text-sm text-black/50">
            Reach us at{' '}
            <a href="mailto:contact@tarajuvva.com" className="underline text-black">
              contact@tarajuvva.com
            </a>
            . Location: Hyderabad.
          </p>
        </div>
      </section>

      <section className="tj-section bg-[var(--tj-bg-soft)] border-y border-black">
        <div className="tj-container">
          <p className="tj-eyebrow">Manifesto</p>
          <h2 className="tj-h2 mt-3 max-w-3xl text-[#0a0a0a]">
            Six lines we won&apos;t compromise on.
          </h2>
          <div className="grid md:grid-cols-2 gap-px bg-black border border-black mt-10">
            {MANIFESTO_LINES.map((line) => (
              <div key={line.title} className="bg-white p-8">
                <p className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-[#0a0a0a]">
                  {line.title}
                </p>
                <p className="text-black/60 mt-2 font-body">{line.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
