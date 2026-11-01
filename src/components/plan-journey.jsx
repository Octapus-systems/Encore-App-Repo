// "Plan your journey" — full-screen, Uber-style trip planner opened from the Home search bar.
// Pickup + destination stacked in one route card at the top, results fill the space above the
// keyboard, with distance from the pickup, saved places, recents and a drag-the-pin map option.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/app-ui';
import { QUICK, recent, remember, useSuggestions } from '@/components/address';
import { MapPicker, preloadMaps } from '@/components/lazy-maps';

const SAVED_KEY = 'encore.savedPlaces';
const TYPES = [['point_to_point', 'One way', 'east'], ['return', 'Return', 'sync_alt'], ['airport', 'Airport', 'flight'], ['hourly', 'By the hour', 'schedule']];
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function whenOptions() {
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 3600000); soon.setMinutes(Math.ceil(soon.getMinutes() / 15) * 15, 0, 0);
  const evening = new Date(now); evening.setHours(19, 0, 0, 0);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  const out = [['Later today', soon]];
  if (evening > soon) out.push(['This evening', evening]);
  out.push(['Tomorrow 9am', tomorrow]);
  return out.map(([l, d]) => [l, localInput(d)]);
}
const whenLabel = (v, opts) => opts.find(([, x]) => x === v)?.[0]
  || (v ? new Date(v).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Pickup time');
const miles = (m) => (m == null ? null : m < 160 ? 'here' : `${(m / 1609.344).toFixed(m < 16093 ? 1 : 0)} mi`);
const saved = () => { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}'); } catch { return {}; } };
const strip = ({ text, main, secondary, airport, lat, lng }) => ({ text, main, secondary, airport, lat, lng });

function Row({ it, q, onPick, icon, dist, delay }) {
  const name = it.main || it.text;
  const i = q ? name.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
  const n = q?.trim().length || 0;
  return (
    <li className="place-row" style={{ animationDelay: `${delay || 0}ms` }}>
      <button type="button" onClick={() => onPick(it)} className="flex w-full items-center gap-3.5 px-5 py-2.5 text-left active:bg-white/5">
        <span className="flex w-11 flex-shrink-0 flex-col items-center gap-0.5">
          <span className={cn('grid h-9 w-9 place-items-center rounded-full', it.airport ? 'bg-[#FF710F]/15 text-[#FF8A3D]' : 'bg-white/[0.07] text-white/70')}>
            <Icon name={icon || (it.airport ? 'flight' : 'location_on')} className="!text-[19px]" />
          </span>
          {dist && <span className="text-[10.5px] font-semibold text-white/40">{dist}</span>}
        </span>
        <span className="min-w-0 flex-1 border-b border-white/[0.06] pb-2.5 pt-0.5">
          <span className="block truncate text-[15px] font-semibold text-white/90">
            {i >= 0 && n ? <>{name.slice(0, i)}<span className="text-[#FF8A3D]">{name.slice(i, i + n)}</span>{name.slice(i + n)}</> : name}
          </span>
          {it.secondary && <span className="mt-0.5 block truncate text-[12.5px] text-white/45">{it.secondary}</span>}
        </span>
      </button>
    </li>
  );
}

/**
 * here: { place, status, fetchNow } from useCurrentLocation. onDone({ pickup, destination, type, when }).
 */
export function PlanJourney({ here, initialType, onDone, onClose }) {
  const [pickup, setPickup] = useState(here.place ? { ...here.place, gps: true } : null);
  const [dest, setDest] = useState(null);
  const [field, setField] = useState('destination'); // which row is being typed into
  const [q, setQ] = useState({ pickup: '', destination: '' });
  const [type, setType] = useState(initialType && initialType !== 'all' ? initialType : 'point_to_point');
  const [when, setWhen] = useState('');
  const [menu, setMenu] = useState(null); // 'when' | 'type'
  const [map, setMap] = useState(null); // field the map picker is for, or 'home'/'work'
  const [saving, setSaving] = useState(null); // 'home' | 'work' while choosing a saved place
  const [places, setPlaces] = useState(saved);
  const [vh, setVh] = useState(() => window.visualViewport?.height || window.innerHeight);
  const inputs = { pickup: useRef(null), destination: useRef(null) };
  const opts = useMemo(whenOptions, []);
  const past = useMemo(recent, []);
  const query = q[field];
  const { items, loading } = useSuggestions(query, true, pickup?.lat != null ? pickup : null);
  const typing = query.trim().length >= 3;

  // The GPS answer may arrive after the sheet opened.
  useEffect(() => { if (here.place && !pickup) setPickup({ ...here.place, gps: true }); }, [here.place, pickup]);
  useEffect(() => {
    preloadMaps();
    if (!here.place && here.status !== 'loading') here.fetchNow?.();
    const vv = window.visualViewport;
    const fit = () => setVh(vv ? vv.height : window.innerHeight);
    vv?.addEventListener('resize', fit);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => inputs.destination.current?.focus({ preventScroll: true }), 80);
    return () => { vv?.removeEventListener('resize', fit); document.body.style.overflow = prev; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focus = (f) => { setField(f); setMenu(null); setTimeout(() => inputs[f].current?.focus({ preventScroll: true }), 0); };
  const finish = (p, d) => { haptic('success'); onDone({ pickup: p, destination: d, type, when }); };

  const choose = (it, f = field) => {
    haptic('select');
    const place = strip(it);
    if (saving) {
      const next = { ...places, [saving]: place };
      setPlaces(next);
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* storage off */ }
      setSaving(null); setQ((s) => ({ ...s, [f]: '' }));
      return;
    }
    remember(place);
    setQ((s) => ({ ...s, [f]: '' }));
    if (f === 'pickup') {
      setPickup(place);
      if (dest) finish(place, dest); else focus('destination');
    } else {
      setDest(place);
      if (pickup) finish(pickup, place); else focus('pickup');
    }
  };
  const shortcut = (k) => {
    if (places[k]) choose(places[k]);
    else { haptic('light'); setSaving(k); focus(field); }
  };

  const value = (f) => (f === field ? q[f] : '');
  const shown = (f) => {
    const p = f === 'pickup' ? pickup : dest;
    return p ? (p.gps ? 'Current location' : p.main || p.text) : '';
  };

  return createPortal(
    <div className="plan-sheet fixed inset-x-0 top-0 z-[85] mx-auto flex max-w-[480px] flex-col overflow-hidden bg-[#0E0E10] text-white" style={{ height: vh }}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-[max(10px,env(safe-area-inset-top))]">
        <div className="relative flex h-12 items-center justify-center">
          <button type="button" onClick={onClose} aria-label="Back" className="absolute left-0 grid h-10 w-10 place-items-center rounded-full active:bg-white/10"><Icon name="arrow_back" className="!text-[22px]" /></button>
          <div className="text-[17px] font-bold tracking-tight">{saving ? `Set your ${saving === 'home' ? 'Home' : 'Work'} address` : 'Plan your journey'}</div>
        </div>

        {/* When / type chips */}
        {!saving && (
          <div className="relative mt-1 flex gap-2">
            <button type="button" onClick={() => { haptic('light'); setMenu(menu === 'when' ? null : 'when'); }}
              className={cn('flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition', when ? 'bg-[#FF710F] text-white' : 'bg-white/[0.08] text-white/85')}>
              <Icon name="schedule" className="!text-[17px]" />{whenLabel(when, opts)}<Icon name="expand_more" className="!text-[17px] opacity-70" />
            </button>
            <button type="button" onClick={() => { haptic('light'); setMenu(menu === 'type' ? null : 'type'); }}
              className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 text-[13px] font-semibold text-white/85">
              <Icon name={TYPES.find(([k]) => k === type)?.[2]} className="!text-[17px]" />{TYPES.find(([k]) => k === type)?.[1]}<Icon name="expand_more" className="!text-[17px] opacity-70" />
            </button>
            {menu && (
              <div className="plan-menu absolute left-0 top-11 z-30 w-60 overflow-hidden rounded-2xl bg-[#1C1C1F] py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
                {menu === 'when' ? (
                  <>
                    {opts.map(([l, v]) => (
                      <button key={l} type="button" onClick={() => { setWhen(v); setMenu(null); haptic('select'); }} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] font-medium active:bg-white/5">
                        {l}{when === v && <Icon name="check" className="!text-[18px] text-[#FF8A3D]" />}
                      </button>
                    ))}
                    <label className="relative flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-[14px] font-medium text-[#FF8A3D]">
                      <Icon name="calendar_month" className="!text-[18px]" />Choose date & time
                      <input type="datetime-local" min={localInput(new Date())} className="absolute inset-0 opacity-0" onChange={(e) => { setWhen(e.target.value); setMenu(null); }} />
                    </label>
                  </>
                ) : TYPES.map(([k, l, ic]) => (
                  <button key={k} type="button" onClick={() => { setType(k); setMenu(null); haptic('select'); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] font-medium active:bg-white/5">
                    <Icon name={ic} className="!text-[18px] text-white/60" /><span className="flex-1">{l}</span>{type === k && <Icon name="check" className="!text-[18px] text-[#FF8A3D]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Route card */}
        <div className="relative mt-3 rounded-[22px] bg-white/[0.05] p-1.5 ring-1 ring-white/10">
          <span className="pointer-events-none absolute bottom-[30px] left-[25px] top-[30px] w-[2px] rounded-full bg-gradient-to-b from-emerald-400/80 to-[#FF710F]/80" />
          {['pickup', 'destination'].map((f) => {
            const active = field === f && !saving;
            const has = f === 'pickup' ? pickup : dest;
            return (
              <div key={f} className={cn('relative flex h-[50px] items-center gap-3 rounded-2xl px-3 transition', active ? 'bg-white/[0.07] ring-1 ring-[#FF710F]/70' : '')}>
                <span className="relative z-10 grid h-[22px] w-[22px] flex-shrink-0 place-items-center">
                  {f === 'pickup'
                    ? <span className="h-3 w-3 rounded-full border-[3px] border-emerald-400 bg-[#0E0E10]" />
                    : <span className="h-3 w-3 rounded-[3px] bg-[#FF710F]" />}
                </span>
                <input ref={inputs[f]} value={field === f ? value(f) : ''} placeholder={shown(f) || (f === 'pickup' ? (here.status === 'loading' ? 'Finding your location…' : 'Pickup address') : 'Where to?')}
                  onFocus={() => { setField(f); setMenu(null); }} onChange={(e) => setQ((s) => ({ ...s, [f]: e.target.value }))}
                  autoComplete="off" enterKeyHint="search"
                  className={cn('min-w-0 flex-1 bg-transparent text-[15.5px] font-semibold focus:outline-none', has && !(field === f && q[f]) ? 'placeholder:text-white' : 'placeholder:text-white/40')} />
                {field === f && q[f] ? (
                  loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#FF710F]" />
                    : <button type="button" aria-label="Clear" onClick={() => setQ((s) => ({ ...s, [f]: '' }))} className="grid h-6 w-6 place-items-center rounded-full bg-white/15"><Icon name="close" className="!text-[15px]" /></button>
                ) : (
                  <button type="button" aria-label={`Choose ${f} on the map`} onClick={() => { haptic('light'); setMap(f); }} className="grid h-8 w-8 place-items-center rounded-full text-white/55 active:bg-white/10"><Icon name="map" className="!text-[19px]" /></button>
                )}
              </div>
            );
          })}
        </div>

        {/* Saved places */}
        {!saving && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-3">
            {[['home', 'Home', 'home'], ['work', 'Work', 'work']].map(([k, l, ic]) => (
              <button key={k} type="button" onClick={() => shortcut(k)} className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/10 active:scale-95">
                <Icon name={ic} className="!text-[17px] text-[#FF8A3D]" />{places[k] ? l : `Add ${l}`}
              </button>
            ))}
            <button type="button" onClick={() => { haptic('light'); setMap(field); }} className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-3.5 text-[13px] font-semibold text-white/85 ring-1 ring-white/10 active:scale-95">
              <Icon name="pin_drop" className="!text-[17px] text-emerald-400" />Pin on map
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/[0.06] pb-6 pt-1" onScroll={() => document.activeElement?.blur?.()}>
        {typing ? (
          items.length ? items.map((it, i) => <Row key={it.id} it={it} q={query} onPick={(x) => choose(x)} dist={miles(it.distance_m)} delay={i * 28} />)
            : !loading && (
              <li className="px-5 py-8 text-center text-[14px] text-white/50">
                No matches yet.
                <button type="button" onClick={() => choose({ text: query.trim(), main: query.trim() })} className="mt-3 block w-full rounded-xl bg-white/[0.07] py-3 font-semibold text-white/90">Use “{query.trim()}” as typed</button>
              </li>
            )
        ) : (
          <>
            {field === 'pickup' && here.place && !saving && (
              <Row it={{ ...here.place, main: 'Current location', secondary: here.place.text }} onPick={() => { setPickup({ ...here.place, gps: true }); if (dest) finish({ ...here.place, gps: true }, dest); else focus('destination'); }} icon="my_location" />
            )}
            {past.length > 0 && <li className="px-5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Recent</li>}
            {past.map((it, i) => <Row key={`r-${it.text}`} it={it} onPick={(x) => choose(x)} icon="history" delay={i * 28} />)}
            <li className="px-5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Airports</li>
            {QUICK.map((it, i) => <Row key={it.id} it={it} onPick={(x) => choose(x)} delay={(past.length + i) * 28} />)}
          </>
        )}
        {typing && items.length > 0 && <li className="px-5 pt-2 text-right text-[10px] text-white/30">Powered by Google</li>}
      </ul>

      {map && (
        <MapPicker
          title={map === 'pickup' ? 'Set your pickup' : 'Set your destination'}
          confirmLabel={map === 'pickup' ? 'Confirm pickup' : 'Confirm destination'}
          initial={(map === 'pickup' ? pickup : dest)?.lat != null ? (map === 'pickup' ? pickup : dest) : null}
          onClose={() => setMap(null)}
          onConfirm={(p) => { const f = map; setMap(null); setField(f); choose(p, f); }} />
      )}
    </div>,
    document.body,
  );
}
