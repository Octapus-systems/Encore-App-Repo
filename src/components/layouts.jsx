import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Bell, Building2, CalendarDays, Car, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, MessageSquare,
  Phone, Plus, Receipt, Settings, User, Users, X, Briefcase,
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

// ---------------- Admin ----------------
const ADMIN_NAV = [
  { group: 'Operations', items: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
    { to: '/admin/calendar', label: 'Calendar', icon: CalendarDays },
  ] },
  { group: 'Resources', items: [
    { to: '/admin/fleet', label: 'Fleet', icon: Car },
    { to: '/admin/drivers', label: 'Drivers', icon: Users },
    { to: '/admin/operators', label: 'External cover', icon: Briefcase },
  ] },
  { group: 'Customers & money', items: [
    { to: '/admin/customers', label: 'Customers', icon: Building2 },
    { to: '/admin/payments', label: 'Payments', icon: Receipt },
    { to: '/admin/invoices', label: 'Invoices', icon: FileText },
  ] },
  { group: 'Control', items: [
    { to: '/admin/messages', label: 'Notifications', icon: MessageSquare },
    { to: '/admin/activity', label: 'Activity history', icon: Activity },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ] },
];

export function AdminLayout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const unread = useUnread();
  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Logo dark />
        <button className="text-white/60 lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
      </div>
      <div className="px-5 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Command Center</div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {ADMIN_NAV.map((g) => (
          <div key={g.group} className="mb-4">
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/35">{g.group}</div>
            {g.items.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)}
                className={({ isActive }) => cn('mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/5 hover:text-white', isActive && 'bg-primary text-white hover:bg-primary')}>
                <n.icon className="h-4 w-4" />{n.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="truncate text-sm font-semibold text-white">{user.name}</div>
        <div className="truncate text-xs text-white/50">{user.email}</div>
        <button onClick={signOut} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white"><LogOut className="h-3.5 w-3.5" />Sign out</button>
      </div>
    </div>
  );
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-ink lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-ink">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white/90 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-muted-foreground lg:block">{loc.pathname.startsWith('/admin/bookings/') ? 'Booking' : ''}</div>
          <div className="flex items-center gap-2">
            <Link to="/admin/bookings/new" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"><Plus className="h-4 w-4" />New booking</Link>
            <Link to="/admin/inbox" className="relative rounded-full p-2 hover:bg-surface" title="Alerts"><Bell className="h-5 w-5" /><Dot n={unread} /></Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8"><Outlet /></main>
      </div>
    </div>
  );
}
