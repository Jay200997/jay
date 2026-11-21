import type { AppData, WeightEntry } from './types';
import { addDays, dateKey, mondayOf } from './date';

/** Current streak of completed days. Today counts if complete; otherwise counting starts at yesterday. */
export function currentStreak(data: AppData, today = dateKey()): number {
  let key = data.logs[today]?.complete ? today : addDays(today, -1);
  let n = 0;
  while (data.logs[key]?.complete) {
    n += 1;
    key = addDays(key, -1);
  }
  return n;
}

export function longestStreak(data: AppData): number {
  const keys = Object.keys(data.logs).filter((k) => data.logs[k].complete).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

/**
 * Number of consecutive missed days immediately before today (only counting days on/after start date).
 */
export function missedInARow(data: AppData, today = dateKey()): number {
  let n = 0;
  let key = addDays(today, -1);
  while (key >= data.settings.startDate && !data.logs[key]?.complete && n < 30) {
    n += 1;
    key = addDays(key, -1);
  }
  return n;
}

export interface WeeklyAvg {
  week: string; // Monday key
  avg: number;
  count: number;
}

export function weeklyAverages(weights: WeightEntry[]): WeeklyAvg[] {
  const groups = new Map<string, number[]>();
  for (const w of weights) {
    const wk = mondayOf(w.date);
    groups.set(wk, [...(groups.get(wk) ?? []), w.kg]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, arr]) => ({ week, avg: arr.reduce((s, x) => s + x, 0) / arr.length, count: arr.length }));
}

/**
 * Returns the weekly loss rate (kg/week) between the two most recent weeks with data,
 * normalised by the number of weeks between them. Positive = losing.
 */
export function recentLossRate(weights: WeightEntry[]): number | null {
  const avgs = weeklyAverages(weights);
  if (avgs.length < 2) return null;
  const a = avgs[avgs.length - 2];
  const b = avgs[avgs.length - 1];
  const weeks = Math.max(1, Math.round((new Date(b.week).getTime() - new Date(a.week).getTime()) / (7 * 86400000)));
  return (a.avg - b.avg) / weeks;
}

export const FAST_LOSS_KG_PER_WEEK = 0.5;
