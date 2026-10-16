import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider, homeFor, useAuth } from '@/lib/auth';
import { AdminLayout, CustomerLayout, DriverLayout, RequireRole } from '@/components/layouts';
import { PageLoader } from '@/components/common';
import { Invite, Login, Register } from '@/pages/auth';
import { NewRequest, Account, Notifications, CustomerInvoices } from '@/pages/customer';
import InvoiceView from '@/pages/InvoiceView';
import { AppHome, CarDetails, FleetList, Onboarding } from '@/pages/app-screens';
import { JourneyDetails, RequestSent } from '@/pages/app-journey';
import { AppProfile, AppUpdates, MyBookings } from '@/pages/app-pages';
import { DriverJobs, DriverJob } from '@/pages/driver';
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminBookings from '@/pages/admin/Bookings';
import AdminBooking from '@/pages/admin/BookingDetail';
import AdminNewBooking from '@/pages/admin/NewBooking';
import AdminCalendar from '@/pages/admin/Calendar';
import { Fleet, Drivers, Operators } from '@/pages/admin/Resources';
import AdminCustomers from '@/pages/admin/Customers';
import { Payments, Invoices } from '@/pages/admin/Money';
import { MessagesLog, ActivityLog, Settings } from '@/pages/admin/Control';

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/welcome" element={<Onboarding />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/invite/:token" element={<Invite />} />

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

            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="bookings/new" element={<AdminNewBooking />} />
                <Route path="bookings/:id" element={<AdminBooking />} />
                <Route path="calendar" element={<AdminCalendar />} />
                <Route path="fleet" element={<Fleet />} />
                <Route path="drivers" element={<Drivers />} />
                <Route path="operators" element={<Operators />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="payments" element={<Payments />} />
                <Route path="invoices" element={<Invoices />} />
                <Route path="invoices/:id" element={<InvoiceView back="/admin/invoices" />} />
                <Route path="messages" element={<MessagesLog />} />
                <Route path="inbox" element={<Notifications admin />} />
                <Route path="activity" element={<ActivityLog />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
