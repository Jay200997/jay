export type MealSlot = 'Breakfast' | 'Lunch' | 'Evening' | 'Dinner' | 'Supplements';
export const MEAL_SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Evening', 'Dinner', 'Supplements'];

export interface Exercise {
  id: string;
  name: string;
  detail: string; // e.g. "3 × 10–12"
}

export interface Meal {
  id: string;
  slot: MealSlot;
  name: string;
  kcal: number;
  protein: number;
  /** Only shown from this programme week onwards (e.g. the weekly cheat meal). */
  fromWeek?: number;
}

export interface DayPlan {
  title: string;
  exercises: Exercise[];
  meals: Meal[];
}

/** Index 0 = Monday … 6 = Sunday */
export type WeekPlan = DayPlan[];

export interface DayLog {
  checked: Record<string, boolean>;
  waterMl: number;
  sleepHours: number | null;
  complete: boolean;
}

export interface WeightEntry { id: string; date: string; kg: number }
export interface WaistEntry { id: string; date: string; inches: number }
export interface RunEntry { id: string; date: string; km: number; seconds: number }

export interface GoalItem { id: string; text: string }
export interface GoalWeek { id: string; label: string; week: number | null; items: GoalItem[] }

export interface Settings {
  startDate: string; // YYYY-MM-DD
  waterTargetMl: number;
  /** One-time data updates already applied on this device. */
  migrations?: string[];
}

export interface CheckIn {
  id: string;
  date: string;
  summary: string;
  observations: string[];
  applied: string[]; // human-readable list of changes that were applied
}

export interface AppData {
  version: 1;
  plan: WeekPlan;
  logs: Record<string, DayLog>; // keyed by YYYY-MM-DD
  weights: WeightEntry[];
  waists: WaistEntry[];
  runs: RunEntry[];
  goals: GoalWeek[];
  goalsDone: Record<string, boolean>;
  settings: Settings;
  checkins: CheckIn[];
}
