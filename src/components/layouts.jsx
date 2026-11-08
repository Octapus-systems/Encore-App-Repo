import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Car,
  Phone, User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { homeFor, useAuth, usePublicSettings } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Logo, PageLoader, SkeletonList } from '@/components/common';
import { EncoreHeader, Icon } from '@/components/app-ui';
import { useLiveUpdates } from '@/lib/live';
import { HelpLauncher } from '@/components/help-center';
import { FeatureGuide } from '@/components/feature-guide';
import { useShareLiveLocation } from '@/lib/live-share';

const customerLink = (n) => `/app/bookings/${n.booking_id}`;
const driverLink = (n) => `/driver/jobs/${n.booking_id}`;

export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

function useUnread() {
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/account/notifications'), refetchInterval: 10000 });
  return (data || []).filter((n) => !n.read_at).length;
}

function Dot({ n }) {
  if (!n) return null;
  return <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">{n > 9 ? '9+' : n}</span>;
}

// ---------------- Customer ----------------
const CUSTOMER_TITLES = [
  [/^\/app\/?$/, { title: 'Home', home: true }],
  [/^\/app\/fleet\/.+/, { title: 'Fleet Vehicle Details', back: '/app/fleet' }],
  [/^\/app\/fleet/, { title: 'Our Fleet', back: '/app' }],
  [/^\/app\/request/, { title: 'Book a ride', back: true, overlay: true }],
  [/^\/app\/bookings\/\d+\/sent/, { title: 'All set', back: '/app/bookings' }],
  [/^\/app\/bookings\/.+/, { title: 'Journey Details', back: '/app/bookings', overlay: true }],
  [/^\/app\/bookings/, { title: 'My Bookings', back: '/app' }],
  [/^\/app\/invoices\/.+/, { title: 'Invoice', back: '/app/invoices' }],
  [/^\/app\/invoices/, { title: 'Invoices', back: '/app/account' }],
  [/^\/app\/notifications/, { title: 'Updates', back: '/app' }],
  [/^\/app\/company/, { title: 'Company team', back: '/app/account' }],
  [/^\/app\/corporate/, { title: 'Corporate account', back: '/app/account' }],
  [/^\/app\/account/, { title: 'Profile', back: '/app' }],
];


/**
 * Customer dock: dark glass bar fixed to the bottom with a raised centre "Book" button
 * and an orange indicator that slides to the active tab. Page content stops above it.
 */
function AppDock({ items }) {
  const loc = useLocation();
  const unread = useUnread();
  const [left, right] = [items.slice(0, 2), items.slice(2)];
  const activeIdx = items.findIndex((n) => (n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to)));
  // Hide the floating Book + button wherever a page already has its own bottom action bar
  // (the booking form, and a fleet vehicle's "Book Now" bar) so the two never overlap.
  const booking = loc.pathname.startsWith('/app/request') || /^\/app\/fleet\/[^/]+$/.test(loc.pathname);
  const slot = booking ? 2 : activeIdx < 0 ? -1 : activeIdx < 2 ? activeIdx : activeIdx + 1; // 5 slots, centre is Book

  // Tuck the dock away while scrolling down a page, bring it back on the slightest scroll up.
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY; let raf = 0;
    const check = () => {
      raf = 0;
      const y = window.scrollY;
      // Back at the top or at the very end of the page (the space under the content is the dock's) → show it.
      const atEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 48;
      if (y < 60 || atEnd) setTucked(false);
      else if (y > last + 8) setTucked(true);
      else if (y < last - 8) setTucked(false);
      if (Math.abs(y - last) > 8) last = y;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => { setTucked(false); }, [loc.pathname]);

  const Tab = (n) => (
    <NavLink key={n.to} to={n.to} end={n.end} data-haptic="select"
      className={({ isActive }) => cn('dock-tab relative z-10 flex flex-col items-center justify-center gap-[3px] text-white/50 transition-colors duration-300', isActive && 'is-active text-white')}>
      {({ isActive }) => (
        <>
          <span className="dock-icon relative">
            <Icon name={n.icon} fill={isActive} className="!text-[23px]" />
            {n.badge && unread > 0 && <span key={unread} className="dock-badge absolute -right-2 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-primary-container px-1 text-[9.5px] font-bold text-white ring-2 ring-[#111113]">{unread > 9 ? '9+' : unread}</span>}
          </span>
          <span className="dock-label text-[10.5px] font-semibold leading-none tracking-wide">{n.label}</span>
        </>
      )}
    </NavLink>
  );
  return (
    <nav className={cn('fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 px-3 pb-[max(10px,env(safe-area-inset-bottom))] transition-transform duration-500 ease-[cubic-bezier(.32,.72,0,1)]', tucked && 'translate-y-[calc(100%+44px)]')}>
      <div className="dock-shell relative grid h-[66px] grid-cols-5 rounded-[24px] bg-[#111113]/90 shadow-[0_20px_44px_rgba(0,0,0,0.38),0_2px_6px_rgba(0,0,0,0.25)] ring-1 ring-white/[0.08] backdrop-blur-xl backdrop-saturate-150">
        {/* Glass pill that glides to the selected tab */}
        <span aria-hidden className={cn('dock-pill pointer-events-none absolute inset-y-[7px] left-0 w-[20%]', slot < 0 && 'opacity-0')}
          style={{ transform: `translateX(${Math.max(slot, 0) * 100}%)` }}>
          <span className="absolute inset-x-[7px] inset-y-0 rounded-[17px] bg-white/[0.07] ring-1 ring-inset ring-white/[0.06]" />
          <span className="absolute bottom-[3px] left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-primary-container shadow-[0_0_8px_2px_rgba(255,113,15,0.7)]" />
        </span>
        {left.map(Tab)}
        <div className="relative z-10 flex justify-center">
          <NavLink to="/app/request" aria-label="Book a journey" data-haptic="medium"
            className={cn('dock-fab absolute -top-[26px] grid h-[58px] w-[58px] place-items-center rounded-full bg-gradient-to-b from-[#FF8A3D] to-[#F25F0A] text-white shadow-[0_12px_28px_rgba(255,113,15,0.5),inset_0_1px_0_rgba(255,255,255,0.35)] ring-[5px] ring-background', booking && 'dock-fab-away')}>
            <Icon name="add" className="!text-[30px]" />
          </NavLink>
          <span className={cn('dock-slot-icon pointer-events-none absolute top-[13px] text-primary-container', booking && 'is-on')}><Icon name="edit_road" fill className="!text-[23px]" /></span>
          <span className={cn('mt-auto pb-[11px] text-[10.5px] font-semibold leading-none tracking-wide transition-colors', booking ? 'text-white' : 'text-white/50')}>{booking ? 'Booking' : 'Book'}</span>
        </div>
        {right.map(Tab)}
      </div>
    </nav>
  );
}

export function CustomerLayout() {
  const { user } = useAuth();
  useLiveUpdates(customerLink);
  const loc = useLocation();
  const head = CUSTOMER_TITLES.find(([re]) => re.test(loc.pathname))?.[1] || { title: 'Encore' };
  const nav = [
    { to: '/app', label: 'Home', icon: 'home', end: true },
    { to: '/app/bookings', label: 'Trips', icon: 'event_note' },
    { to: '/app/notifications', label: 'Updates', icon: 'notifications', badge: true },
    { to: '/app/account', label: 'Profile', icon: 'person' },
  ];
  return (
    <div className="min-h-screen bg-[#ECEDEF]">
      <div className="encore-app relative mx-auto min-h-screen w-full max-w-[480px] overflow-x-clip shadow-[0_0_60px_rgba(0,0,0,0.08)]">
        {!head.home && <EncoreHeader title={head.title} back={head.back} overlay={head.overlay} />}
        <main className="px-margin pb-[calc(110px+env(safe-area-inset-bottom))] pt-space-sm"><div key={loc.pathname} className="page-enter"><Suspense fallback={<SkeletonList />}><Outlet /></Suspense></div></main>
        {/* Home stays uncluttered — help is in Profile and on every other screen. */}
        {!head.home && !loc.pathname.startsWith('/app/request') && !loc.pathname.includes('/sent') && <HelpLauncher />}
        <FeatureGuide user={user} />
        <AppDock items={nav} />
      </div>
    </div>
  );
}

// ---------------- Driver ----------------
export function DriverLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const { data: s } = usePublicSettings();
  const unread = useLiveUpdates(driverLink);
  const live = useShareLiveLocation();
  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 bg-ink safe-top">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pb-3 sm:h-16 sm:pb-0">
          <Link to="/driver"><Logo dark /></Link>
          <div className="flex items-center gap-2">
            {s?.dispatcher_phone && (
              <a href={`tel:${s.dispatcher_phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold text-white">
                <Phone className="h-4 w-4" />Dispatch
              </a>
            )}
          </div>
        </div>
        {live.active && (
          <div className={cn('flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold', live.error ? 'bg-amber-500 text-black' : 'bg-primary text-white')}>
            {live.error ? live.error : (
              <><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-white" /></span>Sharing your live location with the passenger — keep Encore open</>
            )}
          </div>
        )}
        {!live.active && live.onDuty && (
          <div className="flex items-center justify-center gap-1.5 bg-emerald-600/90 px-4 py-1 text-[11px] font-semibold text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />On duty · your location is shared with Encore dispatch
          </div>
        )}
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-5"><div key={loc.pathname} className="page-enter"><Suspense fallback={<SkeletonList />}><Outlet /></Suspense></div></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 safe-bottom">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {[{ to: '/driver', label: 'My journeys', icon: Car, end: true }, { to: '/driver/updates', label: 'Updates', icon: Bell, badge: unread }, { to: '/driver/account', label: user.name.split(' ')[0], icon: User }].map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground', isActive && 'text-primary')}>
              <span className="relative"><n.icon className="h-5 w-5" /><Dot n={n.badge} /></span>{n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
