'use client';

import { motion } from 'framer-motion';

// You'll update these with real data
const trackData = [
  { track: 'Monza', car: 'Super Formula Lights', sessions: 24, status: 'Active' },
  { track: 'Silverstone', car: 'Super Formula Lights', sessions: 18, status: 'Active' },
  { track: 'Spa-Francorchamps', car: 'Super Formula Lights', sessions: 15, status: 'Active' },
  { track: 'Suzuka', car: 'Super Formula Lights', sessions: 12, status: 'Learning' },
];

const recentSessions = [
  { date: 'Recent', track: 'Monza', type: 'Practice', laps: 45, focus: 'Braking zones' },
  { date: 'Recent', track: 'Silverstone', type: 'Practice', laps: 32, focus: 'Consistency' },
  { date: 'Recent', track: 'Spa', type: 'Practice', laps: 38, focus: 'Sector 1' },
];

export default function RacingLogPage() {
  return (
    <div className="pt-24">
      {/* Header */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Racing Log
            </h1>
            <p className="text-lg text-[var(--foreground-muted)] leading-relaxed">
              Session tracking and progress data.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Track Overview */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Tracks</h2>
            <div className="space-y-3">
              {trackData.map((item) => (
                <div key={item.track} className="card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-white">{item.track}</h3>
                      <p className="text-sm text-[var(--foreground-muted)]">{item.car}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-[var(--foreground-muted)]">
                        {item.sessions} sessions
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        item.status === 'Active'
                          ? 'bg-[var(--purple-primary)]/20 text-[var(--purple-glow)]'
                          : 'bg-[var(--background)]/50 text-[var(--foreground-muted)]'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Recent Sessions */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Recent Sessions</h2>
            <div className="space-y-3">
              {recentSessions.map((session, index) => (
                <div key={index} className="card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-white">{session.track}</h3>
                        <span className="text-xs text-[var(--foreground-muted)]">{session.type}</span>
                      </div>
                      <p className="text-sm text-[var(--foreground-muted)]">
                        Focus: {session.focus}
                      </p>
                    </div>
                    <div className="text-sm text-[var(--foreground-muted)]">
                      {session.laps} laps
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Notes */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Training Notes</h2>
            <div className="card p-6">
              <div className="space-y-4 text-[var(--foreground-muted)] leading-relaxed">
                <p>
                  Current focus is on building consistency across multiple circuits rather than
                  optimizing lap times on any single track. The fundamentals transfer.
                </p>
                <p>
                  Each session has a specific focus area — braking points, corner entry, tire
                  management, etc. Deliberate practice over mindless laps.
                </p>
                <p>
                  This page will be expanded with more detailed data as the project develops.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
