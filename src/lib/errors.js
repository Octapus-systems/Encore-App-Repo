/**
 * Turns an API error into a friendly, on-brand message.
 * Messages written by our server for the user (400/409/422) are kept as they are —
 * they already say exactly what to fix. Everything technical gets a human voice.
 */
export function friendly(error) {
  const status = error?.status ?? 0;
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (status === 0 || offline) {
    return {
      kind: 'offline', icon: 'wifi_off', tone: 'amber', retry: true,
      title: offline ? "You're off the grid" : 'Lost the signal',
      body: "Your chauffeur's waiting — we just need a connection. Nothing you typed has been lost.",
    };
  }
  if (status === 401) return { kind: 'session', icon: 'lock_clock', tone: 'amber', title: 'Session ended', body: 'For your security you were signed out. Please sign in again to continue.', retry: false };
  if (status === 403) return { kind: 'forbidden', icon: 'block', tone: 'red', title: "That door's locked", body: error?.message || "Your account doesn't have access to this.", retry: false };
  if (status === 404) return { kind: 'notfound', icon: 'explore_off', tone: 'amber', title: 'Wrong turn', body: "We couldn't find that. It may have been moved or removed.", retry: false };
  if (status === 429) return { kind: 'busy', icon: 'speed', tone: 'amber', title: 'Easy on the throttle', body: 'Too many requests in a short time. Give it a few seconds and try again.', retry: true };
  if (status >= 500) return { kind: 'server', icon: 'car_crash', tone: 'red', title: 'Engine trouble', body: "Something went wrong on our side — we've been alerted. Please try again in a moment.", retry: true };
  return { kind: 'input', icon: 'error', tone: 'red', title: 'Almost there', body: error?.message || 'Something needs your attention.', retry: false };
}
