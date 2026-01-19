'use client';

import { motion } from 'framer-motion';
import telemetryData from '@/data/summary.json';

// Format date for display
function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Calculate delta between times
function calculateDelta(current: number, previous: number) {
  const delta = current - previous;
  if (Math.abs(delta) < 0.001) return null;
  const sign = delta > 0 ? '+' : '-';
  return `${sign}${Math.abs(delta).toFixed(3)}s`;
}

export default function RacingLogPage() {
  const { dailyBests, totalSessions, totalLaps, bestOverallTimeFormatted, track, trackShort, car } = telemetryData;

  // Calculate personal best from Super Formula Lights only (exclude SF23 times)
  const sflBests = dailyBests.filter(d => d.car === 'Super Formula Lights 324');
  const sflBestTime = sflBests.length > 0 ? Math.min(...sflBests.map(d => d.bestTime)) : null;
  const sflBestFormatted = sflBestTime
    ? `${Math.floor(sflBestTime / 60)}:${(sflBestTime % 60).toFixed(3).padStart(6, '0')}`
    : 'N/A';

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
              Session tracking and lap time progression from iRacing telemetry.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--purple-glow)]">{totalSessions}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Sessions</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--purple-glow)]">{totalLaps}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Laps Recorded</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--accent-green)]">{sflBestFormatted}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Personal Best</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-white">{dailyBests.length}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Days Tracked</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Current Focus */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Current Focus</h2>
            <div className="card p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-white text-lg">{track}</h3>
                  <p className="text-sm text-[var(--foreground-muted)]">{car}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 rounded bg-[var(--purple-primary)]/20 text-[var(--purple-glow)] text-sm">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Daily Best Lap Times */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Daily Best Laps</h2>
            <div className="space-y-3">
              {dailyBests.map((day, index) => {
                const prevDay = index > 0 ? dailyBests[index - 1] : null;
                const delta = prevDay ? calculateDelta(day.bestTime, prevDay.bestTime) : null;
                const isImprovement = delta && delta.startsWith('-');
                const isPersonalBest = day.bestTime === sflBestTime;

                return (
                  <div key={day.date} className={`card p-4 ${isPersonalBest ? 'border-[var(--accent-green)]/50' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="min-w-[100px]">
                          <div className="text-sm text-[var(--foreground-muted)]">{formatDate(day.date)}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-lg font-semibold ${isPersonalBest ? 'text-[var(--accent-green)]' : 'text-white'}`}>
                              {day.bestTimeFormatted}
                            </span>
                            {isPersonalBest && (
                              <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                                PB
                              </span>
                            )}
                            {delta && (
                              <span className={`text-xs font-mono ${isImprovement ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                {delta}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-[var(--foreground-muted)]">
                        <span>{day.sessions} sessions</span>
                        <span>{day.totalLaps} laps</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Notes */}
      <section className="py-12">
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
                  Data is automatically extracted from iRacing .ibt telemetry files. Each session captures
                  lap times, track conditions, and car setup information.
                </p>
                <p>
                  Current focus at Monza: learning the track, building consistency, and understanding
                  the Super Formula Lights. The priority is completing clean laps rather than chasing
                  lap times.
                </p>
                <p>
                  As more data accumulates, this page will expand to show sector analysis, consistency
                  metrics, and progression trends.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
