'use client';

import { motion } from 'framer-motion';
import telemetryData from '@/data/summary.json';

// Type definitions
interface DailyBest {
  date: string;
  car: string;
  sessions: number;
  totalLaps: number;
  bestTime: number;
  bestTimeFormatted: string;
  medianTime: number | null;
  medianTimeFormatted: string | null;
  slowestTime: number | null;
  slowestTimeFormatted: string | null;
  range: number | null;
  rangeFormatted: string | null;
  consistencyScore: number | null;
  track: string;
  sessionTimeSeconds: number;
  sessionTimeFormatted: string;
}

interface CarStat {
  car: string;
  totalSessions: number;
  totalLaps: number;
  bestTime: number;
  bestTimeFormatted: string;
  medianTime: number | null;
  medianTimeFormatted: string | null;
  consistencyScore: number | null;
  sessionTimeSeconds: number;
  sessionTimeFormatted: string;
}

interface PurpleLap {
  file: string;
  date: string;
  track: string;
  car: string;
  lap: number;
  sectorTimes: number[];
  lapTime: number;
  lapTimeFormatted: string;
  missedSector?: number;
  purpleSectors?: number[];
}

interface BestSectors {
  track: string;
  car: string;
  sectors: number[];
  sectorsFormatted: string[];
  theoreticalBest: number;
  theoreticalBestFormatted: string;
}

interface PurpleSectorData {
  allPurpleLaps: PurpleLap[];
  almostPurpleLaps: PurpleLap[];
  bestSectorsByCar: Record<string, BestSectors>;
  totalAllPurple: number;
  totalAlmostPurple: number;
}

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

// Calculate delta for consistency score (higher is better, so reverse the sign logic)
function calculateConsistencyDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 1) return null;
  const sign = delta > 0 ? '+' : ''; // Positive is good for consistency
  return `${sign}${delta}%`;
}

// Get color for consistency score
function getConsistencyColor(score: number | null): string {
  if (score === null) return 'text-[var(--foreground-muted)]';
  if (score >= 90) return 'text-[var(--accent-green)]';
  if (score >= 75) return 'text-[var(--purple-glow)]';
  if (score >= 50) return 'text-yellow-400';
  return 'text-[var(--accent-red)]';
}

// Group daily bests by car, then by track
function groupByCarAndTrack(dailyBests: DailyBest[]): Record<string, Record<string, DailyBest[]>> {
  const grouped: Record<string, Record<string, DailyBest[]>> = {};
  dailyBests.forEach(day => {
    if (!grouped[day.car]) {
      grouped[day.car] = {};
    }
    if (!grouped[day.car][day.track]) {
      grouped[day.car][day.track] = [];
    }
    grouped[day.car][day.track].push(day);
  });
  // Sort each track's entries by date
  Object.values(grouped).forEach(tracks => {
    Object.values(tracks).forEach(entries => {
      entries.sort((a, b) => a.date.localeCompare(b.date));
    });
  });
  return grouped;
}

export default function RacingLogPage() {
  const { dailyBests, totalSessions, totalLaps, carStats, totalTrackTimeFormatted, purpleSectors } = telemetryData as {
    dailyBests: DailyBest[];
    totalSessions: number;
    totalLaps: number;
    carStats: CarStat[];
    totalTrackTimeFormatted: string;
    purpleSectors?: PurpleSectorData;
  };

  // Group daily bests by car, then by track
  const groupedByCarAndTrack = groupByCarAndTrack(dailyBests);

  // Get unique days and tracks tracked
  const uniqueDays = new Set(dailyBests.map(d => d.date)).size;
  const uniqueTracks = new Set(dailyBests.map(d => d.track)).size;

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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--purple-glow)]">{totalTrackTimeFormatted}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Track Time</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--purple-glow)]">{totalSessions}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Sessions</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-[var(--purple-glow)]">{totalLaps}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Laps</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-white">{uniqueTracks}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Tracks</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold text-white">{uniqueDays}</div>
                <div className="text-sm text-[var(--foreground-muted)]">Days</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Car Cards with Daily Best Lap Times by Track */}
      <section className="py-12 bg-[var(--background-secondary)]">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-xl font-semibold text-white mb-6">Lap Times by Car</h2>
            <div className="space-y-8">
              {carStats?.map((carStat) => {
                const carTracks = groupedByCarAndTrack[carStat.car] || {};

                return (
                  <div key={carStat.car} className="card p-6">
                    {/* Car Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-primary)]">
                      <div>
                        <h3 className="font-semibold text-white text-lg">{carStat.car}</h3>
                        <p className="text-sm text-[var(--foreground-muted)]">
                          {carStat.sessionTimeFormatted} on track · {carStat.totalSessions} sessions · {carStat.totalLaps} laps
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-[var(--foreground-muted)]">Best</div>
                          <div className="font-mono text-base font-bold text-[var(--accent-green)]">
                            {carStat.bestTimeFormatted || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[var(--foreground-muted)]">Median</div>
                          <div className="font-mono text-base font-semibold text-white">
                            {carStat.medianTimeFormatted || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[var(--foreground-muted)]">Consistency</div>
                          <div className={`font-mono text-base font-bold ${getConsistencyColor(carStat.consistencyScore)}`}>
                            {carStat.consistencyScore !== null ? `${carStat.consistencyScore}%` : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tracks within this car */}
                    <div className="space-y-6">
                      {Object.entries(carTracks).map(([trackName, trackDays]) => (
                        <div key={trackName}>
                          {/* Track Header */}
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="text-sm font-medium text-[var(--purple-glow)]">{trackName}</h4>
                            <span className="text-xs text-[var(--foreground-muted)]">
                              ({trackDays.length} day{trackDays.length !== 1 ? 's' : ''})
                            </span>
                          </div>

                          {/* Daily Bests for this track */}
                          <div className="space-y-3">
                            {trackDays.map((day, index) => {
                              const prevDay = index > 0 ? trackDays[index - 1] : null;
                              const bestDelta = prevDay && day.bestTime && prevDay.bestTime ? calculateDelta(day.bestTime, prevDay.bestTime) : null;
                              const medianDelta = prevDay && day.medianTime && prevDay.medianTime
                                ? calculateDelta(day.medianTime, prevDay.medianTime)
                                : null;
                              const consistencyDelta = calculateConsistencyDelta(day.consistencyScore, prevDay?.consistencyScore ?? null);
                              const isBestImprovement = bestDelta && bestDelta.startsWith('-');
                              const isMedianImprovement = medianDelta && medianDelta.startsWith('-');
                              const isConsistencyImprovement = consistencyDelta && consistencyDelta.startsWith('+');
                              const isPersonalBest = day.bestTime === carStat.bestTime;

                              return (
                                <div
                                  key={day.date}
                                  className={`p-4 rounded-lg ${isPersonalBest ? 'bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30' : 'bg-[var(--background-primary)]'}`}
                                >
                                  {/* Date and lap count header */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="text-sm font-medium text-white">{formatDate(day.date)}</div>
                                    <div className="text-xs text-[var(--foreground-muted)]">
                                      {day.sessionTimeFormatted} · {day.sessions} sessions · {day.totalLaps} laps
                                    </div>
                                  </div>

                                  {/* Stats grid */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {/* Best Time */}
                                    <div>
                                      <div className="text-xs text-[var(--foreground-muted)] mb-1">Best</div>
                                      <div className="flex items-center gap-1.5">
                                        <span className={`font-mono text-sm font-semibold ${isPersonalBest ? 'text-[var(--accent-green)]' : 'text-white'}`}>
                                          {day.bestTimeFormatted || 'N/A'}
                                        </span>
                                        {isPersonalBest && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-green)]/20 text-[var(--accent-green)]">
                                            PB
                                          </span>
                                        )}
                                      </div>
                                      {bestDelta && (
                                        <div className={`text-xs font-mono mt-0.5 ${isBestImprovement ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                          {bestDelta}
                                        </div>
                                      )}
                                    </div>

                                    {/* Median Time */}
                                    <div>
                                      <div className="text-xs text-[var(--foreground-muted)] mb-1">Median</div>
                                      <div className="font-mono text-sm text-white">
                                        {day.medianTimeFormatted || 'N/A'}
                                      </div>
                                      {medianDelta && (
                                        <div className={`text-xs font-mono mt-0.5 ${isMedianImprovement ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                          {medianDelta}
                                        </div>
                                      )}
                                    </div>

                                    {/* Range */}
                                    <div>
                                      <div className="text-xs text-[var(--foreground-muted)] mb-1">Range</div>
                                      <div className="font-mono text-sm text-white">
                                        {day.rangeFormatted || 'N/A'}
                                      </div>
                                    </div>

                                    {/* Consistency */}
                                    <div>
                                      <div className="text-xs text-[var(--foreground-muted)] mb-1">Consistency</div>
                                      <div className={`font-mono text-sm font-semibold ${getConsistencyColor(day.consistencyScore)}`}>
                                        {day.consistencyScore !== null ? `${day.consistencyScore}%` : 'N/A'}
                                      </div>
                                      {consistencyDelta && (
                                        <div className={`text-xs font-mono mt-0.5 ${isConsistencyImprovement ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                          {consistencyDelta}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
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
                  Purple sectors indicate personal best times for each track section. An "ALL PURPLE" lap
                  means every sector was a personal best at that moment - a perfect lap of improvements.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
