import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '@/lib/api';
import { haptic } from '@/lib/fx';
import { Icon } from '@/components/app-ui';
import { cn } from '@/lib/utils';

/**
 * Watches the connection. Offline → a creative banner slides in (a car pulls over under a flickering signal).
 * Back online → it turns green ("Back on the road"), buzzes, and refreshes whatever is on screen.
 */
export function ConnectionWatcher() {
  const qc = useQueryClient();
  const [state, setState] = useState('ok'); // ok | offline | back
  const [checking, setChecking] = useState(false);
  const stateRef = useRef('ok');
  const set = (s) => { stateRef.current = s; setState(s); };

  const goOffline = useCallback(() => {
    if (stateRef.current !== 'offline') { set('offline'); haptic('warning'); }
  }, []);
  const goOnline = useCallback(() => {
    if (stateRef.current !== 'offline') return;
    set('back'); haptic('success');
    qc.refetchQueries({ type: 'active' });
    setTimeout(() => { if (stateRef.current === 'back') set('ok'); }, 2600);
  }, [qc]);

  useEffect(() => {
    const off = () => goOffline();
    const on = () => ping().then((ok) => (ok ? goOnline() : goOffline()));
    const net = (e) => (e.detail?.ok ? goOnline() : goOffline());
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    window.addEventListener('encore:network', net);
    if (navigator.onLine === false) goOffline();
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', on); window.removeEventListener('encore:network', net); };
  }, [goOffline, goOnline]);

  // While offline keep quietly checking, so recovery is automatic.
  useEffect(() => {
    if (state !== 'offline') return undefined;
    const t = setInterval(() => ping().then((ok) => ok && goOnline()), 4000);
    return () => clearInterval(t);
  }, [state, goOnline]);

  const retry = async () => {
    setChecking(true); haptic('medium');
    const ok = await ping();
    setChecking(false);
    if (ok) goOnline(); else haptic('error');
  };

  if (state === 'ok') return null;
  const back = state === 'back';
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex justify-center px-3 pt-[max(10px,env(safe-area-inset-top))]">
      <div role="status" aria-live="assertive"
        className={cn('conn-banner pointer-events-auto w-full max-w-[456px] overflow-hidden rounded-3xl p-4 text-white shadow-[0_18px_44px_rgba(0,0,0,0.4)] ring-1 ring-white/10 transition-colors duration-500', back ? 'bg-emerald-600' : 'bg-[#141416]')}>
        <div className="flex items-center gap-3">
          <div className={cn('grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl', back ? 'bg-white/20' : 'bg-white/10')}>
            {back ? <Icon name="check_circle" fill className="pop-in !text-[28px]" /> : <span className="conn-bars"><i /><i /><i /><i /></span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-heading text-[15px] font-bold leading-tight">{back ? 'Back on the road' : "You're off the grid"}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-white/70">{back ? 'Connection restored — refreshing your trips.' : "Your chauffeur's waiting — we just need a connection. Nothing you typed is lost."}</div>
          </div>
          {!back && (
            <button type="button" onClick={retry} disabled={checking} className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-full bg-[#FF710F] px-4 text-[13px] font-bold text-white disabled:opacity-70">
              <Icon name="refresh" className={cn('!text-[18px]', checking && 'animate-spin')} />{checking ? 'Checking' : 'Retry'}
            </button>
          )}
        </div>
        {/* A tiny road: the car drives, then stops where the signal drops. */}
        {!back && (
          <div className="conn-road relative mt-3 h-6" aria-hidden>
            <span className="absolute inset-x-0 bottom-1 h-[2px] rounded-full bg-white/15 [background-image:repeating-linear-gradient(90deg,transparent_0_10px,rgba(255,255,255,.35)_10px_18px)]" />
            <span className="conn-car absolute bottom-[3px] text-[#FF710F]"><Icon name="directions_car" fill className="!text-[22px]" /></span>
            <span className="conn-x absolute bottom-1 right-6 text-[11px] font-bold text-amber-300">No signal</span>
          </div>
        )}
      </div>
    </div>
  );
}

async function ping() {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch(`${API_BASE}/api/health?_=${Date.now()}`, { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
}
