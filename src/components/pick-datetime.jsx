import { useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Button that opens the phone's native date & time picker. An invisible input laid over a chip
 * does not open on Android WebView, so the tap calls showPicker() on a hidden input instead.
 */
export function PickDateTime({ value, min, onChange, className, children }) {
  const input = useRef(null);
  const open = () => {
    const el = input.current;
    if (!el) return;
    try { el.showPicker(); } catch { el.focus(); el.click(); }
  };
  return (
    <button type="button" onClick={open} className={cn('relative', className)}>
      {children}
      <input ref={input} type="datetime-local" min={min} value={value || ''} tabIndex={-1} aria-hidden
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0" />
    </button>
  );
}
