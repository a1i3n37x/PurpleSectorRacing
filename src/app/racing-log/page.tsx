'use client';

import { useMemo, useState } from 'react';
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

interface TrackStat {
  car: string;
  track: string;
  totalSessions: number;
  totalLaps: number;
  bestTime: number | null;
  bestTimeFormatted: string | null;
  medianTime: number | null;
  medianTimeFormatted: string | null;
  slowestTime: number | null;
  slowestTimeFormatted: string | null;
  range: number | null;
  rangeFormatted: string | null;
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

function formatDateWithYear(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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
  // Sort each track's entries by date (most recent first)
  Object.values(grouped).forEach(tracks => {
    Object.values(tracks).forEach(entries => {
      entries.sort((a, b) => b.date.localeCompare(a.date));
    });
  });
  return grouped;
}

function makeTrackKey(car: string, track: string) {
  return `${car}::${track}`;
}

function getMostRecentEntry(dailyBests: DailyBest[]) {
  if (!dailyBests.length) return null;
  return dailyBests.reduce((latest, entry) => {
    if (!latest) return entry;
    if (entry.date > latest.date) return entry;
    if (entry.date < latest.date) return latest;
    if (entry.sessionTimeSeconds !== latest.sessionTimeSeconds) {
      return entry.sessionTimeSeconds > latest.sessionTimeSeconds ? entry : latest;
    }
    const carCompare = entry.car.localeCompare(latest.car);
    if (carCompare > 0) return entry;
    if (carCompare < 0) return latest;
    return entry.track.localeCompare(latest.track) > 0 ? entry : latest;
  }, null as DailyBest | null);
}

export default function RacingLogPage() {
  const { dailyBests, totalSessions, totalLaps, carStats, trackStats, totalTrackTimeFormatted, purpleSectors } = telemetryData as {
    dailyBests: DailyBest[];
    totalSessions: number;
    totalLaps: number;
    carStats: CarStat[];
    trackStats: TrackStat[];
    totalTrackTimeFormatted: string;
    purpleSectors?: PurpleSectorData;
  };

  // Group daily bests by car, then by track
  const groupedByCarAndTrack = groupByCarAndTrack(dailyBests);
  const trackStatsByCarAndTrack = trackStats?.reduce<Record<string, Record<string, TrackStat>>>((acc, stat) => {
    if (!acc[stat.car]) {
      acc[stat.car] = {};
    }
    acc[stat.car][stat.track] = stat;
    return acc;
  }, {});

  const [expandedCars, setExpandedCars] = useState<Set<string>>(() => {
    const mostRecent = getMostRecentEntry(dailyBests);
    return mostRecent ? new Set([mostRecent.car]) : new Set();
  });
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(() => {
    const mostRecent = getMostRecentEntry(dailyBests);
    return mostRecent ? new Set([makeTrackKey(mostRecent.car, mostRecent.track)]) : new Set();
  });
  const toggleCar = (car: string) => {
    setExpandedCars(prev => {
      const next = new Set(prev);
      if (next.has(car)) {
        next.delete(car);
      } else {
        next.add(car);
      }
      return next;
    });
  };
  const toggleTrack = (trackKey: string) => {
    setExpandedTracks(prev => {
      const next = new Set(prev);
      if (next.has(trackKey)) {
        next.delete(trackKey);
      } else {
        next.add(trackKey);
      }
      return next;
    });
  };

  const sortedDailyBests = useMemo(() => {
    return [...dailyBests].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      const carCompare = a.car.localeCompare(b.car);
      if (carCompare !== 0) return carCompare;
      return a.track.localeCompare(b.track);
    });
  }, [dailyBests]);

  const recentActivity = useMemo(() => sortedDailyBests.slice(0, 8), [sortedDailyBests]);

  const dateRange = useMemo(() => {
    if (!dailyBests.length) return null;
    let start = dailyBests[0].date;
    let end = dailyBests[0].date;
    dailyBests.forEach(entry => {
      if (entry.date < start) start = entry.date;
      if (entry.date > end) end = entry.date;
    });
    return { start, end };
  }, [dailyBests]);

  const allCarKeys = useMemo(() => carStats?.map(stat => stat.car) ?? [], [carStats]);
  const allTrackKeys = useMemo(() => {
    return Object.entries(groupedByCarAndTrack).flatMap(([car, tracks]) => {
      return Object.keys(tracks).map(track => makeTrackKey(car, track));
    });
  }, [groupedByCarAndTrack]);
  const handleExpandAll = () => {
    setExpandedCars(new Set(allCarKeys));
    setExpandedTracks(new Set(allTrackKeys));
  };
  const handleCollapseAll = () => {
    setExpandedCars(new Set());
    setExpandedTracks(new Set());
  };

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
            {dateRange && (
              <p className="text-sm text-[var(--foreground-muted)] mt-3">
                Date range: {formatDateWithYear(dateRange.start)} → {formatDateWithYear(dateRange.end)}
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
                <span className="text-xs text-[var(--foreground-muted)]">
                  Last {recentActivity.length} entries
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {recentActivity.map(entry => (
                  <div
                    key={`${entry.date}-${entry.car}-${entry.track}`}
                    className="card p-4 min-w-[240px] shrink-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white">{formatDate(entry.date)}</div>
                      <div className="text-xs text-[var(--foreground-muted)]">
                        {entry.sessions} session{entry.sessions !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-[var(--foreground-muted)]">
                      {entry.car} · {entry.track}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-[var(--foreground-muted)]">Best</div>
                        <div className="font-mono text-white">{entry.bestTimeFormatted || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--foreground-muted)]">Median</div>
                        <div className="font-mono text-white">{entry.medianTimeFormatted || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--foreground-muted)]">Track Time</div>
                        <div className="font-mono text-white">{entry.sessionTimeFormatted || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--foreground-muted)]">Laps</div>
                        <div className="font-mono text-white">{entry.totalLaps}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-xl font-semibold text-white">Lap Times by Car</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExpandAll}
                  className="text-xs px-3 py-1 rounded border border-[var(--border-primary)] text-[var(--foreground-muted)] hover:text-white hover:border-[var(--purple-glow)] transition-colors"
                >
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={handleCollapseAll}
                  className="text-xs px-3 py-1 rounded border border-[var(--border-primary)] text-[var(--foreground-muted)] hover:text-white hover:border-[var(--purple-glow)] transition-colors"
                >
                  Collapse all
                </button>
              </div>
            </div>
            <div className="space-y-8">
              {carStats?.map((carStat) => {
                const carTracks = groupedByCarAndTrack[carStat.car] || {};
                const isCarExpanded = expandedCars.has(carStat.car);
                const trackCount = Object.keys(carTracks).length;

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
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--foreground-muted)]">
                          {trackCount} track{trackCount !== 1 ? 's' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleCar(carStat.car)}
                          aria-expanded={isCarExpanded}
                          className="text-xs px-3 py-1 rounded border border-[var(--border-primary)] text-[var(--foreground-muted)] hover:text-white hover:border-[var(--purple-glow)] transition-colors"
                        >
                          {isCarExpanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </div>

                    {/* Tracks within this car */}
                    {isCarExpanded && (
                      <div className="space-y-6">
                        {Object.entries(carTracks).map(([trackName, trackDays]) => {
                          const trackStat = trackStatsByCarAndTrack?.[carStat.car]?.[trackName];
                          const trackKey = makeTrackKey(carStat.car, trackName);
                          const isTrackExpanded = expandedTracks.has(trackKey);

                          return (
                          <div key={trackName}>
                            {/* Track Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-medium text-[var(--purple-glow)]">{trackName}</h4>
                                  <span className="text-xs text-[var(--foreground-muted)]">
                                    ({trackDays.length} day{trackDays.length !== 1 ? 's' : ''})
                                  </span>
                                </div>
                                {trackStat && (
                                  <p className="text-xs text-[var(--foreground-muted)]">
                                    {trackStat.sessionTimeFormatted} on track · {trackStat.totalSessions} sessions · {trackStat.totalLaps} laps
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-4">
                                <div className="text-right">
                                  <div className="text-xs text-[var(--foreground-muted)]">Best</div>
                                  <div className="font-mono text-base font-bold text-[var(--accent-green)]">
                                    {trackStat?.bestTimeFormatted || 'N/A'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-[var(--foreground-muted)]">Median</div>
                                  <div className="font-mono text-base font-semibold text-white">
                                    {trackStat?.medianTimeFormatted || 'N/A'}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-[var(--foreground-muted)]">Consistency</div>
                                  <div className={`font-mono text-base font-bold ${getConsistencyColor(trackStat?.consistencyScore ?? null)}`}>
                                    {trackStat?.consistencyScore !== null && trackStat?.consistencyScore !== undefined
                                      ? `${trackStat.consistencyScore}%`
                                      : 'N/A'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleTrack(trackKey)}
                                  aria-expanded={isTrackExpanded}
                                  className="text-xs px-3 py-1 rounded border border-[var(--border-primary)] text-[var(--foreground-muted)] hover:text-white hover:border-[var(--purple-glow)] transition-colors"
                                >
                                  {isTrackExpanded ? 'Hide days' : 'Show days'}
                                </button>
                              </div>
                            </div>

                            {/* Daily Bests for this track */}
                            {isTrackExpanded && (
                              <div className="space-y-3">
                                {trackDays.map((day, index) => {
                                  const prevDay = index < trackDays.length - 1 ? trackDays[index + 1] : null;
                                  const bestDelta = prevDay && day.bestTime && prevDay.bestTime ? calculateDelta(day.bestTime, prevDay.bestTime) : null;
                                  const medianDelta = prevDay && day.medianTime && prevDay.medianTime
                                    ? calculateDelta(day.medianTime, prevDay.medianTime)
                                    : null;
                                  const consistencyDelta = calculateConsistencyDelta(day.consistencyScore, prevDay?.consistencyScore ?? null);
                                  const isBestImprovement = bestDelta && bestDelta.startsWith('-');
                                  const isMedianImprovement = medianDelta && medianDelta.startsWith('-');
                                  const isConsistencyImprovement = consistencyDelta && consistencyDelta.startsWith('+');
                                  const isPersonalBest = trackStat?.bestTime !== null
                                    && trackStat?.bestTime !== undefined
                                    && day.bestTime === trackStat.bestTime;

                                  return (
                                    <div
                                      key={day.date}
                                      className={`p-4 rounded-lg ${isPersonalBest ? 'bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30' : 'bg-[var(--background-primary)]'}`}
                                    >
                                      {/* Date and lap count header */}
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="text-sm font-medium text-white">{formatDate(day.date)}</div>
                                        <div className="text-xs text-[var(--foreground-muted)]">
                                          {day.sessions} sessions · {day.totalLaps} laps
                                        </div>
                                      </div>

                                      {/* Stats grid */}
                                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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

                                        {/* Track Time */}
                                        <div>
                                          <div className="text-xs text-[var(--foreground-muted)] mb-1">Track Time</div>
                                          <div className="font-mono text-sm text-white">
                                            {day.sessionTimeFormatted || 'N/A'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )})}
                      </div>
                    )}
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
