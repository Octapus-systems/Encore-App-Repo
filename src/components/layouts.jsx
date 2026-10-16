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

export function RequireRole({ roles }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}

function useUnread() {
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/account/notifications'), refetchInterval: 30000 });
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
  const loc = useLocation();
  const head = CUSTOMER_TITLES.find(([re]) => re.test(loc.pathname))?.[1] || { title: 'Encore' };
  const nav = [
    { to: '/app', label: 'Home', icon: 'directions_car', end: true },
    { to: '/app/request', label: 'Book', icon: 'search' },
    { to: '/app/bookings', label: 'Bookings', icon: 'calendar_today' },
    { to: '/app/account', label: 'Profile', icon: 'person' },
  ];
  return (
    <div className="min-h-screen bg-[#ECEDEF]">
      <div className="encore-app relative mx-auto min-h-screen w-full max-w-[480px] overflow-x-clip shadow-[0_0_60px_rgba(0,0,0,0.08)]">
        <EncoreHeader title={head.title} back={head.back} subtitle={head.home ? (user.organisation?.name || 'Staffordshire · UK-wide') : null} />
        <main className="px-margin pb-32 pt-space-sm"><Outlet /></main>
        <div className="pointer-events-none fixed bottom-0 left-1/2 z-50 mb-space-sm w-full max-w-[480px] -translate-x-1/2 px-margin safe-bottom">
          <nav className="pointer-events-auto mx-auto flex max-w-md items-center justify-between rounded-full bg-surface-container-lowest/95 p-space-xs shadow-[0_16px_36px_var(--encore-shadow-0-12)] backdrop-blur-2xl">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn('flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-space-xs text-on-surface-variant transition-all duration-200 hover:text-on-surface',
                  isActive && 'bg-primary-container font-bold text-on-primary shadow-[0_8px_20px_var(--encore-orange-shadow-0-35)] hover:text-on-primary')}>
                <Icon name={n.icon} className="!text-[20px]" /><span className="text-label-sm font-label-sm">{n.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}

// ---------------- Driver ----------------
export function DriverLayout() {
  const { user } = useAuth();
  const { data: s } = usePublicSettings();
  const unread = useUnread();
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
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-5"><Outlet /></main>
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
