import type { AppData, DayPlan, Exercise, GoalWeek, Meal, MealSlot } from './types';
import { dateKey, mondayOf } from './date';

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

// ---- Meals ----
const breakfast = () => meal('Breakfast', '300 ml milk + 40 g oats + 2 scoops whey + 1 banana', 680, 65);
const lunch = () => meal('Lunch', '1 serving rice, dal, sabzi, 100 g paneer, salad', 700, 32);
const lunchRajma = () => meal('Lunch', '1 serving rice, rajma/chole, sabzi, 100 g paneer, salad', 720, 34);
const lunchBigRice = () => meal('Lunch', '1.5 servings rice, dal, sabzi, 100 g paneer, salad', 800, 34);
const evening = () => meal('Evening', '3 whole eggs + 1 fruit', 280, 18);
const dinner = () => meal('Dinner', '7 egg whites + 2 rotis + big bowl of sabzi', 400, 32);
const dinnerCurd = () => meal('Dinner', '7 egg whites + 1 roti + 200 g curd + big bowl of sabzi', 400, 36);
const preRunBanana = () => meal('Breakfast', 'Banana before the run', 105, 1);
const supplements = () => [
  meal('Supplements', 'Creatine (3–5 g)', 0, 0),
  meal('Supplements', 'Omega-3', 0, 0),
  meal('Supplements', 'Multivitamin', 0, 0),
];

const stretch10 = () => ex('Stretching', '10 min');

export function seedPlan(): DayPlan[] {
  return [
    {
      title: 'Easy run + mobility',
      exercises: [
        ex('Easy run (conversational pace)', '25–40 min'),
        ex('Hip flexor stretch', '1 min/side'),
        ex('Hamstring stretch', '1 min/side'),
        ex('Calf stretch', '1 min/side'),
        ex('Couch stretch', '1 min/side'),
      ],
      meals: [breakfast(), lunch(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Strength A',
      exercises: [
        ex('Goblet squat', '3 × 10–12'),
        ex('Push-ups', '3 × near max'),
        ex('Dumbbell row', '3 × 10/side'),
        ex('Romanian deadlift', '3 × 10'),
        ex('Plank', '3 × 40–60 s'),
        ex('Hanging knee raise', '3 × 10'),
      ],
      meals: [breakfast(), lunchRajma(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Intervals',
      exercises: [
        ex('Warm-up jog', '10 min'),
        ex('Intervals: 1 min hard / 2 min easy', '6–8 rounds'),
        ex('Cool-down jog', '5 min'),
        stretch10(),
      ],
      meals: [preRunBanana(), breakfast(), lunch(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Strength B',
      exercises: [
        ex('Walking lunges', '3 × 10/leg'),
        ex('Pull-ups (or band-assisted)', '3 × 5–8'),
        ex('Dumbbell shoulder press', '3 × 10'),
        ex('Hip thrust', '3 × 12'),
        ex('Dead bug', '3 × 10/side'),
        ex('Side plank', '3 × 30 s/side'),
      ],
      meals: [breakfast(), lunch(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Light day',
      exercises: [ex('15-min HIIT  OR  20 min yoga/mobility', '1 session')],
      meals: [breakfast(), lunch(), evening(), dinnerCurd(), ...supplements()],
    },
    {
      title: 'Long easy run',
      exercises: [
        ex('Long easy run (or 60 min sport)', '{longrun}'),
        stretch10(),
      ],
      meals: [preRunBanana(), breakfast(), lunchBigRice(), evening(), dinner(), ...supplements()],
    },
    {
      title: 'Rest + check-in',
      exercises: [
        ex('Walk', '30–45 min'),
        ex('Mobility', '15 min'),
        ex('Weigh-in (morning)', 'log in Progress'),
        ex('Waist check', 'every 2 weeks'),
      ],
      meals: [breakfast(), lunch(), evening(), dinnerCurd(), ...supplements()],
    },
  ];
}

const goalRows: [string, number | null, string[]][] = [
  ['Week 1', 1, ['Run/walk 20 min (2 min run / 1 min walk)', 'Learn all movements', 'Measure baseline (weight, waist, 5 km or 20 min test)']],
  ['Week 2', 2, ['Run/walk 20 min (3 min run / 1 min walk)', 'Full sets on every exercise', 'Weight ~69.7 kg']],
  ['Week 3', 3, ['Run 15 min non-stop', '+1–2 reps per set', 'Weight ~69.4 kg']],
  ['Week 4', 4, ['Run 20 min non-stop', '10 push-ups', 'Weight ~69 kg']],
  ['Week 5', 5, ['Run 3 km', 'Band pull-ups × 8', 'Weight ~68.7 kg']],
  ['Week 6', 6, ['Run 4 km', '12 push-ups', 'Weight ~68.5 kg']],
  ['Week 7', 7, ['6 strong intervals', 'Plank 60 s', 'Weight ~68.2 kg']],
  ['Week 8', 8, ['Run 5 km non-stop', '15 push-ups', 'Weight ~68 kg', 'Waist −1 in']],
  ['Week 9', 9, ['5 km in 32 min', 'Negative pull-ups', 'Weight ~67.7 kg']],
  ['Week 10', 10, ['Long run 6 km', '18 push-ups', 'Weight ~67.5 kg']],
  ['Week 11', 11, ['5 km in 31 min', 'Pull-up attempt', 'Weight ~67.2 kg']],
  ['Week 12', 12, ['5 km under 30 min', 'First strict pull-up', 'Weight ~67 kg']],
  ['Months 4–6', null, ['5 km under 27 min', 'Comfortable 10 km', '3–5 pull-ups', '25 push-ups', 'Weight 64–66 kg', 'Waist ~32 in']],
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
    settings: { startDate: mondayOf(dateKey()), waterTargetMl: 3000 },
  };
}

/** Saturday long-run target: 4 km in week 1, +0.5 km/week, capped at 10 km. */
export function longRunKm(week: number): number {
  return Math.min(10, 4 + 0.5 * Math.max(0, week - 1));
}
