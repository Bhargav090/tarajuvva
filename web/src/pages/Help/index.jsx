import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { WHATSAPP_DISPLAY, WHATSAPP_LINK } from '../../utils/constants';

const SECTIONS = [
  {
    id: 'shipping',
    title: 'Shipping Policy',
    body: (
      <>
        <p>
          Every Tarajuvva garment is thoughtfully handmade, and many of our pieces are made only after you
          place an order. This allows us to reduce unnecessary waste while ensuring every garment receives
          the attention it deserves.
        </p>
        <h4>Processing Time</h4>
        <p className="font-semibold text-black/80">Shop Orders</p>
        <ul>
          <li>Ready-to-Ship products: 2–4 business days</li>
          <li>Made-to-Order garments: 7–14 business days</li>
        </ul>
        <p className="font-semibold text-black/80">Reimagine Orders</p>
        <p>
          Timelines vary depending on the complexity of the transformation. An estimated completion timeline
          will be shared once we receive and assess your garment.
        </p>
        <p>
          If your order contains both ready-to-ship and made-to-order items, we may ship them together once
          everything is ready.
        </p>
        <h4>Delivery Time</h4>
        <p>Within India:</p>
        <ul>
          <li>Metro Cities: 2–5 business days</li>
          <li>Other Locations: 4–8 business days</li>
        </ul>
        <p>Delivery timelines may vary during festivals, weather disruptions or courier delays.</p>
        <h4>Shipping Charges</h4>
        <p className="font-semibold text-black/80">Shop Orders</p>
        <p>Shipping charges (or free shipping thresholds) will be calculated during checkout.</p>
        <p className="font-semibold text-black/80">Reimagine Orders</p>
        <p>Pickup and return shipping are charged as follows:</p>
        <ul>
          <li>Hyderabad: ₹149</li>
          <li>Rest of Telangana: ₹199</li>
          <li>Rest of India: ₹399</li>
        </ul>
        <h4>Order Tracking</h4>
        <p>Once your order has been dispatched, you’ll receive a tracking link via email or WhatsApp.</p>
      </>
    ),
  },
  {
    id: 'returns',
    title: 'Returns & Exchanges',
    body: (
      <>
        <p>
          Since every Tarajuvva garment is handmade—and many are produced specifically for you—we encourage
          thoughtful purchases. However, if something isn’t right, we’re here to help.
        </p>
        <h4>Returns</h4>
        <p>Returns are accepted only if:</p>
        <ul>
          <li>You received the wrong product.</li>
          <li>Your order arrived damaged.</li>
          <li>There is a manufacturing defect.</li>
        </ul>
        <p>Please contact us within 48 hours of delivery with clear photographs of the issue.</p>
        <h4>Exchanges</h4>
        <p>
          Eligible garments may be exchanged for a different size, subject to fabric availability. Exchange
          requests must be made within 7 days of delivery.
        </p>
        <p>Returned products must be:</p>
        <ul>
          <li>Unworn</li>
          <li>Unwashed</li>
          <li>In their original condition</li>
          <li>With all original tags attached</li>
        </ul>
        <p>Customers are responsible for return shipping unless the error was on our part.</p>
        <h4>Non-Returnable Items</h4>
        <ul>
          <li>Custom-made garments</li>
          <li>Reimagine orders</li>
          <li>Personalised products</li>
          <li>Sale items</li>
          <li>Gift cards</li>
        </ul>
      </>
    ),
  },
  {
    id: 'reimagine',
    title: 'Reimagine',
    body: (
      <>
        <p>
          Reimagine is Tarajuvva’s design-led upcycling service that transforms garments you already own into
          something you’ll love wearing again. Whether it’s a shirt, saree, kurti or pair of pants, we help
          extend the life of your clothing through thoughtful redesign.
        </p>
        <h4>Option 1 – Preset Transformations</h4>
        <ol>
          <li>Select your garment type (shirts, pants, kurtis, sarees).</li>
          <li>Choose a curated preset transformation.</li>
          <li>Tell us current size, desired size, height, and fit notes.</li>
          <li>Upload clear photographs of your garment.</li>
          <li>Schedule pickup (morning / afternoon / evening).</li>
          <li>Place your order and complete payment.</li>
          <li>We assess, transform by hand, and ship it back to you.</li>
        </ol>
        <p>Pickup &amp; return charges (preset flow): Hyderabad – ₹110 · Rest of India – ₹500.</p>
        <h4>Option 2 – Custom Reimagine</h4>
        <ol>
          <li>Book a 20-minute design consultation (₹299).</li>
          <li>Share your vision, garment, and style preferences.</li>
          <li>Receive a personalised quote (design, pricing, timeline).</li>
          <li>Approve the project — or stop after consultation if you prefer.</li>
          <li>We arrange pickup, transform, and deliver.</li>
        </ol>
      </>
    ),
  },
  {
    id: 'reimagine-policy',
    title: 'Reimagine Policy',
    body: (
      <>
        <ul>
          <li>Garments should be freshly washed before pickup.</li>
          <li>
            We reserve the right to decline garments that are heavily damaged, unhygienic, or structurally
            unsuitable.
          </li>
          <li>
            Minor design variations may occur due to fabric type, garment construction and condition.
          </li>
          <li>If we believe your selected preset isn’t suitable, we’ll contact you before beginning work.</li>
          <li>
            Reimagine projects are custom-made and cannot be returned or exchanged once production has begun.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'repair-policy',
    title: 'Repair Policy',
    body: (
      <>
        <p>
          We believe clothing should last. Every Tarajuvva garment is designed with longevity in mind, and
          we’re committed to helping you enjoy it for years to come.
        </p>
        <h4>Covered Repairs</h4>
        <ul>
          <li>Loose seams</li>
          <li>Minor stitching repairs</li>
          <li>Detached buttons or fasteners</li>
          <li>Construction-related issues</li>
        </ul>
        <h4>Not Covered</h4>
        <ul>
          <li>Burns</li>
          <li>Bleach</li>
          <li>Misuse</li>
          <li>Significant tearing</li>
          <li>Fabric deterioration due to age</li>
          <li>Alterations carried out by third parties</li>
        </ul>
        <p>Customers are responsible for shipping garments to us. Return shipping charges may apply.</p>
      </>
    ),
  },
  {
    id: 'care',
    title: 'Garment Care',
    body: (
      <>
        <p>
          Our garments are handcrafted using carefully selected fabrics, including handloom textiles. To help
          them last longer:
        </p>
        <ul>
          <li>Wash gently in cold water.</li>
          <li>Use a mild detergent.</li>
          <li>Do not bleach.</li>
          <li>Dry in shade.</li>
          <li>Iron on low to medium heat.</li>
          <li>Store in a cool, dry place.</li>
        </ul>
        <p>Please also follow the care instructions provided with your individual garment.</p>
      </>
    ),
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    items: [
      {
        q: 'Are your garments handmade?',
        a: 'Yes. Every Tarajuvva garment is handmade with care by skilled artisans.',
      },
      {
        q: 'Why does my order take longer than regular fashion brands?',
        a: 'Many of our garments are made after you place your order, allowing us to reduce waste while maintaining quality.',
      },
      {
        q: 'What sizes do you offer?',
        a: 'Many of our garments are thoughtfully designed to comfortably fit across two adjacent sizes. A detailed Size Guide will be available soon.',
      },
      {
        q: 'Can I customise a Shop garment?',
        a: 'Some garments may offer customisation options. If you have a specific request, please get in touch with us.',
      },
      {
        q: 'What is Reimagine?',
        a: 'Reimagine is our design-led upcycling service that transforms garments you already own into something entirely new.',
      },
      {
        q: 'Can I send any garment for Reimagine?',
        a: 'In most cases, yes. We’ll first assess whether your garment is suitable for transformation.',
      },
      {
        q: 'How long does Reimagine take?',
        a: 'The timeline depends on the complexity of your project. We’ll share an estimated completion date after assessing your garment.',
      },
      {
        q: 'Do you offer repairs?',
        a: 'Yes. Eligible Tarajuvva garments can be repaired under our Repair Policy.',
      },
      {
        q: 'Do you ship across India?',
        a: 'Yes, we currently deliver across India.',
      },
      {
        q: 'Can I cancel my order?',
        a: 'Orders may be cancelled within 24 hours if production has not yet begun. Once production has started, cancellations may no longer be possible.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept UPI, debit cards, credit cards, net banking and other secure payment methods available during checkout.',
      },
    ],
  },
  {
    id: 'terms',
    title: 'Terms & Conditions',
    intro: 'By using the Tarajuvva website or placing an order with us, you agree to the following terms.',
    items: [
      {
        q: 'Handmade Nature',
        a: 'Every Tarajuvva garment is handmade. Slight variations in colour, weave, texture and finishing are natural and should not be considered defects.',
      },
      {
        q: 'Product Images',
        a: 'We make every effort to accurately represent our products. However, colours may vary slightly due to differences in screen settings and photography.',
      },
      {
        q: 'Pricing',
        a: 'All prices are listed in Indian Rupees (INR) and are subject to change without prior notice.',
      },
      {
        q: 'Order Acceptance',
        a: 'We reserve the right to refuse or cancel orders in exceptional circumstances, including pricing errors or suspected fraudulent activity.',
      },
      {
        q: 'Intellectual Property',
        a: 'All designs, photographs, illustrations, logos, website content and written material belong to Tarajuvva and may not be reproduced without prior written permission.',
      },
      {
        q: 'Limitation of Liability',
        a: 'Tarajuvva shall not be liable for indirect or consequential damages arising from the use of our products or services.',
      },
      {
        q: 'Policy Updates',
        a: 'These policies may be updated from time to time. Continued use of our website constitutes acceptance of the latest version.',
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    body: (
      <>
        <p>Have a question? Need help choosing a size? Want to discuss a Reimagine project?</p>
        <p>We’re always happy to hear from you.</p>
        <ul>
          <li>
            Email:{' '}
            <a href="mailto:contact@tarajuvva.com" className="underline">
              contact@tarajuvva.com
            </a>
          </li>
          <li>
            WhatsApp:{' '}
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="underline">
              {WHATSAPP_DISPLAY}
            </a>
          </li>
          <li>Instagram: @tarajuvvaaa</li>
        </ul>
        <p>We’ll do our best to respond within 1–2 business days.</p>
      </>
    ),
  },
];

function NestedQA({ items, intro }) {
  const [openQ, setOpenQ] = useState(null);

  return (
    <div className="space-y-2">
      {intro && <p className="text-sm sm:text-base text-black/70 font-body mb-3">{intro}</p>}
      {items.map((item, idx) => {
        const open = openQ === idx;
        return (
          <div key={item.q} className="border border-black/15 bg-[var(--tj-bg-soft)]/40">
            <button
              type="button"
              onClick={() => setOpenQ((cur) => (cur === idx ? null : idx))}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={open}
            >
              <span className="font-display font-semibold text-[15px] text-[#0a0a0a]">{item.q}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-black/50 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && (
              <div className="px-4 pb-3 text-sm text-black/70 font-body leading-relaxed border-t border-black/10 pt-3">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AccordionItem({ section, open, onToggle }) {
  return (
    <div className="border border-black bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-display font-bold text-lg text-[#0a0a0a]">{section.title}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-black/10 pt-4">
          {section.items ? (
            <NestedQA items={section.items} intro={section.intro} />
          ) : (
            <div className="text-sm sm:text-base text-black/70 font-body leading-relaxed space-y-3 help-prose">
              {section.body}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="bg-white min-h-screen">
      <section className="border-b border-black" data-testid="help-page">
        <div className="tj-container py-16 md:py-24">
          <p className="tj-eyebrow">Help Centre</p>
          <h1 className="tj-h1 mt-3 max-w-4xl text-[#0a0a0a]">Welcome to Tarajuvva.</h1>
          <p className="mt-6 max-w-2xl text-lg text-black/70 font-body leading-relaxed">
            Whether you’re shopping with us for the first time, transforming a beloved garment through
            Reimagine, or looking after a piece you’ve owned for years, we’re here to make the experience as
            seamless as possible.
          </p>
          <p className="mt-4 max-w-2xl text-black/60 font-body">
            If you can’t find what you’re looking for, feel free to get in touch—we’re always happy to help.
          </p>
        </div>
      </section>

      <section className="tj-section">
        <div className="tj-container max-w-3xl space-y-3">
          <style>{`
            .help-prose h4 { font-family: inherit; font-weight: 700; color: #0a0a0a; margin-top: 0.75rem; }
            .help-prose ul, .help-prose ol { padding-left: 1.25rem; list-style: disc; }
            .help-prose ol { list-style: decimal; }
            .help-prose li { margin: 0.25rem 0; }
          `}</style>
          {SECTIONS.map((section) => (
            <AccordionItem
              key={section.id}
              section={section}
              open={openId === section.id}
              onToggle={() => setOpenId((id) => (id === section.id ? null : section.id))}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
