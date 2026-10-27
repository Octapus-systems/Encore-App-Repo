import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

const CACHE_KEY = 'encore.here';
const MAX_AGE = 10 * 60000;

function cached() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    return c && Date.now() - c.at < MAX_AGE ? c.place : null;
  } catch { return null; }
}

/** Browser/phone GPS → readable address via the API. Asks permission once; result cached for 10 minutes. */
export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not available on this device.'));
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const place = await api.get(`/places/reverse?lat=${coords.latitude.toFixed(6)}&lng=${coords.longitude.toFixed(6)}`);
          try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), place })); } catch { /* storage off */ }
          resolve(place);
        } catch (e) { reject(e); }
      },
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
