import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plane } from 'lucide-react';
import { api } from '@/lib/api';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/app-ui';
import { MapPicker, preloadMaps } from '@/components/lazy-maps';

const newSession = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
const RECENT_KEY = 'encore.recentPlaces';
const QUICK = [
  { id: 'q-bhx', text: 'Birmingham Airport (BHX), Birmingham, UK', main: 'Birmingham Airport (BHX)', secondary: 'Birmingham, UK', airport: true },
  { id: 'q-man', text: 'Manchester Airport (MAN), Manchester, UK', main: 'Manchester Airport (MAN)', secondary: 'Manchester, UK', airport: true },
  { id: 'q-lhr', text: 'Heathrow Airport (LHR), Longford, Hounslow, UK', main: 'Heathrow Airport (LHR)', secondary: 'London, UK', airport: true },
  { id: 'q-eme', text: 'East Midlands Airport (EMA), Castle Donington, Derby, UK', main: 'East Midlands Airport (EMA)', secondary: 'Derby, UK', airport: true },
];

const recent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
const remember = (it) => {
  try {
    const list = [it, ...recent().filter((r) => r.text !== it.text)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.map(({ id, text, main, secondary, airport, lat, lng }) => ({ id, text, main, secondary, airport, lat, lng }))));
  } catch { /* storage off */ }
};
// Phones get the full-screen search; desktop keeps the inline dropdown.
const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;

/** Debounced UK place suggestions (Google Places via our server — the key never reaches the app). */
function useSuggestions(query, enabled) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const session = useMemo(newSession, []);
  useEffect(() => {
    const q = (query || '').trim();
    if (!enabled || q.length < 3) { setItems([]); setLoading(false); return undefined; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/places?q=${encodeURIComponent(q)}&session=${session}`)
        .then((r) => { if (!cancelled) setItems(r || []); })
        .catch(() => { if (!cancelled) setItems([]); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, enabled, session]);
  return { items, loading };
}

/** Bold the part of the name that matches what was typed. */
function Highlight({ text, q }) {
  const i = q ? text.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
  if (i < 0 || !q.trim()) return text;
  const n = q.trim().length;
  return <>{text.slice(0, i)}<b className="font-extrabold text-[#141416]">{text.slice(i, i + n)}</b>{text.slice(i + n)}</>;
}

function PlaceRow({ it, q, icon, onPick, style }) {
  return (
    <li style={style} className="place-row">
      <button type="button" onClick={() => onPick(it)} className="flex w-full items-center gap-3.5 px-5 py-3 text-left active:bg-neutral-100">
        <span className={cn('grid h-10 w-10 flex-shrink-0 place-items-center rounded-full', it.airport ? 'bg-orange-50 text-[#FF710F]' : 'bg-neutral-100 text-neutral-600')}>
          {icon || (it.airport ? <Plane className="h-[18px] w-[18px]" /> : <MapPin className="h-[18px] w-[18px]" />)}
        </span>
        <span className="min-w-0 flex-1 border-b border-neutral-100 pb-3 pt-0.5">
          <span className="block truncate text-[15px] font-semibold text-neutral-800"><Highlight text={it.main || it.text} q={q} /></span>
          {it.secondary && <span className="mt-0.5 block truncate text-[12.5px] text-neutral-500">{it.secondary}</span>}
        </span>
      </button>
    </li>
  );
}

/**
 * Uber-style full-screen place search. The search box sits at the top and results fill the space
 * above the keyboard (sized to the visual viewport), so the keyboard never covers a result.
 */
export function PlaceSearchSheet({ title = 'Where to?', initial = '', onPick, onClose }) {
  const [q, setQ] = useState(initial);
  const [mapOpen, setMapOpen] = useState(false);
  const [vh, setVh] = useState(() => window.visualViewport?.height || window.innerHeight);
  const input = useRef(null);
  const { items, loading } = useSuggestions(q, true);
  const typing = q.trim().length >= 3;
  const past = useMemo(recent, []);

  useEffect(() => {
    preloadMaps();
    const vv = window.visualViewport;
    const fit = () => setVh(vv ? vv.height : window.innerHeight);
    vv?.addEventListener('resize', fit);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus after the slide-in so Android opens the keyboard reliably.
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { vv?.removeEventListener('resize', fit); document.body.style.overflow = prev; clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const pick = (it) => { haptic('select'); remember(it); onPick(it); };
  const submitFree = () => { const t = q.trim(); if (t) pick({ id: `free-${t}`, text: t, main: t.split(',')[0], secondary: t.split(',').slice(1).join(',').trim() }); };

  return createPortal(
    <div className="search-sheet fixed inset-x-0 top-0 z-[85] mx-auto flex max-w-[480px] flex-col overflow-hidden bg-white" style={{ height: vh }}>
      <div className="flex-shrink-0 border-b border-neutral-100 px-4 pb-3 pt-[max(12px,env(safe-area-inset-top))] shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
        <div className="mb-2.5 flex items-center gap-2">
          <button type="button" onClick={onClose} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full text-[#141416] active:bg-neutral-100"><Icon name="arrow_back" className="!text-[22px]" /></button>
          <div className="text-[17px] font-bold text-[#141416]">{title}</div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (items[0]) pick(items[0]); else submitFree(); }}
          className="flex h-[52px] items-center gap-2.5 rounded-2xl bg-neutral-100 px-4 ring-2 ring-[#FF710F]/60">
          <Icon name="search" className="!text-[21px] text-[#FF710F]" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search address, postcode, airport" autoComplete="off" enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold text-[#141416] placeholder:font-medium placeholder:text-neutral-400 focus:outline-none" />
          {loading ? <span className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FF710F]" />
            : q && <button type="button" aria-label="Clear" onClick={() => { setQ(''); input.current?.focus(); }} className="grid h-7 w-7 place-items-center rounded-full bg-neutral-300/70 text-white"><Icon name="close" className="!text-[16px]" /></button>}
        </form>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
        <li>
          <button type="button" onClick={() => { haptic('light'); setMapOpen(true); }} className="flex w-full items-center gap-3.5 px-5 py-3 text-left active:bg-neutral-100">
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="pin_drop" className="!text-[20px]" /></span>
            <span className="min-w-0 flex-1 border-b border-neutral-100 pb-3 pt-0.5">
              <span className="block text-[15px] font-semibold text-neutral-800">Set location on map</span>
              <span className="mt-0.5 block text-[12.5px] text-neutral-500">Use GPS and drag the pin to the exact spot</span>
            </span>
          </button>
        </li>

        {typing ? (
          items.length ? items.map((it, i) => <PlaceRow key={it.id} it={it} q={q} onPick={pick} style={{ animationDelay: `${i * 30}ms` }} />)
            : !loading && (
              <li className="px-5 py-8 text-center text-[14px] text-neutral-500">
                No matches yet.
                <button type="button" onClick={submitFree} className="mt-3 block w-full rounded-xl bg-neutral-100 py-3 font-semibold text-neutral-800">Use “{q.trim()}” as typed</button>
              </li>
            )
        ) : (
          <>
            {past.length > 0 && <li className="px-5 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Recent</li>}
            {past.map((it) => <PlaceRow key={`r-${it.text}`} it={it} q="" onPick={pick} icon={<Icon name="history" className="!text-[19px]" />} />)}
            <li className="px-5 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Popular airports</li>
            {QUICK.map((it) => <PlaceRow key={it.id} it={it} q="" onPick={pick} />)}
          </>
        )}
        {typing && items.length > 0 && <li className="px-5 pt-2 text-right text-[10px] text-neutral-400">Powered by Google</li>}
      </ul>

      {mapOpen && (
        <MapPicker title={title} confirmLabel="Confirm location" onClose={() => setMapOpen(false)}
          onConfirm={(p) => { setMapOpen(false); pick({ ...p, id: `pin-${p.lat},${p.lng}` }); }} />
      )}
    </div>,
    document.body,
  );
}

/**
 * Address field. On phones, tapping it opens the full-screen search (keyboard never hides the
 * results); on desktop it shows suggestions in a dropdown. Free text is always allowed.
 * onSelect receives the chosen place (with lat/lng when it was pinned on the map).
 */
export function AddressInput({ value, onChange, onSelect, placeholder, invalid, className, inputClassName, autoFocus, name, sheetTitle }) {
  const [phone] = useState(isPhone);
  const [sheet, setSheet] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false);
  const boxRef = useRef(null);
  const [query, setQuery] = useState('');
  const { items, loading } = useSuggestions(query, !phone && typed.current);

  useEffect(() => { if (items.length) { setOpen(true); setActive(-1); } }, [items]);
  useEffect(() => { if (phone && autoFocus) setSheet(true); }, [phone, autoFocus]);
  useEffect(() => {
    const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const pick = (it) => { typed.current = false; onChange(it.text); setOpen(false); setSheet(false); onSelect?.(it); };
  const onKey = (e) => {
    if (!open || !items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(items[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };
  const inputCls = cn(inputClassName || 'block h-11 w-full rounded-xl border border-input bg-white px-3.5 text-[15px] text-ink shadow-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20', invalid && 'border-red-400');

  if (phone) {
    return (
      <div className={cn('relative', className)}>
        <input name={name} readOnly value={value ?? ''} placeholder={placeholder} inputMode="none"
          onClick={() => { haptic('light'); setSheet(true); }} onFocus={(e) => e.target.blur()}
          className={cn(inputCls, 'cursor-pointer caret-transparent')} />
        {sheet && <PlaceSearchSheet title={sheetTitle || placeholder || 'Search'} initial={value || ''} onPick={pick} onClose={() => setSheet(false)} />}
      </div>
    );
  }

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <input
        name={name}
        autoFocus={autoFocus}
        autoComplete="off"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => { typed.current = true; setQuery(e.target.value); onChange(e.target.value); }}
        onFocus={() => items.length && setOpen(true)}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={inputCls}
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
