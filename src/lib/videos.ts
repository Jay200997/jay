import type { Exercise } from './types';

/** Items that are not an exercise technique (walks, check-ins): no video button. */
const NO_VIDEO = /^(walk|easy walk|mobility|weigh-in|waist check|cool-down|warm-up: 5 min)/i;

/** First match wins; otherwise the exercise's own name + "proper form" is searched. */
const QUERIES: [RegExp, string][] = [
  [/^warm-up: leg swings/i, 'dynamic warm up leg swings hip circles cat cow arm circles'],
  [/knee holds|spanish squat/i, 'spanish squat isometric hold patellar tendon'],
  [/^stretching: couch/i, 'post workout stretch couch stretch hamstring calf hip flexor'],
  [/^intervals/i, 'treadmill interval running workout how to'],
  [/long easy run/i, 'easy run conversational pace short quick steps knee friendly'],
  [/slow leg press/i, 'slow tempo leg press patellar tendon'],
  [/slow leg extension/i, 'slow tempo leg extension patellar tendon'],
  [/step-down/i, 'eccentric step down exercise knee'],
  [/knee test|slope/i, 'single leg decline squat test patellar tendon'],
  [/^hips:/i, 'couch stretch half kneeling hip flexor stretch'],
  [/^hamstrings\/back:/i, 'hamstring strap stretch 90 90 hip switch'],
  [/^calves\/ankles:/i, 'knee to wall ankle mobility calf stretch'],
  [/^shoulders\/upper back:/i, 'doorway chest stretch open book wall slides'],
  [/pull-ups/i, 'pull up proper form'],
];

/** Splits "Title: details" or "Title (details)" into a short title and a note. */
export function splitName(name: string): { title: string; note?: string } {
  const colon = name.indexOf(': ');
  if (colon > 0 && colon <= 28) return { title: name.slice(0, colon), note: cap(name.slice(colon + 2)) };
  const paren = name.indexOf(' (');
  if (paren > 0 && name.endsWith(')')) return { title: name.slice(0, paren), note: cap(name.slice(paren + 2, -1)) };
  return { title: name };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A user-pasted link wins; otherwise a YouTube search for the exercise's form. */
export function videoUrl(e: Exercise): string | null {
  if (e.video?.trim()) return e.video.trim();
  if (!e.name.trim() || NO_VIDEO.test(e.name)) return null;
  const q = QUERIES.find(([re]) => re.test(e.name))?.[1] ?? `${splitName(e.name).title} proper form`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
