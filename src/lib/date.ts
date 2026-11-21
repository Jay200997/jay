export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Local-date key YYYY-MM-DD (not UTC, so late-evening use stays on the right day). */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(key: string): number {
  return (parseKey(key).getDay() + 6) % 7;
}

/** Monday of the week containing `key`. */
export function mondayOf(key: string): string {
  return addDays(key, -weekdayIndex(key));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86400000);
}

/** 1-based programme week for `key` given a start date; 0 if before start. */
export function programWeek(startDate: string, key: string = dateKey()): number {
  const diff = daysBetween(startDate, key);
  if (diff < 0) return 0;
  return Math.floor(diff / 7) + 1;
}

export function formatShort(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatLong(key: string): string {
  return parseKey(key).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? h + ':' : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** Parses "mm:ss", "h:mm:ss" or plain minutes ("32.5"). Returns seconds or null. */
export function parseDuration(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (t.includes(':')) {
    const parts = t.split(':').map(Number);
    if (parts.some((p) => Number.isNaN(p) || p < 0)) return null;
    return parts.reduce((acc, p) => acc * 60 + p, 0) || null;
  }
  const mins = Number(t);
  return Number.isFinite(mins) && mins > 0 ? Math.round(mins * 60) : null;
}

export function paceString(seconds: number, km: number): string {
  if (!km) return '–';
  return `${formatDuration(seconds / km)} /km`;
}
