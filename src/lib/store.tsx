import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppData, DayLog } from './types';
import { seedData, seedGoals, seedPlan, DEFAULT_START_DATE, START_MIGRATION, PLAN_V2_MIGRATION, CHEAT_MEAL_MIGRATION, cheatMeal, MEAL_GRAMS_MIGRATION, MEAL_GRAM_UPDATES, SWAP_WEEK1_MIGRATION, ALL_MIGRATIONS } from './seed';

const STORAGE_KEY = 'fittrack:v1';

export function emptyLog(): DayLog {
  return { checked: {}, waterMl: 0, sleepHours: null, complete: false };
}

/** Validates & fills missing fields so imported/old data never crashes the UI. */
export function normalize(raw: unknown): AppData {
  const base = seedData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppData>;
  return {
    version: 1,
    plan: Array.isArray(r.plan) && r.plan.length === 7 ? r.plan : base.plan,
    logs: r.logs && typeof r.logs === 'object' ? r.logs : {},
    weights: Array.isArray(r.weights) ? r.weights : [],
    waists: Array.isArray(r.waists) ? r.waists : [],
    runs: Array.isArray(r.runs) ? r.runs : [],
    goals: Array.isArray(r.goals) ? r.goals : base.goals,
    goalsDone: r.goalsDone && typeof r.goalsDone === 'object' ? r.goalsDone : {},
    // Migrations come only from the stored data, never from the fresh defaults.
    settings: { ...base.settings, ...(r.settings ?? {}), migrations: r.settings?.migrations ?? [] },
    checkins: Array.isArray(r.checkins) ? r.checkins : [],
    dayOverrides: r.dayOverrides && typeof r.dayOverrides === 'object' ? r.dayOverrides : {},
  };
}

/** Applies one-time updates. Runs on every load but each update only once per device. */
function migrate(d: AppData): AppData {
  let out = d;
  const has = (m: string) => (out.settings.migrations ?? []).includes(m);
  const mark = (m: string, patch: Partial<AppData>, settings: Partial<AppData['settings']> = {}) => {
    out = { ...out, ...patch, settings: { ...out.settings, ...settings, migrations: [...(out.settings.migrations ?? []), m] } };
  };
  if (!has(START_MIGRATION)) mark(START_MIGRATION, {}, { startDate: DEFAULT_START_DATE });
  // New plan and goals replace the originals; logs, weights, runs and check-ins are kept.
  if (!has(PLAN_V2_MIGRATION)) mark(PLAN_V2_MIGRATION, { plan: seedPlan(), goals: seedGoals(), goalsDone: {} });
  // Adds the Saturday cheat meal without touching any other edits to the plan.
  if (!has(CHEAT_MEAL_MIGRATION)) {
    const plan = out.plan.map((day, i) => (i === 5 && !day.meals.some((m) => m.fromWeek) ? { ...day, meals: [...day.meals, cheatMeal()] } : day));
    mark(CHEAT_MEAL_MIGRATION, { plan });
  }
  // Adds gram portions to meals still using the original wording; edited meals are left alone.
  if (!has(MEAL_GRAMS_MIGRATION)) {
    const plan = out.plan.map((day) => ({
      ...day,
      meals: day.meals.map((m) => {
        const u = MEAL_GRAM_UPDATES[m.name];
        return u ? { ...m, name: u[1], kcal: u[2], protein: u[3] } : m;
      }),
    }));
    mark(MEAL_GRAMS_MIGRATION, { plan });
  }
  if (!has(SWAP_WEEK1_MIGRATION)) {
    mark(SWAP_WEEK1_MIGRATION, { dayOverrides: { '2026-11-25': 3, '2026-11-26': 2, ...out.dayOverrides } });
  }
  return out;
}

function load(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) return migrate(normalize(JSON.parse(s)));
  } catch {
    /* fall through to seed */
  }
  return seedData();
}

type Updater = (draft: AppData) => AppData;

interface Ctx {
  data: AppData;
  update: (fn: Updater) => void;
  replace: (d: AppData) => void;
  updateLog: (key: string, fn: (log: DayLog) => DayLog) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      // Ask the browser not to evict our storage.
      try {
        navigator.storage?.persist?.().catch(() => {});
      } catch {
        /* not supported */
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save', e);
    }
  }, [data]);

  const update = useCallback((fn: Updater) => setData((d) => fn(d)), []);
  // A restored backup keeps its own start date and plan: mark the one-time updates as done.
  const replace = useCallback((d: AppData) => {
    const n = normalize(d);
    const done = n.settings.migrations ?? [];
    setData({ ...n, settings: { ...n.settings, migrations: [...new Set([...done, ...ALL_MIGRATIONS])] } });
  }, []);
  const updateLog = useCallback(
    (key: string, fn: (log: DayLog) => DayLog) =>
      setData((d) => ({ ...d, logs: { ...d.logs, [key]: fn(d.logs[key] ?? emptyLog()) } })),
    [],
  );

  return <StoreCtx.Provider value={{ data, update, replace, updateLog }}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside provider');
  return c;
}
