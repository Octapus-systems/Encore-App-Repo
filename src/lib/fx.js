import confetti from 'canvas-confetti';

// Tactile feedback for the app: tap ripples, light haptics and small celebrations
// at meaningful moments (request sent, journey accepted, journey completed...).

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const BRAND = ['#FF710F', '#FFB692', '#FFD9C4', '#ffffff', '#1a1a1a'];

export function haptic(pattern = 12) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported */ }
}

/** Big moment: a burst of brand-coloured confetti from the bottom centre. */
export function celebrate({ origin = { x: 0.5, y: 0.9 } } = {}) {
  haptic([18, 40, 28]);
  if (reduced()) return;
  const base = { origin, colors: BRAND, disableForReducedMotion: true, zIndex: 9999 };
  confetti({ ...base, particleCount: 70, spread: 70, startVelocity: 45, scalar: 0.9 });
  setTimeout(() => confetti({ ...base, particleCount: 40, spread: 110, startVelocity: 30, scalar: 0.7, ticks: 160 }), 180);
}

/** Small moment: a short sparkle from the element that was tapped. */
export function sparkle(el) {
  haptic(10);
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
    haptic(8);
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
}
