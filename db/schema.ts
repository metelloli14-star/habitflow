// "Tables" of the mock database. Shapes are chosen so they map 1:1 onto a real DB later
// (Supabase/Postgres or Firebase): every record has a string id and foreign keys are explicit.

import type { Category, Frequency, Gender, HabitGoal } from '@/lib/shared/types';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  /** '' for accounts created through VK ID that haven't set a password yet. */
  passwordHash: string;
  gender: Gender;
  avatar: string | null;
  waterGoal: number;
  emailVerified: boolean;
  /** Active one-time codes, one per purpose (see lib/server/services/codes.ts). */
  codes?: Partial<Record<CodePurpose, OneTimeCode>>;
  /** New email waiting for confirmation (the current `email` stays in use until then). */
  pendingEmail?: string | null;
  /** VK ID user id when the account is linked to VK ID (login with VK). */
  vkId?: string | null;
  /** Consecutive wrong passwords; resets on success. */
  loginFailures?: number;
  /** Login is blocked until this moment (ISO) after too many wrong passwords. */
  lockedUntil?: string | null;
  /** First calendar day the person used the app (YYYY-MM-DD) — used for fair monthly averages. */
  firstUseDate: string;
  createdAt: string;
}

/** 'verify' — confirm email after registration; 'reset' — forgot password; 'email' — confirm a new email. */
export type CodePurpose = 'verify' | 'reset' | 'email';

export interface OneTimeCode {
  code: string;
  /** Sent to this address (for 'email' it's the new address). */
  sentTo: string;
  expiresAt: string;
  sentAt: string;
  attempts: number;
}

export interface SessionRecord {
  /** The session token stored in the httpOnly cookie. */
  id: string;
  userId: string;
  createdAt: string;
}

export interface HabitRecord {
  id: string;
  userId: string;
  title: string;
  category: Category;
  frequency: Frequency;
  days: string[];
  reminderTime: string;
  goal: HabitGoal | null;
  createdAt: string;
}

/** One row per day a habit was marked done. Streaks, progress and stats are all derived from these. */
export interface HabitCompletionRecord {
  id: string;
  userId: string;
  habitId: string;
  /** YYYY-MM-DD */
  date: string;
  createdAt: string;
}

export interface WaterEntryRecord {
  id: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  amount: number;
  /** HH:MM, the person's local time */
  time: string;
  createdAt: string;
}

export interface DatabaseShape {
  users: UserRecord[];
  sessions: SessionRecord[];
  habits: HabitRecord[];
  completions: HabitCompletionRecord[];
  waterEntries: WaterEntryRecord[];
}

export function emptyDatabase(): DatabaseShape {
  return { users: [], sessions: [], habits: [], completions: [], waterEntries: [] };
}
