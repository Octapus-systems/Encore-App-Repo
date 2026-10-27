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

export function CustomerLayout() {
  const { user } = useAuth();
  useLiveUpdates(customerLink);
  const loc = useLocation();
  const head = CUSTOMER_TITLES.find(([re]) => re.test(loc.pathname))?.[1] || { title: 'Encore' };
  const nav = [
    { to: '/app', label: 'Home', icon: 'home', end: true },
    { to: '/app/request', label: 'Book', icon: 'add_circle' },
    { to: '/app/bookings', label: 'Bookings', icon: 'calendar_today' },
    { to: '/app/account', label: 'Profile', icon: 'person' },
  ];
  return (
    <div className="min-h-screen bg-[#ECEDEF]">
      <div className="encore-app relative mx-auto min-h-screen w-full max-w-[480px] overflow-x-clip shadow-[0_0_60px_rgba(0,0,0,0.08)]">
        <EncoreHeader title={head.title} back={head.back} subtitle={head.home ? (user.organisation?.name || 'Staffordshire · UK-wide') : null} />
        <main className="px-margin pb-[calc(92px+env(safe-area-inset-bottom))] pt-space-sm"><div key={loc.pathname} className="page-enter"><Outlet /></div></main>
        {/* Docked tab bar: content scrolls above it, never under it. */}
        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-black/5 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
          <div className="grid h-[68px] grid-cols-4">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn('group flex flex-col items-center justify-center gap-0.5 text-on-surface-variant transition-colors', isActive && 'text-primary-container')}>
                {({ isActive }) => (
                  <>
                    <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-all duration-300', isActive ? 'bg-primary-container/[0.12] scale-100' : 'scale-90 group-hover:bg-surface-container')}>
                      <Icon name={n.icon} fill={isActive} className="!text-[22px]" />
                    </span>
                    <span className={cn('text-[11px] leading-none', isActive ? 'font-bold' : 'font-medium')}>{n.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
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
