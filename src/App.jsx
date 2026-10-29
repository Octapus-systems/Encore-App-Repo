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
import { NewRequest, Account, Notifications, CustomerInvoices } from '@/pages/customer';
import InvoiceView from '@/pages/InvoiceView';
import { AppHome, CarDetails, FleetList, Onboarding } from '@/pages/app-screens';
import { JourneyDetails, RequestSent } from '@/pages/app-journey';
import { AppProfile, AppUpdates, MyBookings } from '@/pages/app-pages';
import { DriverJobs, DriverJob } from '@/pages/driver';
import { GuestBook } from '@/pages/guest';

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
          </ErrorBoundary>
        </BrowserRouter>
        <ConnectionWatcher />
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
