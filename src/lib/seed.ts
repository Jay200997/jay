import type { AppData, DayPlan, Exercise, GoalWeek, Meal, MealSlot } from './types';
/** Day 1 of the programme. */
export const DEFAULT_START_DATE = '2026-11-23';
export const START_MIGRATION = 'start-2026-11-23';
/** Gym + knee + mobility plan agreed on 22 Nov 2026. */
export const PLAN_V2_MIGRATION = 'plan-v2';
export const CHEAT_MEAL_MIGRATION = 'cheat-meal';
export const MEAL_GRAMS_MIGRATION = 'meal-grams';

let counter = 0;
export function uid(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

const ex = (name: string, detail: string): Exercise => ({ id: uid('ex'), name, detail });
const meal = (slot: MealSlot, name: string, kcal: number, protein: number): Meal => ({
  id: uid('meal'),
  slot,
  name,
  kcal,
  protein,
});

// ---- Meals (cooked weights for rice, dal and sabzi) ----
type MealDef = [MealSlot, string, number, number];
const M = {
  breakfast: ['Breakfast', '300 ml toned milk + 40 g oats (dry) + 2 scoops whey (~60 g) + 1 banana (~120 g)', 680, 65],
  lunch: ['Lunch', '130 g rice (cooked) + 150 g dal (cooked) + 150 g sabzi + 100 g paneer + 100 g salad · 2 tsp oil', 700, 32],
  lunchRajma: ['Lunch', '130 g rice (cooked) + 150 g rajma/chole (cooked) + 150 g sabzi + 100 g paneer + 100 g salad · 2 tsp oil', 730, 34],
  lunchBigRice: ['Lunch', '200 g rice (cooked) + 150 g dal (cooked) + 150 g sabzi + 100 g paneer + 100 g salad · 2 tsp oil', 800, 34],
  evening: ['Evening', '3 whole eggs + 1 fruit (~150 g)', 280, 18],
  dinner: ['Dinner', '7 egg whites + 2 rotis (25 g atta each, no ghee) + 200 g sabzi · 1 tsp oil', 400, 32],
  dinnerCurd: ['Dinner', '7 egg whites + 1 roti (25 g atta) + 200 g curd + 200 g sabzi · 1 tsp oil', 440, 38],
  preRunBanana: ['Breakfast', 'Banana before the run (~120 g)', 105, 1],
} satisfies Record<string, MealDef>;
const fromDef = ([slot, name, kcal, protein]: MealDef) => () => meal(slot, name, kcal, protein);
const breakfast = fromDef(M.breakfast);
const lunch = fromDef(M.lunch);
const lunchRajma = fromDef(M.lunchRajma);
const lunchBigRice = fromDef(M.lunchBigRice);
const evening = fromDef(M.evening);
const dinner = fromDef(M.dinner);
const dinnerCurd = fromDef(M.dinnerCurd);
const preRunBanana = fromDef(M.preRunBanana);

/** Old meal names (before portions in grams) → updated meal. Used once to update existing plans. */
export const MEAL_GRAM_UPDATES: Record<string, MealDef> = {
  '300 ml milk + 40 g oats + 2 scoops whey + 1 banana': M.breakfast,
  '1 serving rice, dal, sabzi, 100 g paneer, salad': M.lunch,
  '1 serving rice, rajma/chole, sabzi, 100 g paneer, salad': M.lunchRajma,
  '1.5 servings rice, dal, sabzi, 100 g paneer, salad': M.lunchBigRice,
  '3 whole eggs + 1 fruit': M.evening,
  '7 egg whites + 2 rotis + big bowl of sabzi': M.dinner,
  '7 egg whites + 1 roti + 200 g curd + big bowl of sabzi': M.dinnerCurd,
  'Banana before the run': M.preRunBanana,
};

/** Weekly cheat meal: Saturday dinner from Week 3, on top of the normal dinner. */
export const cheatMeal = (): Meal => ({
  ...meal('Dinner', 'Cheat meal: one restaurant meal + 1 dessert (keep some protein, go easy on alcohol)', 900, 15),
  fromWeek: 3,
});
const supplements = () => [
  meal('Supplements', 'Creatine (3–5 g)', 0, 0),
  meal('Supplements', 'Omega-3', 0, 0),
  meal('Supplements', 'Multivitamin', 0, 0),
];

// ---- Recurring workout items ----
const warmup = () => ex('Warm-up: leg swings, hip circles, cat-cow, arm circles, ankle rocks', '5 min');
const kneeHolds = () => ex('Knee holds: wall sit or Spanish squat (~70% effort)', '5 × 45 s');
const stretch = () => ex('Stretching: couch, hamstring, calf, hip flexor, chest', '10 min · 45 s each');

/*
 * Detail tokens, filled in from the programme week (see resolveDetail):
 *   {longrun}   Saturday long-run distance
 *   {intervals} Tuesday interval rounds
 *   {kneereps}  slow leg press / leg extension sets × reps
 */
export function seedPlan(): DayPlan[] {
  return [
    {
      title: 'Upper A (push) + abs + knee',
      exercises: [
        warmup(),
        ex('Incline dumbbell press', '3 × 8–10'),
        ex('Lat pulldown', '3 × 8–10'),
        ex('Seated dumbbell shoulder press', '3 × 8–10'),
        ex('Cable row', '3 × 10–12'),
        ex('Lateral raise', '3 × 12–15'),
        ex('Triceps rope pushdown', '2 × 12'),
        ex('Hanging leg raise', '3 × 10–12'),
        ex('Cable crunch', '3 × 12'),
        ex('Slow leg extension (3 s down, 3 s up)', '{kneereps}'),
        kneeHolds(),
        stretch(),
      ],
      meals: [breakfast(), lunch(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Intervals (stamina)',
      exercises: [
        kneeHolds(),
        ex('Warm-up: 5 min brisk walk + 5 min easy jog', '10 min'),
        ex('Intervals: fast run / slow jog (treadmill 1–2% incline; bike if knee > 3/10)', '{intervals}'),
        ex('Cool-down: easy jog, then walk', '5 min'),
        stretch(),
      ],
      meals: [preRunBanana(), breakfast(), lunchRajma(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Lower (knee-friendly) + core',
      exercises: [
        warmup(),
        ex('Slow leg press, pain-free range (3 s down, 3 s up)', '{kneereps}'),
        ex('Slow leg extension (3 s down, 3 s up)', '{kneereps}'),
        ex('Romanian deadlift', '3 × 8–10'),
        ex('Hip thrust', '3 × 10'),
        ex('Slow step-down from low box', '2 × 10/leg'),
        ex('Banded lateral walk', '2 × 15/side'),
        ex('Wall sit', '3 × 45–60 s'),
        ex('Standing calf raise', '3 × 15'),
        ex('Tibialis raise', '2 × 15'),
        ex('Pallof press', '3 × 10/side'),
        stretch(),
      ],
      meals: [breakfast(), lunch(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Mobility day',
      exercises: [
        kneeHolds(),
        ex('Easy walk', '15–20 min'),
        ex('Hips: couch stretch + half-kneeling hip flexor (squeeze glute)', '2 × 45 s/side'),
        ex('Hamstrings/back: strap hamstring stretch, 90/90 switches × 8, child’s pose', '2 × 45 s'),
        ex('Calves/ankles: knee-to-wall rocks × 10, calf stretch straight + bent knee', '2 rounds/side'),
        ex('Shoulders/upper back: doorway chest stretch, open books × 10, wall slides × 10', '2 rounds'),
      ],
      meals: [breakfast(), lunch(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Upper B (pull) + abs + knee',
      exercises: [
        warmup(),
        ex('Pull-ups (add weight once you hit 4 × 8)', '4 × 5–8'),
        ex('Flat dumbbell bench', '3 × 8–10'),
        ex('Chest-supported row', '3 × 10'),
        ex('Face pull', '3 × 15'),
        ex('Lateral raise', '3 × 15'),
        ex('Dumbbell curl', '2 × 12'),
        ex('Ab wheel rollout', '3 × 8–10'),
        ex('Side plank', '3 × 30–45 s/side'),
        ex('Slow leg press (3 s down, 3 s up)', '{kneereps}'),
        kneeHolds(),
        stretch(),
      ],
      meals: [breakfast(), lunch(), evening(), dinnerCurd(), ...supplements()],
    },
    {
      title: 'Long easy run',
      exercises: [
        kneeHolds(),
        ex('Long easy run, conversational pace (short quick steps, no downhill)', '{longrun}'),
        stretch(),
      ],
      meals: [preRunBanana(), breakfast(), lunchBigRice(), evening(), dinner(), cheatMeal(), ...supplements()],
    },
    {
      title: 'Rest + check-in',
      exercises: [
        kneeHolds(),
        ex('Walk', '30–45 min'),
        ex('Mobility', '15 min'),
        ex('Weigh-in (morning)', 'log in Progress'),
        ex('Waist check', 'every 2 weeks'),
        ex('Knee test: single-leg squat on a slope, rate pain', '0–10'),
      ],
      meals: [breakfast(), lunch(), evening(), dinnerCurd(), ...supplements()],
    },
  ];
}

const goalRows: [string, number | null, string[]][] = [
  ['Week 1', 1, [
    'Baseline: distance in a 20-min run (or 5 km time if pain-free)',
    'Record starting weight on every lift + max pull-ups',
    'Baseline knee: slope-squat pain (0–10) + leg-extension weight',
    'Baseline flexibility: toe touch, knee-to-wall (cm), couch-stretch hold',
    'Log weight, waist + photo check-in',
  ]],
  ['Week 2', 2, ['All 8 hard intervals at the same speed', 'Weight up on 1+ lifts', 'Knee holds done every day', 'Weight ~69.7 kg']],
  ['Week 3', 3, ['6 × 90 s intervals with knee ≤ 3/10', 'Weight up on 2+ lifts', 'Weight ~69.4 kg']],
  ['Week 4', 4, ['Long run 4 km pain-free', '30 push-ups in one set', 'Runs at ≤ 3/10 knee pain, settled by next morning', 'Couch stretch 60 s easy', 'Weight ~69 kg']],
  ['Week 5', 5, ['First 4×4 completed', 'Leg-extension weight up', 'Weight ~68.7 kg']],
  ['Week 6', 6, ['5 km 1 min faster than Week 1', '6 pull-ups × 2 sets', 'Weight ~68.5 kg']],
  ['Week 7', 7, ['4×4 at the same speed every round', 'Long run 6.5 km', 'Weight ~68.2 kg']],
  ['Week 8', 8, [
    '5 × 4 min at a steady pace',
    '12 strict hanging leg raises',
    'Slope-squat pain half of Week 1; leg press +30% for 4 × 8',
    'Fingertips to toes; knee-to-wall +3 cm',
    'Weight ~68 kg',
    'Waist −1 in',
  ]],
  ['Week 9', 9, ['Long run 7 km', 'Ab wheel 3 × 10', 'Weight ~67.7 kg']],
  ['Week 10', 10, ['Long run 7.5 km', '10 strict pull-ups', 'Weight ~67.5 kg']],
  ['Week 11', 11, ['Long run 8 km pain-free', 'Weight ~67.2 kg']],
  ['Week 12', 12, [
    '5 km 2–3 min faster than Week 1',
    '4×4 at a speed 1 km/h faster than Week 5',
    '5 pull-ups with +5 kg',
    'Incline press +20% vs Week 1',
    'Slope-squat pain 0–1/10',
    'Touch toes with straight legs; arms flat in wall slides',
    'Weight ~67 kg',
  ]],
  ['Months 4–6', null, [
    'Comfortable 10 km',
    '5 km under 27 min',
    '12+ pull-ups',
    'Upper abs visible in good light',
    'Pain-free running',
    'Mobility 3× per week',
    'Weight 64–66 kg',
    'Waist ~32 in',
  ]],
];

export function seedGoals(): GoalWeek[] {
  return goalRows.map(([label, week, items]) => ({
    id: uid('gw'),
    label,
    week,
    items: items.map((text) => ({ id: uid('g'), text })),
  }));
}

export function seedData(): AppData {
  return {
    version: 1,
    plan: seedPlan(),
    logs: {},
    weights: [],
    waists: [],
    runs: [],
    goals: seedGoals(),
    goalsDone: {},
    settings: { startDate: DEFAULT_START_DATE, waterTargetMl: 3000, migrations: [START_MIGRATION, PLAN_V2_MIGRATION, CHEAT_MEAL_MIGRATION, MEAL_GRAMS_MIGRATION] },
    checkins: [],
  };
}

// ---- Week-based progressions ----

/** Long run: 4 → 8 km over 12 weeks with an easier week every 4th, then +0.5 km/week up to 10 km. */
const LONG_RUN_KM = [4, 4.5, 5, 4, 5.5, 6, 6.5, 5.5, 7, 7.5, 8, 7];
export function longRunKm(week: number): number {
  const w = Math.max(1, week);
  return w <= 12 ? LONG_RUN_KM[w - 1] : Math.min(10, 7 + 0.5 * (w - 12));
}

export function intervalSet(week: number): string {
  const w = Math.max(1, week);
  if (w <= 2) return '8 × (1 min fast / 1 min easy)';
  if (w === 3) return '6 × (90 s fast / 90 s easy)';
  if (w === 4) return '6 × (1 min fast / 2 min easy)';
  if (w <= 7) return '4 × (4 min fast / 3 min easy)';
  return '5 × (4 min fast / 2 min easy)';
}

/** Slow heavy leg press / extension for the patellar tendon. */
export function kneeReps(week: number): string {
  const w = Math.max(1, week);
  if (w <= 3) return '3 × 15';
  if (w <= 6) return '3 × 12';
  if (w <= 9) return '4 × 10';
  return '4 × 8';
}

export function resolveDetail(detail: string, week: number): string {
  return detail
    .replace('{longrun}', `${longRunKm(week).toFixed(1)} km`)
    .replace('{intervals}', intervalSet(week))
    .replace('{kneereps}', kneeReps(week));
}
