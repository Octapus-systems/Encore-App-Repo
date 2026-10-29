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

/** Browser/phone GPS → readable address via the API. Asks permission once; result cached for 10 minutes. */
export async function locate() {
  const lookup = async (latitude, longitude) => {
    const place = await api.get(`/places/reverse?lat=${latitude.toFixed(6)}&lng=${longitude.toFixed(6)}`);
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), place })); } catch { /* storage off */ }
    return place;
  };
  if (isNative()) {
    // Installed app: system location permission prompt, then GPS.
    try {
      let perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted') perm = await Geolocation.requestPermissions({ permissions: ['location'] });
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') throw new Error('denied');
      const { coords } = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
      return await lookup(coords.latitude, coords.longitude);
    } catch (e) {
      if (e?.message === 'denied' || /denied|permission/i.test(e?.message || '')) throw new Error('Location permission was declined. Allow it in Settings → Apps → Encore → Permissions, or type your pickup.');
      throw e?.status ? e : new Error('Could not find your location. Type your pickup instead.');
    }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available on this device.'));
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => { try { resolve(await lookup(coords.latitude, coords.longitude)); } catch (e) { reject(e); } },
      (err) => reject(new Error(err.code === 1 ? 'Location permission was declined. Type your pickup instead.' : 'Could not find your location. Type your pickup instead.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  });
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
  return { place, status, error, fetchNow };
}
