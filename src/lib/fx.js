import confetti from 'canvas-confetti';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from '@/lib/native';

// Tactile feedback for the app: tap ripples, light haptics and small celebrations
// at meaningful moments (request sent, journey accepted, journey completed...).

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const BRAND = ['#FF710F', '#FFB692', '#FFD9C4', '#ffffff', '#1a1a1a'];

// ---------- haptics ----------
// Kinds: light (tap), medium, heavy, select (chip/tab/stepper change), success, warning, error.
// Installed app → real Taptic/vibration-motor feedback; browser → short vibration where supported.
const WEB = { light: 8, medium: 16, heavy: 26, select: 6, success: [10, 40, 18], warning: [20, 60, 20], error: [30, 50, 30, 50, 30] };
let last = 0;
let selecting = false;
export function haptic(kind = 'light') {
  // Older call sites pass a number or an array: small number → tap, bigger → medium, array → success.
  if (Array.isArray(kind)) kind = 'success';
  else if (typeof kind === 'number') kind = kind <= 10 ? 'light' : 'medium';
  const now = performance.now();
  if (now - last < 35) return; // one buzz per gesture
  last = now;
  try {
    if (isNative()) {
      if (kind === 'select') {
        if (!selecting) { selecting = true; Haptics.selectionStart(); }
        Haptics.selectionChanged();
      } else if (kind === 'success' || kind === 'warning' || kind === 'error') {
        Haptics.notification({ type: { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error }[kind] });
      } else {
        Haptics.impact({ style: { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy }[kind] || ImpactStyle.Light });
      }
    } else {
      navigator.vibrate?.(WEB[kind] ?? 8);
    }
  } catch { /* haptics unavailable */ }
}

/** Big moment: a burst of brand-coloured confetti from the bottom centre. */
export function celebrate({ origin = { x: 0.5, y: 0.9 } } = {}) {
  haptic('success');
  if (reduced()) return;
  const base = { origin, colors: BRAND, disableForReducedMotion: true, zIndex: 9999 };
  confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 45, scalar: 0.9 });
  setTimeout(() => confetti({ ...base, particleCount: 40, spread: 110, startVelocity: 30, scalar: 0.7, ticks: 160 }), 180);
}

/** Small moment: a short sparkle from the element that was tapped. */
export function sparkle(el) {
  haptic('medium');
  if (reduced() || !el) return;
  const r = el.getBoundingClientRect();
  confetti({
    origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
    particleCount: 18, spread: 60, startVelocity: 18, gravity: 0.9, scalar: 0.6, ticks: 70,
    colors: BRAND, shapes: ['circle'], disableForReducedMotion: true, zIndex: 9999,
  });
}

/** Material-style ripple + haptic on every button and link-button tap. Call once at start-up. */
export function installTapFx() {
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest?.('button:not(:disabled), a[role="button"], .press, a.rounded-full, nav a');
    if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const dot = document.createElement('span');
    dot.className = 'fx-ripple';
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove());
  }, { passive: true });
  // Haptics fire on a real tap (click), not on touch-start, so scrolling over buttons never buzzes.
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('button:not(:disabled), a[role="button"], .press, a.rounded-full, nav a, [role="tab"]');
    if (!el) return;
    haptic(el.dataset.haptic || (el.matches('nav a, [role="tab"]') ? 'select' : 'light'));
  }, { capture: true, passive: true });
}
