// Maps are a separate download (MapLibre + tiles) fetched only when a map is first shown.
import { lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';

const load = () => import('./map.jsx');
const Picker = lazy(() => load().then((m) => ({ default: m.MapPicker })));
const Mini = lazy(() => load().then((m) => ({ default: m.MiniMap })));
const Route = lazy(() => load().then((m) => ({ default: m.RouteMap })));
const Live = lazy(() => load().then((m) => ({ default: m.LiveTrackMap })));

/** Warm the map code ahead of a likely tap (e.g. when the booking form opens). */
export const preloadMaps = () => { load().catch(() => {}); };

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
    <Suspense fallback={<div className={cn('bg-[#1a1a1d]', className)} />}>
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
