import { useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth, usePublicSettings } from '@/lib/auth';
import { driveTime, miles, JOURNEY_TYPES, LEG_STATUS, PAYMENT_ARRANGEMENT, PAYMENT_METHOD, STATUS, gbp, shortDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ErrorState, Field, Modal, PageLoader, PaymentBadge, TextArea, TextInput, useAction } from '@/components/common';
import { MessageThread } from '@/components/booking';
import { Icon, Img } from '@/components/app-ui';
import { FLEET as VEHICLES, useFleet } from '@/lib/fleet';
import { celebrate, haptic } from '@/lib/fx';
import { addToDeviceCalendar } from '@/lib/native';
import { SplitText } from '@/components/motion-text';
import { LiveTrackMap, RouteMap } from '@/components/lazy-maps';

const TERMINAL = ['closed', 'rejected', 'cancelled_customer', 'cancelled_management', 'expired', 'quote_declined'];
const STEPS = [
  ['Requested', ['pending', 'under_review', 'clarification_needed']],
  ['Quoted', ['quote_sent', 'change_requested', 'quote_accepted']],
  ['Confirmed', ['confirmed']],
  ['Assigned', ['driver_assigned']],
  ['On the way', ['on_the_way', 'arrived', 'started']],
  ['Completed', ['completed', 'closed']],
];
const STEP_ICONS = ['receipt_long', 'request_quote', 'verified', 'person_pin', 'near_me', 'flag'];
const STEP_SHORT = ['Request', 'Quote', 'Confirmed', 'Chauffeur', 'On way', 'Done'];

/** Pickup / drop-off coordinates for the route map: the saved pins, or looked up from the addresses. */
function useLegPins(leg) {
  const pin = (lat, lng) => (lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null);
  const saved = { from: pin(leg?.pickup_lat, leg?.pickup_lng), to: pin(leg?.dest_lat, leg?.dest_lng) };
  const look = (text, on) => ({
    queryKey: ['geocode', text], enabled: !!text && on, staleTime: Infinity, retry: false,
    queryFn: () => api.get(`/places/geocode?q=${encodeURIComponent(text)}`).catch(() => null),
  });
  const a = useQuery(look(leg?.pickup, !saved.from));
  const z = useQuery(look(leg?.destination, !saved.to));
  return { from: saved.from || (a.data?.lat != null ? a.data : null), to: saved.to || (z.data?.lat != null ? z.data : null) };
}

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
  useFleet();
  const { id } = useParams();
  const { user } = useAuth();
  const { data: s } = usePublicSettings();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['booking', id], queryFn: () => api.get(`/bookings/${id}`), refetchInterval: 8000 });
  const [legIdx, setLegIdx] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [note, setNote] = useState('');
  const refresh = (b) => { qc.setQueryData(['booking', id], b); qc.invalidateQueries({ queryKey: ['bookings'] }); qc.invalidateQueries({ queryKey: ['notifications'] }); };
  const respond = useAction(({ qid, action, note: n }) => api.post(`/bookings/${id}/quotes/${qid}/respond`, { action, note: n }), {
    success: (_d, v) => ({ accept: 'Accepted — Encore will now confirm your booking.', decline: 'Quotation declined.', change: 'Change request sent.' }[v.action]),
    onSuccess: (b, v) => { refresh(b); setDialog(null); setNote(''); if (v.action === 'accept') celebrate(); },
  });
  const cancel = useAction(() => api.post(`/bookings/${id}/cancel`, { reason: note }), { success: 'Booking cancelled.', onSuccess: (b) => { refresh(b); setDialog(null); setNote(''); } });
  const message = useAction(({ body }) => api.post(`/bookings/${id}/messages`, { body }), { onSuccess: (b, v) => { refresh(b); v.done(); } });

  const pins = useLegPins(q.data?.legs?.[Math.min(legIdx, Math.max(0, (q.data?.legs?.length || 1) - 1))]);
  if (q.error && !q.data) return <ErrorState error={q.error} />;
  if (q.isLoading || !q.data) return <PageLoader />;
  const b = q.data;
  const leg = b.legs[Math.min(legIdx, b.legs.length - 1)];
  const openQuote = b.quotes.find((x) => x.status === 'sent');
  const shownQuote = openQuote || b.quotes.find((x) => x.status === 'accepted');
  const stepIdx = STEPS.findIndex(([, m]) => m.includes(b.status));
  const banner = BANNER[b.status] || ['info', STATUS[b.status]?.label || b.status, b.cancel_reason || ''];
  const ended = TERMINAL.includes(b.status);
  const LIVE = ['on_the_way', 'arrived', 'started'];
  const trackLeg = LIVE.includes(leg.status) ? leg : b.legs.find((l) => LIVE.includes(l.status));
  const tracking = !ended && !!trackLeg;

  return (
    <div className="-mx-margin -mt-space-sm flex flex-col pb-6">
      {/* Hero: live chauffeur map while on the way, otherwise the planned route (photo if the route can't be drawn). */}
      <div className={cn('relative w-full overflow-hidden bg-surface-container-high transition-[height] duration-500', tracking ? 'h-[calc(52vh+env(safe-area-inset-top))] min-h-[340px]' : 'h-[calc(260px+env(safe-area-inset-top))]')}>
        {tracking ? (
          <LiveTrackMap bookingId={b.id} legId={trackLeg.id} chipTop className="absolute inset-0" />
        ) : pins.from && pins.to ? (
          <RouteMap from={pins.from} to={pins.to} topInset={84} bottomInset={40} className="absolute inset-0 h-full w-full" />
        ) : (
          <>
            <Img k="map" alt="" className="h-full w-full object-cover object-center" placeholderClassName="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 bg-black/25" />
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 bg-gradient-to-b from-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative z-20 -mt-10 flex flex-col gap-space-md px-margin">
        {/* Status + progress */}
        <div className="rounded-[2rem] bg-surface-container-lowest p-4 shadow-[0_14px_34px_var(--encore-shadow-0-08)]">
          <div className="flex items-start gap-3">
            <div className={cn('grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl', ended ? 'bg-red-50 text-red-600' : 'bg-primary-container text-white shadow-[0_8px_18px_var(--encore-orange-shadow-0-35)]')}>
              <Icon name={ended ? 'block' : banner[0]} className="!text-[22px]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-extrabold leading-tight tracking-tight text-on-surface">{ended ? STATUS[b.status]?.label : banner[1]}</div>
              <div className="mt-0.5 text-[13px] leading-snug text-secondary">{ended ? (b.cancel_reason || 'This booking has ended.') : banner[2]}</div>
            </div>
            <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-surface-container-low px-2 py-1 text-[11px] font-bold text-on-surface"><Icon name="confirmation_number" className="!text-[13px] text-primary" />{b.ref}</span>
          </div>
          {stepIdx >= 0 && !ended && (
            <ol className="mt-4 grid grid-cols-6">
              {STEPS.map(([label], i) => {
                const done = i < stepIdx; const now = i === stepIdx;
                return (
                  <li key={label} className="relative flex flex-col items-center text-center" aria-current={now ? 'step' : undefined}>
                    {i > 0 && <span className={cn('absolute right-1/2 top-[13px] h-[3px] w-full -translate-y-1/2 rounded-full', i <= stepIdx ? 'bg-primary-container' : 'bg-surface-container-high')} />}
                    <span className={cn('relative z-10 grid h-[26px] w-[26px] place-items-center rounded-full transition-all',
                      now ? 'bg-primary-container text-white ring-4 ring-primary-container/20' : done ? 'bg-primary-container text-white' : 'bg-surface-container-high text-secondary')}>
                      <Icon name={done ? 'check' : STEP_ICONS[i]} className="!text-[14px]" />
                    </span>
                    <span className={cn('mt-1.5 text-[10px] leading-tight', now ? 'font-extrabold text-on-surface' : done ? 'font-semibold text-primary' : 'text-secondary')} title={label}>{STEP_SHORT[i]}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

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
          {(b.po_number || b.cost_centre) && (
            <div className="flex flex-wrap gap-2 text-[12px] text-secondary">
              {b.po_number && <span className="rounded-full bg-surface-container-low px-2.5 py-1"><b className="text-on-surface">PO</b> {b.po_number}</span>}
              {b.cost_centre && <span className="rounded-full bg-surface-container-low px-2.5 py-1"><b className="text-on-surface">Cost centre</b> {b.cost_centre}</span>}
            </div>
          )}
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
              {leg.vehicle || b.preferred_category
                ? <Img k={vehicleImageKey(leg.vehicle ? VEHICLES.find((v) => `${leg.vehicle.make} ${leg.vehicle.model}`.toLowerCase().includes(v.name.split(' ').pop().toLowerCase()))?.category || b.preferred_category : b.preferred_category)} alt="" className="h-full w-full object-cover" placeholderClassName="h-full w-full" />
                : <Icon name="directions_car" className="!text-[24px] text-secondary" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-label-md font-label-md font-bold text-on-surface">{leg.vehicle ? [leg.vehicle.colour, leg.vehicle.make, leg.vehicle.model].filter(Boolean).join(' ') || 'Your vehicle' : (b.preferred_category || 'Vehicle to be advised')}</span>
                {leg.vehicle && <span className="rounded-full bg-primary-fixed px-1.5 py-0.5 font-label-sm text-[10px] font-bold uppercase text-on-primary-fixed">{LEG_STATUS[leg.status]}</span>}
              </div>
              <div className="mt-0.5 truncate text-body-sm font-body-sm text-secondary">
                {leg.chauffeur ? <>Chauffeur {leg.chauffeur}{leg.driver_accepted_at && <span className="ml-1.5 inline-flex items-center gap-0.5 font-bold text-emerald-600"><Icon name="verified" className="text-[14px]" />confirmed</span>}</> : ['confirmed', 'driver_assigned'].includes(b.status) ? 'Chauffeur to be assigned' : 'Selected by Encore after review'}
              </div>
            </div>
          </div>
          {leg.vehicle?.registration && <span className="flex-shrink-0 rounded-md border-2 border-on-surface bg-[#FFD400] px-2 py-0.5 font-mono text-sm font-black tracking-wider text-on-surface">{leg.vehicle.registration}</span>}
        </div>

        {/* Rate the journey (once completed) */}
        {['completed', 'closed'].includes(b.status) && <RateJourney b={b} onSaved={refresh} />}

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
            <button disabled={respond.isPending} onClick={() => respond.mutate({ qid: openQuote.id, action: 'accept' })} className="cta-glow flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-container to-button-end px-6 py-4 font-headline-sm text-headline-sm font-bold text-on-primary shadow-[0_10px_26px_var(--encore-orange-shadow-0-38)] transition-transform active:scale-[0.98] disabled:opacity-60">
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
        footer={<button className="w-full rounded-full bg-gradient-to-r from-[#FF710F] to-[#FF8D3B] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(255,113,15,0.35)] active:scale-[.98] disabled:opacity-60" disabled={respond.isPending} onClick={() => respond.mutate({ qid: openQuote.id, action: 'change', note })}>Send request</button>}>
        <Field error={respond.fields.note}><TextArea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Could we add a stop, or use a larger vehicle?" /></Field>
      </Modal>
      <Modal open={dialog === 'decline'} onOpenChange={() => setDialog(null)} title="Decline this quotation?" description="Your request will not go ahead. You can always send a new request."
        footer={<button className="w-full rounded-full bg-[#DC2626] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] active:scale-[.98] disabled:opacity-60" disabled={respond.isPending} onClick={() => respond.mutate({ qid: openQuote.id, action: 'decline', note })}>Decline quotation</button>}>
        <Field label="Reason (optional)"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </Modal>
      <Modal open={dialog === 'cancel'} onOpenChange={() => setDialog(null)} title="Cancel this booking?" description={s?.cancellation_policy}
        footer={<><button className="w-full rounded-full bg-[#DC2626] px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] active:scale-[.98] disabled:opacity-60" disabled={cancel.isPending} onClick={() => cancel.mutate()}>{cancel.isPending ? 'Cancelling…' : 'Yes, cancel booking'}</button>
          <button type="button" onClick={() => setDialog(null)} className="w-full rounded-full bg-neutral-100 px-5 py-3.5 text-[15px] font-bold text-neutral-800 active:scale-[.98]">Keep my booking</button></>}>
        <Field label="Reason (optional)" hint="Shared with Encore and your chauffeur"><TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Meeting moved to next week" /></Field>
      </Modal>
    </div>
  );
}

// ======================= Request received (Lovable screen 5) =======================
export function RequestSent() {
  useFleet();
  const { id } = useParams();
  const nav = useNavigate();
  const { data: b, isLoading, error } = useQuery({ queryKey: ['booking', id], queryFn: () => api.get(`/bookings/${id}`) });
  const loaded = !!b;
  const [copied, setCopied] = useState(false);

  // Hero tick animation
  const sealRef = useRef(null);
  useLayoutEffect(() => {
    const el = sealRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--dx', `${window.innerWidth / 2 - (r.left + r.width / 2)}px`);
    el.style.setProperty('--dy', `${window.innerHeight / 2 - (r.top + r.height / 2)}px`);
    el.classList.add('is-go');
    const t = setTimeout(() => haptic('success'), 700);
    return () => clearTimeout(t);
  }, [loaded]);

  if (error && !b) return <ErrorState error={error} />;
  if (isLoading || !b) return <PageLoader />;

  const leg = b.legs?.[0] || {};
  const stopsList = leg.stops ? (Array.isArray(leg.stops) ? leg.stops : JSON.parse(leg.stops || '[]')) : [];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(b.ref);
      setCopied(true);
      toast.success('Booking reference copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(b.ref);
    }
  };

  const calendar = async () => {
    const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(new Date(leg.pickup_at).getTime() + 2 * 3600000);
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `UID:${b.ref}@encore`,
      `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(leg.pickup_at)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:Encore Chauffeur (${b.ref}) — awaiting confirmation`, `LOCATION:${leg.pickup}`,
      `DESCRIPTION:To ${leg.destination}`, 'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    try {
      const result = await addToDeviceCalendar(ics, `${b.ref}.ics`);
      if (result === 'downloaded') toast.success('Calendar file downloaded');
    } catch {
      toast.error("Couldn't open calendar options. Please try again.");
    }
  };

  const steps = [
    { icon: 'check', title: 'Request received', text: `Sent ${shortDateTime(b.created_at)}`, state: 'done' },
    { icon: 'request_quote', title: 'We prepare your quote', text: 'Our team reviews your journey and prices it.', state: 'now' },
    { icon: 'thumb_up', title: 'You accept, we confirm', text: 'Accept the quote in the app, then we confirm your booking.', state: 'next' },
    { icon: 'directions_car', title: 'Chauffeur assigned', text: 'You’ll get their name, car and live tracking.', state: 'next' },
  ];
  const car = VEHICLES.find((v) => v.category === b.preferred_category);
  const bags = b.luggage_large + b.luggage_small;
  return (
    <div className="sent-page flex flex-col pb-[calc(120px+env(safe-area-inset-bottom))]">
      <div aria-hidden className="seal-veil pointer-events-none fixed inset-0 z-[55]" />

      {/* ---------- Hero ---------- */}
      <div className="mb-5 mt-1 flex flex-col items-center text-center">
        {/* Success seal: ring and tick draw themselves, then two soft rings ripple out. */}
        <div ref={sealRef} className="seal seal-hero relative z-[60] mb-4 grid h-24 w-24 place-items-center" aria-hidden>
          <span className="seal-wave absolute inset-0 rounded-full" />
          <span className="seal-wave seal-wave-2 absolute inset-0 rounded-full" />
          <span className="seal-core absolute inset-2 rounded-full bg-gradient-to-br from-[#FF8A3D] to-[#E85D04] shadow-[0_14px_30px_rgba(255,113,15,0.35)]" />
          <svg viewBox="0 0 96 96" className="relative h-24 w-24">
            <circle className="seal-ring" cx="48" cy="48" r="44" fill="none" stroke="#FFB692" strokeWidth="2" strokeLinecap="round" pathLength="1" />
            <path className="seal-tick" d="M32 49 L43 60 L65 37" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
          </svg>
        </div>
        <h2 className="font-headline-lg text-headline-lg tracking-tight text-on-surface"><SplitText text="Request Received" delay={250} step={35} /></h2>
        {/* Client-approved wording — keep as written. */}
        <div className="mt-2 max-w-[320px] space-y-2 text-[14px] leading-relaxed text-secondary">
          <p className="text-[15px] font-bold text-on-surface">Thank you for choosing Encore!</p>
          <p>A member of our team will be in touch to review your journey details and provide a personalised quotation.</p>
          <p>We usually respond promptly, but during busier periods, please allow up to 24 hours for a response.</p>
        </div>
        <button type="button" onClick={copy} className="mt-3 flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-3.5 py-1.5 text-[13px] font-bold text-on-surface shadow-[0_4px_14px_var(--encore-shadow-0-06)] ring-1 ring-black/5 active:scale-95">
          <span className="text-secondary">Ref</span><span className="tabular-nums">{b.ref}</span><Icon name="content_copy" className="!text-[15px] text-primary" />
        </button>
      </div>

      {/* ---------- What happens next ---------- */}
      <section className="animate-rise mb-4 rounded-[26px] bg-surface-container-lowest p-5 shadow-[0_10px_30px_var(--encore-shadow-0-06)]">
        <h3 className="mb-4 text-[15px] font-extrabold tracking-tight text-on-surface">What happens next</h3>
        <ol className="relative space-y-4">
          <span className="absolute bottom-4 left-[15px] top-4 w-[2px] rounded-full bg-gradient-to-b from-primary-container via-primary-container/40 to-surface-container" />
          {steps.map((st, i) => (
            <li key={st.title} className="relative flex gap-3.5" style={{ animationDelay: `${300 + i * 120}ms` }}>
              <span className={cn('relative grid h-8 w-8 flex-shrink-0 place-items-center rounded-full',
                st.state === 'done' ? 'bg-primary-container text-white' : st.state === 'now' ? 'bg-primary-fixed text-primary ring-2 ring-primary-container' : 'bg-surface-container text-secondary')}>
                {st.state === 'now' && <span className="absolute inset-0 animate-ping rounded-full bg-primary-container/30 [animation-duration:2s]" />}
                <Icon name={st.icon} className="relative !text-[17px]" />
              </span>
              <div className="min-w-0 pt-0.5">
                <div className={cn('text-[14px] font-extrabold leading-tight', st.state === 'next' ? 'text-secondary' : 'text-on-surface')}>
                  {st.title}{st.state === 'now' && <span className="ml-2 rounded-full bg-primary-fixed px-2 py-0.5 align-middle text-[10.5px] font-bold uppercase tracking-wide text-primary">Now</span>}
                </div>
                <div className="mt-0.5 text-[12.5px] leading-snug text-secondary">{st.text}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Your journey ---------- */}
      <section className="animate-rise mb-5 overflow-hidden rounded-[26px] bg-surface-container-lowest shadow-[0_10px_30px_var(--encore-shadow-0-06)] [animation-delay:120ms]">
        <div className="flex items-center gap-3 bg-[#0f0f11] p-3 pr-4 text-white">
          <div className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-2xl">
            <Img k={vehicleImageKey(b.preferred_category)} alt="" className="h-full w-full object-cover object-[center_55%]" placeholderClassName="h-full w-full !bg-white/5 !border-0" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-extrabold">{car ? car.name.replace('Mercedes-Benz ', '') : b.preferred_category || 'Car to be advised'}</div>
            <div className="truncate text-[12px] text-white/60">{JOURNEY_TYPES[b.journey_type]}{car ? ` · ${car.label}` : ''}</div>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-orange-200">Quote to follow</span>
        </div>
        <div className="space-y-3.5 p-4">
          <div className="relative space-y-3">
            <span className="absolute bottom-[18px] left-[11px] top-[18px] w-[2px] rounded-full bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,.18)_0_4px,transparent_4px_8px)]" />
            {[[leg.pickup, 'trip_origin', 'text-emerald-600 bg-emerald-50'], [leg.destination || 'As directed', 'location_on', 'text-primary bg-primary-fixed']].map(([t, ic, tone]) => (
              <div key={ic} className="relative flex items-start gap-3">
                <span className={cn('grid h-6 w-6 flex-shrink-0 place-items-center rounded-full', tone)}><Icon name={ic} className="!text-[15px]" /></span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-bold text-on-surface">{String(t).split(',')[0]}</div>
                  <div className="truncate text-[12px] text-secondary">{String(t).split(',').slice(1).join(',').trim()}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-surface-container pt-3.5">
            {[['calendar_today', new Date(leg.pickup_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }), new Date(leg.pickup_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })],
              ['group', `${b.passenger_count}`, b.passenger_count === 1 ? 'passenger' : 'passengers'],
              ['luggage', `${bags}`, bags === 1 ? 'bag' : 'bags']].map(([ic, a, z]) => (
              <div key={ic} className="rounded-2xl bg-surface-container-low px-2.5 py-2">
                <Icon name={ic} className="!text-[17px] text-primary" />
                <div className="mt-0.5 truncate text-[13px] font-extrabold text-on-surface">{a}</div>
                <div className="truncate text-[11px] text-secondary">{z}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Actions ---------- */}
      <div className="flex w-full flex-col gap-2.5">
        <button onClick={() => nav(`/app/bookings/${b.id}`)} className="cta-glow flex h-14 w-full items-center justify-between rounded-full bg-gradient-to-r from-primary-container to-button-end pl-6 pr-2 text-white shadow-[0_12px_28px_var(--encore-orange-shadow-0-38)] active:scale-[0.98]">
          <span className="text-left"><span className="block text-[15px] font-extrabold leading-tight">Track my request</span><span className="block text-[11.5px] font-medium opacity-85">See the quote here as soon as it’s ready</span></span>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20"><Icon name="arrow_forward" className="!text-[22px]" /></span>
        </button>
        <div className="flex gap-2.5">
          <button onClick={calendar} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-container-lowest py-3.5 text-[13.5px] font-bold text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)] ring-1 ring-black/5 active:scale-[0.98]">
            <Icon name="calendar_add_on" className="!text-[18px] text-primary" />Add to calendar
          </button>
          <Link to="/app" className="flex flex-1 items-center justify-center gap-2 rounded-full bg-surface-container-lowest py-3.5 text-[13.5px] font-bold text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)] ring-1 ring-black/5 active:scale-[0.98]">
            <Icon name="home" className="!text-[18px] text-primary" />Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/** After the journey: 5 stars + optional comment. Shown to Encore per chauffeur. */
function RateJourney({ b, onSaved }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const save = useAction(() => api.post(`/bookings/${b.id}/rating`, { rating: stars, comment }), {
    success: 'Thank you — your feedback goes straight to Encore.', onSuccess: (nb) => { onSaved(nb); if (stars >= 4) celebrate(); },
  });
  const LABELS = ['', 'Poor', 'Could be better', 'Good', 'Great', 'Outstanding'];
  if (b.review) {
    return (
      <div className="flex items-center gap-3 rounded-[2rem] bg-surface-container-lowest p-4 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
        <div className="flex">{[1, 2, 3, 4, 5].map((n) => <Icon key={n} name="star" fill={n <= b.review.rating} className={cn('!text-[22px]', n <= b.review.rating ? 'text-amber-400' : 'text-neutral-200')} />)}</div>
        <div className="min-w-0 flex-1 text-[13px] text-secondary"><span className="font-bold text-on-surface">You rated this journey</span>{b.review.comment ? ` · “${b.review.comment}”` : ''}</div>
      </div>
    );
  }
  return (
    <div className="rounded-[2rem] bg-surface-container-lowest p-5 text-center shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
      <div className="text-[16px] font-extrabold text-on-surface">How was your journey?</div>
      <div className="mt-0.5 text-[12.5px] text-secondary">{b.legs.find((l) => l.chauffeur)?.chauffeur ? `Rate your chauffeur, ${b.legs.find((l) => l.chauffeur).chauffeur}` : 'Your rating helps us keep every ride first class'}</div>
      <div role="radiogroup" aria-label="Rating" className="mt-3 flex justify-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => { haptic('select'); setStars(n); }}
            className={cn('grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90', n <= stars && 'rate-pop')} style={{ animationDelay: `${(n - 1) * 40}ms` }}>
            <Icon name="star" fill={n <= stars} className={cn('!text-[34px] transition-colors', n <= stars ? 'text-amber-400' : 'text-neutral-300')} />
          </button>
        ))}
      </div>
      <div className="mt-1 h-4 text-[12px] font-bold text-amber-600">{LABELS[stars]}</div>
      {stars > 0 && (
        <div className="pop-in mt-3 space-y-3 text-left">
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={1000}
            placeholder={stars <= 3 ? 'What could we do better? (optional)' : 'Anything you’d like to share? (optional)'}
            className="w-full rounded-2xl bg-surface-container-low p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container/40" />
          <button type="button" disabled={save.isPending} onClick={() => save.mutate()}
            className="w-full rounded-full bg-[#141416] py-3.5 text-[15px] font-bold text-white transition active:scale-[0.98] disabled:opacity-60">
            {save.isPending ? 'Sending…' : 'Send rating'}
          </button>
        </div>
      )}
    </div>
  );
}
