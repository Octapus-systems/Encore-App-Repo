import { Suspense, lazy, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, homeFor, useAuth } from '@/lib/auth';
import { CustomerLayout, DriverLayout, RequireRole } from '@/components/layouts';
import { PageLoader } from '@/components/common';
import { ConnectionWatcher } from '@/components/connection';
import { ErrorBoundary } from '@/components/error-boundary';
import { Invite, Login, Register, StaffNotice } from '@/pages/auth';
import { AppHome, CarDetails, FleetList, Onboarding } from '@/pages/app-screens';

// Screens beyond Home load as separate chunks, then are fetched in the background once the
// app is idle — so the first screen paints sooner and later taps open instantly.
const loaders = {
  customer: () => import('@/pages/customer'),
  journey: () => import('@/pages/app-journey'),
  pages: () => import('@/pages/app-pages'),
  invoice: () => import('@/pages/InvoiceView'),
  driver: () => import('@/pages/driver'),
  guest: () => import('@/pages/guest'),
};
const page = (mod, name = 'default') => lazy(() => loaders[mod]().then((m) => ({ default: m[name] })));
const NewRequest = page('customer', 'NewRequest');
const Account = page('customer', 'Account');
const Notifications = page('customer', 'Notifications');
const CustomerInvoices = page('customer', 'CustomerInvoices');
const InvoiceView = page('invoice');
const JourneyDetails = page('journey', 'JourneyDetails');
const RequestSent = page('journey', 'RequestSent');
const AppProfile = page('pages', 'AppProfile');
const AppUpdates = page('pages', 'AppUpdates');
const MyBookings = page('pages', 'MyBookings');
const DriverJobs = page('driver', 'DriverJobs');
const DriverJob = page('driver', 'DriverJob');
const GuestBook = page('guest', 'GuestBook');

function Prefetch() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return undefined;
    const mods = user.role === 'driver' ? ['driver', 'customer'] : ['journey', 'pages', 'customer', 'invoice'];
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
    const id = idle(() => mods.forEach((m) => loaders[m]().catch(() => {})));
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, [user]);
  return null;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={homeFor(user)} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Prefetch />
          <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/welcome" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/book" element={<GuestBook />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invite/:token" element={<Invite />} />
            <Route path="/staff" element={<StaffNotice />} />

            <Route element={<RequireRole roles={['customer', 'corporate']} />}>
              <Route path="/app" element={<CustomerLayout />}>
                <Route index element={<AppHome />} />
                <Route path="fleet" element={<FleetList />} />
                <Route path="fleet/:slug" element={<CarDetails />} />
                <Route path="request" element={<NewRequest />} />
                <Route path="bookings" element={<MyBookings />} />
                <Route path="bookings/:id" element={<JourneyDetails />} />
                <Route path="bookings/:id/sent" element={<RequestSent />} />
                <Route path="invoices" element={<CustomerInvoices />} />
                <Route path="invoices/:id" element={<InvoiceView back="/app/invoices" />} />
                <Route path="notifications" element={<AppUpdates />} />
                <Route path="account" element={<AppProfile />} />
              </Route>
            </Route>

            <Route element={<RequireRole roles={['driver']} />}>
              <Route path="/driver" element={<DriverLayout />}>
                <Route index element={<DriverJobs />} />
                <Route path="jobs/:id" element={<DriverJob />} />
                <Route path="updates" element={<Notifications driver />} />
                <Route path="account" element={<Account />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        <ConnectionWatcher />
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
