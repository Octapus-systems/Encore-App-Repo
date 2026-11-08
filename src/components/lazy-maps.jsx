// Maps are a separate download (MapLibre + tiles) fetched only when a map is first shown.
import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';

const load = () => import('./map.jsx');
const Picker = lazy(() => load().then((m) => ({ default: m.MapPicker })));
const Mini = lazy(() => load().then((m) => ({ default: m.MiniMap })));
const Route = lazy(() => load().then((m) => ({ default: m.RouteMap })));
const Live = lazy(() => load().then((m) => ({ default: m.LiveTrackMap })));

/** Warm the map code ahead of a likely tap (e.g. when the booking form opens). */
let warmed = false;
export const preloadMaps = () => {
  load().catch(() => {});
  if (warmed || import.meta.env.VITE_MAP_STYLE) return;
  warmed = true;
  // Pull the tile index and the label font into the browser cache ahead of the first map
  // (the map host is slow to answer; both responses are cacheable).
  const warm = (u) => fetch(u, { credentials: 'same-origin' }).catch(() => {});
  warm('https://tiles.openfreemap.org/planet');
  warm('/map/positron.json');
};
/** Warm the maps once the app is idle (called from Home), so "Where to?" opens with a ready map. */
export const preloadMapsWhenIdle = () => {
  const go = () => preloadMaps();
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 4000 }); else setTimeout(go, 1500);
};

export function MapPicker(props) {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[90] mx-auto max-w-[480px] bg-[#E9EAEC]"><div className="sk h-full w-full" /></div>}>
      <Picker {...props} />
    </Suspense>
  );
}

export function LiveTrackMap({ className, ...props }) {
  return (
    <Suspense fallback={<div className={cn('sk', className)} />}>
      <Live className={className} {...props} />
    </Suspense>
  );
}

export function MiniMap({ className, ...props }) {
  return (
    <Suspense fallback={<div className={cn('bg-neutral-100', className)} />}>
      <Mini className={className} {...props} />
    </Suspense>
  );
}

export function RouteMap({ className, ...props }) {
  return (
    <Suspense fallback={<div className={cn('sk', className)} />}>
      <Route className={className} {...props} />
    </Suspense>
  );
}
