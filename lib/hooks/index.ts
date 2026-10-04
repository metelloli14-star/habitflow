// Data layer for the UI. Screens get and change data only through these hooks,
// so swapping the mock backend for a real one doesn't touch any component.
export { useToday } from './useToday';
export { useSession, authApi } from './useSession';
export type { RegisterResult } from './useSession';
export { useHabits, useHabit } from './useHabits';
export { useWater } from './useWater';
export { useStats } from './useStats';
export { profileApi } from './useProfile';
export type { ProfileUpdate } from './useProfile';
export { useReminders, requestReminderPermission } from './useReminders';
export { useAuthProviders } from './useAuthProviders';
