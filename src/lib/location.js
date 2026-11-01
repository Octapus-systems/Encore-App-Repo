import { useCallback, useEffect, useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { api } from '@/lib/api';
import { isNative } from '@/lib/native';

const CACHE_KEY = 'encore.here';
const MAX_AGE = 10 * 60000;

function cached() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return c && Date.now() - c.at < MAX_AGE ? c.place : null;
  } catch { return null; }
}

const DENIED = 'Location permission was declined. Allow it in Settings → Apps → Encore → Permissions, or set your pickup on the map.';
const OFF = 'Your phone’s location (GPS) is switched off. Turn on Location in quick settings and try again.';
const NOT_FOUND = 'Could not get a GPS fix. Move near a window or set your pickup on the map.';

function friendly(e) {
  const m = String(e?.message || '');
  if (e?.code === 1 || /denied|permission/i.test(m)) return new Error(DENIED);
  if (/disabled|not enabled|location services|provider/i.test(m)) return new Error(OFF);
  return new Error(NOT_FOUND);
}

/**
 * Phone GPS → { lat, lng, accuracy }. The previous version asked only for a precise GPS fix
 * with a 12 s limit, which often times out indoors on Android ("could not find your location").
 * Now: a recent cached fix is accepted, then precise GPS, then a quick network/Wi-Fi fix.
 */
export async function getPosition() {
  if (isNative()) {
    let perm;
    try { perm = await Geolocation.checkPermissions(); } catch (e) { throw friendly(e); }
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      try { perm = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] }); } catch (e) { throw friendly(e); }
    }
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') throw new Error(DENIED);
    const attempt = (o) => Geolocation.getCurrentPosition(o).then(({ coords }) => ({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }));
    try {
      return await attempt({ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
    } catch (e) {
      if (/denied|permission|disabled|not enabled|services/i.test(String(e?.message))) throw friendly(e);
      try { return await attempt({ enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }); } catch (e2) { throw friendly(e2); }
    }
  }
  if (!navigator.geolocation) throw new Error('Location is not available on this device. Set your pickup on the map.');
  const attempt = (o) => new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy }), reject, o));
  try {
    return await attempt({ enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
  } catch (e) {
    if (e?.code === 1) throw friendly(e);
    try { return await attempt({ enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }); } catch (e2) { throw friendly(e2); }
  }
}

/** Continuous GPS (map picker accuracy refinement, driver live sharing). Returns a stop() function. */
export function watchPosition(onPos, onError, { high = true } = {}) {
  let stopped = false;
  let id = null;
  const emit = (c) => onPos({ lat: c.latitude, lng: c.longitude, accuracy: c.accuracy, heading: c.heading, speed: c.speed });
  if (isNative()) {
    Geolocation.watchPosition({ enableHighAccuracy: high, timeout: 20000, maximumAge: 5000 }, (pos, err) => {
      if (err) onError?.(friendly(err)); else if (pos) emit(pos.coords);
    }).then((cid) => { if (stopped) Geolocation.clearWatch({ id: cid }); else id = cid; }).catch((e) => onError?.(friendly(e)));
    return () => { stopped = true; if (id) Geolocation.clearWatch({ id }); };
  }
  if (!navigator.geolocation) { onError?.(new Error('Location is not available on this device.')); return () => {}; }
  id = navigator.geolocation.watchPosition((p) => emit(p.coords), (e) => onError?.(friendly(e)), { enableHighAccuracy: high, timeout: 20000, maximumAge: 5000 });
  return () => navigator.geolocation.clearWatch(id);
}

/** Coordinates → readable address via the API (key stays on the server). */
export async function reverse(lat, lng) {
  const place = await api.get(`/places/reverse?lat=${lat.toFixed(6)}&lng=${lng.toFixed(6)}`);
  return { ...place, lat, lng };
}

/** Browser/phone GPS → readable address. Result cached for 10 minutes. */
export async function locate() {
  const { lat, lng } = await getPosition();
  const place = await reverse(lat, lng);
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), place })); } catch { /* storage off */ }
  return place;
}

/** Current location as a pickup suggestion. auto=true fetches on mount. */
export function useCurrentLocation({ auto = false } = {}) {
  const [place, setPlace] = useState(cached);
  const [status, setStatus] = useState(place ? 'ready' : 'idle');
  const [error, setError] = useState(null);
  const fetchNow = useCallback(() => {
    setStatus('loading'); setError(null);
    return locate().then((p) => { setPlace(p); setStatus('ready'); return p; })
      .catch((e) => { setError(e.message); setStatus('error'); return null; });
  }, []);
  useEffect(() => { if (auto && !cached()) fetchNow(); }, [auto, fetchNow]);
  return { place, status, error, fetchNow, setPlace };
}
