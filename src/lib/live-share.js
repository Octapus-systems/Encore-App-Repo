import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { watchPosition } from '@/lib/location';

const LIVE = ['on_the_way', 'arrived', 'started'];
const EVERY_MS = 5000;

/**
 * Driver app: while any of the chauffeur's journeys is on the way / arrived / started, share the
 * phone's GPS with the customer's live map every ~5 s. Stops by itself at completion.
 * Works while the app is open (screen kept awake where the phone allows it).
 */
export function useShareLiveLocation() {
  const { data: legs = [] } = useQuery({ queryKey: ['driver-legs'], queryFn: () => api.get('/driver/legs'), refetchInterval: 8000 });
  const active = legs.filter((l) => LIVE.includes(l.status) && !String(l.booking_status).startsWith('cancelled')).map((l) => l.id);
  const key = active.join(',');
  const [state, setState] = useState({ sharing: false, error: null, at: null });
  const last = useRef({ at: 0, fix: null });

  useEffect(() => {
    if (!key) { setState({ sharing: false, error: null, at: null }); return undefined; }
    const ids = key.split(',').map(Number);
    let lock = null;
    const wake = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch { /* not supported */ } };
    wake();
    const onVisible = () => { if (document.visibilityState === 'visible') wake(); };
    document.addEventListener('visibilitychange', onVisible);

    const send = (fix) => {
      last.current = { at: Date.now(), fix };
      Promise.all(ids.map((leg_id) => api.post('/driver/location', { leg_id, ...fix })))
        .then(() => setState({ sharing: true, error: null, at: Date.now() }))
        .catch(() => setState((s) => ({ ...s, sharing: true, error: 'Live location could not be sent — check your signal.' })));
    };
    const stop = watchPosition((fix) => {
      if (Date.now() - last.current.at >= EVERY_MS) send(fix);
      else last.current.fix = fix;
    }, (e) => setState({
      sharing: false, at: null,
      error: /declined/i.test(e.message) ? 'Allow location for Encore (Settings → Apps → Encore → Permissions) so your passenger can see you arriving.'
        : /switched off/i.test(e.message) ? 'Turn on your phone’s Location so your passenger can see you arriving.' : 'Waiting for GPS signal…',
    }));
    // Standing still produces few GPS events — re-send the latest fix so the customer's map stays "live".
    const beat = setInterval(() => { if (last.current.fix && Date.now() - last.current.at >= EVERY_MS * 2) send(last.current.fix); }, EVERY_MS);
    return () => { stop(); clearInterval(beat); document.removeEventListener('visibilitychange', onVisible); lock?.release?.().catch?.(() => {}); };
  }, [key]);

  // On duty but between journeys: a light position update every 30 s for Encore's dispatch map.
  const onDuty = useDutyPosition(!key);
  return { ...state, active: active.length > 0, onDuty };
}

const DUTY_MS = 30000;
function useDutyPosition(enabled) {
  const { data: me } = useQuery({ queryKey: ['me-driver'], queryFn: () => api.get('/auth/me'), refetchInterval: 60000 });
  const on = enabled && me?.role === 'driver' && me?.driver_availability === 'available';
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    if (!on) { setSharing(false); return undefined; }
    let lastAt = 0; let lastFix = null;
    const send = (fix) => { lastAt = Date.now(); api.post('/driver/position', fix).then(() => setSharing(true)).catch(() => {}); };
    const stop = watchPosition((fix) => { lastFix = fix; if (Date.now() - lastAt >= DUTY_MS) send(fix); }, () => setSharing(false));
    const beat = setInterval(() => { if (lastFix && Date.now() - lastAt >= DUTY_MS) send(lastFix); }, DUTY_MS);
    return () => { stop(); clearInterval(beat); };
  }, [on]);
  return on && sharing;
}
