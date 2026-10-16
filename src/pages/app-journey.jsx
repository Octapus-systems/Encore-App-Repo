import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth, usePublicSettings } from '@/lib/auth';
import { driveTime, miles, JOURNEY_TYPES, LEG_STATUS, PAYMENT_ARRANGEMENT, PAYMENT_METHOD, STATUS, dateOnly, dateTime, gbp, shortDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ErrorState, Field, Modal, PageLoader, PaymentBadge, TextArea, TextInput, useAction } from '@/components/common';
import { MessageThread } from '@/components/booking';
import { Icon, Img } from '@/components/app-ui';
import { VEHICLES } from '@/lib/showcase';

const TERMINAL = ['closed', 'rejected', 'cancelled_customer', 'cancelled_management', 'expired', 'quote_declined'];
const STEPS = [
  ['Requested', ['pending', 'under_review', 'clarification_needed']],
  ['Quoted', ['quote_sent', 'change_requested', 'quote_accepted']],
  ['Confirmed', ['confirmed']],
  ['Assigned', ['driver_assigned']],
  ['On the way', ['on_the_way', 'arrived', 'started']],
  ['Completed', ['completed', 'closed']],
];

const BANNER = {
  pending: ['hourglass_top', 'Request received', 'Not yet confirmed — our team is reviewing your journey.'],
  under_review: ['manage_search', 'Under review', 'We are checking availability and preparing your quotation.'],
  clarification_needed: ['help', 'Details needed', 'Please reply to our message below.'],
  quote_sent: ['request_quote', 'Quotation ready', 'Review and respond below.'],
  change_requested: ['edit_note', 'Change requested', 'We will send you a revised quotation.'],
  quote_accepted: ['schedule', 'Awaiting confirmation', 'Encore will confirm your booking shortly.'],
  confirmed: ['check_circle', 'Booking confirmed', 'Your chauffeur and vehicle will be assigned soon.'],
  driver_assigned: ['directions_car', 'Chauffeur assigned', 'Your vehicle details are below.'],
  on_the_way: ['near_me', 'Chauffeur on the way', 'Your chauffeur is heading to your pickup.'],
  arrived: ['pin_drop', 'Chauffeur has arrived', 'Your chauffeur is waiting at the pickup.'],
  started: ['route', 'Journey in progress', 'Enjoy your journey.'],
  completed: ['verified', 'Journey completed', 'Thank you for travelling with Encore.'],
  closed: ['verified', 'Journey completed', 'Thank you for travelling with Encore.'],
};

function vehicleImageKey(category) {
  return VEHICLES.find((v) => v.category === category)?.card || 'fleetS';
}

export function JourneyDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: s } = usePublicSettings();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => api.get(`/bookings/${id}`), refetchInterval: 20000 });
  const [legIdx, setLegIdx] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [note, setNote] = useState('');
  const refresh = (b) => { qc.setQueryData(['booking', id], b); qc.invalidateQueries({ queryKey: ['bookings'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); };
  const respond = useAction(({ qid, action, note: n }) => api.post(`/bookings/${id}/quotes/${qid}/respond`, { action, note: n }), {
    success: (_d, v) => ({ accept: 'Accepted — Encore will now confirm your booking.', decline: 'Quotation declined.', change: 'Change request sent.' }[v.action]),
    onSuccess: (b) => { refresh(b); setDialog(null); setNote(''); },
  });
  const cancel = useAction(() => api.post(`/bookings/${id}/cancel`, { reason: note }), { success: 'Booking cancelled.', onSuccess: (b) => { refresh(b); setDialog(null); setNote(''); } });
  const message = useAction(({ body }) => api.post(`/bookings/${id}/messages`, { body }), { onSuccess: (b, v) => { refresh(b); v.done(); } });

  if (q.isLoading) return <PageLoader />;
  if (q.error) return <ErrorState error={q.error} />;
  const b = q.data;
  const leg = b.legs[Math.min(legIdx, b.legs.length - 1)];
  const openQuote = b.quotes.find((x) => x.status === 'sent');
  const shownQuote = openQuote || b.quotes.find((x) => x.status === 'accepted');
  const stepIdx = STEPS.findIndex(([, m]) => m.includes(b.status));
  const banner = BANNER[b.status] || ['info', STATUS[b.status]?.label || b.status, b.cancel_reason || ''];
  const ended = TERMINAL.includes(b.status);

  return (
    <div className="-mx-margin flex flex-col pb-6">
      {/* Hero: route image + live status (no GPS tracking in Phase 1) */}
      <div className="relative h-56 w-full overflow-hidden bg-surface-container-high">
        <Img k="map" alt="Route" className="h-full w-full object-cover object-center" placeholderClassName="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-surface" />
        <div className="absolute left-4 right-4 top-3 z-10">
          <div className="flex items-center gap-space-sm rounded-full bg-surface-container-lowest/95 px-4 py-2.5 shadow-[0_8px_20px_var(--encore-shadow-0-08)] backdrop-blur-md">
            <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full', ended ? 'bg-error-container text-error' : 'bg-primary-container/15 text-primary')}><Icon name={ended ? 'block' : banner[0]} className="!text-[20px]" /></div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-headline-sm text-headline-sm font-bold tracking-tight text-on-surface">{ended ? STATUS[b.status]?.label : banner[1]}</div>
              <div className="truncate text-body-sm font-body-sm text-secondary">{ended ? (b.cancel_reason || 'This booking has ended.') : banner[2]}</div>
            </div>
            {!ended && <span className="h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-primary-container" />}
          </div>
        </div>
        <div className="absolute bottom-4 right-4 z-10">
          <div className="flex items-center gap-2 rounded-full bg-inverse-surface/90 px-3 py-1.5 text-inverse-on-surface shadow-[0_4px_14px_var(--encore-shadow-0-2)]">
            <Icon name="confirmation_number" className="!text-[16px] text-primary-fixed-dim" />
            <span className="text-label-sm font-label-sm tracking-wide">{b.ref}</span>
          </div>
        </div>
      </div>

      <div className="relative z-20 -mt-3 flex flex-col gap-space-md px-margin">
        {/* Progress */}
        {stepIdx >= 0 && (
          <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full bg-surface-container-lowest p-1 shadow-[0_4px_16px_var(--encore-shadow-0-05)]">
            {STEPS.map(([label], i) => (
              <span key={label} className={cn('flex-shrink-0 rounded-full px-3 py-2 text-label-sm font-label-sm', i === stepIdx ? 'bg-primary-container font-bold text-on-primary shadow-[0_4px_12px_var(--encore-orange-shadow-0-35)]' : i < stepIdx ? 'text-primary' : 'text-secondary')}>{label}</span>
            ))}
          </div>
        )}

        {/* Leg tabs (Outbound / Return) */}
        {b.legs.length > 1 && (
          <div className="flex items-center justify-between rounded-full bg-surface-container-lowest p-1 shadow-[0_4px_16px_var(--encore-shadow-0-05)]">
            {b.legs.map((l, i) => (
              <button key={l.id} onClick={() => setLegIdx(i)} className={cn('flex-1 rounded-full py-2 text-center text-label-md font-label-md transition-all', i === legIdx ? 'bg-primary-container font-bold text-on-primary shadow-[0_4px_12px_var(--encore-orange-shadow-0-35)]' : 'text-secondary hover:text-on-surface')}>{l.label}</button>
            ))}
          </div>
        )}

        {/* Route card */}
        <div className="flex flex-col gap-4 rounded-[2rem] bg-surface-container-lowest p-5 shadow-[0_10px_30px_var(--encore-shadow-0-04),0_2px_6px_var(--encore-shadow-0-02)]">
          <div className="relative flex flex-col gap-4">
            <div className="absolute bottom-6 left-[13px] top-6 w-[2px] bg-surface-container-highest" />
            <div className="relative z-10 flex items-start gap-3.5">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-container/15"><span className="h-2.5 w-2.5 rounded-full bg-primary-container" /></div>
              <div className="min-w-0 flex-1">
                <span className="block text-label-sm font-label-sm uppercase tracking-wider text-secondary">Pickup</span>
                <p className="text-body-lg font-body-lg font-semibold text-on-surface">{leg.pickup}</p>
              </div>
            </div>
            {leg.stops.map((st, i) => (
              <div key={i} className="relative z-10 flex items-start gap-3.5">
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-container"><span className="h-2 w-2 rounded-full bg-secondary" /></div>
                <div className="min-w-0 flex-1"><span className="block text-label-sm font-label-sm uppercase tracking-wider text-secondary">Stop {i + 1}</span><p className="text-body-md font-body-md text-on-surface">{st}</p></div>
              </div>
            ))}
            <div className="relative z-10 flex items-start gap-3.5">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-secondary-container"><span className="h-2.5 w-2.5 rounded-full bg-on-secondary-fixed" /></div>
              <div className="min-w-0 flex-1">
                <span className="block text-label-sm font-label-sm uppercase tracking-wider text-secondary">Destination</span>
                <p className="text-body-lg font-body-lg font-semibold text-on-surface">{leg.destination}</p>
                <span className="mt-0.5 block text-body-sm font-body-sm text-secondary">{JOURNEY_TYPES[b.journey_type]}{b.flight_number ? ` · Flight ${b.flight_number}` : ''}{b.duration_hours ? ` · ${b.duration_hours} hours` : ''}</span>
                {leg.distance_m ? <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 text-label-sm font-label-sm text-on-primary-fixed"><Icon name="route" className="!text-[14px]" />Approx. {miles(leg.distance_m)} · {driveTime(leg.duration_s)} drive</span> : null}
              </div>
            </div>
          </div>
          <div className="h-[1px] w-full bg-surface-container" />
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2.5 rounded-2xl bg-surface-container-low px-3.5 py-2.5">
              <Icon name="schedule" className="!text-[20px] flex-shrink-0 text-primary" />
              <div className="min-w-0"><span className="block text-label-sm font-label-sm text-secondary">Pickup</span><span className="block truncate text-body-sm font-body-sm font-semibold text-on-surface">{shortDateTime(leg.pickup_at)}</span></div>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-surface-container-low px-3.5 py-2.5">
              <Icon name="group" className="!text-[20px] flex-shrink-0 text-primary" />
              <div className="min-w-0"><span className="block text-label-sm font-label-sm text-secondary">Capacity</span><span className="block truncate text-body-sm font-body-sm font-semibold text-on-surface">{b.passenger_count} Pax • {b.luggage_large + b.luggage_small} Bags</span></div>
            </div>
          </div>
          {['on_the_way_at', 'arrived_at', 'started_at', 'completed_at'].some((k) => leg[k]) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-body-sm font-body-sm text-secondary">
              {[['on_the_way_at', 'On the way'], ['arrived_at', 'Arrived'], ['started_at', 'Started'], ['completed_at', 'Completed']].filter(([k]) => leg[k]).map(([k, l]) => <span key={k}><b className="text-on-surface">{l}</b> {shortDateTime(leg[k])}</span>)}
            </div>
          )}
        </div>

        {/* Vehicle card */}
        <div className="flex items-center justify-between gap-3 rounded-[2rem] bg-surface-container-lowest p-4 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-12 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container">
              <Img k={vehicleImageKey(b.preferred_category)} alt="" className="h-full w-full object-cover" placeholderClassName="h-full w-full" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-label-md font-label-md font-bold text-on-surface">{leg.vehicle ? [leg.vehicle.colour, leg.vehicle.make, leg.vehicle.model].filter(Boolean).join(' ') || 'Your vehicle' : (b.preferred_category || 'Vehicle to be advised')}</span>
                {leg.vehicle && <span className="rounded-full bg-primary-fixed px-1.5 py-0.5 font-label-sm text-[10px] font-bold uppercase text-on-primary-fixed">{LEG_STATUS[leg.status]}</span>}
              </div>
              <div className="mt-0.5 truncate text-body-sm font-body-sm text-secondary">
                {leg.chauffeur ? `Chauffeur ${leg.chauffeur}` : ['confirmed', 'driver_assigned'].includes(b.status) ? 'Chauffeur to be assigned' : 'Selected by Encore after review'}
              </div>
            </div>
          </div>
          {leg.vehicle?.registration && <span className="flex-shrink-0 rounded-md border-2 border-on-surface bg-[#FFD400] px-2 py-0.5 font-mono text-sm font-black tracking-wider text-on-surface">{leg.vehicle.registration}</span>}
        </div>

        {/* Quotation / fare */}
        {shownQuote ? (
          <div className="flex flex-col gap-2.5 rounded-[2rem] bg-surface-container-lowest p-5 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
            {shownQuote.customer_lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between text-body-md font-body-md text-secondary"><span>{l.label}</span><span className="font-medium text-on-surface">{gbp(l.amount)}</span></div>
            ))}
            <div className="my-1 h-[1px] w-full bg-surface-container" />
            <div className="flex items-baseline justify-between pt-0.5">
              <div>
                <span className="block font-headline-sm text-headline-sm font-bold text-on-surface">{openQuote ? 'Your Quotation' : 'Agreed Fare'}</span>
                <span className="text-label-sm font-label-sm text-secondary">{openQuote?.valid_until ? `Valid until ${shortDateTime(openQuote.valid_until)}` : PAYMENT_ARRANGEMENT[b.payment_arrangement]}</span>
              </div>
              <span className="text-[32px] font-extrabold leading-tight tracking-tight text-on-surface">{gbp(shownQuote.total)}</span>
            </div>
            {openQuote?.message_to_customer && <p className="rounded-2xl bg-surface-container-low p-3 text-body-sm font-body-sm text-on-surface-variant">{openQuote.message_to_customer}</p>}
          </div>
        ) : !ended && (
          <div className="flex items-center gap-3 rounded-[2rem] bg-surface-container-lowest p-5 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant"><Icon name="request_quote" /></div>
            <div><div className="text-label-lg font-label-lg text-on-surface">Tailored quotation</div><div className="text-body-sm font-body-sm text-secondary">Encore will send your price after reviewing the request.</div></div>
          </div>
        )}

        {/* Payment */}
        {(b.agreed_total != null && !openQuote) && (
          <div className="flex items-center justify-between rounded-[2rem] bg-surface-container-lowest p-3.5 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-7 w-11 flex-shrink-0 items-center justify-center rounded bg-visa text-[11px] font-bold tracking-wider text-white shadow-sm"><Icon name="payments" className="!text-[16px]" /></div>
              <div className="min-w-0">
                <span className="block truncate text-label-md font-label-md font-semibold text-on-surface">{PAYMENT_ARRANGEMENT[b.payment_arrangement]}</span>
                <span className="block text-body-sm font-body-sm text-secondary">{b.invoice ? `Invoice ${b.invoice.number}` : b.payments.filter((p) => p.outcome === 'succeeded').map((p) => `${gbp(p.amount)} ${PAYMENT_METHOD[p.method].toLowerCase()}`).join(' · ') || 'Card details are never stored by Encore'}</span>
              </div>
            </div>
            {b.payment_link && !['paid', 'invoiced'].includes(b.payment_status)
              ? <a href={b.payment_link} target="_blank" rel="noopener noreferrer" className="px-2 py-1 text-label-md font-label-md font-bold text-primary hover:underline">Pay now</a>
              : <PaymentBadge status={b.payment_status} />}
          </div>
        )}

        {/* Primary actions */}
        {openQuote && b.status === 'quote_sent' && (
          <div className="flex flex-col gap-3 pt-2">
            <button disabled={respond.isPending} onClick={() => respond.mutate({ qid: openQuote.id, action: 'accept' })} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-container to-button-end px-6 py-4 font-headline-sm text-headline-sm font-bold text-on-primary shadow-[0_10px_26px_var(--encore-orange-shadow-0-38)] transition-transform active:scale-[0.98] disabled:opacity-60">
              <span>Accept Quotation</span><Icon name="arrow_forward" className="!text-[20px]" />
            </button>
            <div className="flex gap-3">
              <button onClick={() => setDialog('change')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-4 py-3.5 text-label-lg font-label-lg text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)]"><Icon name="edit" className="!text-[18px]" />Request change</button>
              <button onClick={() => setDialog('decline')} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-4 py-3.5 text-label-lg font-label-lg text-error shadow-[0_4px_16px_var(--encore-shadow-0-06)]">Decline</button>
            </div>
            <p className="text-center text-body-sm font-body-sm text-secondary">Accepting does not confirm the booking — Encore will confirm it and let you know.</p>
          </div>
        )}

        {/* Requirements */}
        <div className="flex flex-col gap-2 rounded-[2rem] bg-surface-container-lowest p-5 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
          <span className="font-headline-sm text-headline-sm text-on-surface">Your Requirements</span>
          {[['person', 'Lead passenger', `${b.lead_passenger} · ${b.contact_phone}`], ['luggage', 'Luggage', `${b.luggage_large} large · ${b.luggage_small} small`],
            b.child_seats > 0 && ['child_care', 'Child seats', b.child_seats], b.preferred_category && ['directions_car', 'Preferred vehicle', b.preferred_category],
            b.accessibility_needs && ['accessible', 'Accessibility', b.accessibility_needs], b.special_instructions && ['notes', 'Instructions', b.special_instructions],
            b.sensitive_notes && ['lock', 'Private chauffeur notes', b.sensitive_notes]].filter(Boolean).map(([icon, l, v]) => (
            <div key={l} className="flex items-start gap-3">
              <Icon name={icon} className="mt-0.5 !text-[18px] text-primary" />
              <div className="min-w-0"><span className="block text-label-sm font-label-sm text-secondary">{l}</span><span className="text-body-md font-body-md text-on-surface">{v}</span></div>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div className="rounded-[2rem] bg-surface-container-lowest p-5 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
          <span className="mb-3 block font-headline-sm text-headline-sm text-on-surface">Messages</span>
          <MessageThread messages={b.messages} viewerRole={user.role} sending={message.isPending}
            placeholder={b.status === 'clarification_needed' ? 'Reply with the details requested…' : 'Message Encore…'}
            onSend={ended ? null : (body, done) => message.mutate({ body, done })} />
        </div>

        {/* Help / cancel */}
        <div className="flex flex-col gap-3">
          {s && <a href={`tel:${s.dispatcher_phone}`} className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-4 py-3.5 text-label-lg font-label-lg text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)]"><Icon name="call" className="!text-[18px]" />Call Encore · {s.dispatcher_phone}</a>}
          {b.can_customer_cancel
            ? <button onClick={() => setDialog('cancel')} className="py-2.5 text-center text-label-md font-label-md text-error">Cancel this booking</button>
            : ['on_the_way', 'arrived', 'started'].includes(b.status) && <p className="text-center text-body-sm font-body-sm text-secondary">Your chauffeur is on the way — please call us to make changes.</p>}
        </div>
      </div>

      <Modal open={dialog === 'change'} onOpenChange={() => setDialog(null)} title="Request a change" description="Tell us what you would like changed and we will send a revised quotation."
        footer={<button className="w-full rounded-full bg-primary-container px-5 py-3 font-bold text-on-primary disabled:opacity-60" disabled={respond.isPending} onClick={() => respond.mutate({ qid: openQuote.id, action: 'change', note })}>Send request</button>}>
        <Field error={respond.fields.note}><TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Could we add a stop, or use a larger vehicle?" /></Field>
      </Modal>
      <Modal open={dialog === 'decline'} onOpenChange={() => setDialog(null)} title="Decline this quotation?" description="Your request will not go ahead. You can always send a new request."
        footer={<button className="w-full rounded-full bg-error px-5 py-3 font-bold text-white disabled:opacity-60" disabled={respond.isPending} onClick={() => respond.mutate({ qid: openQuote.id, action: 'decline', note })}>Decline quotation</button>}>
        <Field label="Reason (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>
      <Modal open={dialog === 'cancel'} onOpenChange={() => setDialog(null)} title="Cancel this booking?" description={s?.cancellation_policy}
        footer={<button className="w-full rounded-full bg-error px-5 py-3 font-bold text-white disabled:opacity-60" disabled={cancel.isPending} onClick={() => cancel.mutate()}>Yes, cancel booking</button>}>
        <Field label="Reason (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}

// ======================= Request received (Lovable screen 5) =======================
export function RequestSent() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: b, isLoading, error } = useQuery({ queryKey: ['booking', id], queryFn: () => api.get(`/bookings/${id}`) });
  if (isLoading) return <PageLoader />;
  if (error) return <ErrorState error={error} />;
  const leg = b.legs[0];
  const copy = async () => { try { await navigator.clipboard.writeText(b.ref); toast.success('Booking reference copied'); } catch { toast(b.ref); } };
  const calendar = () => {
    const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(new Date(leg.pickup_at).getTime() + 2 * 3600000);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `UID:${b.ref}@encore`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(leg.pickup_at)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:Encore chauffeur (${b.ref}) — awaiting confirmation`, `LOCATION:${leg.pickup}`, `DESCRIPTION:To ${leg.destination}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = `${b.ref}.ics`; a.click(); URL.revokeObjectURL(url);
    toast.success('Calendar file downloaded');
  };
  return (
    <div className="flex flex-col pb-10">
      <div className="mb-6 mt-2 flex flex-col items-center text-center">
        <div className="relative mb-4 flex items-center justify-center">
          <div className="absolute h-20 w-20 animate-pulse rounded-full bg-primary-container/20 blur-xl" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_10px_25px_var(--encore-orange-shadow-0-35)]"><Icon name="check" className="!text-[32px] font-bold" /></div>
        </div>
        <h2 className="mb-2 font-headline-lg text-headline-lg text-on-surface">Request Received</h2>
        <p className="max-w-[310px] text-body-md font-body-md leading-relaxed text-secondary">Thank you. This is not yet a confirmed booking — Encore will review your journey and send you a tailored quotation.</p>
      </div>

      <div className="mb-6 w-full overflow-hidden rounded-[2rem] bg-surface-container-lowest shadow-[0_10px_30px_var(--encore-shadow-0-06)]">
        <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-surface-container-low">
          <div className="absolute bottom-0 h-24 w-3/4 rounded-full bg-gradient-to-t from-primary-container/15 to-transparent blur-md" />
          <Img k={vehicleImageKey(b.preferred_category)} alt="" className="relative z-10 h-full w-full object-cover object-center" placeholderClassName="h-full w-full" />
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-surface-container-lowest/90 px-3 py-1 shadow-sm backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-primary-container" /><span className="text-label-sm font-label-sm text-on-surface">{b.preferred_category || JOURNEY_TYPES[b.journey_type]}</span>
          </div>
        </div>
        <div className="flex flex-col gap-space-md p-space-md">
          <div className="flex items-center justify-between pb-space-xs">
            <div>
              <span className="block text-label-sm font-label-sm uppercase tracking-wider text-secondary">Booking Reference</span>
              <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">#{b.ref}</span>
            </div>
            <button aria-label="Copy booking reference" onClick={copy} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-secondary hover:text-on-surface"><Icon name="content_copy" className="!text-[18px]" /></button>
          </div>
          <div className="flex flex-col gap-3 rounded-DEFAULT bg-surface-container-low p-3.5">
            {[['calendar_today', 'Date & Time', dateTime(leg.pickup_at), 'text-primary-container'], ['trip_origin', 'Pickup Location', leg.pickup, 'text-primary-container'],
              ['location_on', 'Drop-off Destination', leg.destination, 'text-on-surface', `${b.passenger_count} passenger${b.passenger_count > 1 ? 's' : ''} • ${b.luggage_large + b.luggage_small} luggage pieces`]].map(([icon, l, v, tone, sub]) => (
              <div key={l} className="flex items-start gap-3">
                <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-lowest shadow-sm', tone)}><Icon name={icon} className="!text-[18px]" /></div>
                <div className="flex min-w-0 flex-col">
                  <span className="text-label-sm font-label-sm text-secondary">{l}</span>
                  <span className="truncate text-body-md font-body-md font-semibold text-on-surface">{v}</span>
                  {sub && <span className="mt-0.5 text-body-sm font-body-sm text-secondary">{sub}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-body-sm font-body-sm text-secondary">Requested {dateOnly(b.created_at)}</span>
            <span className="font-headline-sm text-headline-sm font-bold text-primary">Quote to follow</span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="flex gap-3">
          <button onClick={calendar} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-4 py-3.5 text-label-lg font-label-lg text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)] transition-all hover:bg-surface-container">
            <Icon name="calendar_add_on" className="!text-[18px]" /><span>Add to Calendar</span>
          </button>
          <button onClick={() => nav(`/app/bookings/${b.id}`)} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-primary-container to-tertiary-container px-4 py-3.5 text-label-lg font-label-lg text-on-primary shadow-[0_8px_24px_var(--encore-orange-shadow-0-38)] transition-all active:scale-[0.98]">
            <span>View Request</span><Icon name="arrow_forward" className="!text-[18px]" />
          </button>
        </div>
        <Link to="/app" className="w-full py-2.5 text-center text-label-md font-label-md text-secondary transition-colors hover:text-on-surface">Return to Home</Link>
      </div>
    </div>
  );
}
