// One-screen booking ("Confirm your journey"). Used when the customer has already chosen
// pickup and destination in the planner. Laid out as short numbered cards so it reads top to
// bottom: trip type → when → who & luggage → car → contact. Same fields and payload as before.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { haptic } from '@/lib/fx';
import { useAuth, usePublicSettings } from '@/lib/auth';
import { useFleet } from '@/lib/fleet';
import { cn } from '@/lib/utils';
import { Icon, Img } from '@/components/app-ui';
import { RouteMap } from '@/components/lazy-maps';
import { PickDateTime, earliestPickup } from '@/components/pick-datetime';

const TYPES = [['point_to_point', 'One way', 'east'], ['return', 'Return', 'sync_alt'], ['airport', 'Airport', 'flight'], ['hourly', 'By the hour', 'schedule'], ['corporate', 'Business', 'business_center'], ['event', 'Event', 'celebration']];
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const dayPart = (v) => new Date(v).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const timePart = (v) => new Date(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const pretty = (v) => (v ? `${dayPart(v)} · ${timePart(v)}` : '');
const short = (t) => String(t || '').split(',')[0];
const rest = (t) => String(t || '').split(',').slice(1).join(',').trim();
const caseUnits = (f) => Number(f.luggage_large || 0) + Math.ceil(Number(f.luggage_small || 0) / 2);
const fits = (v, f) => Number(v.seats) >= Number(f.passenger_count || 1) && Number(v.bags) >= caseUnits(f);

/** "Today", "Tomorrow" or "Fri" for a local date-time value. */
function dayWord(v) {
  const d = new Date(v); const t = new Date();
  const k = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((k(d) - k(t)) / 86400000);
  return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' });
}

function quickTimes(minIso) {
  const min = new Date(minIso);
  const now = new Date();
  const soon = new Date(Math.max(now.getTime() + 3 * 3600000, min.getTime())); soon.setMinutes(Math.ceil(soon.getMinutes() / 15) * 15, 0, 0);
  const evening = new Date(now); evening.setHours(19, 0, 0, 0);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  // "Later today" only while the soonest slot is still today; otherwise it is named for its real day.
  const soonLabel = soon.toDateString() === now.toDateString() ? 'Later today' : 'Earliest';
  return [[soonLabel, 'bolt', soon], ...(evening > soon ? [['This evening', 'nights_stay', evening]] : []), ...(tomorrow.getTime() !== soon.getTime() ? [['Tomorrow', 'wb_sunny', tomorrow]] : [])]
    .filter(([, , d]) => d >= min).map(([l, ic, d]) => [l, ic, localInput(d)]);
}

/** Numbered card with a heading — the backbone of the screen. */
function Card({ n, title, aside, error, children, className, ...rest }) {
  return (
    <section {...rest} className={cn('animate-rise rounded-[24px] bg-surface-container-lowest p-4 shadow-[0_6px_20px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.03]', error && 'fx-shake ring-2 ring-amber-400', className)}>
      <div className="mb-3 flex items-center gap-2.5">
        <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-on-surface text-[11.5px] font-extrabold text-surface">{n}</span>
        <h2 className="flex-1 text-[15px] font-extrabold tracking-tight text-on-surface">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Count({ icon, label, sub, value, onChange, min = 0, max = 12 }) {
  return (
    <div className="flex-1 rounded-2xl bg-surface-container-low p-3">
      <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-on-surface"><Icon name={icon} className="!text-[18px] text-primary" />{label}</div>
      {sub && <div className="text-[11px] text-secondary">{sub}</div>}
      <div className="mt-2 flex items-center justify-between">
        <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => { haptic('light'); onChange(value - 1); }} className="grid h-9 w-9 place-items-center rounded-full bg-white text-on-surface shadow-sm disabled:opacity-30 active:scale-90"><Icon name="remove" className="!text-[18px]" /></button>
        <span key={value} className="pop-in text-[22px] font-extrabold tabular-nums">{value}</span>
        <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => { haptic('light'); onChange(value + 1); }} className="grid h-9 w-9 place-items-center rounded-full bg-on-surface text-surface shadow-sm disabled:opacity-30 active:scale-90"><Icon name="add" className="!text-[18px]" /></button>
      </div>
    </div>
  );
}

export function QuickRequest({ initial, onSubmit, submitting, fields = {}, onFullForm, onChangeRoute }) {
  const { data: s } = usePublicSettings();
  const VEHICLES = useFleet();
  const nav = useNavigate();
  const [f, setF] = useState(() => ({ ...initial, preferred_category: initial.preferred_category || '' }));
  const [err, setErr] = useState({});
  const [editMe, setEditMe] = useState(!initial.lead_passenger || !initial.contact_phone);
  const [note, setNote] = useState(!!initial.special_instructions);
  // Booking for someone else: keep the account holder's own details to restore if they switch back.
  const [me] = useState(() => ({ lead_passenger: initial.lead_passenger || '', contact_phone: initial.contact_phone || '' }));
  // Who travels: me · a colleague (company accounts) · a guest / someone else.
  const { user } = useAuth();
  const corporate = user?.role === 'corporate';
  const company = useQuery({ queryKey: ['company'], queryFn: () => api.get('/account/company'), enabled: corporate, staleTime: 5 * 60000 });
  const colleagues = (company.data?.members || []).filter((m) => m.id !== user?.id);
  const [who, setWho] = useState('me');
  const forOther = who !== 'me';
  const pickWho = (w) => {
    if (w === who) return;
    haptic('select'); setWho(w);
    if (w === 'me') { setF((p) => ({ ...p, ...me })); setEditMe(!me.lead_passenger || !me.contact_phone); }
    else { setF((p) => ({ ...p, lead_passenger: '', contact_phone: '' })); setEditMe(w === 'guest'); }
  };
  const pickColleague = (m) => { haptic('select'); setF((p) => ({ ...p, lead_passenger: m.name, contact_phone: m.phone || '' })); setErr((e) => ({ ...e, lead_passenger: undefined })); };
  const [route, setRoute] = useState(null);
  const [pins, setPins] = useState({ from: null, to: null });
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setErr((e) => (e[k] ? { ...e, [k]: undefined } : e)); };

  const notice = Number(s?.min_notice_hours || 0);
  const minDate = earliestPickup(notice);
  const times = useMemo(() => quickTimes(minDate), [minDate]);
  const isReturn = f.journey_type === 'return';
  const fitting = VEHICLES.filter((v) => fits(v, f));
  const best = [...fitting].sort((a, b) => a.seats - b.seats || a.bags - b.bags)[0];
  // Several models can share a class (S-Class and BMW 7 Series are both First Class), so the exact
  // car tapped is tracked by slug; the booking still carries the class.
  const [pick, setPick] = useState(null);
  const chosen = VEHICLES.find((v) => v.slug === pick && v.category === f.preferred_category) || VEHICLES.find((v) => v.category === f.preferred_category);
  const car = chosen || best;

  // Drive time / distance for the summary (server-side route; never a price).
  useEffect(() => {
    if (!f.pickup || !f.destination) return undefined;
    let off = false;
    api.get(`/places/route?from=${encodeURIComponent(f.pickup)}&to=${encodeURIComponent(f.destination)}`).then((r) => { if (!off) setRoute(r); }).catch(() => {});
    return () => { off = true; };
  }, [f.pickup, f.destination]);
  // The map needs coordinates: use the planner's pins, otherwise look the addresses up.
  useEffect(() => {
    let off = false;
    const at = (lat, lng) => (lat != null ? { lat, lng } : null);
    const look = (q) => (q ? api.get(`/places/geocode?q=${encodeURIComponent(q)}`).catch(() => null) : Promise.resolve(null));
    const a = at(f.pickup_lat, f.pickup_lng); const b = at(f.dest_lat, f.dest_lng);
    setPins({ from: a, to: b });
    Promise.all([a || look(f.pickup), b || look(f.destination)]).then(([x, y]) => {
      if (!off) setPins({ from: x?.lat != null ? { lat: x.lat, lng: x.lng } : null, to: y?.lat != null ? { lat: y.lat, lng: y.lng } : null });
    });
    return () => { off = true; };
  }, [f.pickup, f.destination]); // eslint-disable-line react-hooks/exhaustive-deps
  // Keep the chosen car valid as the party grows.
  useEffect(() => { if (chosen && !fits(chosen, f)) set('preferred_category', best?.category || ''); }, [f.passenger_count, f.luggage_large]); // eslint-disable-line react-hooks/exhaustive-deps
  // Server-side field errors → show inline / open the right section.
  useEffect(() => { if (fields?.lead_passenger || fields?.contact_phone) setEditMe(true); setErr((e) => ({ ...e, ...fields })); }, [fields]);

  // What still blocks sending (shown on the button instead of a vague error).
  const missing = !f.pickup_at ? 'Choose a pickup time'
    : isReturn && !f.return_pickup_at ? 'Choose the return time'
      : f.journey_type === 'airport' && s?.flight_number_required && !f.flight_number?.trim() ? 'Add the flight number'
        : !f.lead_passenger?.trim() || !f.contact_phone?.trim() ? 'Add the passenger’s name and mobile' : null;

  const submit = () => {
    const e = {};
    if (!f.pickup_at) e.pickup_at = 'Choose a pickup time.';
    if (isReturn && !f.return_pickup_at) e.return_pickup_at = 'Choose the return time.';
    if (f.journey_type === 'airport' && s?.flight_number_required && !f.flight_number?.trim()) e.flight_number = 'Flight number is required.';
    if (!f.lead_passenger?.trim() || !f.contact_phone?.trim()) { e.lead_passenger = 'Name and mobile needed for the day.'; setEditMe(true); }
    setErr(e);
    if (Object.keys(e).length) { haptic('error'); setTimeout(() => document.querySelector('[data-err]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30); return; }
    haptic('success');
    onSubmit({
      ...f, stops: [], is_return: isReturn,
      pickup_at: new Date(f.pickup_at).toISOString(),
      return_pickup_at: isReturn && f.return_pickup_at ? new Date(f.return_pickup_at).toISOString() : '',
      preferred_category: f.preferred_category || best?.category || '',
      // Tell Encore which model when the class has more than one.
      special_instructions: chosen && pick && VEHICLES.filter((v) => v.category === chosen.category).length > 1
        ? [`Preferred car: ${chosen.name}`, f.special_instructions].filter(Boolean).join(' · ') : f.special_instructions,
    });
  };

  const minutes = route?.duration_s ? Math.round(route.duration_s / 60) : null;
  const drive = minutes == null ? null : minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
  const customTime = f.pickup_at && !times.some(([, , v]) => v === f.pickup_at);

  return (
    <div className="-mx-margin -mt-space-sm pb-[calc(170px+env(safe-area-inset-bottom))]">
      {/* ---------- Route map ---------- */}
      <div className="relative">
        {pins.from || pins.to
          ? <RouteMap from={pins.from} to={pins.to} topInset={64} bottomInset={44} className="h-[calc(300px+env(safe-area-inset-top))] w-full" />
          : <div className="sk h-[calc(300px+env(safe-area-inset-top))] w-full" />}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-background" />
        {drive && (
          <div className="pop-in absolute bottom-16 right-4 flex items-center gap-1.5 rounded-full bg-[#141416]/85 px-3 py-1.5 text-[12px] font-bold text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
            <Icon name="directions_car" className="!text-[16px] text-primary-container" />{drive}
            <span className="text-white/40">·</span>{(route.distance_m / 1609.344).toFixed(0)} mi
          </div>
        )}
      </div>

      <div className="relative z-10 -mt-16 space-y-3 px-margin">
        {/* ---------- From / to ---------- */}
        <div className="animate-rise rounded-[24px] bg-surface-container-lowest p-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
          <div className="relative space-y-4">
            <span className="absolute bottom-[26px] left-[13px] top-[26px] w-[2px] rounded-full bg-[repeating-linear-gradient(to_bottom,rgba(0,0,0,.18)_0_4px,transparent_4px_8px)]" />
            {[['pickup', 'From', 'trip_origin', 'text-emerald-600 bg-emerald-50'], ['destination', 'To', 'location_on', 'text-primary bg-primary-fixed']].map(([k, l, ic, tone]) => (
              <div key={k} className="relative flex items-center gap-3">
                <span className={cn('grid h-7 w-7 flex-shrink-0 place-items-center rounded-full', tone)}><Icon name={ic} className="!text-[17px]" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-secondary">{l}</div>
                  <div className="truncate text-[15px] font-extrabold leading-tight text-on-surface">{short(f[k])}</div>
                  {rest(f[k]) && <div className="truncate text-[12px] text-secondary">{rest(f[k])}</div>}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => { haptic('light'); if (onChangeRoute) onChangeRoute(f); else nav(-1); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-surface-container-low py-2 text-[12.5px] font-bold text-on-surface active:scale-[.98]">
            <Icon name="edit_location_alt" className="!text-[17px] text-primary" />Change route
          </button>
        </div>

        {/* ---------- 1. Trip type ---------- */}
        <Card n={1} title="Type of trip">
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map(([k, l, ic]) => {
              const on = f.journey_type === k;
              return (
                <button key={k} type="button" onClick={() => { haptic('select'); set('journey_type', k); }}
                  className={cn('flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[12px] font-bold transition active:scale-95',
                    on ? 'bg-on-surface text-surface shadow-[0_8px_18px_rgba(0,0,0,0.18)]' : 'bg-surface-container-low text-on-surface')}>
                  <Icon name={ic} className={cn('!text-[20px]', on ? 'text-primary-container' : 'text-secondary')} />{l}
                </button>
              );
            })}
          </div>
        </Card>

        {/* ---------- 2. When ---------- */}
        <Card n={2} title="When should we pick you up?" data-err={err.pickup_at ? '' : undefined} error={!!err.pickup_at}>
          <div className="grid grid-cols-2 gap-2">
            {times.map(([l, ic, v]) => {
              const on = f.pickup_at === v;
              return (
                <button key={l} type="button" onClick={() => { haptic('select'); set('pickup_at', v); }}
                  className={cn('flex items-center gap-2.5 rounded-2xl p-3 text-left transition active:scale-[.97] max-[359px]:px-3 max-[359px]:py-2.5', on ? 'bg-primary-container text-white shadow-[0_10px_22px_rgba(255,113,15,0.35)]' : 'bg-surface-container-low text-on-surface')}>
                  <Icon name={ic} className={cn('!text-[20px] max-[359px]:hidden', on ? 'text-white' : 'text-primary')} />
                  <span className="min-w-0"><span className="block text-[13px] font-extrabold">{l}</span><span className={cn('block text-[11.5px]', on ? 'text-white/85' : 'text-secondary')}>{dayWord(v)} · {timePart(v)}</span></span>
                </button>
              );
            })}
            <PickDateTime value={f.pickup_at} min={minDate} onChange={(v) => { haptic('select'); set('pickup_at', v); }}
              className={cn('flex items-center gap-2.5 rounded-2xl p-3 text-left transition active:scale-[.97] max-[359px]:px-3 max-[359px]:py-2.5', customTime ? 'bg-primary-container text-white shadow-[0_10px_22px_rgba(255,113,15,0.35)]' : 'bg-surface-container-low text-on-surface outline-dashed outline-1 -outline-offset-1 outline-black/15')}>
              <Icon name="calendar_month" className={cn('!text-[20px] max-[359px]:hidden', customTime ? 'text-white' : 'text-primary')} />
              <span className="min-w-0"><span className="block text-[13px] font-extrabold">{customTime ? dayPart(f.pickup_at) : 'Pick a date'}</span><span className={cn('block text-[11.5px]', customTime ? 'text-white/85' : 'text-secondary')}>{customTime ? timePart(f.pickup_at) : 'Any day & time'}</span></span>
            </PickDateTime>
          </div>
          {f.pickup_at && (
            <div key={f.pickup_at} className="pop-in mt-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2 text-[12.5px] font-bold text-emerald-800">
              <Icon name="check_circle" className="!text-[18px]" />Pickup {pretty(f.pickup_at)}
            </div>
          )}
          {err.pickup_at && <p className="mt-2 text-[12px] font-semibold text-amber-700">{err.pickup_at}</p>}
          {isReturn && (
            <label data-err={err.return_pickup_at ? '' : undefined} className={cn('mt-3 flex items-center justify-between gap-2 rounded-2xl bg-surface-container-low px-3 py-2.5', err.return_pickup_at && 'ring-2 ring-amber-400')}>
              <span className="flex items-center gap-2 text-[13px] font-bold"><Icon name="sync_alt" className="!text-[18px] text-primary" />Return pickup</span>
              <input type="datetime-local" min={f.pickup_at || minDate} value={f.return_pickup_at || ''} onChange={(e) => set('return_pickup_at', e.target.value)} className="min-w-0 bg-transparent text-right text-[13px] font-bold text-on-surface focus:outline-none" />
            </label>
          )}
          {f.journey_type === 'hourly' && (
            <div className="mt-3 flex"><Count icon="hourglass_top" label="Hours" sub={s?.hourly_min_hours ? `Minimum ${s.hourly_min_hours}` : undefined} value={Number(f.duration_hours) || 3} min={Number(s?.hourly_min_hours) || 1} max={24} onChange={(v) => set('duration_hours', v)} /></div>
          )}
          {f.journey_type === 'airport' && (
            <label data-err={err.flight_number ? '' : undefined} className={cn('mt-3 flex items-center gap-2 rounded-2xl bg-surface-container-low px-3 py-3', err.flight_number && 'ring-2 ring-amber-400')}>
              <Icon name="flight_takeoff" className="!text-[19px] text-primary" />
              <input value={f.flight_number || ''} onChange={(e) => set('flight_number', e.target.value.toUpperCase())} placeholder={s?.flight_number_required ? 'Flight number (required)' : 'Flight number — we track delays'} className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold focus:outline-none" />
            </label>
          )}
        </Card>

        {/* ---------- 3. Who & luggage ---------- */}
        <Card n={3} title="Who’s travelling?">
          <div className="flex gap-2">
            <Count icon="group" label="Passengers" value={Number(f.passenger_count) || 1} min={1} onChange={(v) => set('passenger_count', v)} />
            <Count icon="luggage" label="Suitcases" value={Number(f.luggage_large) || 0} onChange={(v) => set('luggage_large', v)} />
          </div>
        </Card>

        {/* ---------- 4. Car ---------- */}
        <Card n={4} title="Your car" aside={<span className="text-[11px] font-semibold text-secondary">Price on your quote</span>}>
          <div role="radiogroup" className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 pt-1">
            {VEHICLES.map((v) => {
              const ok = fits(v, f);
              const on = car?.slug === v.slug;
              return (
                <button key={v.slug} type="button" role="radio" aria-checked={on} disabled={!ok}
                  onClick={(e) => { haptic('select'); setPick(v.slug); set('preferred_category', v.category); e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }); }}
                  className={cn('relative w-[46%] min-w-[140px] max-w-[190px] flex-shrink-0 snap-start overflow-hidden rounded-[20px] bg-[#0f0f11] text-left text-white transition-all duration-300',
                    on ? 'ring-[3px] ring-primary-container shadow-[0_12px_26px_rgba(255,113,15,0.35)]' : 'ring-1 ring-black/5', !ok && 'opacity-40 grayscale')}>
                  {v.card ? <Img k={v.card} alt="" className="mt-8 aspect-[16/9] w-full object-cover object-[center_60%]" />
                    : <span className="mt-8 grid aspect-[16/9] w-full place-items-center bg-white/[0.04]"><Icon name="directions_car" className="!text-[44px] text-white/25" /></span>}
                  <span className="pointer-events-none absolute inset-x-0 top-8 aspect-[16/9] bg-gradient-to-b from-[#0f0f11]/70 via-transparent to-[#0f0f11]" />
                  <span className="relative block px-3 pb-3">
                    <span className="block truncate text-[13.5px] font-extrabold">{v.name.replace('Mercedes-Benz ', '')}</span>
                    <span className="block truncate text-[11px] text-white/55">{v.label}</span>
                    <span className="mt-1.5 flex items-center gap-3 text-[11.5px] font-semibold text-white/75">
                      <span className="flex items-center gap-0.5"><Icon name="group" className="!text-[14px]" />{v.seats}</span>
                      <span className="flex items-center gap-0.5"><Icon name="luggage" className="!text-[14px]" />{v.bags}</span>
                      {!ok && <span className="text-white/60">Too small</span>}
                    </span>
                  </span>
                  {v.slug === best?.slug && ok && <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">Best fit</span>}
                  <span className={cn('absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full transition', on ? 'bg-primary-container text-white' : 'bg-black/40 ring-1 ring-white/40')}>
                    {on && <Icon name="check" className="!text-[16px]" />}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ---------- 5. Contact ---------- */}
        <Card n={5} title="Who is this ride for?" data-err={err.lead_passenger ? '' : undefined} error={!!err.lead_passenger}>
          <div role="radiogroup" className={cn('mb-3 grid gap-1 rounded-2xl bg-surface-container-low p-1', corporate ? 'grid-cols-3' : 'grid-cols-2')}>
            {(corporate ? [['me', 'Me', 'person'], ['colleague', 'Colleague', 'badge'], ['guest', 'Guest', 'group_add']] : [['me', 'Me', 'person'], ['guest', 'Someone else', 'group_add']]).map(([v, l, ic]) => (
              <button key={v} type="button" role="radio" aria-checked={who === v} onClick={() => pickWho(v)}
                className={cn('flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition', who === v ? 'bg-[#141416] text-white shadow-md' : 'text-secondary')}>
                <Icon name={ic} className={cn('!text-[17px]', who === v && 'text-primary-container')} />{l}
              </button>
            ))}
          </div>
          {forOther && <p className="mb-2 text-[12.5px] text-secondary">{who === 'colleague' ? 'Your chauffeur will meet and call your colleague on the day.' : 'Your chauffeur will meet and call this person on the day.'} {corporate ? `Billed to ${user.organisation?.name || 'your company'}.` : 'The booking stays on your account.'}</p>}
          {who === 'colleague' ? (
            <div className="space-y-2">
              <div className="no-scrollbar max-h-56 space-y-1 overflow-y-auto rounded-2xl bg-surface-container-low p-1">
                {company.isLoading ? <div className="p-3 text-[13px] text-secondary">Loading colleagues…</div>
                  : colleagues.length ? colleagues.map((m) => {
                    const on = f.lead_passenger === m.name;
                    return (
                      <button key={m.id} type="button" onClick={() => pickColleague(m)}
                        className={cn('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition', on ? 'bg-white shadow-sm ring-1 ring-primary-container/40' : 'hover:bg-white/60')}>
                        <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[#141416] text-[12px] font-bold text-white">{m.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-bold text-on-surface">{m.name}</span><span className="block truncate text-[12px] text-secondary">{m.phone || 'No mobile on file'}</span></span>
                        {on && <Icon name="check_circle" fill className="!text-[20px] text-primary-container" />}
                      </button>
                    );
                  }) : <div className="p-3 text-[13px] text-secondary">No colleagues on your company account yet. Choose Guest, or ask your company admin to invite them.</div>}
              </div>
              {f.lead_passenger && !f.contact_phone && (
                <label className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-3"><Icon name="call" className="!text-[19px] text-primary" />
                  <input value={f.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} placeholder={`${f.lead_passenger.split(' ')[0]}’s mobile on the day`} inputMode="tel" className="h-12 min-w-0 flex-1 bg-transparent text-[14px] font-semibold focus:outline-none" /></label>
              )}
              {err.lead_passenger && <p className="text-[12px] font-semibold text-amber-700">{err.lead_passenger}</p>}
            </div>
          ) : editMe ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-3"><Icon name="person" className="!text-[19px] text-primary" />
                <input value={f.lead_passenger || ''} onChange={(e) => set('lead_passenger', e.target.value)} placeholder={forOther ? 'Passenger’s full name' : 'Your full name'} autoComplete={forOther ? 'off' : 'name'} className="h-12 min-w-0 flex-1 bg-transparent text-[14px] font-semibold focus:outline-none" /></label>
              <label className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-3"><Icon name="call" className="!text-[19px] text-primary" />
                <input value={f.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} placeholder={forOther ? 'Passenger’s mobile' : 'Your mobile on the day'} inputMode="tel" autoComplete={forOther ? 'off' : 'tel'} className="h-12 min-w-0 flex-1 bg-transparent text-[14px] font-semibold focus:outline-none" /></label>
              {err.lead_passenger && <p className="text-[12px] font-semibold text-amber-700">{err.lead_passenger}</p>}
            </div>
          ) : (
            <button type="button" onClick={() => setEditMe(true)} className="flex w-full items-center gap-3 rounded-2xl bg-surface-container-low p-3 text-left">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-fixed text-primary"><Icon name="person" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-extrabold text-on-surface">{f.lead_passenger}</span><span className="block truncate text-[12.5px] text-secondary">{f.contact_phone}</span></span>
              <span className="text-[13px] font-bold text-primary">Change</span>
            </button>
          )}
          {corporate && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-3"><Icon name="receipt_long" className="!text-[18px] text-primary" />
                <input value={f.po_number || ''} onChange={(e) => set('po_number', e.target.value)} placeholder="PO number" maxLength={60} className="h-11 min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold focus:outline-none" /></label>
              <label className="flex items-center gap-2 rounded-2xl bg-surface-container-low px-3"><Icon name="account_tree" className="!text-[18px] text-primary" />
                <input value={f.cost_centre || ''} onChange={(e) => set('cost_centre', e.target.value)} placeholder="Cost centre" maxLength={60} className="h-11 min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold focus:outline-none" /></label>
              <p className="col-span-2 -mt-0.5 px-1 text-[11.5px] text-secondary">Optional · printed on your company invoice</p>
            </div>
          )}
          {note ? (
            <textarea autoFocus value={f.special_instructions || ''} onChange={(e) => set('special_instructions', e.target.value)} rows={2} placeholder="Note for your chauffeur (child seat, meet & greet, gate code…)" className="mt-3 w-full rounded-2xl bg-surface-container-low p-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary-container/40" />
          ) : (
            <button type="button" onClick={() => setNote(true)} className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-primary"><Icon name="edit_note" className="!text-[18px]" />Add a note for your chauffeur</button>
          )}
        </Card>

        <button type="button" onClick={onFullForm} className="mx-auto flex items-center gap-1 py-2 text-[12.5px] font-semibold text-secondary">
          <Icon name="add_road" className="!text-[16px]" />Extra stops or special needs? Use the full form
        </button>
        <p className="px-6 pb-2 text-center text-[12px] leading-relaxed text-secondary"><Icon name="verified_user" className="!text-[15px] mr-1 align-[-3px] text-emerald-600" />This is a request, not a booking — we’ll send you a tailored quote.</p>
      </div>

      {/* ---------- Send bar, above the dock ---------- */}
      <div className="fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-[480px] px-margin">
          <button type="button" disabled={submitting} onClick={submit}
            className={cn('flex h-14 w-full items-center justify-between rounded-full pl-6 pr-2 text-white transition disabled:opacity-70',
              missing ? 'bg-on-surface/90' : 'cta-glow bg-gradient-to-r from-primary-container to-button-end shadow-[0_12px_28px_rgba(255,113,15,0.4)]')}>
            <span className="min-w-0 text-left">
              <span className="block text-[15px] font-extrabold leading-tight">{submitting ? 'Sending…' : missing || 'Request my quote'}</span>
              <span className="block truncate text-[11.5px] font-medium opacity-80">{[car?.name.replace('Mercedes-Benz ', ''), `${f.passenger_count || 1} passenger${Number(f.passenger_count) === 1 ? '' : 's'}`, f.pickup_at && pretty(f.pickup_at)].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-white/20">
              {submitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Icon name={missing ? 'arrow_downward' : 'arrow_forward'} className="!text-[22px]" />}
            </span>
          </button>
      </div>
    </div>
  );
}
