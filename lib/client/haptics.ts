// A short vibration, like a native app's tap feedback. Android browsers support it; iPhone ignores it silently.
export function haptic(pattern: number | number[] = 12) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}
