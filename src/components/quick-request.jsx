// One-screen booking ("Confirm your journey"). Used when the customer has already chosen
// pickup, destination (and usually time) in the planner — no multi-step form to repeat it all.
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { haptic } from '@/lib/fx';
import { usePublicSettings } from '@/lib/auth';
import { VEHICLES } from '@/lib/showcase';
import { cn } from '@/lib/utils';
import { Icon, Img } from '@/components/app-ui';
import { RouteMap } from '@/components/lazy-maps';

const TYPES = [['point_to_point', 'One way', 'east'], ['return', 'Return', 'sync_alt'], ['airport', 'Airport', 'flight'], ['hourly', 'By the hour', 'schedule'], ['corporate', 'Corporate', 'business_center'], ['event', 'Event', 'celebration']];
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const pretty = (v) => (v ? new Date(v).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
const short = (t) => String(t || '').split(',')[0];
const caseUnits = (f) => Number(f.luggage_large || 0) + Math.ceil(Number(f.luggage_small || 0) / 2);
const fits = (v, f) => Number(v.seats) >= Number(f.passenger_count || 1) && Number(v.bags) >= caseUnits(f);

function quickTimes(minIso) {
  const min = new Date(minIso);
  const now = new Date();
  const soon = new Date(Math.max(now.getTime() + 3 * 3600000, min.getTime())); soon.setMinutes(Math.ceil(soon.getMinutes() / 15) * 15, 0, 0);
  const evening = new Date(now); evening.setHours(19, 0, 0, 0);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  return [['Later today', soon], ...(evening > soon ? [['This evening', evening]] : []), ['Tomorrow 9am', tomorrow]]
    .filter(([, d]) => d >= min).map(([l, d]) => [l, localInput(d)]);
}

function Count({ icon, label, value, onChange, min = 0, max = 12 }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surface-container-low px-3 py-2">
      <span className="flex items-center gap-2 text-[13px] font-semibold text-on-surface"><Icon name={icon} className="!text-[19px] text-primary" />{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" disabled={value <= min} onClick={() => { haptic('light'); onChange(value - 1); }} className="grid h-8 w-8 place-items-center rounded-full bg-white text-on-surface shadow-sm disabled:opacity-30 active:scale-90"><Icon name="remove" className="!text-[18px]" /></button>
        <span key={value} className="pop-in w-5 text-center text-[15px] font-extrabold tabular-nums">{value}</span>
        <button type="button" disabled={value >= max} onClick={() => { haptic('light'); onChange(value + 1); }} className="grid h-8 w-8 place-items-center rounded-full bg-white text-on-surface shadow-sm disabled:opacity-30 active:scale-90"><Icon name="add" className="!text-[18px]" /></button>
      </span>
    </div>
  );
}

export function QuickRequest({ initial, onSubmit, submitting, fields = {}, onFullForm }) {
  const { data: s } = usePublicSettings();
  const [f, setF] = useState(() => ({ ...initial, preferred_category: initial.preferred_category || '' }));
  const [err, setErr] = useState({});
  const [editMe, setEditMe] = useState(!initial.lead_passenger || !initial.contact_phone);
  const [note, setNote] = useState(!!initial.special_instructions);
  const [route, setRoute] = useState(null);
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErr((e) => (e[k] ? { ...e, [k]: undefined } : e)); };

  const notice = Number(s?.min_notice_hours || 0);
  const minDate = localInput(new Date(Date.now() + Math.max(15, notice * 60) * 60000));
  const times = useMemo(() => quickTimes(minDate), [minDate]);
  const isReturn = f.journey_type === 'return';
  const fitting = VEHICLES.filter((v) => fits(v, f));
  const best = [...fitting].sort((a, b) => a.seats - b.seats || a.bags - b.bags)[0];
  const chosen = VEHICLES.find((v) => v.category === f.preferred_category);

  // Drive time / distance for the summary (server-side Google route; never a price).
  useEffect(() => {
    if (!f.pickup || !f.destination) return undefined;
    let off = false;
    api.get(`/places/route?from=${encodeURIComponent(f.pickup)}&to=${encodeURIComponent(f.destination)}`).then((r) => { if (!off) setRoute(r); }).catch(() => {});
    return () => { off = true; };
  }, [f.pickup, f.destination]);
  // Keep the chosen car valid as the party grows.
  useEffect(() => { if (chosen && !fits(chosen, f)) set('preferred_category', best?.category || ''); }, [f.passenger_count, f.luggage_large]); // eslint-disable-line react-hooks/exhaustive-deps
  // Server-side field errors → show inline / open the right section.
  useEffect(() => { if (fields?.lead_passenger || fields?.contact_phone) setEditMe(true); setErr((e) => ({ ...e, ...fields })); }, [fields]);

  const submit = () => {
    const e = {};
    if (!f.pickup_at) e.pickup_at = 'Choose a pickup time.';
    if (isReturn && !f.return_pickup_at) e.return_pickup_at = 'Choose the return time.';
    if (f.journey_type === 'airport' && s?.flight_number_required && !f.flight_number?.trim()) e.flight_number = 'Flight number is required.';
    if (!f.lead_passenger?.trim() || !f.contact_phone?.trim()) { e.lead_passenger = 'Name and mobile needed for the day.'; setEditMe(true); }
    setErr(e);
    if (Object.keys(e).length) { haptic('error'); document.querySelector('[data-err]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    haptic('success');
    onSubmit({
      ...f, stops: [], is_return: isReturn,
      pickup_at: new Date(f.pickup_at).toISOString(),
      return_pickup_at: isReturn && f.return_pickup_at ? new Date(f.return_pickup_at).toISOString() : '',
      preferred_category: f.preferred_category || best?.category || '',
    });
  };

  const from = f.pickup_lat != null ? { lat: f.pickup_lat, lng: f.pickup_lng } : null;
  const to = f.dest_lat != null ? { lat: f.dest_lat, lng: f.dest_lng } : null;
  const minutes = route?.duration_s ? Math.round(route.duration_s / 60) : null;

  return (
    <div className="-mx-margin -mt-space-sm pb-36">
      {/* Route */}
      <div className="relative">
        {from || to ? <RouteMap from={from} to={to} className="h-52 w-full" /> : <div className="h-24" />}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background" />
      </div>
      <div className="relative z-10 -mt-12 space-y-3 px-margin">
        <div className="animate-rise rounded-[26px] bg-surface-container-lowest p-4 shadow-[0_14px_36px_rgba(0,0,0,0.10)]">
          <div className="relative space-y-3">
            <span className="absolute bottom-[22px] left-[11px] top-[22px] w-[2px] rounded-full bg-gradient-to-b from-emerald-400 to-primary-container" />
            {[['pickup', 'Pickup', 'bg-emerald-500 rounded-full'], ['destination', 'Drop-off', 'bg-primary-container rounded-[4px]']].map(([k, l, dot]) => (
              <div key={k} className="relative flex items-center gap-3">
                <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-white"><span className={cn('h-3 w-3', dot)} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-secondary">{l}</div>
                  <div className="truncate text-[15px] font-bold text-on-surface">{f[k]}</div>
                </div>
              </div>
            ))}
          </div>
          {route && (
            <div className="mt-3 flex items-center gap-2 border-t border-surface-container pt-3 text-[12.5px] font-semibold text-secondary">
              <Icon name="route" className="!text-[17px] text-primary" />{(route.distance_m / 1609.344).toFixed(0)} mi
              <span className="h-1 w-1 rounded-full bg-secondary/40" /><Icon name="schedule" className="!text-[17px] text-primary" />~{minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`} drive
            </div>
          )}
        </div>

        {/* Trip type */}
        <div className="no-scrollbar -mx-margin flex gap-2 overflow-x-auto px-margin">
          {TYPES.map(([k, l, ic]) => (
            <button key={k} type="button" onClick={() => { haptic('select'); set('journey_type', k); }}
              className={cn('flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition', f.journey_type === k ? 'bg-on-surface text-surface shadow-md' : 'bg-surface-container-lowest text-on-surface shadow-sm')}>
              <Icon name={ic} className="!text-[17px]" />{l}
            </button>
          ))}
        </div>

        {/* When */}
        <div data-err={err.pickup_at ? '' : undefined} className={cn('rounded-[22px] bg-surface-container-lowest p-4 shadow-sm', err.pickup_at && 'fx-shake ring-2 ring-amber-400')}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-bold text-on-surface">Pickup time</span>
            {f.pickup_at && <span className="text-[13px] font-bold text-primary">{pretty(f.pickup_at)}</span>}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {times.map(([l, v]) => (
              <button key={l} type="button" onClick={() => { haptic('select'); set('pickup_at', v); }} className={cn('whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold transition', f.pickup_at === v ? 'bg-primary-container text-white' : 'bg-surface-container text-on-surface')}>{l}</button>
            ))}
            <label className={cn('relative flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold', f.pickup_at && !times.some(([, v]) => v === f.pickup_at) ? 'bg-primary-container text-white' : 'bg-surface-container text-on-surface')}>
              <Icon name="calendar_month" className="!text-[16px]" />Other
              <input type="datetime-local" min={minDate} value={f.pickup_at || ''} onChange={(e) => set('pickup_at', e.target.value)} className="absolute inset-0 opacity-0" />
            </label>
          </div>
          {err.pickup_at && <p className="mt-2 text-[12px] font-semibold text-amber-700">{err.pickup_at}</p>}
          {isReturn && (
            <label data-err={err.return_pickup_at ? '' : undefined} className="mt-3 flex items-center justify-between rounded-2xl bg-surface-container-low px-3 py-2.5">
              <span className="flex items-center gap-2 text-[13px] font-semibold"><Icon name="sync_alt" className="!text-[18px] text-primary" />Return pickup</span>
              <input type="datetime-local" min={f.pickup_at || minDate} value={f.return_pickup_at || ''} onChange={(e) => set('return_pickup_at', e.target.value)} className="bg-transparent text-right text-[13px] font-bold text-on-surface focus:outline-none" />
            </label>
          )}
          {f.journey_type === 'hourly' && <div className="mt-3"><Count icon="hourglass_top" label="Hours" value={Number(f.duration_hours) || 3} min={Number(s?.hourly_min_hours) || 1} max={24} onChange={(v) => set('duration_hours', v)} /></div>}
          {f.journey_type === 'airport' && (
            <label data-err={err.flight_number ? '' : undefined} className={cn('mt-3 flex items-center gap-2 rounded-2xl bg-surface-container-low px-3 py-2.5', err.flight_number && 'ring-2 ring-amber-400')}>
              <Icon name="flight" className="!text-[18px] text-primary" />
              <input value={f.flight_number || ''} onChange={(e) => set('flight_number', e.target.value.toUpperCase())} placeholder={s?.flight_number_required ? 'Flight number (required)' : 'Flight number (optional)'} className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold focus:outline-none" />
            </label>
          )}
        </div>

        {/* Party */}
        <div className="grid grid-cols-1 gap-2 rounded-[22px] bg-surface-container-lowest p-3 shadow-sm">
          <Count icon="group" label="Passengers" value={Number(f.passenger_count) || 1} min={1} onChange={(v) => set('passenger_count', v)} />
          <Count icon="luggage" label="Suitcases" value={Number(f.luggage_large) || 0} onChange={(v) => set('luggage_large', v)} />
        </div>

        {/* Vehicle */}
        <div>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <span className="text-[13px] font-bold text-on-surface">Choose your car</span>
            <span className="text-[11.5px] text-secondary">Quoted by Encore — no surprise fares</span>
          </div>
          <div className="no-scrollbar -mx-margin flex snap-x gap-3 overflow-x-auto px-margin pb-1">
            {VEHICLES.map((v) => {
              const ok = fits(v, f);
              const on = (f.preferred_category || best?.category) === v.category;
              return (
                <button key={v.slug} type="button" disabled={!ok} onClick={() => { haptic('select'); set('preferred_category', v.category); }}
                  className={cn('relative w-[150px] flex-shrink-0 snap-start overflow-hidden rounded-[20px] bg-surface-container-lowest p-2 text-left shadow-sm transition', on ? 'ring-2 ring-primary-container shadow-[0_10px_24px_rgba(255,113,15,0.25)]' : 'ring-1 ring-black/5', !ok && 'opacity-40')}>
                  <Img k={v.card} alt="" className="h-20 w-full rounded-[14px] object-cover" />
                  <div className="mt-2 px-1">
                    <div className="truncate text-[13px] font-bold text-on-surface">{v.label}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-secondary"><span className="flex items-center gap-0.5"><Icon name="group" className="!text-[14px]" />{v.seats}</span><span className="flex items-center gap-0.5"><Icon name="luggage" className="!text-[14px]" />{v.bags}</span>{v.category === best?.category && ok && <span className="ml-auto rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700">Best fit</span>}</div>
                  </div>
                  {on && <span className="absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full bg-primary-container text-white shadow"><Icon name="check" className="!text-[16px]" /></span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Passenger */}
        <div data-err={err.lead_passenger ? '' : undefined} className={cn('rounded-[22px] bg-surface-container-lowest p-4 shadow-sm', err.lead_passenger && 'ring-2 ring-amber-400')}>
          {editMe ? (
            <div className="space-y-2">
              <div className="text-[13px] font-bold text-on-surface">Lead passenger</div>
              <input value={f.lead_passenger || ''} onChange={(e) => set('lead_passenger', e.target.value)} placeholder="Full name" className="h-11 w-full rounded-xl bg-surface-container-low px-3 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container/40" />
              <input value={f.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} placeholder="Mobile on the day" inputMode="tel" className="h-11 w-full rounded-xl bg-surface-container-low px-3 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container/40" />
              {err.lead_passenger && <p className="text-[12px] font-semibold text-amber-700">{err.lead_passenger}</p>}
            </div>
          ) : (
            <button type="button" onClick={() => setEditMe(true)} className="flex w-full items-center gap-3 text-left">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-fixed text-primary"><Icon name="person" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase tracking-wider text-secondary">Travelling</span><span className="block truncate text-[14px] font-bold text-on-surface">{f.lead_passenger} · {f.contact_phone}</span></span>
              <span className="text-[13px] font-bold text-primary">Change</span>
            </button>
          )}
          {note ? (
            <textarea autoFocus value={f.special_instructions || ''} onChange={(e) => set('special_instructions', e.target.value)} rows={2} placeholder="Note for your chauffeur (child seat, meet & greet, gate code…)" className="mt-3 w-full rounded-xl bg-surface-container-low p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container/40" />
          ) : (
            <button type="button" onClick={() => setNote(true)} className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-primary"><Icon name="edit_note" className="!text-[18px]" />Add a note for your chauffeur</button>
          )}
        </div>

        <button type="button" onClick={onFullForm} className="mx-auto block py-2 text-[12.5px] font-semibold text-secondary underline-offset-4 hover:underline">Need extra stops or special requirements? Use the full form</button>
      </div>

      {/* Sticky confirm bar, above the dock */}
      <div className="fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[480px] px-margin">
        <button type="button" disabled={submitting} onClick={submit}
          className="cta-glow flex h-14 w-full items-center justify-between rounded-full bg-gradient-to-r from-primary-container to-button-end pl-6 pr-2 text-white shadow-[0_14px_30px_rgba(255,113,15,0.4)] disabled:opacity-70">
          <span className="min-w-0 text-left">
            <span className="block text-[15px] font-extrabold leading-tight">{submitting ? 'Sending…' : 'Request quote'}</span>
            <span className="block truncate text-[11.5px] font-medium opacity-85">{short(f.pickup)} → {short(f.destination)}{f.pickup_at ? ` · ${pretty(f.pickup_at)}` : ''}</span>
          </span>
          <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-white/20">{submitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name="arrow_forward" className="!text-[22px]" />}</span>
        </button>
      </div>
    </div>
  );
}
