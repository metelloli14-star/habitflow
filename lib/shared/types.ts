// Types shared by the API (server) and the UI (client). These are the "contract" of the API.

export type Category = 'Здоровье' | 'Хобби' | 'Разум';
export type Frequency = 'Ежедневно' | 'Еженедельно' | 'Ежемесячно';
export type Gender = 'Мужской' | 'Женский' | '';

export interface HabitGoal {
  title: string;
  description: string;
  /** How many completions are needed to reach the goal. */
  targetCount: number;
  /** YYYY-MM-DD */
  deadline: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  gender: Gender;
  /** Small JPEG data URL, or null when the person has no photo. */
  avatar: string | null;
  /** Daily water goal in ml. */
  waterGoal: number;
  /** New email waiting for confirmation by code, or null. */
  pendingEmail: string | null;
  /** Account is linked to VK ID. */
  vkLinked: boolean;
  /** Account has a password (VK ID accounts may not). */
  hasPassword: boolean;
}

/** Fields the person fills in when creating or editing a habit. */
export interface HabitInput {
  title: string;
  category: Category;
  frequency: Frequency;
  /** Weekday labels ('Пн'…'Вс') for weekly habits, day-of-month numbers ('1'…'31') for monthly ones. */
  days: string[];
  /** 'HH:MM' or '' when no reminder is set. */
  reminderTime: string;
  goal: HabitGoal | null;
}

export interface HabitDTO extends HabitInput {
  id: string;
  createdAt: string;
  /** Whether it's marked done on the requested date. */
  doneToday: boolean;
  /** Total number of completions (progress toward the goal). */
  progressDone: number;
  /** Current run of consecutive scheduled days that were completed. */
  streak: number;
}

export interface WaterEntryDTO {
  id: string;
  amount: number;
  /** 'HH:MM' local time of the entry. */
  time: string;
  /** Running total for the day after this entry. */
  total: number;
}

export interface WaterDayDTO {
  date: string;
  goal: number;
  amount: number;
  entries: WaterEntryDTO[];
}

export interface StatsDayPoint {
  date: string;
  label: string;
  value: number;
}

export interface StatsDTO {
  bestStreak: { days: number; habitTitle: string } | null;
  /** Average daily completion % this month (from the first day of use), or null if nothing was scheduled yet. */
  monthAverage: number | null;
  habitsWeek: StatsDayPoint[];
  waterWeek: StatsDayPoint[];
  /** Average ml per day for the days of this week so far. */
  waterAverage: number;
  /** Change vs. the previous week in %, or null if there's no data for last week. */
  waterChangePct: number | null;
}

export interface ApiErrorBody {
  error: string;
  code?: string;
}
