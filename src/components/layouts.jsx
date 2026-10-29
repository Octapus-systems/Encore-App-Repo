import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Car,
  Phone, User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { homeFor, useAuth, usePublicSettings } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Logo, PageLoader } from '@/components/common';
import { EncoreHeader, Icon } from '@/components/app-ui';
import { useLiveUpdates } from '@/lib/live';
import { HelpLauncher } from '@/components/help-center';
import { FeatureGuide } from '@/components/feature-guide';

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
  [/^\/app\/request/, { title: 'Request a Journey', back: true }],
  [/^\/app\/bookings\/\d+\/sent/, { title: 'Request Received', back: '/app/bookings' }],
  [/^\/app\/bookings\/.+/, { title: 'Journey Details', back: '/app/bookings' }],
  [/^\/app\/bookings/, { title: 'My Bookings' }],
  [/^\/app\/invoices\/.+/, { title: 'Invoice', back: '/app/invoices' }],
  [/^\/app\/invoices/, { title: 'Invoices', back: '/app/account' }],
  [/^\/app\/notifications/, { title: 'Updates', back: true }],
  [/^\/app\/account/, { title: 'Profile' }],
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
  const slot = activeIdx < 0 ? -1 : activeIdx < 2 ? activeIdx : activeIdx + 1; // 5 slots, centre is Book
  const booking = loc.pathname.startsWith('/app/request');
  const Tab = (n) => (
    <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('dock-tab relative flex flex-col items-center justify-center gap-1 text-white/55 transition-colors duration-300', isActive && 'text-white active-pop')}>
      {({ isActive }) => (
        <>
          <span className={cn('relative transition-transform duration-300', isActive ? '-translate-y-0.5 scale-110' : '')}>
            <Icon name={n.icon} fill={isActive} className="!text-[24px]" />
            {n.badge && unread > 0 && <span className="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary-container px-1 text-[9px] font-bold text-white ring-2 ring-[#141416]">{unread > 9 ? '9+' : unread}</span>}
          </span>
          <span className={cn('text-[10.5px] font-semibold leading-none tracking-wide transition-opacity', isActive ? 'opacity-100' : 'opacity-70')}>{n.label}</span>
        </>
      )}
    </NavLink>
  );
  return (
    <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="dock-shell relative grid h-[70px] grid-cols-5 rounded-[26px] bg-[#141416]/95 shadow-[0_18px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-2xl">
        {slot >= 0 && (
          <span className="dock-indicator pointer-events-none absolute top-0 h-[3px] w-10 rounded-full bg-gradient-to-r from-primary-container to-button-end shadow-[0_0_14px_rgba(255,113,15,0.9)]"
            style={{ left: `calc(${slot} * 20% + 10% - 20px)` }} />
        )}
        {left.map(Tab)}
        <div className="relative flex justify-center">
          <NavLink to="/app/request" aria-label="Book a journey"
            className={cn('dock-fab absolute -top-7 grid h-[62px] w-[62px] place-items-center rounded-full bg-gradient-to-br from-primary-container via-button-mid to-tertiary-container text-white shadow-[0_12px_30px_rgba(255,113,15,0.55)] ring-[6px] ring-background transition-transform duration-300 active:scale-90', booking && 'dock-fab-away')}>
            <Icon name="add" className="!text-[32px]" />
          </NavLink>
          <span className={cn('dock-slot-icon pointer-events-none absolute top-[14px] text-primary-container', booking && 'is-on')}><Icon name="edit_road" fill className="!text-[24px]" /></span>
          <span className={cn('mt-auto pb-2.5 text-[10.5px] font-semibold tracking-wide transition-colors', booking ? 'text-white' : 'text-white/55')}>{booking ? 'Booking' : 'Book'}</span>
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
        {!head.home && <EncoreHeader title={head.title} back={head.back} />}
        <main className="px-margin pb-[calc(110px+env(safe-area-inset-bottom))] pt-space-sm"><div key={loc.pathname} className="page-enter"><Outlet /></div></main>
        <HelpLauncher />
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
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-5"><div key={loc.pathname} className="page-enter"><Outlet /></div></main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 backdrop-blur safe-bottom">
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
