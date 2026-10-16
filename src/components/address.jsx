import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Plane } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const newSession = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

/**
 * Text input with UK address / place suggestions (Google Places via our server).
 * Free text is always allowed — suggestions only help.
 */
export function AddressInput({ value, onChange, placeholder, invalid, className, inputClassName, autoFocus, name }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const session = useMemo(newSession, []);
  const typed = useRef(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = (value || '').trim();
    if (!typed.current || q.length < 3) { setItems([]); return undefined; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/places?q=${encodeURIComponent(q)}&session=${session}`)
        .then((r) => { if (!cancelled) { setItems(r || []); setOpen(true); setActive(-1); } })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value, session]);

  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const pick = (it) => { typed.current = false; onChange(it.text); setOpen(false); setItems([]); };
  const onKey = (e) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <input
        name={name}
        autoFocus={autoFocus}
        autoComplete="off"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => { typed.current = true; onChange(e.target.value); }}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={cn(inputClassName || 'block h-11 w-full rounded-xl border border-input bg-white px-3.5 text-[15px] text-ink shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20', invalid && 'border-red-400')}
      />
      {loading && <span className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FF710F]" />}
      {open && items.length > 0 && (
        <ul role="listbox" className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-2xl border border-black/5 bg-white py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.14)]">
          {items.map((it, i) => (
            <li key={it.id} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(it)}
                className={cn('flex w-full items-start gap-3 px-4 py-2.5 text-left transition', i === active ? 'bg-orange-50' : 'hover:bg-neutral-50')}>
                <span className={cn('mt-0.5 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full', it.airport ? 'bg-orange-100 text-[#FF710F]' : 'bg-neutral-100 text-neutral-600')}>
                  {it.airport ? <Plane className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-neutral-900">{it.main}</span>
                  {it.secondary && <span className="block truncate text-[12px] text-neutral-500">{it.secondary}</span>}
                </span>
              </button>
            </li>
          ))}
          <li className="px-4 pb-1 pt-1.5 text-right text-[10px] text-neutral-400">Powered by Google</li>
        </ul>
      )}
    </div>
  );
}
