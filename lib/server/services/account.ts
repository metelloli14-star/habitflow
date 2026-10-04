import { db } from '@/db';

/** Removes the person and everything that belongs to them. */
export function deleteAccountData(userId: string): void {
  db.completions.removeWhere((c) => c.userId === userId);
  db.waterEntries.removeWhere((e) => e.userId === userId);
  db.habits.removeWhere((h) => h.userId === userId);
  db.sessions.removeWhere((s) => s.userId === userId);
  db.users.remove(userId);
}
