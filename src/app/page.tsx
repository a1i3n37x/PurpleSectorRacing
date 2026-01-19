'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 gradient-radial opacity-60" />

        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
            className="absolute top-1/4 left-0 w-1/3 h-[2px] bg-gradient-to-r from-transparent via-[var(--purple-bright)] to-transparent opacity-50"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 1, repeatDelay: 3 }}
            className="absolute top-1/3 left-0 w-1/4 h-[1px] bg-gradient-to-r from-transparent via-[var(--accent-magenta)] to-transparent opacity-40"
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', delay: 0.5, repeatDelay: 2.5 }}
            className="absolute top-2/3 left-0 w-1/3 h-[2px] bg-gradient-to-r from-transparent via-[var(--purple-glow)] to-transparent opacity-30"
          />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(var(--purple-primary) 1px, transparent 1px),
                             linear-gradient(90deg, var(--purple-primary) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 text-white">
              Sim Racing.<br />
              <span className="text-gradient">Documented.</span>
            </h1>

            <p className="text-lg sm:text-xl text-[var(--foreground-muted)] mb-12 max-w-xl mx-auto">
              Following the pursuit of speed in iRacing. The work, the progress, and where it leads.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/journey" className="btn-primary inline-flex items-center gap-2">
                About the Project
                <ChevronRight size={20} />
              </Link>
              <Link href="/partners" className="btn-secondary inline-flex items-center gap-2">
                Work With Me
              </Link>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-[var(--purple-primary)]/50 flex justify-center pt-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--purple-bright)]" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What This Is */}
      <section className="relative py-24 bg-[var(--background-secondary)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">What This Is</h2>
            <p className="text-[var(--foreground-muted)] leading-relaxed mb-6">
              A place to document the process. Sim racing takes time, consistency, and a lot of seat hours.
              This is a record of that work — the sessions, the tracks, and whatever comes from it.
            </p>
            <p className="text-[var(--foreground-muted)] leading-relaxed">
              Currently focused on open-wheel cars in iRacing, building fundamentals and finding pace.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Current Focus */}
      <section className="relative py-24">
        <div className="absolute inset-0 gradient-purple opacity-20" />

        <div className="relative max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Current Focus</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Super Formula Lights',
                description: 'Primary series. High-downforce open-wheel racing that demands precision.',
              },
              {
                title: 'Consistency',
                description: 'Putting in laps. Building muscle memory and understanding the fundamentals.',
              },
              {
                title: 'Documentation',
                description: 'Tracking progress. Recording sessions and building a presence around the work.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card p-6"
              >
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--foreground-muted)]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Preview */}
      <section className="relative py-24 bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Content</h2>
            <p className="text-[var(--foreground-muted)]">
              Videos, session breakdowns, and progress updates as they happen.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <div className="card relative aspect-video overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--purple-deep)] to-[var(--background)] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-[var(--purple-primary)]/30 border border-[var(--purple-primary)]/50 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 group-hover:bg-[var(--purple-primary)]/50 transition-all">
                    <Play size={28} className="text-white ml-1" />
                  </div>
                  <p className="text-sm text-[var(--foreground-muted)]">Coming Soon</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link
              href="/content"
              className="inline-flex items-center gap-2 text-[var(--purple-bright)] hover:text-[var(--purple-glow)] font-medium transition-colors"
            >
              View Content
              <ChevronRight size={18} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Partnership CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 gradient-radial opacity-30" />
        <div className="absolute top-0 left-0 right-0 h-[2px] animated-border" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Open to Partnerships
            </h2>
            <p className="text-[var(--foreground-muted)] mb-8 max-w-xl mx-auto">
              Looking to work with brands in the sim racing space. If there&apos;s a fit, let&apos;s talk.
            </p>

            <Link href="/partners" className="btn-primary inline-flex items-center gap-2">
              Partnership Info
              <ChevronRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
