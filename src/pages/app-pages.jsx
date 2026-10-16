import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth, usePublicSettings } from '@/lib/auth';
import { JOURNEY_TYPES, gbp, relative, shortDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageLoader, StatusBadge, useAction } from '@/components/common';
import { Icon, Img } from '@/components/app-ui';

const card = 'rounded-[2rem] bg-surface-container-lowest shadow-[0_8px_24px_var(--encore-shadow-0-05)]';

function Segmented({ value, onChange, options }) {
  return (
    <div className="flex items-center justify-between rounded-full bg-surface-container-lowest p-1 shadow-[0_4px_16px_var(--encore-shadow-0-05)]">
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)} className={cn('flex-1 rounded-full py-2 text-center text-label-md font-label-md transition-all', value === k ? 'bg-primary-container font-bold text-on-primary shadow-[0_4px_12px_var(--encore-orange-shadow-0-35)]' : 'text-secondary hover:text-on-surface')}>{l}</button>
      ))}
    </div>
  );
}

function EmptyCard({ icon, title, text, action }) {
  return (
    <div className={cn(card, 'flex flex-col items-center gap-2 p-8 text-center')}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant"><Icon name={icon} /></div>
      <div className="font-headline-sm text-headline-sm text-on-surface">{title}</div>
      {text && <p className="text-body-sm font-body-sm text-secondary">{text}</p>}
      {action}
    </div>
  );
}

const TYPE_ICON = { point_to_point: 'pin_drop', airport: 'flight', return: 'sync_alt', event: 'nightlife', corporate: 'business_center', hourly: 'schedule' };

// ======================= My Bookings =======================
export function MyBookings() {
  const [tab, setTab] = useState('upcoming');
  const { data, isLoading } = useQuery({ queryKey: ['bookings', tab], queryFn: () => api.get(`/bookings?view=${tab}&sort=${tab === 'past' ? 'pickup_desc' : 'pickup'}`), refetchInterval: 30000 });
  return (
    <div className="flex flex-col gap-space-md pt-space-xs">
      <Segmented value={tab} onChange={setTab} options={[['upcoming', 'Upcoming'], ['past', 'Past']]} />
      {isLoading ? <PageLoader /> : !data.length ? (
        <EmptyCard icon="event_available" title={tab === 'upcoming' ? 'No upcoming journeys' : 'No past journeys'} text="Requests you send will appear here."
          action={tab === 'upcoming' && <Link to="/app/request" className="mt-2 rounded-full bg-primary-container px-5 py-3 text-label-md font-label-md font-bold text-on-primary shadow-[0_8px_20px_var(--encore-orange-shadow-0-35)]">Request a journey</Link>} />
      ) : data.map((b) => (
        <Link key={b.id} to={`/app/bookings/${b.id}`} className={cn(card, 'flex flex-col gap-3 p-space-md transition-transform active:scale-[0.99]')}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-space-sm">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant"><Icon name={TYPE_ICON[b.journey_type] || 'directions_car'} className="!text-[22px]" /></div>
              <div className="min-w-0">
                <div className="truncate font-headline-sm text-headline-sm text-on-surface">{shortDateTime(b.first_pickup)}</div>
                <div className="text-body-sm font-body-sm text-secondary">{b.ref} · {JOURNEY_TYPES[b.journey_type]}{b.is_return ? ' · Return' : ''}</div>
              </div>
            </div>
            <StatusBadge status={b.status} className="flex-shrink-0" />
          </div>
          <div className="relative flex flex-col gap-2 rounded-2xl bg-surface-container-low p-3">
            <div className="absolute bottom-5 left-[19px] top-5 w-[2px] bg-surface-container-highest" />
            <div className="relative flex items-center gap-2.5"><span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary-container ring-4 ring-primary-container/15" /><span className="truncate text-body-md font-body-md text-on-surface">{b.pickup}</span></div>
            <div className="relative flex items-center gap-2.5"><span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-on-secondary-fixed ring-4 ring-secondary-container" /><span className="truncate text-body-md font-body-md text-on-surface">{b.destination}</span></div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-body-sm text-secondary">{b.organisation_name ? `Passenger ${b.lead_passenger}` : `${b.passenger_count} passenger${b.passenger_count > 1 ? 's' : ''}`}</span>
            <div className="flex items-center gap-2">
              {b.vehicles && <span className="rounded-md border-2 border-on-surface bg-[#FFD400] px-1.5 font-mono text-xs font-black text-on-surface">{b.vehicles}</span>}
              <span className="text-label-md font-label-md font-bold text-on-surface">{b.total != null ? gbp(b.total) : 'Quote to follow'}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ======================= Updates =======================
const EVENT_ICON = {
  request_received: 'inbox', quote_sent: 'request_quote', booking_confirmed: 'check_circle', driver_assigned: 'directions_car', pickup_reminder: 'alarm',
  driver_on_the_way: 'near_me', driver_arrived: 'pin_drop', journey_started: 'route', journey_completed: 'verified', clarification_requested: 'help',
  message: 'chat', payment_link: 'credit_card', invoice_issued: 'receipt_long', booking_cancelled: 'cancel', request_rejected: 'block', account_approved: 'how_to_reg',
};

export function AppUpdates() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/account/notifications') });
  const readAll = useAction(() => api.post('/account/notifications/read-all'), { invalidate: ['notifications'] });
  const open = (n) => { if (!n.read_at) api.post(`/account/notifications/${n.id}/read`).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })); };
  if (isLoading) return <PageLoader />;
  return (
    <div className="flex flex-col gap-space-sm pt-space-xs">
      {data.some((n) => !n.read_at) && (
        <button onClick={() => readAll.mutate()} className="self-end rounded-full px-3 py-1.5 text-label-md font-label-md font-bold text-primary">Mark all as read</button>
      )}
      {!data.length ? <EmptyCard icon="notifications" title="No updates yet" text="Quotes, confirmations and chauffeur updates will appear here." /> : data.map((n) => {
        const body = (
          <div className={cn(card, 'flex items-start gap-space-sm p-space-md', !n.read_at && 'ring-2 ring-primary-container/30')}>
            <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full', n.read_at ? 'bg-surface-container text-secondary' : 'bg-primary-container text-on-primary')}><Icon name={EVENT_ICON[n.event] || 'notifications'} className="!text-[20px]" /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-label-lg font-label-lg text-on-surface">{n.title}</span>
                <span className="flex-shrink-0 text-body-sm font-body-sm text-secondary">{relative(n.created_at)}</span>
              </div>
              <p className="mt-0.5 text-body-sm font-body-sm text-secondary">{n.body}</p>
            </div>
          </div>
        );
        return n.booking_id
          ? <Link key={n.id} to={`/app/bookings/${n.booking_id}`} onClick={() => open(n)}>{body}</Link>
          : <div key={n.id} onClick={() => open(n)}>{body}</div>;
      })}
    </div>
  );
}

// ======================= Profile =======================
export function AppProfile() {
  const { user, setUser, signOut } = useAuth();
  const { data: s } = usePublicSettings();
  const [phone, setPhone] = useState(user.phone || '');
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const [section, setSection] = useState(null);
  const save = useAction((b) => api.patch('/auth/me', b), { success: 'Saved.', onSuccess: (u) => { setUser(u); setPw({ current_password: '', new_password: '' }); setSection(null); } });
  const input = 'w-full rounded-full border-0 bg-surface-container-low px-5 py-3.5 text-body-md font-body-md text-on-surface outline-none ring-1 ring-transparent placeholder:text-secondary focus:ring-primary-container';
  const Row = ({ icon, label, sub, onClick, to, href, danger }) => {
    const inner = (
      <>
        <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', danger ? 'bg-error-container text-error' : 'bg-surface-container text-on-surface')}><Icon name={icon} className="!text-[20px]" /></div>
        <div className="min-w-0 flex-1 text-left">
          <div className={cn('text-label-lg font-label-lg font-bold', danger ? 'text-error' : 'text-on-surface')}>{label}</div>
          {sub && <div className="truncate text-body-sm font-body-sm text-secondary">{sub}</div>}
        </div>
        {!danger && <Icon name="chevron_right" className="text-secondary" />}
      </>
    );
    const cls = 'flex w-full items-center gap-space-sm px-space-md py-3 transition-colors hover:bg-surface-container-low';
    if (to) return <Link to={to} className={cls}>{inner}</Link>;
    if (href) return <a href={href} className={cls}>{inner}</a>;
    return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  };
  return (
    <div className="flex flex-col gap-space-md pt-space-xs">
      <div className="relative overflow-hidden rounded-[2rem] bg-inverse-surface p-space-lg text-inverse-on-surface shadow-[0_16px_36px_var(--encore-shadow-0-18)]">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-primary-container/35 to-transparent blur-2xl" />
        <div className="relative flex items-center gap-space-md">
          <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-primary-container/40"><Img k="martin" alt="" className="h-full w-full object-cover" placeholderClassName="h-full w-full rounded-full" /></div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 text-[11px] font-bold text-on-primary-fixed"><Icon name="verified" className="!text-[12px] text-primary" />{user.organisation ? 'CORPORATE' : 'PRIVATE CLIENT'}</span>
            <div className="mt-1 truncate font-headline-md text-headline-md text-white">{user.name}</div>
            <div className="truncate text-body-sm font-body-sm text-secondary-fixed">{user.email}</div>
          </div>
        </div>
        {user.organisation && (
          <div className="relative mt-space-md rounded-2xl bg-white/5 p-3 text-body-sm font-body-sm">
            <div className="font-semibold text-white">{user.organisation.name}</div>
            <div className="text-secondary-fixed">{user.organisation.payment_terms}</div>
          </div>
        )}
      </div>

      <div className={cn(card, 'divide-y divide-surface-container overflow-hidden')}>
        <Row icon="call" label="Mobile number" sub={user.phone || 'Not set'} onClick={() => setSection(section === 'phone' ? null : 'phone')} />
        {section === 'phone' && (
          <form className="flex gap-2 p-space-md" onSubmit={(e) => { e.preventDefault(); save.mutate({ phone }); }}>
            <input className={input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <button className="flex-shrink-0 rounded-full bg-primary-container px-5 text-label-md font-label-md font-bold text-on-primary">Save</button>
          </form>
        )}
        <label className="flex w-full cursor-pointer items-center gap-space-sm px-space-md py-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface"><Icon name="chat" className="!text-[20px]" /></div>
          <div className="flex-1"><div className="text-label-lg font-label-lg text-on-surface">WhatsApp updates</div><div className="text-body-sm font-body-sm text-secondary">Journey updates to your mobile</div></div>
          <input type="checkbox" className="h-5 w-5 accent-[#FF710F]" checked={!!user.whatsapp_opt_in} onChange={(e) => save.mutate({ whatsapp_opt_in: e.target.checked })} />
        </label>
        <Row icon="lock" label="Change password" onClick={() => setSection(section === 'pw' ? null : 'pw')} />
        {section === 'pw' && (
          <form className="flex flex-col gap-2 p-space-md" onSubmit={(e) => { e.preventDefault(); save.mutate(pw); }}>
            <input className={input} type="password" autoComplete="current-password" placeholder="Current password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
            {save.fields.current_password && <span className="px-4 text-body-sm text-error">{save.fields.current_password}</span>}
            <input className={input} type="password" autoComplete="new-password" placeholder="New password (8+ characters)" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} />
            {save.fields.new_password && <span className="px-4 text-body-sm text-error">{save.fields.new_password}</span>}
            <button disabled={!pw.new_password} className="rounded-full bg-primary-container py-3 text-label-md font-label-md font-bold text-on-primary disabled:opacity-50">Update password</button>
          </form>
        )}
      </div>

      <div className={cn(card, 'divide-y divide-surface-container overflow-hidden')}>
        <Row icon="notifications" label="Updates" sub="Quotes, confirmations and chauffeur updates" to="/app/notifications" />
        <Row icon="directions_car" label="Our fleet" to="/app/fleet" />
        {user.role === 'corporate' && <Row icon="receipt_long" label="Corporate invoices" sub="Consolidated invoices for your organisation" to="/app/invoices" />}
        {s && <Row icon="support_agent" label="Call Encore" sub={`${s.dispatcher_phone} · 24/7`} href={`tel:${s.dispatcher_phone}`} />}
      </div>

      <div className={cn(card, 'overflow-hidden')}>
        <Row icon="logout" label="Sign out" onClick={signOut} danger />
      </div>
      <p className="px-4 text-center text-body-sm font-body-sm text-secondary">Your data is handled under Encore Executive's Privacy Policy. Card details are never stored by Encore.</p>
    </div>
  );
}
