import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight, Bell, CalendarClock, Car, CheckCircle2, ChevronRight, ClipboardList, CreditCard, ExternalLink, FileText,
  HelpCircle, LogOut, MessageSquare, Phone, Plus, Receipt, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, usePublicSettings } from '@/lib/auth';
import {
  JOURNEY_TYPES, LEG_STATUS, PAYMENT_ARRANGEMENT, PAYMENT_METHOD, dateOnly, dateTime, gbp, relative, shortDateTime,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Banner, Empty, ErrorState, Field, KV, Modal, PageHeader, PageLoader, PaymentBadge, Panel, PrimaryButton, StatusBadge, TextArea,
  TextInput, useAction,
} from '@/components/common';
import { BookingProgress, LegRoute, LegTimes, MessageThread, RequestForm, emptyRequest } from '@/components/booking';
import { Button } from '@/components/ui/button';

const useBookings = (view) => useQuery({ queryKey: ['bookings', view], queryFn: () => api.get(`/bookings?view=${view}&sort=${view === 'past' ? 'pickup_desc' : 'pickup'}`), refetchInterval: 10000 });

function BookingRow({ b, to }) {
  return (
    <Link to={to} className="group block rounded-2xl border bg-white p-4 shadow-sm transition hover:border-primary/40 hover:shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>{b.ref}</span><span>·</span><span>{JOURNEY_TYPES[b.journey_type]}</span>{b.is_return ? <span className="rounded bg-surface px-1.5">Return</span> : null}
          </div>
          <div className="mt-1.5 font-heading text-[15px] font-semibold text-ink">{dateTime(b.first_pickup)}</div>
          <div className="mt-1 truncate text-sm text-muted-foreground">{b.pickup} → {b.destination}</div>
          {b.organisation_name && <div className="mt-1 text-xs text-muted-foreground">Passenger: {b.lead_passenger}</div>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={b.status} />
          {b.vehicles && ['driver_assigned', 'on_the_way', 'arrived', 'started'].includes(b.status) && <span className="rounded-md bg-ink px-2 py-0.5 font-mono text-xs font-bold text-white">{b.vehicles}</span>}
          <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

export function CustomerHome() {
  const { user } = useAuth();
  const { data: s } = usePublicSettings();
  const { data, isLoading } = useBookings('upcoming');
  const action = (data || []).filter((b) => ['quote_sent', 'clarification_needed'].includes(b.status));
  const next = (data || []).find((b) => ['confirmed', 'driver_assigned', 'on_the_way', 'arrived', 'started'].includes(b.status));
  const hour = new Date().getHours();
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-lg sm:p-8">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{user.organisation?.name || 'Encore Executive'}</div>
        <h1 className="mt-2 font-heading text-3xl font-bold">Good {hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]}</h1>
        <p className="mt-2 max-w-md text-sm text-white/60">Tell us about your journey and we will prepare a tailored quotation for you.</p>
        <Link to="/app/request" className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-6 font-semibold text-white shadow-lg shadow-primary/30 hover:bg-primary/90">
          Request a journey <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {action.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-heading text-lg font-semibold">Needs your attention</h2>
          {action.map((b) => (
            <Link key={b.id} to={`/app/bookings/${b.id}`} className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-orange-50 p-4">
              {b.status === 'quote_sent' ? <Receipt className="h-5 w-5 text-primary" /> : <HelpCircle className="h-5 w-5 text-primary" />}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{b.status === 'quote_sent' ? `Your quotation is ready${b.total ? ` · ${gbp(b.total)}` : ''}` : 'We need a few more details'}</div>
                <div className="truncate text-sm text-muted-foreground">{b.ref} · {shortDateTime(b.first_pickup)}</div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      )}

      {next && (
        <div>
          <h2 className="mb-2 font-heading text-lg font-semibold">Next journey</h2>
          <BookingRow b={next} to={`/app/bookings/${next.id}`} />
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Upcoming</h2>
          <Link to="/app/bookings" className="text-sm font-semibold text-primary">View all</Link>
        </div>
        {isLoading ? <PageLoader /> : (data || []).length === 0 ? (
          <Empty icon={CalendarClock} title="No upcoming journeys">When you request a journey it will appear here.</Empty>
        ) : <div className="space-y-2">{data.slice(0, 4).map((b) => <BookingRow key={b.id} b={b} to={`/app/bookings/${b.id}`} />)}</div>}
      </div>

      {s && (
        <a href={`tel:${s.dispatcher_phone}`} className="flex items-center gap-3 rounded-2xl border bg-white p-4 text-sm shadow-sm">
          <Phone className="h-5 w-5 text-primary" /><div><div className="font-semibold">Speak to Encore Executive</div><div className="text-muted-foreground">{s.dispatcher_phone} · available 24/7</div></div>
        </a>
      )}
    </div>
  );
}

export function NewRequest() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const type = params.get('type');
  const initial = {
    ...emptyRequest(user),
    ...(type && JOURNEY_TYPES[type] ? { journey_type: type } : {}),
    ...(params.get('destination') ? { destination: params.get('destination') } : {}),
    ...(params.get('category') ? { preferred_category: params.get('category') } : {}),
  };
  const create = useAction((body) => api.post('/bookings', body), {
    success: 'Request sent — we will be in touch with a quotation.',
    invalidate: ['bookings', 'notifications'],
    onSuccess: (b) => nav(`/app/bookings/${b.id}/sent`, { replace: true }),
  });
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="" subtitle={user.role === 'corporate' ? `Booking for ${user.organisation?.name}. Add your traveller as the lead passenger.` : 'Tell us everything we need to arrange your journey perfectly.'} />
      <RequestForm initial={initial} onSubmit={(b) => create.mutate(b)} submitting={create.isPending} fields={create.fields} />
    </div>
  );
}

export function CustomerBookings() {
  const [tab, setTab] = useState('upcoming');
  const { data, isLoading, error } = useBookings(tab);
  return (
    <div>
      <PageHeader title="" actions={<Link to="/app/request"><Button className="rounded-full"><Plus />New request</Button></Link>} />
      <div className="mb-4 inline-flex rounded-full bg-white p-1 shadow-sm ring-1 ring-border">
        {['upcoming', 'past'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn('rounded-full px-4 py-1.5 text-sm font-semibold capitalize', tab === t ? 'bg-ink text-white' : 'text-muted-foreground')}>{t}</button>
        ))}
      </div>
      {isLoading ? <PageLoader /> : error ? <ErrorState error={error} /> : data.length === 0 ? (
        <Empty icon={ClipboardList} title={tab === 'upcoming' ? 'Nothing upcoming' : 'No past journeys'} />
      ) : <div className="space-y-2">{data.map((b) => <BookingRow key={b.id} b={b} to={`/app/bookings/${b.id}`} />)}</div>}
    </div>
  );
}

export function CustomerBooking() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: s } = usePublicSettings();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => api.get(`/bookings/${id}`), refetchInterval: 8000 });
  const [dialog, setDialog] = useState(null);
  const [note, setNote] = useState('');
  const refresh = (b) => { qc.setQueryData(['booking', id], b); qc.invalidateQueries({ queryKey: ['bookings'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); };
  const respond = useAction(({ qid, action, note: n }) => api.post(`/bookings/${id}/quotes/${qid}/respond`, { action, note: n }), {
    success: (_d, v) => ({ accept: 'Thank you — Encore will now confirm your booking.', decline: 'Quotation declined.', change: 'Change request sent.' }[v.action]),
    onSuccess: (b) => { refresh(b); setDialog(null); setNote(''); },
  });
  const cancel = useAction(() => api.post(`/bookings/${id}/cancel`, { reason: note }), {
    success: 'Booking cancelled.', onSuccess: (b) => { refresh(b); setDialog(null); setNote(''); },
  });
  const message = useAction(({ body }) => api.post(`/bookings/${id}/messages`, { body }), { onSuccess: (b, v) => { refresh(b); v.done(); } });

  if (q.isLoading) return <PageLoader />;
  if (q.error) return <ErrorState error={q.error} />;
  const b = q.data;
  const openQuote = b.quotes.find((x) => x.status === 'sent');
  const lastQuote = b.quotes.find((x) => ['accepted', 'sent', 'change_requested', 'declined'].includes(x.status));
  const confirmedish = ['confirmed', 'driver_assigned', 'on_the_way', 'arrived', 'started', 'completed', 'closed'].includes(b.status);

  return (
    <div className="space-y-4">
      <Link to="/app/bookings" className="text-sm font-semibold text-muted-foreground hover:text-ink">← Bookings</Link>
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-border sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-muted-foreground">{b.ref} · {JOURNEY_TYPES[b.journey_type]}</div>
            <h1 className="mt-1 font-heading text-2xl font-bold">{dateTime(b.legs[0]?.pickup_at)}</h1>
            {b.organisation && <div className="mt-1 text-sm text-muted-foreground">{b.organisation.name} · passenger {b.lead_passenger}</div>}
          </div>
          <StatusBadge status={b.status} className="text-sm" />
        </div>
        <div className="mt-4"><BookingProgress status={b.status} /></div>
      </div>

      {['pending', 'under_review'].includes(b.status) && (
        <Banner tone="amber" icon={CalendarClock} title="Your request is with our team">This is not yet a confirmed booking. We are reviewing your journey and will send a tailored quotation.</Banner>
      )}
      {b.status === 'clarification_needed' && (
        <Banner tone="amber" icon={HelpCircle} title="We need a little more information">Please reply to our message below so we can prepare your quotation.</Banner>
      )}
      {b.status === 'change_requested' && <Banner tone="blue" icon={MessageSquare} title="Change requested">We have your requested changes and will send a revised quotation.</Banner>}
      {b.status === 'quote_accepted' && (
        <Banner tone="blue" icon={CheckCircle2} title="Quotation accepted — awaiting confirmation">Thank you. Your booking is confirmed only once Encore Executive confirms it. We will notify you shortly.</Banner>
      )}
      {b.status === 'rejected' && <Banner tone="red" icon={XCircle} title="We're unable to take this journey">Please call us on {s?.dispatcher_phone} to discuss alternatives.</Banner>}
      {b.status.startsWith('cancelled') && <Banner tone="red" icon={XCircle} title="Booking cancelled">{b.cancel_reason || `Cancelled ${shortDateTime(b.cancelled_at)}.`}</Banner>}

      {openQuote && b.status === 'quote_sent' && (
        <div className="overflow-hidden rounded-3xl border-2 border-primary bg-white shadow-lg">
          <div className="bg-ink px-5 py-4 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your tailored quotation</div>
            <div className="mt-1 flex items-end justify-between gap-3">
              <div className="font-heading text-4xl font-bold">{gbp(openQuote.total)}</div>
              {openQuote.valid_until && <div className="text-right text-xs text-white/60">Valid until<br />{shortDateTime(openQuote.valid_until)}</div>}
            </div>
          </div>
          <div className="p-5">
            <div className="divide-y text-sm">
              {openQuote.customer_lines.map((l, i) => <div key={i} className="flex justify-between py-2"><span>{l.label}</span><span className="font-semibold">{gbp(l.amount)}</span></div>)}
              <div className="flex justify-between py-2 font-heading text-base font-bold"><span>Total</span><span>{gbp(openQuote.total)}</span></div>
            </div>
            {openQuote.message_to_customer && <p className="mt-3 rounded-xl bg-surface p-3 text-sm">{openQuote.message_to_customer}</p>}
            {new Date(openQuote.valid_until) < new Date() && <Banner tone="amber" className="mt-3">This quotation has passed its validity date. You can still respond and we will reconfirm availability.</Banner>}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <PrimaryButton onClick={() => respond.mutate({ qid: openQuote.id, action: 'accept' })} loading={respond.isPending && respond.variables?.action === 'accept'}>Accept</PrimaryButton>
              <Button variant="outline" className="h-11 rounded-xl" onClick={() => setDialog('change')}>Request a change</Button>
              <Button variant="ghost" className="h-11 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDialog('decline')}>Decline</Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Accepting does not confirm the booking — Encore Executive will confirm it and let you know.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        <div className="space-y-4">
          {b.legs.map((leg) => (
            <Panel key={leg.id} title={b.legs.length > 1 ? `${leg.label} · ${shortDateTime(leg.pickup_at)}` : 'Journey'} actions={confirmedish && <span className="text-xs font-semibold text-muted-foreground">{LEG_STATUS[leg.status]}</span>}>
              <LegRoute leg={leg} />
              {leg.vehicle ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
                  <Car className="h-5 w-5 text-primary" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="font-semibold">{[leg.vehicle.colour, leg.vehicle.make, leg.vehicle.model].filter(Boolean).join(' ') || 'Your vehicle'}</div>
                    {leg.chauffeur && <div className="text-muted-foreground">Chauffeur: {leg.chauffeur}</div>}
                  </div>
                  <span className="rounded-md border-2 border-ink bg-yellow-300 px-2 py-0.5 font-mono text-sm font-black tracking-wider text-ink">{leg.vehicle.registration}</span>
                </div>
              ) : confirmedish && leg.status === 'unassigned' ? <p className="mt-4 text-sm text-muted-foreground">Your chauffeur and vehicle registration will appear here once assigned.</p> : null}
              <div className="mt-3"><LegTimes leg={leg} /></div>
            </Panel>
          ))}

          <Panel title="Messages">
            <MessageThread messages={b.messages} viewerRole={user.role} sending={message.isPending}
              placeholder={b.status === 'clarification_needed' ? 'Reply with the details requested…' : 'Message Encore Executive…'}
              onSend={TERMINAL_CUSTOMER.includes(b.status) ? null : (body, done) => message.mutate({ body, done })} />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Your requirements">
            <div className="grid grid-cols-2 gap-4">
              <KV label="Lead passenger">{b.lead_passenger}</KV>
              <KV label="Contact">{b.contact_phone}</KV>
              <KV label="Passengers">{b.passenger_count}</KV>
              <KV label="Luggage">{b.luggage_large} large · {b.luggage_small} small</KV>
              {b.child_seats > 0 && <KV label="Child seats">{b.child_seats}</KV>}
              {b.flight_number && <KV label="Flight">{b.flight_number}</KV>}
              {b.duration_hours && <KV label="Duration">{b.duration_hours} hours</KV>}
              {b.preferred_category && <KV label="Preferred vehicle">{b.preferred_category}</KV>}
              {b.accessibility_needs && <KV label="Accessibility" className="col-span-2">{b.accessibility_needs}</KV>}
              {b.special_instructions && <KV label="Instructions" className="col-span-2">{b.special_instructions}</KV>}
              {b.sensitive_notes && <KV label="Private chauffeur notes" className="col-span-2">{b.sensitive_notes}</KV>}
            </div>
          </Panel>

          {(confirmedish || lastQuote) && (
            <Panel title="Payment">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{b.status === 'quote_sent' ? 'Quoted price' : 'Agreed price'}</span><span className="font-heading text-lg font-bold">{b.agreed_total != null ? gbp(b.agreed_total) : '—'}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Arrangement</span><span className="text-sm font-medium">{PAYMENT_ARRANGEMENT[b.payment_arrangement]}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Status</span><PaymentBadge status={b.payment_status} /></div>
                {b.invoice && <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Invoice</span>{user.role === 'corporate' ? <Link className="text-sm font-semibold text-primary" to={`/app/invoices/${b.invoice.id}`}>{b.invoice.number}</Link> : <span className="text-sm">{b.invoice.number}</span>}</div>}
                {b.payment_link && !['paid', 'invoiced'].includes(b.payment_status) && (
                  <a href={b.payment_link} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-white"><CreditCard className="h-4 w-4" />Pay securely<ExternalLink className="h-3.5 w-3.5" /></a>
                )}
                {b.payments.filter((p) => p.outcome === 'succeeded').map((p) => (
                  <div key={p.id} className="flex justify-between text-xs text-muted-foreground"><span>{p.kind === 'refund' ? 'Refund' : 'Received'} · {PAYMENT_METHOD[p.method]} · {dateOnly(p.created_at)}</span><span className="font-semibold text-ink">{gbp(p.amount)}</span></div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Need to change something?">
            {b.can_customer_cancel ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{s?.cancellation_policy}</p>
                <Button variant="outline" className="h-11 w-full rounded-xl border-red-200 text-red-600 hover:bg-red-50" onClick={() => setDialog('cancel')}>Cancel this booking</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{['on_the_way', 'arrived', 'started'].includes(b.status) ? 'Your chauffeur is on the way, so changes must be made by phone.' : 'Please contact us for any changes.'}</p>
            )}
            {s && <a href={`tel:${s.dispatcher_phone}`} className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary"><Phone className="h-4 w-4" />{s.dispatcher_phone}</a>}
          </Panel>
        </div>
      </div>

      <Modal open={dialog === 'change'} onOpenChange={() => setDialog(null)} title="Request a change" description="Tell us what you would like changed and we will send a revised quotation."
        footer={<PrimaryButton loading={respond.isPending} onClick={() => respond.mutate({ qid: openQuote.id, action: 'change', note })}>Send request</PrimaryButton>}>
        <Field error={respond.fields.note}><TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Could we add a stop in Lichfield, or use an MPV?" /></Field>
      </Modal>
      <Modal open={dialog === 'decline'} onOpenChange={() => setDialog(null)} title="Decline this quotation?" description="Your request will not go ahead. You can always send a new request."
        footer={<PrimaryButton className="bg-red-600 hover:bg-red-700" loading={respond.isPending} onClick={() => respond.mutate({ qid: openQuote.id, action: 'decline', note })}>Decline quotation</PrimaryButton>}>
        <Field label="Reason (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>
      <Modal open={dialog === 'cancel'} onOpenChange={() => setDialog(null)} title="Cancel this booking?" description={s?.cancellation_policy}
        footer={<PrimaryButton className="bg-red-600 hover:bg-red-700" loading={cancel.isPending} onClick={() => cancel.mutate()}>Yes, cancel booking</PrimaryButton>}>
        <Field label="Reason (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}
const TERMINAL_CUSTOMER = ['closed', 'rejected', 'cancelled_customer', 'cancelled_management', 'expired', 'quote_declined'];

export function CustomerInvoices() {
  const { data, isLoading } = useQuery({ queryKey: ['invoices'], queryFn: () => api.get('/account/invoices') });
  return (
    <div>
      <PageHeader title="Invoices" subtitle="Consolidated invoices for your organisation." />
      {isLoading ? <PageLoader /> : !data?.length ? <Empty icon={FileText} title="No invoices yet">Completed journeys are invoiced under your agreed account terms.</Empty> : (
        <div className="space-y-2">
          {data.map((i) => (
            <Link key={i.id} to={`/app/invoices/${i.id}`} className="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm hover:border-primary/40">
              <div><div className="font-semibold">{i.number}</div><div className="text-sm text-muted-foreground">{dateOnly(i.period_start)} – {dateOnly(new Date(new Date(i.period_end).getTime() - 1))} · due {dateOnly(i.due_date)}</div></div>
              <div className="text-right"><div className="font-heading font-bold">{gbp(i.total)}</div><InvoiceStatus status={i.status} /></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function InvoiceStatus({ status }) {
  const tone = { issued: 'bg-sky-100 text-sky-800', paid: 'bg-emerald-100 text-emerald-800', overdue: 'bg-red-100 text-red-700', void: 'bg-neutral-100 text-neutral-500', draft: 'bg-neutral-100 text-neutral-600' }[status];
  return <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize', tone)}>{status}</span>;
}

export function Notifications({ driver, admin }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/account/notifications') });
  const readAll = useAction(() => api.post('/account/notifications/read-all'), { invalidate: ['notifications'] });
  const base = admin ? '/admin/bookings' : driver ? '/driver/jobs' : '/app/bookings';
  const open = (n) => { if (!n.read_at) api.post(`/account/notifications/${n.id}/read`).then(() => qc.invalidateQueries({ queryKey: ['notifications'] })); };
  return (
    <div className={cn(!admin && 'mx-auto max-w-2xl')}>
      <PageHeader title={admin ? 'Alerts' : 'Updates'} actions={data?.some((n) => !n.read_at) && <Button variant="outline" className="rounded-full" onClick={() => readAll.mutate()}>Mark all read</Button>} />
      {isLoading ? <PageLoader /> : !data?.length ? <Empty icon={Bell} title="No updates yet" /> : (
        <div className="space-y-2">
          {data.map((n) => {
            const body = (
              <div className={cn('flex gap-3 rounded-2xl border bg-white p-4 shadow-sm', !n.read_at && 'border-primary/40 bg-orange-50/50')}>
                <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : 'bg-primary')} />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2"><div className="font-semibold">{n.title}</div><div className="shrink-0 text-xs text-muted-foreground">{relative(n.created_at)}</div></div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{n.body}</div>
                </div>
              </div>
            );
            return n.booking_id ? <Link key={n.id} to={`${base}/${n.booking_id}`} onClick={() => open(n)} className="block">{body}</Link> : <div key={n.id} onClick={() => open(n)}>{body}</div>;
          })}
        </div>
      )}
    </div>
  );
}

export function Account() {
  const { user, setUser, signOut } = useAuth();
  const [phone, setPhone] = useState(user.phone || '');
  const [pw, setPw] = useState({ current_password: '', new_password: '' });
  const save = useAction((b) => api.patch('/auth/me', b), { success: 'Saved.', onSuccess: (u) => { setUser(u); setPw({ current_password: '', new_password: '' }); } });
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Panel title="Your details">
        <div className="grid gap-4 sm:grid-cols-2">
          <KV label="Name">{user.name}</KV>
          <KV label="Email">{user.email}</KV>
          {user.organisation && <KV label="Organisation">{user.organisation.name}</KV>}
          {user.organisation && <KV label="Account terms">{user.organisation.payment_terms}</KV>}
        </div>
        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ phone }); }}>
          <Field label="Mobile number"><TextInput type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#FF5A1F]" checked={!!user.whatsapp_opt_in} onChange={(e) => save.mutate({ whatsapp_opt_in: e.target.checked })} />Send me journey updates on WhatsApp</label>
          <PrimaryButton type="submit" loading={save.isPending}>Save</PrimaryButton>
        </form>
      </Panel>
      <Panel title="Change password">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(pw); }}>
          <Field label="Current password" error={save.fields.current_password}><TextInput type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} /></Field>
          <Field label="New password" error={save.fields.new_password} hint="At least 8 characters"><TextInput type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} /></Field>
          <PrimaryButton type="submit" loading={save.isPending} disabled={!pw.new_password}>Update password</PrimaryButton>
        </form>
      </Panel>
      {user.role === 'corporate' && <Link to="/app/invoices" className="flex h-11 w-full items-center justify-center rounded-xl border bg-white text-sm font-semibold">Corporate invoices</Link>}
      <Link to="/app/fleet" className="flex h-11 w-full items-center justify-center rounded-xl border bg-white text-sm font-semibold">Our fleet</Link>
      <Button variant="outline" className="h-11 w-full rounded-xl" onClick={signOut}><LogOut />Sign out</Button>
      <p className="text-center text-xs text-muted-foreground">Your data is handled under Encore Executive's Privacy Policy. Card details are never stored by Encore.</p>
    </div>
  );
}

