// "Plan your journey" — full-screen trip planner opened from the Home search bar.
// Clean, light executive theme with cinematic dark map shadows & luxury chauffeur accents.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { lockPageScroll, useVisibleArea } from '@/lib/scroll-lock';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { usePublicSettings } from '@/lib/auth';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/app-ui';
import { QUICK, recent, remember, useSuggestions } from '@/components/address';
import { MapPicker, MiniMap, preloadMaps } from '@/components/lazy-maps';
import { PickDateTime, earliestPickup } from '@/components/pick-datetime';

const SAVED_KEY = 'encore.savedPlaces';
const TYPES = [
  ['point_to_point', 'One way', 'east'],
  ['return', 'Return', 'sync_alt'],
  ['airport', 'Airport', 'flight'],
  ['hourly', 'By the hour', 'schedule'],
  ['corporate', 'Corporate', 'business_center'],
  ['event', 'Event', 'celebration'],
];
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function whenOptions() {
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 3600000);
  soon.setMinutes(Math.ceil(soon.getMinutes() / 15) * 15, 0, 0);
  const evening = new Date(now);
  evening.setHours(19, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  // Every option names its exact time, and "Later today" is only used while it really is today.
  const hm = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const sameDay = soon.toDateString() === now.toDateString();
  const out = [[sameDay ? `Later today · ${hm(soon)}` : `Tomorrow · ${hm(soon)}`, soon]];
  if (evening > soon) out.push([`This evening · ${hm(evening)}`, evening]);
  if (tomorrow.getTime() !== soon.getTime()) out.push([`Tomorrow · ${hm(tomorrow)}`, tomorrow]);
  return out.map(([l, d]) => [l, localInput(d)]);
}

const whenLabel = (v, opts) =>
  opts.find(([, x]) => x === v)?.[0] ||
  (v
    ? (() => {
        const d = new Date(v);
        const dateStr = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
        const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr}, ${timeStr}`;
      })()
    : 'Pickup time');

const miles = (m) => (m == null ? null : m < 160 ? 'here' : `${(m / 1609.344).toFixed(m < 16093 ? 1 : 0)} mi`);

// Straight-line miles from the pickup to a remembered place (for recents / airports).
const AIRPORT_AT = {
  'q-bhx': [52.4539, -1.748],
  'q-man': [53.3588, -2.2727],
  'q-lhr': [51.47, -0.4543],
  'q-eme': [52.8311, -1.3281],
};

const crow = (a, b) => {
  const R = 6371000;
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const saved = () => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || '{}');
  } catch {
    return {};
  }
};

const strip = ({ text, main, secondary, airport, lat, lng }) => ({ text, main, secondary, airport, lat, lng });

function Row({ it, q, onPick, icon, dist, delay }) {
  const name = it.main || it.text;
  const i = q ? name.toLowerCase().indexOf(q.trim().toLowerCase()) : -1;
  const n = q?.trim().length || 0;
  return (
    <li className="place-row" style={{ animationDelay: `${delay || 0}ms` }}>
      <button
        type="button"
        onClick={() => onPick(it)}
        className="group flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100"
      >
        <span className="flex w-9 flex-shrink-0 flex-col items-center gap-0.5">
          <span
            className={cn(
              'grid h-9 w-9 place-items-center rounded-full transition-all',
              it.airport && !icon
                ? 'bg-gradient-to-br from-[#FF710F] to-[#FF9A3D] text-white shadow-sm shadow-orange-500/20'
                : 'bg-neutral-50 text-neutral-500 ring-1 ring-neutral-200/80 group-hover:bg-neutral-950 group-hover:text-white group-hover:ring-neutral-950'
            )}
          >
            <Icon name={icon === 'history' && it.airport ? 'flight' : icon || (it.airport ? 'flight' : 'location_on')} className="!text-[18px]" />
          </span>
          {dist && <span className="text-[10px] font-semibold text-neutral-400">{dist}</span>}
        </span>
        <span className="min-w-0 flex-1 border-b border-neutral-100/80 pb-2 pt-0.5">
          <span className="block truncate text-[14.5px] font-semibold text-neutral-900">
            {i >= 0 && n ? (
              <>
                {name.slice(0, i)}
                <span className="text-[#FF710F] font-bold">{name.slice(i, i + n)}</span>
                {name.slice(i + n)}
              </>
            ) : (
              name
            )}
          </span>
          {it.secondary && <span className="block truncate text-[12px] text-neutral-500">{it.secondary}</span>}
        </span>
        <span className="pr-0.5 text-neutral-300 transition-colors group-hover:text-neutral-600">
          <Icon name="north_west" className="!text-[16px]" />
        </span>
      </button>
    </li>
  );
}

/**
 * here: { place, status, fetchNow } from useCurrentLocation. onDone({ pickup, destination, type, when }).
 */
// iOS-style "spring" curve: very fast start, soft landing — reads as instant but smooth.
const SPRING = 'cubic-bezier(.32,.72,0,1)';
const OPEN_MS = 320;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function PlanJourney({ here, initialType, initialPickup, initialDest, onDone, onClose: closeNow, origin }) {
  // Opening: the real planner is on screen from the first frame. The Pickup / Drop-off card glides up
  // from where the "Where to?" bar was, the map drops in behind it and the lists follow — transform and
  // opacity only (GPU). Heavy work (map engine, page freeze) waits until the motion has finished.
  const sheetEl = useRef(null);
  const bodyEl = useRef(null);
  const mapEl = useRef(null);
  const listEl = useRef(null);
  useLayoutEffect(() => {
    if (reducedMotion()) return;
    const go = (el, frames, opts) => el?.animate(frames, { duration: OPEN_MS, easing: SPRING, fill: 'backwards', ...opts });
    if (origin && bodyEl.current) {
      const r = bodyEl.current.getBoundingClientRect();
      const dy = Math.max(-260, Math.min(320, origin.top - r.top));
      go(bodyEl.current, [{ transform: `translateY(${dy}px) scale(.97)`, borderRadius: '28px' }, { transform: 'none' }], { duration: 380 });
    } else {
      go(bodyEl.current, [{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'none', opacity: 1 }]);
    }
    go(sheetEl.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 100, easing: 'linear' });
    go(mapEl.current, [{ transform: 'translateY(-24px) scale(1.04)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360 });
    go(listEl.current, [{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { delay: 70, duration: 300 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [settled, setSettled] = useState(false);
  const [closing, setClosing] = useState(false);
  const onClose = () => {
    if (closing) return;
    if (reducedMotion()) { closeNow(); return; }
    setClosing(true);
    setTimeout(closeNow, 170);
  };
  const { data: settings } = usePublicSettings();
  const [pickup, setPickup] = useState(initialPickup || (here.place ? { ...here.place, gps: true } : null));
  const [dest, setDest] = useState(initialDest || null);
  const [field, setField] = useState(initialPickup || here.place ? 'destination' : 'pickup');
  const [q, setQ] = useState({ pickup: '', destination: '' });
  const [type, setType] = useState(initialType && initialType !== 'all' ? initialType : 'point_to_point');
  const [when, setWhen] = useState('');
  const [menu, setMenu] = useState(null); // 'when' | 'type'
  const [map, setMap] = useState(null);
  const [saving, setSaving] = useState(null);
  const [places, setPlaces] = useState(saved);
  const [swapped, setSwapped] = useState(false);
  const sheetRef = useRef(null);
  const { h: vh, y: vTop } = useVisibleArea(sheetRef, useState, useEffect);
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

  const mapAt = pickup?.lat != null ? pickup : dest?.lat != null ? dest : here.place?.lat != null ? here.place : null;
  const keyboard = vh < window.innerHeight * 0.8;
  // While typing (or setting Home / Work) everything but the search box and results steps aside,
  // so suggestions sit right under the box and stay above the phone keyboard.
  const compact = !!saving || keyboard || !!query;
  const showMap = !compact;

  useEffect(() => {
    if (here.status === 'error' && !pickup && !q.pickup && !q.destination) setField('pickup');
  }, [here.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (here.place && !pickup) setPickup({ ...here.place, gps: true });
  }, [here.place, pickup]);

  useEffect(() => {
    preloadMaps();
    if (!here.place && here.status !== 'loading') here.fetchNow?.();
    let unlock = null;
    const t = setTimeout(() => { unlock = lockPageScroll(); setSettled(true); }, reducedMotion() ? 0 : OPEN_MS);
    return () => { clearTimeout(t); unlock?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focus = (f) => {
    setField(f);
    setMenu(null);
    setTimeout(() => inputs[f].current?.focus({ preventScroll: true }), 0);
  };

  const finish = (p, d) => {
    haptic('success');
    onDone({ pickup: p, destination: d, type, when });
  };

  const choose = async (it, f = field) => {
    haptic('select');
    let place = strip(it);
    if (place.lat == null && place.text) {
      const c = await api.get(`/places/geocode?q=${encodeURIComponent(place.text)}`).catch(() => null);
      if (c) place = { ...place, lat: c.lat, lng: c.lng };
    }
    if (saving) {
      const next = { ...places, [saving]: place };
      setPlaces(next);
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      } catch {
        /* storage off */
      }
      toast.success(`${saving === 'home' ? 'Home' : 'Work'} saved — tap it next time to fill it in.`);
      stopSaving();
      return;
    }
    remember(place);
    setQ((s) => ({ ...s, [f]: '' }));
    if (f === 'pickup') {
      setPickup(place);
      if (dest) finish(place, dest);
      else focus('destination');
    } else {
      setDest(place);
      if (pickup) finish(pickup, place);
      else focus('pickup');
    }
  };

  const beforeSave = useRef('destination');
  const startSaving = (k) => {
    haptic('light');
    beforeSave.current = field;
    setMenu(null);
    setSaving(k);
    setQ((s) => ({ ...s, destination: '' }));
    focus('destination'); // one search box is used while saving
  };
  const stopSaving = () => {
    setSaving(null);
    setQ((s) => ({ ...s, destination: '' }));
    setField(beforeSave.current);
  };
  const shortcut = (k) => (places[k] ? choose(places[k]) : startSaving(k));

  const swapLocations = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    haptic('light');
    setSwapped((s) => !s);

    const prevP = pickup;
    const prevD = dest;
    const prevQ = { ...q };

    // Swap place objects
    const nextP = prevD;
    const nextD = prevP;
    setPickup(nextP);
    setDest(nextD);

    // Swap query strings if typing
    setQ({
      pickup: prevQ.destination || '',
      destination: prevQ.pickup || '',
    });

    // Switch focus intelligently to the field that needs user input
    if (nextP && !nextD) {
      setField('destination');
      setTimeout(() => inputs.destination.current?.focus(), 60);
    } else if (!nextP && nextD) {
      setField('pickup');
      setTimeout(() => inputs.pickup.current?.focus(), 60);
    } else {
      const nextField = field === 'pickup' ? 'destination' : 'pickup';
      setField(nextField);
      setTimeout(() => inputs[nextField].current?.focus(), 60);
    }
  };

  const value = (f) => (f === field ? q[f] : '');
  const shown = (f) => {
    const p = f === 'pickup' ? pickup : dest;
    return p ? (p.gps ? 'Current location' : p.main || p.text) : '';
  };

  return createPortal(
    <>
    <div aria-hidden className={cn('plan-backdrop fixed inset-x-0 top-[-50vh] z-[84] mx-auto h-[200vh] max-w-[480px] bg-white', !settled && 'invisible', closing && 'is-closing')} />
    <div
      ref={(el) => { sheetRef.current = el; sheetEl.current = el; }}
      className={cn('plan-sheet fixed inset-x-0 top-0 z-[85] mx-auto flex max-w-[480px] flex-col overflow-hidden bg-white text-neutral-900 shadow-2xl', closing && 'is-closing')}
      style={{ height: vh, top: vTop }}
    >
      {/* Live map of where customer is — folds away while typing so results get the room */}
      <div
        ref={mapEl}
        className="relative flex-shrink-0 overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(.2,.85,.25,1)]"
        style={{ height: showMap ? Math.max(130, Math.round(vh * 0.22)) : 0 }}
      >
        {settled ? <MiniMap center={mapAt} className="plan-map-in absolute inset-0" /> : <div className="absolute inset-0 bg-[#E9EAEC]" />}

        {/* Small subtle dark shadow at the bottom of the map */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent z-[1]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent z-[1]" />

        <button
          type="button"
          aria-label="Adjust pickup on the map"
          onClick={() => { haptic('light'); setMap('pickup'); }}
          className="absolute inset-0 z-[1]"
        />

        <span className="pointer-events-none absolute bottom-9 right-4 z-[2] flex items-center gap-1.5 rounded-full bg-neutral-950/80 px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md">
          <Icon name="open_in_full" className="!text-[15px] text-[#FF710F]" />
          {mapAt ? 'Tap to adjust pin' : 'Tap to set on map'}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Back"
          className="absolute left-4 z-[2] top-[max(12px,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-neutral-950/80 text-white ring-1 ring-white/10 shadow-lg backdrop-blur-md transition hover:bg-neutral-950 active:scale-95"
        >
          <Icon name="arrow_back" className="!text-[22px]" />
        </button>

        <div className="plan-pill pointer-events-none absolute z-[2] left-16 right-[86px] top-[max(14px,env(safe-area-inset-top))] flex h-10 items-center justify-center gap-2 rounded-full bg-neutral-950/80 px-4 ring-1 ring-white/10 shadow-lg backdrop-blur-md">
          {pickup ? (
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : here.status === 'error' ? (
            <Icon name="location_off" className="!text-[15px] flex-shrink-0 text-amber-300" />
          ) : (
            <span className="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-[#FF710F]" />
          )}
          <span className="truncate text-[12.5px] font-semibold text-white">
            {pickup
              ? pickup.text || pickup.main
              : here.status === 'error'
              ? 'Location off — enter your pickup'
              : 'Finding your location…'}
          </span>
        </div>
      </div>

      {/* Sheet Body */}
      <div
        ref={bodyEl}
        className={cn(
          'plan-body relative z-10 flex-shrink-0 rounded-t-[30px] bg-white px-4 transition-[margin] duration-500 shadow-[0_-12px_40px_rgba(0,0,0,0.12)]',
          showMap ? '-mt-6 pt-2' : 'pt-[max(6px,env(safe-area-inset-top))]'
        )}
      >
        {showMap ? (
          <>
            <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-neutral-200" />
          </>
        ) : (
          <div className="relative flex h-11 items-center justify-center">
            <button
              type="button"
              onClick={saving ? stopSaving : onClose}
              aria-label="Back"
              className="absolute left-0 grid h-10 w-10 place-items-center rounded-full text-neutral-700 hover:bg-neutral-100 active:scale-95"
            >
              <Icon name="arrow_back" className="!text-[22px]" />
            </button>
            <div className="text-[17px] font-bold tracking-tight text-neutral-900">
              {saving ? `Save your ${saving === 'home' ? 'Home' : 'Work'} address` : 'Plan your journey'}
            </div>
          </div>
        )}

        {/* When / type chips */}
        {!compact && (
          <div className="relative mt-1">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 max-w-full">
            <button
              type="button"
              onClick={() => { haptic('light'); setMenu(menu === 'when' ? null : 'when'); }}
              className={cn(
                'flex h-9 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition border shadow-xs',
                when
                  ? 'bg-[#FF710F] text-white border-transparent shadow-[0_4px_12px_rgba(255,113,15,0.3)]'
                  : 'bg-neutral-950 text-white border-neutral-950 hover:bg-neutral-800'
              )}
            >
              <Icon name="schedule" className="!text-[17px]" />
              <span className="whitespace-nowrap">{whenLabel(when, opts)}</span>
              <Icon name="expand_more" className="!text-[17px] opacity-70 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => { haptic('light'); setMenu(menu === 'type' ? null : 'type'); }}
              className="flex h-9 shrink-0 whitespace-nowrap items-center gap-1.5 rounded-full bg-white text-neutral-900 border border-neutral-200 hover:border-neutral-300 px-3.5 text-[13px] font-semibold shadow-xs"
            >
              <Icon name={TYPES.find(([k]) => k === type)?.[2]} className="!text-[17px] text-[#FF710F]" />
              <span className="whitespace-nowrap">{TYPES.find(([k]) => k === type)?.[1]}</span>
              <Icon name="expand_more" className="!text-[17px] opacity-70 shrink-0" />
            </button>
          </div>

            {menu && (
              <div className="plan-menu absolute left-0 top-11 z-30 w-64 overflow-hidden rounded-2xl bg-white py-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] ring-1 ring-black/5 border border-neutral-200">
                {menu === 'when' ? (
                  <>
                    {opts.map(([l, v]) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => { setWhen(v); setMenu(null); haptic('select'); }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[14px] font-medium text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100"
                      >
                        {l}
                        {when === v && <Icon name="check" className="!text-[18px] text-[#FF710F]" />}
                      </button>
                    ))}
                    <PickDateTime
                      value={when}
                      min={earliestPickup(settings?.min_notice_hours ?? 2)}
                      onChange={(v) => { setWhen(v); setMenu(null); haptic('select'); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] font-semibold text-[#FF710F] hover:bg-orange-50 border-t border-neutral-100"
                    >
                      <Icon name="calendar_month" className="!text-[18px]" />
                      Choose date & time
                    </PickDateTime>
                  </>
                ) : (
                  TYPES.map(([k, l, ic]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => { setType(k); setMenu(null); haptic('select'); }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] font-medium text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100"
                    >
                      <Icon name={ic} className="!text-[18px] text-neutral-500" />
                      <span className="flex-1">{l}</span>
                      {type === k && <Icon name="check" className="!text-[18px] text-[#FF710F]" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Route card */}
        <div className={cn('relative rounded-[22px] bg-white p-1.5 border border-neutral-200/80 shadow-[0_10px_30px_rgba(15,15,20,0.07)]', compact ? 'mt-1' : 'mt-2.5')}>
          {/* Connector line */}
          {!saving && <span className="pointer-events-none absolute left-[25px] top-[40px] z-20 flex h-[32px] w-[2px] flex-col justify-between">
            {[0, 1, 2, 3, 4].map((i) => (
              <i
                key={i}
                className="block h-[3px] w-[2px] rounded-full"
                style={{ background: i < 2 ? '#10B981' : i > 2 ? '#FF710F' : '#D1D5DB' }}
              />
            ))}
          </span>}

          {(saving ? ['destination'] : ['pickup', 'destination']).map((f) => {
            const active = field === f;
            const has = f === 'pickup' ? pickup : dest;
            return (
              <div
                key={f}
                className={cn(
                  'relative flex h-[52px] items-center gap-3 rounded-[17px] px-3 transition', saving ? 'pr-3' : 'pr-12',
                  active ? 'bg-[#FFF6EF]' : 'hover:bg-neutral-50'
                )}
              >
                <span className="relative z-10 grid h-[22px] w-[22px] flex-shrink-0 place-items-center">
                  {saving ? (
                    <Icon name={saving === 'home' ? 'home' : 'work'} className="!text-[20px] text-[#FF710F]" />
                  ) : f === 'pickup' ? (
                    <span className="h-3.5 w-3.5 rounded-full border-[3.5px] border-emerald-500 bg-white shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-[4px] bg-[#FF710F] shadow-[0_0_0_4px_rgba(255,113,15,0.14)]" />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('text-[10px] font-bold uppercase tracking-[0.14em] transition-colors', active ? 'text-[#FF710F]' : 'text-neutral-400')}>{saving ? `${saving === 'home' ? 'Home' : 'Work'} address` : f === 'pickup' ? 'Pickup' : 'Drop-off'}</span>
                <input
                  ref={inputs[f]}
                  value={field === f ? value(f) : ''}
                  placeholder={
                    (saving ? 'Search street, postcode or building' : '') ||
                    shown(f) ||
                    (f === 'pickup'
                      ? here.status === 'loading'
                        ? 'Finding your location…'
                        : 'Pickup address'
                      : 'Where to?')
                  }
                  onFocus={() => { setField(f); setMenu(null); }}
                  onChange={(e) => setQ((s) => ({ ...s, [f]: e.target.value }))}
                  autoComplete="off"
                  enterKeyHint="search"
                  className={cn(
                    'min-w-0 w-full bg-transparent text-[15px] font-semibold text-neutral-900 focus:outline-none',
                    has && !(field === f && q[f]) ? 'placeholder:text-neutral-900' : 'placeholder:text-neutral-400'
                  )}
                />
                </span>
                {field === f && q[f] ? (
                  loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FF710F]" />
                  ) : (
                    <button
                      type="button"
                      aria-label="Clear"
                      onClick={() => setQ((s) => ({ ...s, [f]: '' }))}
                      className="grid h-6 w-6 place-items-center rounded-full bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition"
                    >
                      <Icon name="close" className="!text-[15px]" />
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    aria-label={`Choose ${f} on the map`}
                    onClick={() => { haptic('light'); setMap(f); }}
                    className="grid h-8 w-8 place-items-center rounded-full text-neutral-300 hover:text-neutral-700 hover:bg-neutral-100 transition"
                  >
                    <Icon name="map" className="!text-[19px]" />
                  </button>
                )}
              </div>
            );
          })}

          {!saving && <span className="pointer-events-none absolute left-12 right-16 top-1/2 h-px bg-neutral-100" />}
          {/* Quick swap button — rendered AFTER rows with z-30, preventDefault, and smooth rotation */}
          {!saving && <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={swapLocations}
            aria-label="Swap pickup and destination"
            title="Swap pickup and destination"
            className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2 z-30 grid h-8 w-8 place-items-center rounded-full border border-neutral-200 bg-white shadow-[0_4px_14px_rgba(15,15,20,0.10)] transition-all duration-300 hover:border-neutral-300 active:scale-90',
              swapped && 'rotate-180'
            )}
          >
            <Icon name="swap_vert" className="!text-[18px] text-neutral-800" />
          </button>}
        </div>

        {/* Saved places shortcuts */}
        {!compact && (
          <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4 pb-2.5">
            {[['home', 'Home', 'home'], ['work', 'Work', 'work']].map(([k, l, ic]) => (
              <div key={k} className="flex h-9 flex-shrink-0 items-center rounded-full bg-neutral-100/80 transition hover:bg-neutral-200/70">
                <button type="button" onClick={() => shortcut(k)} title={places[k]?.text}
                  className="flex h-9 items-center gap-1.5 pl-1.5 pr-3 text-[13px] font-semibold text-neutral-900 active:scale-95">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-[#FF710F] shadow-xs"><Icon name={ic} className="!text-[15px]" /></span>
                  {places[k] ? l : `Add ${l}`}
                </button>
                {places[k] && (
                  <button type="button" aria-label={`Change ${l} address`} onClick={() => startSaving(k)}
                    className="-ml-1 mr-1 grid h-7 w-7 place-items-center rounded-full text-neutral-400 hover:bg-white hover:text-neutral-700">
                    <Icon name="edit" className="!text-[14px]" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => { haptic('light'); setMap(field); }}
              className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-neutral-100/80 pl-1.5 pr-3 text-[13px] font-semibold text-neutral-900 transition hover:bg-neutral-200/70 active:scale-95"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-emerald-600 shadow-xs"><Icon name="pin_drop" className="!text-[15px]" /></span>
              Pin on map
            </button>
          </div>
        )}
        {compact && <div className="h-2" />}
      </div>

      {/* Results / Recents List */}
      <ul
        ref={listEl}
        className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white pb-8 pt-1"
        onScroll={() => document.activeElement?.blur?.()}
      >
        {typing ? (
          items.length ? (
            items.map((it, i) => (
              <Row key={it.id} it={it} q={query} onPick={(x) => choose(x)} dist={miles(it.distance_m)} delay={i * 28} />
            ))
          ) : !loading && (
            <li className="px-5 py-8 text-center text-[14px] text-neutral-500">
              No matches found.
              <button
                type="button"
                onClick={() => choose({ text: query.trim(), main: query.trim() })}
                className="mt-3 block w-full rounded-xl bg-neutral-900 py-3 font-semibold text-white shadow-sm transition hover:bg-neutral-800"
              >
                Use “{query.trim()}” as typed
              </button>
            </li>
          )
        ) : (
          <>
            {saving && (
              <>
                {here.place && <Row it={{ ...here.place, main: 'Use my current location', secondary: here.place.text }} onPick={() => choose(here.place)} icon="my_location" />}
                <Row it={{ main: 'Choose on the map', secondary: 'Drop a pin on the exact spot' }} onPick={() => { setMap('destination'); }} icon="pin_drop" />
              </>
            )}
            {field === 'pickup' && here.place && !saving && (
              <Row
                it={{ ...here.place, main: 'Current location', secondary: here.place.text }}
                onPick={() => {
                  setPickup({ ...here.place, gps: true });
                  if (dest) finish({ ...here.place, gps: true }, dest);
                  else focus('destination');
                }}
                icon="my_location"
              />
            )}
            {past.length > 0 && (
              <li className="flex items-center justify-between px-5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Icon name="history" className="!text-[14px]" />
                  Recent Journeys
                </span>
              </li>
            )}
            {past.slice(0, 4).map((it, i) => (
              <Row key={`r-${it.text}`} it={it} onPick={(x) => choose(x)} icon="history" dist={away(it)} delay={i * 28} />
            ))}
            <li className="flex items-center justify-between px-5 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Icon name="connecting_airports" className="!text-[15px] text-[#FF710F]" />
                Airport transfers
              </span>
              <span className="text-[10px] font-normal lowercase tracking-normal text-neutral-400">Fixed executive rates</span>
            </li>
            <li className="grid grid-cols-2 gap-2.5 px-4">
              {QUICK.map((it, i) => {
                const code = (it.main.match(/\(([A-Z]{3})\)/) || [])[1] || 'AIR';
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => choose(it)}
                    style={{ animationDelay: `${(past.length + i) * 40}ms` }}
                    className="plan-card group relative overflow-hidden rounded-2xl border border-neutral-200/90 bg-gradient-to-br from-white to-neutral-50/80 p-2.5 text-left shadow-xs transition-all hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/5 active:scale-[0.97]"
                  >
                    <div className="flex items-start justify-between">
                      <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#FF710F] to-[#FF9A3D] text-white shadow-md shadow-orange-500/25">
                        <Icon name="flight_takeoff" className="!text-[16px]" />
                      </span>
                      <span className="rounded-md border border-neutral-200/80 bg-neutral-100/90 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wider text-neutral-700">
                        {code}
                      </span>
                    </div>
                    <span className="relative mt-1.5 block text-[13.5px] font-bold text-neutral-900 leading-tight">
                      {it.main.replace(/ Airport.*$/, '')}
                    </span>
                    <span className="relative mt-0.5 flex items-center justify-between text-[11px] text-neutral-500">
                      <span className="font-medium text-neutral-400">Direct terminal</span>
                      {away(it) && <span className="font-semibold text-neutral-600">{away(it)}</span>}
                    </span>
                  </button>
                );
              })}
            </li>
          </>
        )}
        {typing && items.length > 0 && (
          <li className="px-5 pt-2 text-right text-[10px] text-neutral-400">Powered by Google</li>
        )}
      </ul>

      {map && (
        <MapPicker
          title={saving ? `Set your ${saving === 'home' ? 'Home' : 'Work'}` : map === 'pickup' ? 'Set your pickup' : 'Set your destination'}
          confirmLabel={saving ? `Save as ${saving === 'home' ? 'Home' : 'Work'}` : map === 'pickup' ? 'Confirm pickup' : 'Confirm destination'}
          initial={(map === 'pickup' ? pickup : dest)?.lat != null ? (map === 'pickup' ? pickup : dest) : null}
          onClose={() => setMap(null)}
          onConfirm={(p) => {
            const f = map;
            setMap(null);
            setField(f);
            choose(p, f);
          }}
        />
      )}
    </div>
    </>,
    document.body
  );
}
