// No-op on iOS — Safari/WebKit has never implemented the Vibration API.
// Safe to call unconditionally; this only does something on Android.
function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // ignore
  }
}

export function hapticYourTurn() {
  vibrate(60)
}

export function hapticTrickWon() {
  vibrate([40, 60, 40])
}
