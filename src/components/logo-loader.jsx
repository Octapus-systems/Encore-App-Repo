import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const LINES = [
  'Warming up the engine…',
  'Polishing the paintwork…',
  'Checking the route…',
  'Finding your chauffeur…',
  'Pressing the suit…',
];

/** The Encore mark, drawn live: the frame traces itself, the jacket rises, collar and tie slide in, a spark orbits. */
export function LogoMark({ className, animated = true, size }) {
  return (
    <svg viewBox="0 0 100 100" style={size ? { width: size, height: size } : undefined} className={cn('logo-loader', animated && 'is-live', className)} aria-hidden>
      <defs>
        <radialGradient id="ll-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FF6B00" stopOpacity=".45" /><stop offset="1" stopColor="#FF6B00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="ll-glow" cx="50" cy="50" r="52" fill="url(#ll-glow)" />
      <rect className="ll-frame" x="13.4" y="13.4" width="73.2" height="73.2" rx="15" fill="none" stroke="#FF6B00" strokeWidth="5.2" strokeLinecap="round" pathLength="1" />
      <polygon className="ll-jacket" fill="#FF6B00" points="23.7,29.6 39.2,21.4 61.2,21.4 76.6,29.6 82,43.2 78.8,62 70.4,72.8 49.8,80.8 29.6,72.8 21.2,62 18.2,43.2" />
      <g fill="#fff">
        <polygon className="ll-collar ll-l" points="41.6,18.2 47.8,23.8 38.8,29.4 39,21.4" />
        <polygon className="ll-collar ll-r" points="58.6,18.2 61.2,21.4 61.4,29.4 52.4,23.8" />
        <polygon className="ll-tie ll-l" points="45.8,27.4 48,30 41.8,51.6 45,56.2 38.7,51.2 39.6,31.4" />
        <polygon className="ll-tie ll-r" points="54.2,27.4 60.6,31.4 61.3,51.2 54.8,56.2 58.2,51.6 52.1,30" />
        <polygon className="ll-pocket" points="62.2,37.8 73.7,33.3 73.7,37.9" />
      </g>
      <g className="ll-orbit"><circle cx="50" cy="3.5" r="2.6" fill="#FFB692" /></g>
    </svg>
  );
}

/** Full loader: animated logo plus a rotating, slightly cheeky status line. */
export function LogoLoader({ label, size = 84, className, compact = false }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * LINES.length));
  useEffect(() => {
    if (label) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 2200);
    return () => clearInterval(t);
  }, [label]);
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 text-center', className)} role="status" aria-live="polite">
      <LogoMark size={size} className="drop-shadow-[0_10px_26px_rgba(255,107,0,0.35)]" />
      {!compact && <div key={label || i} className="loader-line text-[13px] font-semibold tracking-wide text-secondary">{label || LINES[i]}</div>}
    </div>
  );
}
