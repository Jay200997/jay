import type { AppData } from './types';
import { DAY_NAMES, dateKey, formatDuration, programWeek } from './date';
import { currentStreak, weeklyAverages } from './stats';
import { uid } from './seed';

// ---- Access to Claude from inside the hosted page ----

export interface SampleFn {
  json<T = unknown>(input: string, opts?: { images?: Blob[]; signal?: AbortSignal; cache?: boolean }): Promise<T>;
  limits(): Promise<{ images?: { maxCount: number; maxInputBytes: number; mediaTypes: string[] } }>;
}

/** Resolves the `sample` capability, or null when the app is not running inside a Claude viewer. */
export async function getSample(): Promise<SampleFn | null> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return null;
  try {
    return ((await c.use('sample')) as SampleFn | null) ?? null;
  } catch {
    return null;
  }
}

export function errorCopy(code: string | undefined): string {
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'capability_disabled':
    case 'not_declared':
      return 'Photo analysis is turned off for this page. You can allow it from the page’s Permissions menu.';
    case 'images_unavailable':
      return 'This app view can’t send photos to Claude. Try opening the link in the Claude app or a browser.';
    case 'image_rejected':
      return 'That photo couldn’t be read. Use a JPEG or PNG under 20 MB.';
    case 'rate_limited':
      return 'You’ve hit a usage limit. Try again in a while.';
    case 'session_expired':
      return 'Your Claude session expired. Sign in again, then retry.';
    case 'refused':
      return 'Claude declined to analyse this photo. Try a different photo (e.g. fitted clothing, plain background).';
    case 'invalid_json':
    case 'empty_completion':
      return 'The analysis came back in an unexpected format. Tap Analyse to try again.';
    default:
      return 'Something went wrong reaching Claude. Check your connection and try again.';
  }
}

// ---- Prompt ----

export function buildPrompt(data: AppData, note: string): string {
  const today = dateKey();
  const week = programWeek(data.settings.startDate, today);
  const avgs = weeklyAverages(data.weights).slice(-6);
  const waists = [...data.waists].sort((a, b) => a.date.localeCompare(b.date)).slice(-4);
  const runs = [...data.runs].sort((a, b) => a.date.localeCompare(b.date)).slice(-6);
  const completed = Object.values(data.logs).filter((l) => l.complete).length;

  const plan = data.plan
    .map((d, i) => `${i} ${DAY_NAMES[i]} — ${d.title}\n${d.exercises.map((e) => `   [${e.id}] ${e.name} | ${e.detail}`).join('\n')}`)
    .join('\n');

  const goals = data.goals
    .filter((g) => g.week === null || g.week >= Math.max(1, week))
    .map(
      (g) =>
        `[${g.id}] ${g.label}${g.week === week ? ' (CURRENT WEEK)' : ''}\n${g.items
          .map((it) => `   [${it.id}] ${data.goalsDone[it.id] ? '(done) ' : ''}${it.text}`)
          .join('\n')}`,
    )
    .join('\n');

  return `You are a careful, encouraging fitness coach reviewing a progress check-in for a fitness tracker app.

PERSON
- 5'5" (165 cm), started at 70 kg. Goal 64–66 kg, waist under 32 in, keep muscle.
- Indian vegetarian diet plus eggs, ~1,900–2,000 kcal and 110–130 g protein/day.
- Training: running + light strength + mobility. No heavy lifting.

CONTEXT
- Today ${today}, programme week ${week || 'not started'} (12-week plan, then months 4–6).
- Completed days so far: ${completed}; current streak: ${currentStreak(data, today)} days.
- Weekly average weight: ${avgs.length ? avgs.map((a) => `${a.week}: ${a.avg.toFixed(1)} kg`).join('; ') : 'none logged'}.
- Waist: ${waists.length ? waists.map((w) => `${w.date}: ${w.inches} in`).join('; ') : 'none logged'}.
- Recent runs: ${runs.length ? runs.map((r) => `${r.date}: ${r.km} km in ${formatDuration(r.seconds)}`).join('; ') : 'none logged'}.
- Note from the person: ${note.trim() || '(none)'}

WEEKLY WORKOUT PLAN (day index, then [exerciseId] name | sets/reps; "{longrun}" is an auto-calculated distance, keep it)
${plan}

REMAINING GOALS ([goalWeekId] label, then [goalId] text)
${goals}

THE PHOTO(S)
The attached photo(s) are the person's progress picture(s). Describe only what is visible and relevant to training: posture, visible muscle tone, where fat appears to be carried, and anything that suggests a focus area. Give any body-fat estimate only as a broad range and say it is a rough visual guess. Be neutral and kind; no judgement about appearance. If the photo is not a body/progress photo (e.g. a meal or a screenshot), analyse what it shows in a way that helps their plan instead.

TASK
Based on the photo(s) AND the logged data, suggest a SMALL number of concrete, conservative updates (0–6 total) to the goals and workout tasks. Only suggest a change if it clearly helps; it is fine to change nothing. Keep the "no heavy lifting" constraint. Refer to existing items only by the ids shown above.

Reply with ONLY a JSON object of this shape:
{
  "summary": "2–3 sentence overall assessment",
  "observations": ["short bullet", "..."],
  "goalUpdates": [{"goalId": "g_...", "newText": "...", "reason": "..."}],
  "newGoals": [{"goalWeekId": "gw_...", "text": "...", "reason": "..."}],
  "exerciseUpdates": [{"day": 1, "exerciseId": "ex_...", "newName": "optional", "newDetail": "optional", "reason": "..."}],
  "newExercises": [{"day": 4, "name": "...", "detail": "3 × 10", "reason": "..."}]
}`;
}

// ---- Response → reviewable changes ----

export interface Proposal {
  id: string;
  label: string;
  reason: string;
  apply: (d: AppData) => AppData;
}

export interface Analysis {
  summary: string;
  observations: string[];
  proposals: Proposal[];
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

/** Validates Claude's reply against the current data; drops anything referring to unknown ids. */
export function toAnalysis(raw: unknown, data: AppData): Analysis {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const proposals: Proposal[] = [];

  const goalItem = new Map<string, string>();
  for (const g of data.goals) for (const it of g.items) goalItem.set(it.id, it.text);
  const goalWeek = new Map(data.goals.map((g) => [g.id, g.label]));

  for (const u of arr(r.goalUpdates)) {
    const id = str(u.goalId);
    const text = str(u.newText);
    if (!goalItem.has(id) || !text || text === goalItem.get(id)) continue;
    proposals.push({
      id: uid('p'),
      label: `Goal: “${goalItem.get(id)}” → “${text}”`,
      reason: str(u.reason),
      apply: (d) => ({ ...d, goals: d.goals.map((g) => ({ ...g, items: g.items.map((it) => (it.id === id ? { ...it, text } : it)) })) }),
    });
  }

  for (const u of arr(r.newGoals)) {
    const gw = str(u.goalWeekId);
    const text = str(u.text);
    if (!goalWeek.has(gw) || !text) continue;
    proposals.push({
      id: uid('p'),
      label: `New goal in ${goalWeek.get(gw)}: “${text}”`,
      reason: str(u.reason),
      apply: (d) => ({ ...d, goals: d.goals.map((g) => (g.id === gw ? { ...g, items: [...g.items, { id: uid('g'), text }] } : g)) }),
    });
  }

  for (const u of arr(r.exerciseUpdates)) {
    const day = Number(u.day);
    const exId = str(u.exerciseId);
    const ex = data.plan[day]?.exercises.find((e) => e.id === exId);
    if (!ex) continue;
    const name = str(u.newName) || ex.name;
    const detail = str(u.newDetail) || ex.detail;
    if (name === ex.name && detail === ex.detail) continue;
    proposals.push({
      id: uid('p'),
      label: `${DAY_NAMES[day]}: ${ex.name} (${ex.detail}) → ${name} (${detail})`,
      reason: str(u.reason),
      apply: (d) => ({
        ...d,
        plan: d.plan.map((p, i) => (i === day ? { ...p, exercises: p.exercises.map((e) => (e.id === exId ? { ...e, name, detail } : e)) } : p)),
      }),
    });
  }

  for (const u of arr(r.newExercises)) {
    const day = Number(u.day);
    const name = str(u.name);
    const detail = str(u.detail);
    if (!data.plan[day] || !name) continue;
    proposals.push({
      id: uid('p'),
      label: `${DAY_NAMES[day]}: add ${name}${detail ? ` (${detail})` : ''}`,
      reason: str(u.reason),
      apply: (d) => ({
        ...d,
        plan: d.plan.map((p, i) => (i === day ? { ...p, exercises: [...p.exercises, { id: uid('ex'), name, detail }] } : p)),
      }),
    });
  }

  return {
    summary: str(r.summary) || 'No summary returned.',
    observations: (Array.isArray(r.observations) ? r.observations : []).map(str).filter(Boolean).slice(0, 8),
    proposals: proposals.slice(0, 8),
  };
}
