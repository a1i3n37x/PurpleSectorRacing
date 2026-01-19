'use client';

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

const plannedContent = [
  'Hot lap breakdowns',
  'Setup discussions',
  'Race footage with commentary',
  'Progress updates',
];

export default function ContentPage() {
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
              Content
            </h1>
            <p className="text-lg text-[var(--foreground-muted)] leading-relaxed">
              Videos and updates as the project develops.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Status */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Current Status</h2>
              <p className="text-[var(--foreground-muted)] leading-relaxed">
                Content production is planned but not yet active. The priority right now
                is skill development — content will follow once there&apos;s something worth showing.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Placeholder */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Latest</h2>
            <div className="card relative aspect-video overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--purple-deep)]/50 to-[var(--background)] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[var(--purple-primary)]/20 border border-[var(--purple-primary)]/30 flex items-center justify-center mb-3 mx-auto">
                    <Play size={24} className="text-[var(--foreground-muted)] ml-1" />
                  </div>
                  <p className="text-sm text-[var(--foreground-muted)]">Coming soon</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Planned Content */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Planned</h2>
            <div className="card p-6">
              <ul className="space-y-3">
                {plannedContent.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[var(--foreground-muted)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-primary)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Subscribe */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-[var(--foreground-muted)] mb-6">
              YouTube and other channels will be linked here once content production begins.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
