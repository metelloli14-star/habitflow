// Records the services work with. The tables themselves are defined in prisma/schema.prisma;
// db/index.ts converts database rows into these shapes (dates as 'YYYY-MM-DD' / ISO strings).

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
