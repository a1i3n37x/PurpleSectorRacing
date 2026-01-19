'use client';

import { motion } from 'framer-motion';

export default function JourneyPage() {
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
              The Journey
            </h1>
            <p className="text-lg text-[var(--foreground-muted)] leading-relaxed">
              Background on the project, approach, and where this is headed.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="space-y-12"
          >
            {/* Background */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Background</h2>
              <div className="space-y-4 text-[var(--foreground-muted)] leading-relaxed">
                <p>
                  Started sim racing recently with a focus on iRacing. Primary interest is in
                  open-wheel cars, currently running Super Formula Lights.
                </p>
                <p>
                  The goal is straightforward: develop real skills in competitive sim racing
                  and see where consistent effort leads. Treating it seriously, putting in
                  the time, and tracking the results.
                </p>
              </div>
            </div>

            {/* Approach */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Approach</h2>
              <div className="space-y-4 text-[var(--foreground-muted)] leading-relaxed">
                <p>
                  Structured practice with specific goals for each session. Focus on fundamentals
                  first — consistency, car control, track knowledge. Building a foundation before
                  worrying about shaving tenths.
                </p>
                <p>
                  Documenting progress along the way. Part accountability, part content opportunity.
                  The site and any eventual video content exist to support the broader goal.
                </p>
              </div>
            </div>

            {/* Current Status */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Current Status</h2>
              <div className="space-y-4 text-[var(--foreground-muted)] leading-relaxed">
                <p>
                  Early stages. Accumulating seat time, learning multiple circuits, and
                  working on the fundamentals of high-downforce open-wheel driving.
                </p>
                <p>
                  Working full-time alongside this, so progress is steady rather than rapid.
                  That&apos;s fine — sustainable effort matters more than sprints.
                </p>
              </div>
            </div>

            {/* Direction */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Direction</h2>
              <div className="space-y-4 text-[var(--foreground-muted)] leading-relaxed">
                <p>
                  Continue developing skills. Start competing in leagues once the pace
                  is there. Build content around the process. Explore partnership opportunities
                  with relevant brands.
                </p>
                <p>
                  The sim racing space has real paths forward — esports competitions, content
                  creation, team involvement. Not making promises about outcomes, but putting
                  in the work to create opportunities.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Facts */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Quick Facts</h2>
            <div className="card p-6">
              <dl className="grid sm:grid-cols-2 gap-6">
                <div>
                  <dt className="text-sm text-[var(--foreground-muted)] mb-1">Platform</dt>
                  <dd className="text-white">iRacing</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--foreground-muted)] mb-1">Primary Series</dt>
                  <dd className="text-white">Super Formula Lights</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--foreground-muted)] mb-1">Focus</dt>
                  <dd className="text-white">Open-wheel, high-downforce</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--foreground-muted)] mb-1">Status</dt>
                  <dd className="text-white">Actively training</dd>
                </div>
              </dl>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
