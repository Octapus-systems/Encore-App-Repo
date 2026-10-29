import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Accessibility, Baby, Briefcase, CheckCircle2, ChevronRight, Gauge, Lock, MapPin, Navigation, Phone, Plane, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { usePublicSettings } from '@/lib/auth';
import { celebrate, haptic, sparkle } from '@/lib/fx';
import { driveTime, miles, JOURNEY_TYPES, LEG_STATUS, dateOnly, shortDateTime, timeOnly } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Banner, Empty, ErrorState, Field, KV, Modal, PageLoader, Panel, PrimaryButton, TextInput } from '@/components/common';
import { LegRoute, LegTimes } from '@/components/booking';

const NEXT = {
  assigned: { to: 'on_the_way', label: 'On the way', hint: 'Press when you set off to the pickup' },
  on_the_way: { to: 'arrived', label: 'Arrived', hint: 'Press when you are at the pickup' },
  arrived: { to: 'started', label: 'Journey started', hint: 'Press when the passenger is on board' },
  started: { to: 'completed', label: 'Completed', hint: 'Press at drop-off' },
};

const statusTone = (s) => ({ assigned: 'bg-neutral-100 text-neutral-700', on_the_way: 'bg-orange-100 text-orange-800', arrived: 'bg-orange-100 text-orange-800', started: 'bg-sky-100 text-sky-800', completed: 'bg-emerald-100 text-emerald-800' }[s] || 'bg-neutral-100');

export function DriverJobs() {
  const { data, isLoading, error } = useQuery({ queryKey: ['driver-legs'], queryFn: () => api.get('/driver/legs'), refetchInterval: 8000 });
  if (error && !data) return <ErrorState error={error} />;
  if (isLoading || !data) return <PageLoader />;
  const live = data.filter((l) => !['completed'].includes(l.status) && !l.booking_status.startsWith('cancelled'));
  const today = new Date().toDateString();
  const groups = [
    ['In progress', live.filter((l) => ['on_the_way', 'arrived', 'started'].includes(l.status))],
    ['Today', live.filter((l) => l.status === 'assigned' && new Date(l.pickup_at).toDateString() === today)],
    ['Upcoming', live.filter((l) => l.status === 'assigned' && new Date(l.pickup_at).toDateString() !== today && new Date(l.pickup_at) > new Date())],
    ['Earlier — not yet completed', live.filter((l) => l.status === 'assigned' && new Date(l.pickup_at) < new Date() && new Date(l.pickup_at).toDateString() !== today)],
    ['Recently completed', data.filter((l) => l.status === 'completed').reverse()],
    ['Cancelled', data.filter((l) => l.booking_status.startsWith('cancelled') && l.status !== 'completed')],
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">My journeys</h1>
        <p className="text-sm text-muted-foreground">Assigned to you by Encore dispatch.</p>
      </div>
      {data.length === 0 && <Empty icon={Navigation} title="No journeys assigned">New assignments from dispatch will appear here.</Empty>}
      {groups.filter(([, items]) => items.length).map(([title, items]) => (
        <div key={title}>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
          <div className="space-y-2">
            {items.map((l) => (
              <Link key={l.id} to={`/driver/jobs/${l.booking_id}`} className={cn('press block animate-rise rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md', ['on_the_way', 'arrived', 'started'].includes(l.status) && 'border-primary ring-2 ring-primary/15')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-heading text-2xl font-bold">{timeOnly(l.pickup_at)}</span>
                      <span className="text-sm text-muted-foreground">{dateOnly(l.pickup_at)}</span>
                    </div>
                    <div className="mt-1 text-sm font-medium">{l.lead_passenger} · {l.passenger_count} pax{l.leg_count > 1 ? ` · ${l.label}` : ''}</div>
                    <div className="mt-1 truncate text-sm text-muted-foreground">{l.pickup}</div>
                    <div className="truncate text-sm text-muted-foreground">→ {l.destination}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', l.booking_status.startsWith('cancelled') ? 'bg-red-100 text-red-700' : statusTone(l.status))}>{l.booking_status.startsWith('cancelled') ? 'Cancelled' : LEG_STATUS[l.status]}</span>
                    {l.status === 'assigned' && !l.driver_accepted_at && !l.booking_status.startsWith('cancelled') && <span className="animate-pulse rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">New · tap to accept</span>}
                    {l.vehicle_registration && <span className="font-mono text-xs font-bold">{l.vehicle_registration}</span>}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DriverJob() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { data: s } = usePublicSettings();
  const q = useQuery({ queryKey: ['driver-job', id], queryFn: () => api.get(`/bookings/${id}`), refetchInterval: 8000 });
  const nav = useNavigate();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  const [pending, setPending] = useState(null);
  const [distanceLeg, setDistanceLeg] = useState(null); // leg awaiting an actual-distance entry before completing
  const inFlight = useRef(false);

  const press = async (leg, to, extra) => {
    if (inFlight.current) return; // ignore double taps while a request is in flight
    if (to === 'completed' && !extra) { haptic('medium'); setDistanceLeg(leg); return; } // ask for actual distance first
    inFlight.current = true;
    setPending(leg.id);
    try {
      const res = await api.post(`/bookings/${id}/legs/${leg.id}/status`, { status: to, ...extra });
      qc.setQueryData(['driver-job', id], res.booking);
      qc.invalidateQueries({ queryKey: ['driver-legs'] });
      if (res.unchanged) toast.info('Already recorded — nothing changed.');
      else {
        toast.success(`${LEG_STATUS[to]} — the customer has been informed.`);
        if (to === 'completed') celebrate(); else sparkle(document.activeElement);
      }
    } catch (err) {
      // Never show false success: reload the authoritative state.
      toast.error(err.message);
      qc.invalidateQueries({ queryKey: ['driver-job', id] });
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  const respond = async (leg, accept) => {
    if (inFlight.current) return;
    let reason = '';
    if (!accept) {
      reason = window.prompt('Decline this journey? Dispatch will reassign it. Reason (optional):');
      if (reason === null) return;
    }
    inFlight.current = true;
    setPending(leg.id);
    try {
      const res = await api.post(`/bookings/${id}/legs/${leg.id}/respond`, { accept, reason });
      qc.invalidateQueries({ queryKey: ['driver-legs'] });
      if (accept) {
        qc.setQueryData(['driver-job', id], res);
        toast.success('Journey accepted — dispatch and the customer have been told.');
        celebrate();
      } else {
        toast.info('Journey declined — dispatch will reassign it.');
        nav('/driver');
      }
    } catch (err) {
      toast.error(err.message);
      qc.invalidateQueries({ queryKey: ['driver-job', id] });
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  if (q.error && !q.data) return <ErrorState error={q.error} />;
  if (q.isLoading || !q.data) return <PageLoader />;
  const b = q.data;
  return (
    <div className="space-y-4">
      <Link to="/driver" className="text-sm font-semibold text-muted-foreground">← My journeys</Link>
      <div className="rounded-3xl bg-ink p-5 text-white">
        <div className="text-xs font-semibold text-white/50">{b.ref} · {JOURNEY_TYPES[b.journey_type]}</div>
        <div className="mt-1 font-heading text-2xl font-bold">{b.lead_passenger}</div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><Users className="h-3.5 w-3.5" />{b.passenger_count} passenger{b.passenger_count === 1 ? '' : 's'}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><Briefcase className="h-3.5 w-3.5" />{b.luggage_large} large · {b.luggage_small} small</span>
          {b.child_seats > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 font-semibold"><Baby className="h-3.5 w-3.5" />{b.child_seats} child seat{b.child_seats > 1 ? 's' : ''}</span>}
          {b.flight_number && <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1"><Plane className="h-3.5 w-3.5" />{b.flight_number}</span>}
          {b.duration_hours && <span className="rounded-full bg-white/10 px-2.5 py-1">{b.duration_hours} hours as directed</span>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href={`tel:${b.contact_phone}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold"><Phone className="h-4 w-4" />Passenger</a>
          {s && <a href={`tel:${s.dispatcher_phone}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold"><Phone className="h-4 w-4" />Dispatcher</a>}
        </div>
      </div>

      {b.cancelled && <Banner tone="red" title="This journey has been cancelled">Do not attend. Contact the dispatcher if you have questions.</Banner>}

      {(b.accessibility_needs || b.special_instructions || b.sensitive_notes) && (
        <Panel title="Passenger requirements">
          <div className="space-y-3">
            {b.accessibility_needs && <KV label={<span className="inline-flex items-center gap-1"><Accessibility className="h-3 w-3" />Accessibility</span>}>{b.accessibility_needs}</KV>}
            {b.special_instructions && <KV label="Instructions">{b.special_instructions}</KV>}
            {b.sensitive_notes && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><div className="mb-0.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider"><Lock className="h-3 w-3" />Private — for delivery only</div>{b.sensitive_notes}</div>}
            {b.passenger_names && <KV label="Other passengers">{b.passenger_names}</KV>}
          </div>
        </Panel>
      )}

      {b.legs.map((leg) => {
        const next = NEXT[leg.status];
        return (
          <Panel key={leg.id} title={`${leg.label} · ${shortDateTime(leg.pickup_at)}`} actions={<span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', statusTone(leg.status))}>{LEG_STATUS[leg.status]}</span>}>
            <LegRoute leg={leg} />
            {leg.distance_m ? <div className="mt-3 text-sm text-muted-foreground">Approx. <b className="text-ink">{miles(leg.distance_m)}</b> · <b className="text-ink">{driveTime(leg.duration_s)}</b> drive (without traffic)</div> : null}
            {leg.vehicle && <div className="mt-4 flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm"><span>{leg.vehicle.make} {leg.vehicle.model}</span><span className="font-mono font-bold">{leg.vehicle.registration}</span></div>}
            <a href={leg.navigation_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-ink text-sm font-bold"><MapPin className="h-4 w-4" />Open in Maps</a>
            <div className="mt-3"><LegTimes leg={leg} /></div>
            {!b.cancelled && leg.status === 'assigned' && !leg.driver_accepted_at ? (
              <div className="mt-4 animate-rise rounded-2xl border-2 border-primary/40 bg-primary/5 p-3">
                <div className="mb-3 text-center text-sm font-semibold">New assignment — accept this journey?</div>
                <div className="grid grid-cols-[1fr_2fr] gap-2">
                  <button type="button" disabled={pending === leg.id} onClick={() => respond(leg, false)} className="press h-14 rounded-xl border-2 border-ink/15 bg-white text-sm font-bold">Decline</button>
                  <PrimaryButton className="h-14 w-full text-lg" loading={pending === leg.id} onClick={() => respond(leg, true)}>Accept journey</PrimaryButton>
                </div>
              </div>
            ) : !b.cancelled && next && (
              <div className="mt-4">
                {next.to === 'on_the_way' && b.payment_hold ? (
                  <Banner tone="amber" title="Payment outstanding">Do not set off yet. Dispatch must confirm payment first — call the dispatcher.</Banner>
                ) : next.to === 'on_the_way' && leg.start_available_at && now < new Date(leg.start_available_at).getTime() ? (
                  <>
                    <button type="button" disabled className="h-14 w-full rounded-xl bg-neutral-200 text-lg font-bold text-neutral-500">Starts at {timeOnly(leg.start_available_at)}</button>
                    <p className="mt-1.5 text-center text-xs text-muted-foreground">You can start this journey from {timeOnly(leg.start_available_at)} ({dateOnly(leg.start_available_at)}).</p>
                  </>
                ) : (
                  <>
                    <PrimaryButton className="cta-glow h-14 w-full text-lg" loading={pending === leg.id} onClick={() => press(leg, next.to)}>{next.label}</PrimaryButton>
                    <p className="mt-1.5 text-center text-xs text-muted-foreground">{next.hint}</p>
                  </>
                )}
              </div>
            )}
            {leg.status === 'completed' && (
              <div className={cn('mt-4 rounded-xl py-3 text-center text-sm font-semibold', leg.distance_exceeded ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>
                <div className="flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" />Journey completed</div>
                {leg.actual_distance_m != null && (
                  <div className="mt-0.5 text-xs opacity-80">{miles(leg.actual_distance_m)} driven{leg.distance_exceeded ? ' — over the planned distance, management notified' : ''}</div>
                )}
              </div>
            )}
          </Panel>
        );
      })}

      {distanceLeg && (
        <DistanceModal leg={distanceLeg} onClose={() => setDistanceLeg(null)}
          onConfirm={(mi) => { const leg = distanceLeg; setDistanceLeg(null); press(leg, 'completed', { actual_distance_mi: mi }); }} />
      )}
    </div>
  );
}

/** Asked at drop-off (feature 3): the driver records the distance actually driven, so an
 * over-distance journey can be flagged to management automatically. */
function DistanceModal({ leg, onClose, onConfirm }) {
  const plannedMi = leg.distance_m ? +(leg.distance_m / 1609.344).toFixed(1) : null;
  const [value, setValue] = useState(plannedMi != null ? String(plannedMi) : '');
  const n = Number(value);
  const valid = value.trim() !== '' && Number.isFinite(n) && n >= 0 && n <= 2000;
  return (
    <Modal open onOpenChange={onClose} title="Journey completed" description="Enter the actual distance driven so we can confirm it against the booking."
      footer={<PrimaryButton className="cta-glow w-full" disabled={!valid} onClick={() => onConfirm(n)}><Gauge className="h-4 w-4" />Confirm and complete</PrimaryButton>}>
      <Field label="Actual distance driven (miles)" hint={plannedMi != null ? `Planned distance was about ${plannedMi} mi` : undefined}>
        <TextInput type="number" inputMode="decimal" min="0" max="2000" step="0.1" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
    </Modal>
  );
}
