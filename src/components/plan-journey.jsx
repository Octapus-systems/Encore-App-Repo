// "Plan your journey" — full-screen, Uber-style trip planner opened from the Home search bar.
// Pickup + destination stacked in one route card at the top, results fill the space above the
// keyboard, with distance from the pickup, saved places, recents and a drag-the-pin map option.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/app-ui';
import { QUICK, recent, remember, useSuggestions } from '@/components/address';
import { MapPicker, MiniMap, preloadMaps } from '@/components/lazy-maps';

const SAVED_KEY = 'encore.savedPlaces';
const TYPES = [['point_to_point', 'One way', 'east'], ['return', 'Return', 'sync_alt'], ['airport', 'Airport', 'flight'], ['hourly', 'By the hour', 'schedule'], ['corporate', 'Corporate', 'business_center'], ['event', 'Event', 'celebration']];
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
// Straight-line miles from the pickup to a remembered place (for recents / airports).
const AIRPORT_AT = { 'q-bhx': [52.4539, -1.748], 'q-man': [53.3588, -2.2727], 'q-lhr': [51.47, -0.4543], 'q-eme': [52.8311, -1.3281] };
const crow = (a, b) => {
  const R = 6371000; const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
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
  const [field, setField] = useState(here.place ? 'destination' : 'pickup'); // which row is being typed into
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
  const away = (it) => {
    const at = it.lat != null ? it : AIRPORT_AT[it.id] ? { lat: AIRPORT_AT[it.id][0], lng: AIRPORT_AT[it.id][1] } : null;
    return pickup?.lat != null && at ? miles(crow(pickup, at)) : null;
  };
  // Map centres on the pickup pin, or the phone's GPS position when the pickup was typed.
  const mapAt = pickup?.lat != null ? pickup : dest?.lat != null ? dest : here.place?.lat != null ? here.place : null;
  const keyboard = vh < window.innerHeight * 0.8;
  const showMap = !saving && !keyboard && !query;

  // No GPS → ask for the pickup first.
  useEffect(() => { if (here.status === 'error' && !pickup && !q.pickup && !q.destination) setField('pickup'); }, [here.status]); // eslint-disable-line react-hooks/exhaustive-deps
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
    return () => { vv?.removeEventListener('resize', fit); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focus = (f) => { setField(f); setMenu(null); setTimeout(() => inputs[f].current?.focus({ preventScroll: true }), 0); };
  const finish = (p, d) => { haptic('success'); onDone({ pickup: p, destination: d, type, when }); };

  const choose = async (it, f = field) => {
    haptic('select');
    let place = strip(it);
    // Suggestions carry no coordinates — look them up first so maps can pin the place.
    if (place.lat == null && place.text) {
      const c = await api.get(`/places/geocode?q=${encodeURIComponent(place.text)}`).catch(() => null);
      if (c) place = { ...place, lat: c.lat, lng: c.lng };
    }
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
      {/* Live map of where the customer is — folds away while typing so results get the room. */}
      <div className="relative flex-shrink-0 overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(.2,.85,.25,1)]" style={{ height: showMap ? Math.round(vh * 0.32) : 0 }}>
        <MiniMap center={mapAt} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-[#0E0E10]" />
        {/* Tap the map to open the full-screen pin picker for the pickup. */}
        <button type="button" aria-label="Adjust pickup on the map" onClick={() => { haptic('light'); setMap('pickup'); }} className="absolute inset-0 z-[1]" />
        <span className="pointer-events-none absolute bottom-10 right-4 z-[2] flex items-center gap-1.5 rounded-full bg-[#141416]/85 px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg ring-1 ring-white/10">
          <Icon name="open_in_full" className="!text-[15px] text-[#FF8A3D]" />{mapAt ? 'Tap to adjust pin' : 'Tap to set on map'}
        </span>
        <button type="button" onClick={onClose} aria-label="Back" className="absolute left-4 z-[2] top-[max(12px,env(safe-area-inset-top))] grid h-11 w-11 place-items-center rounded-full bg-black/55 ring-1 ring-white/15 backdrop-blur-md active:scale-95"><Icon name="arrow_back" className="!text-[22px]" /></button>
        <div className="plan-pill pointer-events-none absolute z-[2] left-16 right-[86px] top-[max(14px,env(safe-area-inset-top))] flex h-10 items-center justify-center gap-2 rounded-full bg-black/60 px-4 ring-1 ring-white/10 backdrop-blur-md">
          {pickup ? <span className="relative flex h-2 w-2 flex-shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" /><span className="relative h-2 w-2 rounded-full bg-emerald-400" /></span>
            : <span className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-white/25 border-t-white" />}
          <span className="truncate text-[12.5px] font-semibold text-white/90">{pickup ? (pickup.text || pickup.main) : here.status === 'error' ? 'Location unavailable — type your pickup' : 'Finding your location…'}</span>
        </div>
      </div>

      {/* Sheet */}
      <div className={cn('plan-body relative z-10 flex-shrink-0 rounded-t-[28px] bg-[#0E0E10] px-4 transition-[margin] duration-500', showMap ? '-mt-7 pt-2.5' : 'pt-[max(10px,env(safe-area-inset-top))]')}>
        {showMap ? <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-white/20" /> : (
          <div className="relative flex h-12 items-center justify-center">
            <button type="button" onClick={onClose} aria-label="Back" className="absolute left-0 grid h-10 w-10 place-items-center rounded-full active:bg-white/10"><Icon name="arrow_back" className="!text-[22px]" /></button>
            <div className="text-[17px] font-bold tracking-tight">{saving ? `Set your ${saving === 'home' ? 'Home' : 'Work'} address` : 'Plan your journey'}</div>
          </div>
        )}

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
          {/* Connector: a short dotted line centred between the two markers (card padding 6 + row padding 12 + half marker 11 = 29px). */}
          <span className="pointer-events-none absolute left-[28px] top-[41px] z-20 flex h-[30px] w-[2px] flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => <i key={i} className="block h-[3px] w-[2px] rounded-full" style={{ background: i < 2 ? '#34D399' : i > 2 ? '#FF710F' : '#9CA3AF', opacity: 0.85 }} />)}
          </span>
          {['pickup', 'destination'].map((f) => {
            const active = field === f && !saving;
            const has = f === 'pickup' ? pickup : dest;
            return (
              <div key={f} className={cn('relative flex h-[50px] items-center gap-3 rounded-2xl px-3 transition', active ? 'plan-glow bg-white/[0.07] ring-1 ring-[#FF710F]/70' : '')}>
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
      <ul className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/[0.06] pb-6 pt-1" onScroll={() => document.activeElement?.blur?.()}>
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
            {past.map((it, i) => <Row key={`r-${it.text}`} it={it} onPick={(x) => choose(x)} icon="history" dist={away(it)} delay={i * 28} />)}
            <li className="px-5 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">Airport transfers</li>
            <li className="grid grid-cols-2 gap-2.5 px-4">
              {QUICK.map((it, i) => (
                <button key={it.id} type="button" onClick={() => choose(it)} style={{ animationDelay: `${(past.length + i) * 40}ms` }}
                  className="plan-card group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-3.5 text-left ring-1 ring-white/10 active:scale-[0.97]">
                  <span className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rounded-full bg-[#FF710F]/20 blur-2xl transition-opacity group-active:opacity-100" />
                  <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-[#FF710F]/15 text-[#FF8A3D]"><Icon name="flight_takeoff" className="!text-[19px]" /></span>
                  <span className="relative mt-2.5 block text-[14px] font-bold leading-tight">{it.main.replace(/ Airport.*$/, '')}</span>
                  <span className="relative mt-0.5 flex items-center justify-between text-[11.5px] text-white/45"><span>{(it.main.match(/\(([A-Z]{3})\)/) || [])[1] || 'Airport'}</span>{away(it) && <span>{away(it)}</span>}</span>
                </button>
              ))}
            </li>
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
