'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Mail, ChevronRight } from 'lucide-react';

const partnershipAreas = [
  {
    title: 'Hardware',
    items: ['Wheels & bases', 'Pedals', 'Rigs & cockpits', 'Displays', 'Accessories'],
  },
  {
    title: 'Software',
    items: ['Simulators', 'Telemetry tools', 'Streaming software'],
  },
  {
    title: 'Apparel',
    items: ['Racing gloves', 'Team wear', 'Lifestyle products'],
  },
];

export default function PartnersPage() {
  return (
    <div className="pt-24">
      {/* Header */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Partnerships
            </h1>
            <p className="text-lg text-[var(--foreground-muted)] leading-relaxed">
              Open to working with brands in the sim racing space.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What I Offer */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">What I Offer</h2>
            <div className="card p-6">
              <ul className="space-y-4 text-[var(--foreground-muted)]">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-primary)] mt-2" />
                  <span>Product integration in content — videos, streams, and social posts</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-primary)] mt-2" />
                  <span>Presence on this site and associated platforms</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-primary)] mt-2" />
                  <span>Authentic representation — using products in actual training and competition</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-primary)] mt-2" />
                  <span>Long-term relationship, not one-off mentions</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Areas of Interest */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Areas of Interest</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {partnershipAreas.map((area) => (
                <div key={area.title} className="card p-5">
                  <h3 className="font-medium text-white mb-3">{area.title}</h3>
                  <ul className="space-y-2">
                    {area.items.map((item) => (
                      <li key={item} className="text-sm text-[var(--foreground-muted)]">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Current Stage */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Current Stage</h2>
            <div className="card p-6">
              <div className="space-y-4 text-[var(--foreground-muted)] leading-relaxed">
                <p>
                  Early in the project. Actively training, building skills, and developing
                  a presence in the sim racing space.
                </p>
                <p>
                  Looking for partnerships that make sense at this stage — brands interested
                  in supporting developing talent and being part of the journey from the beginning.
                </p>
                <p>
                  Not expecting major deals right now. Interested in product partnerships,
                  affiliate arrangements, or other creative collaborations.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Get in Touch</h2>
            <div className="card p-6">
              <p className="text-[var(--foreground-muted)] mb-6">
                If there&apos;s a potential fit, I&apos;d be happy to discuss.
              </p>
              <a
                href="mailto:partnerships@purplesectorsracing.com"
                className="btn-primary inline-flex items-center gap-2"
              >
                <Mail size={18} />
                partnerships@purplesectorsracing.com
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Links */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="flex flex-wrap gap-4 justify-center"
          >
            <Link href="/journey" className="text-sm text-[var(--purple-bright)] hover:text-[var(--purple-glow)] inline-flex items-center gap-1">
              About the project <ChevronRight size={16} />
            </Link>
            <Link href="/racing-log" className="text-sm text-[var(--purple-bright)] hover:text-[var(--purple-glow)] inline-flex items-center gap-1">
              Racing progress <ChevronRight size={16} />
            </Link>
            <Link href="/content" className="text-sm text-[var(--purple-bright)] hover:text-[var(--purple-glow)] inline-flex items-center gap-1">
              Content plans <ChevronRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
