// Real maps: MapLibre (GPU-rendered, smooth pinch/zoom like Uber) with free OpenFreeMap tiles —
// no browser API key, commercial use allowed. Swap the style with VITE_MAP_STYLE (e.g. MapTiler).
// Loaded lazily (see lazy-maps.jsx) so the rest of the app stays light.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '@/lib/api';
import { getPosition, reverse, watchPosition } from '@/lib/location';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/app-ui';

// The style ships with the app (public/map/positron.json = OpenFreeMap 'positron') — fetching it from
// tiles.openfreemap.org took ~4 s before anything could draw. Tiles, fonts and sprites still come from there.
const STYLE = import.meta.env.VITE_MAP_STYLE || '/map/positron.json';
const LAST_AT = 'encore.lastMapAt';
const lastAt = () => { try { return JSON.parse(localStorage.getItem(LAST_AT)); } catch { return null; } };
const rememberAt = (c) => { try { localStorage.setItem(LAST_AT, JSON.stringify({ lat: c.lat, lng: c.lng })); } catch { /* storage off */ } };
const UK = { lat: 52.806, lng: -2.117 }; // Stafford — Encore's home patch, used until GPS answers

// Sprites and the label fonts also ship with the app (public/map/sprites, public/map/fonts), so labels and
// icons draw without waiting on the tile host. Only the map tiles themselves are fetched remotely.
const OFM = 'https://tiles.openfreemap.org/';
const LOCAL = `${typeof window !== 'undefined' ? window.location.origin : ''}/map/`;
const LOCAL_RANGES = new Set(['0-255', '256-511', '8192-8447']);
function localAssets(url) {
  if (import.meta.env.VITE_MAP_STYLE || !url.startsWith(OFM)) return { url };
  const sprite = url.match(/sprites\/[^/]+\/(ofm(?:@2x)?\.(?:json|png))$/);
  if (sprite) return { url: `${LOCAL}sprites/${sprite[1]}` };
  const font = url.match(/fonts\/([^/]+)\/(\d+-\d+)\.pbf$/);
  if (font && LOCAL_RANGES.has(font[2])) return { url: `${LOCAL}fonts/${font[1]}/${font[2]}.pbf` };
  return { url };
}

function baseMap(el, center, zoom, style = STYLE) {
  const map = new maplibregl.Map({
    container: el, style, center: [center.lng, center.lat], zoom, transformRequest: localAssets,
    attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, fadeDuration: 150,
  });
  map.touchZoomRotate.disableRotation();
  // Map data licence (OpenStreetMap / OpenMapTiles) needs a visible credit — a faint one-line text, no button.
  const credit = document.createElement('a');
  credit.className = 'map-credit';
  credit.href = 'https://www.openstreetmap.org/copyright';
  credit.target = '_blank'; credit.rel = 'noopener noreferrer';
  credit.textContent = '© OpenStreetMap';
  el.appendChild(credit);
  // The container is sized by an opening animation / growing hero — keep the canvas matched to it.
  const ro = new ResizeObserver(() => map.resize());
  ro.observe(el);
  map.once('remove', () => ro.disconnect());
  return map;
}

/** Run fn once the style is ready (sources/layers can only be added then). */
const ready = (map, fn) => (map.isStyleLoaded() ? fn() : map.once('load', fn));

const el = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };
const dot = (cls) => el(`<span class="map-dot ${cls}"></span>`);
const car = () => el(`<div class="map-car"><div class="map-car-pulse"></div><svg class="map-car-body" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
  <circle cx="20" cy="20" r="17" fill="#141416" stroke="#fff" stroke-width="3"/><path d="M20 9 L28 27 L20 23 L12 27 Z" fill="#FF710F"/></svg></div>`);

/** GeoJSON polygon approximating a circle of `m` metres (GPS accuracy ring). */
function circle({ lat, lng }, m) {
  const pts = []; const R = 6371000;
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * 2 * Math.PI;
    pts.push([lng + ((m / R) * Math.sin(a) * 180) / Math.PI / Math.cos((lat * Math.PI) / 180), lat + ((m / R) * Math.cos(a) * 180) / Math.PI]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [pts] } };
}
const line = (coords) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } });

/** Google encoded polyline → [[lat, lng], …] */
export function decodePolyline(str) {
  const out = []; let i = 0; let lat = 0; let lng = 0;
  while (i < str.length) {
    for (const k of [0, 1]) {
      let shift = 0; let result = 0; let b;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (k === 0) lat += d; else lng += d;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

const bearing = (a, b) => {
  const toR = Math.PI / 180;
  const y = Math.sin((b.lng - a.lng) * toR) * Math.cos(b.lat * toR);
  const x = Math.cos(a.lat * toR) * Math.sin(b.lat * toR) - Math.sin(a.lat * toR) * Math.cos(b.lat * toR) * Math.cos((b.lng - a.lng) * toR);
  return (Math.atan2(y, x) / toR + 360) % 360;
};

// ---------------------------------------------------------------------------
// Pin picker — Uber/Rapido style: the map moves under a fixed centre pin.
// ---------------------------------------------------------------------------
/** Is the map point drawn as water (sea, lake, river)? Uses the map's own water layer, so it is instant. */
function waterAt(m, c) {
  try {
    const layers = ['water', 'waterway'].filter((id) => m.getLayer(id));
    if (!layers.length) return false;
    const p = m.project([c.lng, c.lat]);
    return m.queryRenderedFeatures([[p.x - 2, p.y - 2], [p.x + 2, p.y + 2]], { layers }).length > 0;
  } catch { return false; }
}
const WATER = { main: 'This spot is in the water', secondary: 'Move the pin onto a road or building we can reach by car.', water: true };

export function MapPicker({ title = 'Set pickup point', confirmLabel = 'Confirm pickup', initial, onConfirm, onClose }) {
  const box = useRef(null);
  const map = useRef(null);
  const me = useRef(null);
  const seq = useRef(0);
  const [moving, setMoving] = useState(false);
  const [place, setPlace] = useState(initial?.text ? initial : null);
  const [looking, setLooking] = useState(false);
  const [gps, setGps] = useState({ status: 'idle', error: null, fix: null });

  const lookup = (c) => {
    const n = ++seq.current;
    setLooking(true);
    const pin = `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`;
    if (map.current && waterAt(map.current, c)) { setPlace({ ...WATER, lat: c.lat, lng: c.lng }); setLooking(false); haptic('warning'); return; }
    reverse(c.lat, c.lng)
      .then((p) => { if (n === seq.current) setPlace(p?.water ? { ...WATER, lat: c.lat, lng: c.lng } : p); })
      .catch(() => { if (n === seq.current) setPlace({ text: pin, main: 'Dropped pin', secondary: pin, lat: c.lat, lng: c.lng }); })
      .finally(() => { if (n === seq.current) setLooking(false); });
  };

  // Blue "you are here" dot + soft accuracy ring.
  const showMe = (fix) => {
    const m = map.current; if (!m) return;
    if (!me.current) me.current = new maplibregl.Marker({ element: dot('is-me') }).setLngLat([fix.lng, fix.lat]).addTo(m);
    else me.current.setLngLat([fix.lng, fix.lat]);
    ready(m, () => {
      if (!map.current) return;
      const data = circle(fix, Math.max(10, fix.accuracy || 30));
      if (m.getSource('acc')) { m.getSource('acc').setData(data); return; }
      m.addSource('acc', { type: 'geojson', data });
      m.addLayer({ id: 'acc', type: 'fill', source: 'acc', paint: { 'fill-color': '#3B82F6', 'fill-opacity': 0.12 } });
      m.addLayer({ id: 'acc-edge', type: 'line', source: 'acc', paint: { 'line-color': '#3B82F6', 'line-width': 1, 'line-opacity': 0.5 } });
    });
  };

  const findMe = () => {
    setGps((g) => ({ ...g, status: 'loading', error: null }));
    getPosition().then((fix) => {
      setGps({ status: 'ready', error: null, fix });
      showMe(fix);
      map.current?.flyTo({ center: [fix.lng, fix.lat], zoom: 17.5, duration: 1100, essential: true });
    }).catch((e) => setGps((g) => ({ ...g, status: 'error', error: e.message })));
  };

  useEffect(() => {
    const has = initial?.lat != null && initial?.lng != null;
    const m = baseMap(box.current, has ? initial : UK, has ? 17.5 : 6);
    map.current = m;
    m.on('movestart', () => setMoving(true));
    m.on('dragstart', () => haptic('light'));
    m.on('moveend', () => { setMoving(false); lookup(m.getCenter()); });
    if (has) lookup(initial); else findMe();
    // Keep the blue dot fresh; the map itself only moves when the customer drags or taps "my location".
    const stop = watchPosition((fix) => {
      showMe(fix);
      setGps((g) => (g.fix && Math.abs((g.fix.accuracy || 0) - (fix.accuracy || 0)) < 5 ? g : { status: 'ready', error: null, fix }));
    }, () => {});
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => { stop(); window.removeEventListener('keydown', onKey); map.current = null; me.current = null; m.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirm = () => {
    if (place?.water) return;
    const c = map.current.getCenter();
    haptic('success');
    onConfirm({ ...(place || {}), text: place?.text || `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`, lat: c.lat, lng: c.lng });
  };

  return createPortal(
    <div className="map-sheet fixed inset-0 z-[90] flex justify-center bg-black/40">
      <div className="relative h-full w-full max-w-[480px] overflow-hidden bg-[#E9EAEC]">
        <div className="absolute inset-0"><div ref={box} className="h-full w-full" /></div>

        {/* Fixed centre pin: lifts while the map moves, drops with a little bounce. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <div className={cn('map-pin', moving && 'is-lifted')}>
            <div className="map-pin-head"><span /></div>
            <div className="map-pin-stem" />
          </div>
          <div className={cn('map-pin-shadow', moving && 'is-lifted')} />
        </div>

        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 bg-gradient-to-b from-white/95 to-white/0 px-4 pb-6 pt-[max(14px,env(safe-area-inset-top))]">
          <button type="button" onClick={onClose} aria-label="Close map" className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-white text-[#141416] shadow-[0_6px_18px_rgba(0,0,0,0.15)] active:scale-95"><Icon name="arrow_back" className="!text-[22px]" /></button>
          <div className="min-w-0 rounded-full bg-white px-4 py-2.5 text-[15px] font-bold text-[#141416] shadow-[0_6px_18px_rgba(0,0,0,0.12)]">{title}</div>
        </div>

        <button type="button" onClick={() => { haptic('light'); findMe(); }} aria-label="Go to my location"
          className="absolute bottom-[224px] right-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-white text-[#2563EB] shadow-[0_8px_22px_rgba(0,0,0,0.18)] active:scale-95">
          {gps.status === 'loading' ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" /> : <Icon name="my_location" className="!text-[24px]" />}
        </button>

        <div className="map-card absolute inset-x-0 bottom-0 z-20 rounded-t-[28px] bg-white px-5 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.18)]">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-200" />
          <div className="flex items-start gap-3">
            <span className={cn('mt-0.5 grid h-10 w-10 flex-shrink-0 place-items-center rounded-full', place?.water && !moving && !looking ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}><Icon name={place?.water && !moving && !looking ? 'waves' : 'location_on'} fill /></span>
            <div className="min-w-0 flex-1">
              {looking || moving || !place ? (
                <div className="space-y-2 pt-1"><div className="sk h-4 w-3/4 rounded" /><div className="sk h-3 w-1/2 rounded" /></div>
              ) : (
                <>
                  <div className={cn('truncate text-[17px] font-bold', place.water ? 'text-red-600' : 'text-[#141416]')}>{place.main || place.text}</div>
                  <div className={cn('text-[13px]', place.water ? 'text-red-600/80' : 'truncate text-neutral-500')}>{place.secondary || place.text}</div>
                </>
              )}
            </div>
          </div>
          <div className="mt-2 min-h-[18px] text-[12px] text-neutral-500">
            {gps.status === 'error' ? <span className="text-amber-700">{gps.error}</span>
              : gps.fix?.accuracy ? `GPS accurate to about ${Math.round(gps.fix.accuracy)} m · drag the map to place the pin exactly`
                : 'Drag the map to place the pin exactly where you will be'}
          </div>
          <button type="button" disabled={!place || place.water || looking || moving} onClick={confirm}
            className="cta-glow mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF710F] to-[#FF9A3D] text-[16px] font-bold text-white transition-opacity disabled:opacity-60">
            {place?.water && !moving && !looking ? <>Move the pin onto land<Icon name="block" className="!text-[20px]" /></> : <>{confirmLabel}<Icon name="check" className="!text-[20px]" /></>}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Live "chauffeur on the way" map.
// ---------------------------------------------------------------------------
function etaLabel(s) {
  if (s == null) return null;
  const m = Math.max(1, Math.round(s / 60));
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

export function LiveTrackMap({ bookingId, legId, className, chipTop = false }) {
  const box = useRef(null);
  const map = useRef(null);
  const marks = useRef({});
  const anim = useRef({ raf: 0, pos: null, rot: 0 });
  const fitted = useRef(null);
  const [follow, setFollow] = useState(true);
  const q = useQuery({ queryKey: ['live', bookingId], queryFn: () => api.get(`/bookings/${bookingId}/live`), refetchInterval: 4000 });
  const leg = q.data?.legs?.find((l) => l.leg_id === legId) || q.data?.legs?.[0] || null;

  useEffect(() => {
    const m = baseMap(box.current, UK, 11);
    map.current = m;
    m.on('dragstart', () => setFollow(false));
    const a = anim.current;
    return () => { cancelAnimationFrame(a.raf); map.current = null; marks.current = {}; a.pos = null; m.remove(); };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m || !leg) return;
    const M = marks.current;
    const put = (key, p, make) => {
      if (!p) { M[key]?.remove(); delete M[key]; return; }
      if (!M[key]) M[key] = new maplibregl.Marker({ element: make() }).setLngLat([p.lng, p.lat]).addTo(m);
      else M[key].setLngLat([p.lng, p.lat]);
    };
    put('pickup', leg.pickup, () => dot('is-pickup'));
    put('dest', leg.status === 'started' ? leg.destination : null, () => dot('is-dest'));

    // Road shape from the car to where it is heading.
    const path = leg.polyline ? decodePolyline(leg.polyline).map(([la, ln]) => [ln, la]) : [];
    ready(m, () => {
      if (!map.current) return;
      const data = line(path);
      if (m.getSource('route')) { m.getSource('route').setData(data); return; }
      m.addSource('route', { type: 'geojson', data });
      m.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 9 } });
      m.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FF710F', 'line-width': 5 } });
    });

    // Car glides from where it is drawn now to the new fix over ~3.8 s (between 4 s polls).
    const d = leg.driver;
    const a = anim.current;
    if (d) {
      const target = { lat: d.lat, lng: d.lng };
      if (!M.car) { M.car = new maplibregl.Marker({ element: car() }).setLngLat([d.lng, d.lat]).addTo(m); a.pos = target; }
      const from = a.pos || target;
      const moved = Math.abs(from.lat - target.lat) + Math.abs(from.lng - target.lng) > 0.00002;
      a.rot = d.heading != null && (d.speed ?? 0) > 1 ? d.heading : moved ? bearing(from, target) : a.rot;
      const body = M.car.getElement().querySelector('.map-car-body');
      if (body) body.style.transform = `rotate(${a.rot}deg)`;
      cancelAnimationFrame(a.raf);
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / 3800);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        a.pos = { lat: from.lat + (target.lat - from.lat) * e, lng: from.lng + (target.lng - from.lng) * e };
        M.car?.setLngLat([a.pos.lng, a.pos.lat]);
        if (t < 1) a.raf = requestAnimationFrame(step);
      };
      if (moved) a.raf = requestAnimationFrame(step);
    } else if (M.car) { M.car.remove(); delete M.car; a.pos = null; }

    // Frame the car and its target once per phase; while following, again if the car leaves the view.
    const goal = leg.status === 'started' ? leg.destination : leg.pickup;
    const pts = [d, goal].filter(Boolean);
    const key = `${leg.leg_id}:${leg.status}:${!!d}`;
    const drifting = follow && d && !m.getBounds().contains([d.lng, d.lat]);
    if (pts.length && (fitted.current !== key || drifting)) {
      fitted.current = key;
      if (pts.length === 1) m.flyTo({ center: [pts[0].lng, pts[0].lat], zoom: 15.5, duration: 900 });
      else {
        const b = new maplibregl.LngLatBounds();
        pts.forEach((p) => b.extend([p.lng, p.lat]));
        path.forEach((p) => b.extend(p));
        m.fitBounds(b, { padding: chipTop ? { top: 90, bottom: 120, left: 50, right: 50 } : { top: 90, bottom: 110, left: 50, right: 50 }, maxZoom: 16.5, duration: 900 });
      }
    }
  }, [leg, follow]);

  const recenter = () => { haptic('light'); fitted.current = null; setFollow(true); };
  const eta = leg && leg.status !== 'arrived' ? etaLabel(leg.eta_s) : null;
  const miles = leg?.distance_m != null ? `${(leg.distance_m / 1609.344).toFixed(leg.distance_m < 16093 ? 1 : 0)} mi` : null;

  return (
    <div className={cn('live-map relative overflow-hidden bg-[#E9EAEC]', className)}>
      <div className="absolute inset-0"><div ref={box} className="h-full w-full" /></div>
      {leg && (
        <>
        {chipTop ? (
          // Compact pill, centred low on the map just above the status card that overlaps the map's bottom edge.
          <div className="pointer-events-none absolute inset-x-3 bottom-[52px] z-10 flex justify-center">
            <div className="live-chip pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full bg-[#141416]/90 px-3 py-1.5 text-white shadow-[0_6px_18px_rgba(0,0,0,0.28)] backdrop-blur-md">
              <span className="relative flex h-2 w-2 flex-shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF710F] opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF710F]" /></span>
              <span className="truncate text-[11.5px] font-semibold">
                {!leg.driver ? 'Connecting to your chauffeur…'
                  : leg.status === 'arrived' ? 'Your chauffeur has arrived'
                  : <>{leg.heading_to === 'pickup' ? 'Arriving' : 'At destination'} {eta ? `in ${eta}` : 'soon'}{miles && <span className="text-white/60"> · {miles}</span>}</>}
              </span>
            </div>
          </div>
        ) : (
        <div className="pointer-events-none absolute inset-x-3 bottom-6 z-10 flex items-end justify-between gap-2">          <div className="live-chip pointer-events-auto flex min-w-0 items-center gap-2.5 rounded-2xl bg-[#141416]/95 px-3.5 py-2.5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF710F] opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF710F]" /></span>
            <div className="min-w-0">
              {!leg.driver ? (
                <div className="text-[13px] font-semibold">Waiting for your chauffeur’s live location…</div>
              ) : leg.status === 'arrived' ? (
                <div className="text-[14px] font-bold">Your chauffeur has arrived</div>
              ) : (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{leg.heading_to === 'pickup' ? 'Arriving at pickup' : 'Arriving at destination'}</div>
                  <div className="text-[16px] font-extrabold leading-tight">{eta ? `in ${eta}` : 'Calculating…'}{miles && <span className="ml-1.5 text-[12px] font-semibold text-white/60">· {miles}</span>}</div>
                </>
              )}
            </div>
          </div>
          {!follow && (
            <button type="button" onClick={recenter} aria-label="Re-centre map" className="pointer-events-auto grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-white text-[#141416] shadow-[0_8px_22px_rgba(0,0,0,0.2)] active:scale-95"><Icon name="center_focus_strong" className="!text-[22px]" /></button>
          )}
        </div>
        )}
        {chipTop && !follow && (
          <button type="button" onClick={recenter} aria-label="Re-centre map" className="absolute bottom-[52px] right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-[#141416] shadow-[0_6px_18px_rgba(0,0,0,0.2)] active:scale-95"><Icon name="center_focus_strong" className="!text-[19px]" /></button>
        )}
        </>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// Mini map — a calm, non-interactive view of where the customer is (planner header).
// ---------------------------------------------------------------------------
export function MiniMap({ center, className }) {
  const box = useRef(null);
  const map = useRef(null);
  const pin = useRef(null);
  useEffect(() => {
    // Open where the customer was last time (not zoomed out over the UK) so streets show at once.
    const start = center || lastAt();
    const m = baseMap(box.current, start || UK, start ? 15.5 : 6);
    m.scrollZoom.disable(); m.dragPan.disable(); m.touchZoomRotate.disable(); m.doubleClickZoom.disable(); m.keyboard.disable();
    map.current = m;
    return () => { map.current = null; pin.current = null; m.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const m = map.current; if (!m || !center) return;
    if (!pin.current) pin.current = new maplibregl.Marker({ element: el('<div><div class="mini-pin"><div class="map-pin-head"><span></span></div><div class="map-pin-stem"></div></div></div>'), anchor: 'bottom' }).setLngLat([center.lng, center.lat]).addTo(m);
    else pin.current.setLngLat([center.lng, center.lat]);
    rememberAt(center);
    m.flyTo({ center: [center.lng, center.lat], zoom: 16, duration: 800, essential: true, offset: [0, 20] });
  }, [center?.lat, center?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className={cn('relative overflow-hidden', className)}><div ref={box} className="h-full w-full" /></div>;
}

// ---------------------------------------------------------------------------
// Route preview — both ends pinned and joined by an arc, framed to fit (booking summary).
// ---------------------------------------------------------------------------
export function RouteMap({ from, to, className, topInset = 0, bottomInset = 0 }) {
  const box = useRef(null);
  useEffect(() => {
    const pts = [from, to].filter((p) => p?.lat != null);
    const m = baseMap(box.current, pts[0] || UK, pts.length ? 12 : 6);
    m.scrollZoom.disable(); m.dragPan.disable(); m.touchZoomRotate.disable(); m.doubleClickZoom.disable(); m.keyboard.disable();
    if (from?.lat != null) new maplibregl.Marker({ element: dot('is-pickup') }).setLngLat([from.lng, from.lat]).addTo(m);
    if (to?.lat != null) new maplibregl.Marker({ element: el('<span class="map-dot is-dest" style="border-radius:7px"></span>') }).setLngLat([to.lng, to.lat]).addTo(m);
    if (pts.length === 2) {
      // Gentle curve between the two points (a straight line looks like a bug at long distance).
      const [a, b] = pts; const curve = [];
      const mx = (a.lng + b.lng) / 2 - (b.lat - a.lat) * 0.18; const my = (a.lat + b.lat) / 2 + (b.lng - a.lng) * 0.18;
      for (let i = 0; i <= 40; i++) {
        const t = i / 40;
        curve.push([(1 - t) ** 2 * a.lng + 2 * (1 - t) * t * mx + t * t * b.lng, (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * my + t * t * b.lat]);
      }
      ready(m, () => {
        m.addSource('arc', { type: 'geojson', data: line(curve) });
        m.addLayer({ id: 'arc-casing', type: 'line', source: 'arc', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#fff', 'line-width': 7 } });
        m.addLayer({ id: 'arc', type: 'line', source: 'arc', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#FF710F', 'line-width': 3.5, 'line-dasharray': [1.5, 1.5] } });
      });
      const bb = new maplibregl.LngLatBounds(); curve.forEach((c) => bb.extend(c));
      m.fitBounds(bb, { padding: { top: 36 + topInset, bottom: 84 + bottomInset, left: 46, right: 46 }, maxZoom: 15, duration: 0 });
    }
    return () => m.remove();
  }, [from?.lat, from?.lng, to?.lat, to?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className={cn('relative overflow-hidden', className)}><div ref={box} className="h-full w-full" /></div>;
}
