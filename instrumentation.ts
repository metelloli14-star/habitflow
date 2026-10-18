// Runs once when the Next.js server starts. The push reminder scheduler lives in the server process.
export async function register() {
  // NEXT_RUNTIME is replaced at build time, so the edge bundle never includes the Node-only scheduler.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.NEXT_PHASE === 'phase-production-build') return;
    const { startReminderScheduler } = await import('./lib/server/services/reminders');
    startReminderScheduler();
  }
}
