import { useEffect, useMemo, useRef, useState } from 'react';
import { Armchair, ArrowDown, ArrowLeft, ArrowRight, Baby, Check, Luggage, Briefcase, Clock, MapPin, Minus, Plane, Plus, Repeat, Send, Users, Accessibility, Car, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { locate } from '@/lib/location';
import { api } from '@/lib/api';
import { haptic } from '@/lib/fx';
import { VEHICLES } from '@/lib/showcase';
import { Img } from '@/components/app-ui';
import { usePublicSettings } from '@/lib/auth';
import { JOURNEY_TYPES, LEG_STATUS, dateTime, shortDateTime, toLocalInput } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Banner, Field, PrimaryButton, TextArea, TextInput } from '@/components/common';
import { AddressInput } from '@/components/address';

const TYPE_ICONS = { point_to_point: MapPin, airport: Plane, return: Repeat, event: Users, corporate: Briefcase, hourly: Clock };

function Stepper({ value, onChange, min = 0, max = 60 }) {
  return (
    <div className="flex h-11 items-center justify-between rounded-xl border bg-white px-1.5 shadow-sm">
      <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface disabled:opacity-30" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
      <span className="font-semibold tabular-nums">{value}</span>
      <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface disabled:opacity-30" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Increase"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export const emptyRequest = (user) => ({
  journey_type: 'point_to_point', pickup: '', destination: '', stops: [], pickup_at: '', flight_number: '', duration_hours: 3,
  is_return: false, return_pickup_at: '', return_pickup: '', return_destination: '',
  lead_passenger: user?.role === 'customer' ? user.name : '', contact_phone: user?.role === 'customer' ? user.phone || '' : '',
  passenger_count: 1, passenger_names: '', luggage_large: 0, luggage_small: 0, child_seats: 0,
  accessibility_needs: '', special_instructions: '', sensitive_notes: '', preferred_category: '',
});

const STEPS = [
  { key: 'where', title: 'Where to?', icon: MapPin, fields: ['journey_type', 'pickup', 'destination'] },
  { key: 'when', title: 'When?', icon: Clock, fields: ['pickup_at', 'flight_number', 'duration_hours', 'return_pickup_at'] },
  { key: 'who', title: 'Who is travelling?', icon: Users, fields: ['lead_passenger', 'contact_phone', 'passenger_count'] },
  { key: 'extras', title: 'Final touches', icon: Briefcase, fields: [] },
];

const shortPlace = (t) => String(t || '').split(',')[0];
const whenLabel = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Count from 0 to `to` once, with an ease-out. */
function CountUp({ to, decimals = 0, ms = 900 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setV(to * (1 - (1 - t) ** 3));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return <>{v.toFixed(decimals)}</>;
}

/** Mini route card: a stylised route line draws itself, then distance and drive time count up. */
function RoutePreview({ from, to, onRoute }) {
  // Shows only once a real route is found, and keeps the last good route on screen while
  // the addresses are being edited — so the card never flashes in and disappears.
  const [route, setRoute] = useState(null);
  const [shownFor, setShownFor] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!from || !to || from.length < 5 || to.length < 5) { setRoute(null); setShownFor(null); return undefined; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/places/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        .then((r) => { if (!cancelled && r) { setRoute(r); setShownFor(`${from}|${to}`); onRoute?.(r); } })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 700);
    return () => { cancelled = true; clearTimeout(t); };
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!route) return null;
  const mi = route ? route.distance_m / 1609.344 : 0;
  const mins = route ? Math.round(route.duration_s / 60) : 0;
  return (
    <div className="route-card relative mt-4 overflow-hidden rounded-2xl bg-[#0f0f11] p-4 text-white">
      <svg key={shownFor} viewBox="0 0 320 110" className="h-[110px] w-full" aria-hidden>
        <defs>
          <linearGradient id="rp-line" x1="0" x2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#FF710F" /></linearGradient>
          <pattern id="rp-grid" width="16" height="16" patternUnits="userSpaceOnUse"><path d="M16 0H0V16" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" /></pattern>
        </defs>
        <rect width="320" height="110" fill="url(#rp-grid)" />
        <path d="M24 82 C 80 82, 90 30, 150 44 S 230 92, 296 28" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="6" strokeLinecap="round" />
        {route && <path className="route-draw" d="M24 82 C 80 82, 90 30, 150 44 S 230 92, 296 28" fill="none" stroke="url(#rp-line)" strokeWidth="4" strokeLinecap="round" pathLength="1" />}
        <circle cx="24" cy="82" r="7" fill="#34d399" /><circle cx="24" cy="82" r="12" fill="#34d399" opacity=".25" className="route-ping" />
        <circle cx="296" cy="28" r="7" fill="#FF710F" className={route ? 'route-pin' : ''} opacity={route ? 1 : 0.4} />
        {route && <circle r="5" fill="#fff" className="route-car"><animateMotion dur="1.4s" fill="freeze" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".4 0 .2 1" path="M24 82 C 80 82, 90 30, 150 44 S 230 92, 296 28" /></circle>}
      </svg>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="min-w-0 text-xs text-white/55">
          <div className="truncate"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />{shortPlace(from)}</div>
          <div className="truncate"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#FF710F]" />{shortPlace(to)}</div>
        </div>
        {!loading || shownFor === `${from}|${to}` ? (
          <div key={shownFor} className="flex-shrink-0 text-right">
            <div className="text-2xl font-extrabold tabular-nums leading-none"><CountUp to={mi} decimals={mi < 10 ? 1 : 0} /> <span className="text-sm font-semibold text-white/60">mi</span></div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-[#FFB692]">≈ <CountUp to={mins} /> min drive</div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-white/60"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-[#FF710F]" />Finding route…</div>
        )}
      </div>
    </div>
  );
}


// ---------- vehicle fit ----------
const caseUnits = (f) => Number(f.luggage_large || 0) + Math.ceil(Number(f.luggage_small || 0) / 2);
const fits = (v, f) => Number(v.seats) >= Number(f.passenger_count || 1) && Number(v.bags) >= caseUnits(f);
/** Smallest vehicle that fits the party (fewest seats, then fewest bags). */
const recommended = (f) => [...VEHICLES].sort((a, b) => a.seats - b.seats || a.bags - b.bags).find((v) => fits(v, f)) || null;

/** Swipeable vehicle cards with seats, luggage and a "fits your party" badge. */
function VehiclePicker({ f, value, onChange }) {
  const rec = recommended(f);
  const pax = Number(f.passenger_count || 1);
  const pick = (cat) => { onChange(cat); haptic(10); };
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold">Choose your vehicle</span>
        <button type="button" onClick={() => pick('')} className={cn('text-xs font-semibold', !value ? 'text-primary' : 'text-muted-foreground')}>{!value ? '✓ ' : ''}Let Encore advise</button>
      </div>
      <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2">
        {VEHICLES.map((v) => {
          const ok = fits(v, f);
          const isRec = rec?.slug === v.slug;
          const selected = value === v.category;
          return (
            <button key={v.slug} type="button" onClick={() => pick(v.category)}
              className={cn('vehicle-card relative w-[210px] flex-shrink-0 snap-start overflow-hidden rounded-2xl bg-[#0b0b0c] p-3 text-left text-white transition-all duration-300',
                selected ? 'ring-[3px] ring-[#FF710F] shadow-[0_12px_30px_rgba(255,113,15,0.35)]' : 'ring-1 ring-black/5',
                !ok && 'opacity-45 grayscale', isRec && !selected && 'vehicle-rec')}>
              {isRec && <span className="absolute right-2 top-2 z-10 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5A1F] px-2 py-0.5 text-[10px] font-bold">Recommended for {pax}</span>}
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#FFB692]">{v.label}</div>
              <div className="truncate text-[15px] font-bold">{v.name.replace('Mercedes-Benz ', '')}</div>
              <div className="relative -mx-3 h-[86px]">
                <Img k={v.card} alt="" className="fade-edges absolute inset-0 h-full w-full object-cover object-[center_55%]" placeholderClassName="h-full w-full !bg-white/5 !border-0" />
              </div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 text-white/80">
                  <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{v.seats}</span>
                  <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{v.bags}</span>
                </span>
                {ok ? <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-bold text-emerald-300">Fits ✓</span> : <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white/60">Too small</span>}
              </div>
              {selected && <span className="pop-in absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#FF710F]"><Check className="h-3.5 w-3.5" /></span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Stepper that draws one icon per unit (seats fill in, cases stack up). */
function IconStepper({ label, value, onChange, min = 0, max = 60, icon: I, shake, hint }) {
  const shown = Math.min(value, 8);
  return (
    <div className={cn('rounded-2xl border bg-white p-3 shadow-sm', shake && 'fx-shake border-amber-300')}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} className="grid h-8 w-8 place-items-center rounded-full bg-neutral-100 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
          <span key={value} className="pop-in w-7 text-center text-lg font-bold tabular-nums">{value}</span>
          <button type="button" aria-label={`More ${label}`} disabled={value >= max} onClick={() => { onChange(Math.min(max, value + 1)); haptic(8); }} className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white disabled:opacity-30"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="flex min-h-[26px] flex-wrap items-end gap-1">
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className="unit-pop grid h-6 w-6 place-items-center rounded-md bg-orange-50 text-[#FF710F]" style={{ animationDelay: `${i === shown - 1 ? 0 : 0}ms` }}><I className="h-4 w-4" /></span>
        ))}
        {value > 8 && <span className="text-xs font-semibold text-muted-foreground">+{value - 8}</span>}
        {!value && <span className="text-xs text-muted-foreground">None</span>}
      </div>
      {hint && <div className="mt-2 text-xs font-semibold text-amber-700">{hint}</div>}
    </div>
  );
}

// ---------- smart time ----------
const localIso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function quickTimes() {
  const now = new Date();
  const tonight = new Date(now); tonight.setHours(19, 0, 0, 0);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  const list = [];
  if (tonight.getTime() - now.getTime() > 2 * 3600000) list.push(['Tonight 7pm', localIso(tonight)]);
  list.push(['Tomorrow 9am', localIso(tomorrow)]);
  const weekend = new Date(now); weekend.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7)); weekend.setHours(10, 0, 0, 0);
  list.push(['Saturday 10am', localIso(weekend)]);
  return list;
}

/** Thin road with a car that drives forward as steps are completed. */
function RoadProgress({ step, onJump, maxReached }) {
  const pct = (step / (STEPS.length - 1)) * 100;
  return (
    <div className="mb-4 px-1">
      <div className="relative h-8">
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200 [background-image:repeating-linear-gradient(90deg,transparent_0_10px,rgba(255,255,255,.9)_10px_16px)]" />
        <div className="road-fill absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5A1F]" style={{ width: `${pct}%` }} />
        <div className="road-car absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${pct}%` }}>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-white shadow-[0_6px_16px_rgba(0,0,0,.25)] ring-2 ring-white"><Car className="h-4 w-4" /></span>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-4 text-center text-[11px] font-semibold">
        {STEPS.map((st, i) => (
          <button key={st.key} type="button" disabled={i > maxReached} onClick={() => onJump(i)}
            className={cn('transition-colors', i === step ? 'text-ink' : i <= maxReached ? 'text-primary' : 'text-muted-foreground/60')}>
            {['Where', 'When', 'Who', 'Extras'][i]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Journey request as a 4-step builder (CUS-2). Same fields and payload as before. */
export function RequestForm({ initial, onSubmit, submitting, fields = {}, submitLabel = 'Send request', beforeSections }) {
  const { data: s } = usePublicSettings();
  const [f, setF] = useState(initial);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [dir, setDir] = useState(1);
  const [local, setLocal] = useState({});
  const [routeInfo, setRouteInfo] = useState(null);
  const [flight, setFlight] = useState({ dir: '', time: '' }); // airport: arriving / departing + flight time
  const quick = useMemo(quickTimes, []);
  const applyFlight = (next) => {
    const fl = { ...flight, ...next };
    setFlight(fl);
    if (!fl.dir || !fl.time) return;
    const t = new Date(fl.time).getTime();
    const drive = Math.ceil((routeInfo?.duration_s || 3600) / 60 / 5) * 5; // minutes, rounded up to 5
    // Arriving: collect 30 min after landing (bags, passport control). Departing: arrive 2 h before take-off.
    const pickup = fl.dir === 'arriving' ? t + 30 * 60000 : t - (120 + drive) * 60000;
    set('pickup_at', localIso(new Date(pickup)));
    haptic(12);
  };
  const largest = [...VEHICLES].sort((a, b) => b.seats - a.seats)[0];
  const chosen = VEHICLES.find((v) => v.category === f.preferred_category);
  const overSeats = chosen && Number(f.passenger_count) > Number(chosen.seats);
  const overBags = chosen && caseUnits(f) > Number(chosen.bags);
  const upgradeTo = (overSeats || overBags) ? (recommended(f) || largest) : null;
  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setLocal((e) => (e[k] ? { ...e, [k]: undefined } : e)); };
  const err = (k) => local[k] || fields[k];
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => set(k, e.target.value), invalid: !!err(k) });
  const addr = (k) => ({ value: f[k] ?? '', onChange: (v) => set(k, v), invalid: !!err(k) });
  const isReturn = f.journey_type === 'return' || f.is_return;
  const [locating, setLocating] = useState(false);
  const useMyLocation = () => {
    setLocating(true);
    locate().then((p) => set('pickup', p.text)).catch((e) => toast.error(e.message)).finally(() => setLocating(false));
  };
  const bf = s?.booking_fields || {};
  const on = (k) => bf[k] !== false; // fields management can switch off in Settings
  const notice = Number(s?.min_notice_hours || 0);
  const minHire = Number(s?.hourly_min_hours || 0);
  const minDate = toLocalInput(new Date(Date.now() + Math.max(15, notice * 60) * 60000));

  // Server-side errors: jump back to the first step that has one.
  useEffect(() => {
    const keys = Object.keys(fields || {});
    if (!keys.length) return;
    const i = STEPS.findIndex((st) => st.fields.some((k) => keys.includes(k)));
    if (i >= 0) { setDir(-1); setStep(i); }
  }, [fields]);

  const checkStep = (i) => {
    const e = {};
    if (i === 0) {
      if (!f.pickup?.trim()) e.pickup = 'Where should we collect you?';
      if (f.journey_type !== 'hourly' && !f.destination?.trim()) e.destination = 'Where are you going?';
    }
    if (i === 1) {
      if (!f.pickup_at) e.pickup_at = 'Choose a pickup date and time.';
      if (f.journey_type === 'airport' && s?.flight_number_required && on('flight_number') && !f.flight_number?.trim()) e.flight_number = 'Flight number is required.';
      if (f.journey_type === 'hourly' && !(Number(f.duration_hours) > 0)) e.duration_hours = 'How many hours?';
      if (isReturn && !f.return_pickup_at) e.return_pickup_at = 'Choose the return pickup time.';
    }
    if (i === 2) {
      if (!f.lead_passenger?.trim()) e.lead_passenger = 'Who is the lead passenger?';
      if (!f.contact_phone?.trim()) e.contact_phone = 'A mobile number for the day.';
    }
    setLocal(e);
    return !Object.keys(e).length;
  };
  const go = (i) => {
    if (i > step && !checkStep(step)) return;
    setDir(i > step ? 1 : -1);
    setStep(i);
    setMaxReached((m) => Math.max(m, i));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) return go(step + 1);
    for (let i = 0; i < STEPS.length - 1; i++) if (!checkStep(i)) { setDir(-1); setStep(i); return undefined; }
    onSubmit({
      ...f,
      is_return: isReturn,
      pickup_at: f.pickup_at ? new Date(f.pickup_at).toISOString() : '',
      return_pickup_at: isReturn && f.return_pickup_at ? new Date(f.return_pickup_at).toISOString() : '',
      stops: f.stops.filter((x) => x.trim()),
    });
    return undefined;
  };

  // Swipe left/right between steps.
  const touch = useRef(null);
  const onTouchStart = (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    if (e.target.closest('input, textarea, select, [role="listbox"]')) return;
    if (dx < 0 && step < STEPS.length - 1) go(step + 1);
    if (dx > 0 && step > 0) go(step - 1);
  };

  const bags = Number(f.luggage_large) + Number(f.luggage_small);
  const suggestBigger = (Number(f.passenger_count) <= 3 && Number(f.luggage_large) >= 3) || bags >= 5;

  const summaries = [
    `${JOURNEY_TYPES[f.journey_type]} · ${shortPlace(f.pickup)} → ${f.journey_type === 'hourly' && !f.destination ? 'As directed' : shortPlace(f.destination)}`,
    `${whenLabel(f.pickup_at)}${f.journey_type === 'hourly' ? ` · ${f.duration_hours}h` : ''}${isReturn && f.return_pickup_at ? ` · return ${whenLabel(f.return_pickup_at)}` : ''}${f.flight_number ? ` · ${f.flight_number}` : ''}`,
    `${f.lead_passenger} · ${f.passenger_count} passenger${Number(f.passenger_count) === 1 ? '' : 's'}`,
  ];

  const panes = [
    <div key="where" className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(JOURNEY_TYPES).map(([k, label]) => {
          const Icon = TYPE_ICONS[k];
          return (
            <button type="button" key={k} onClick={() => set('journey_type', k)}
              className={cn('flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-[12px] font-semibold transition', f.journey_type === k ? 'border-primary bg-orange-50 text-ink ring-2 ring-primary/20' : 'bg-white hover:border-neutral-300')}>
              <Icon className={cn('h-5 w-5', f.journey_type === k ? 'text-primary' : 'text-muted-foreground')} />{label}
            </button>
          );
        })}
      </div>
      <Field label="Pickup address" error={err('pickup')} required>
        <AddressInput placeholder="Search address, station or airport" {...addr('pickup')} />
        <button type="button" disabled={locating} onClick={useMyLocation} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 disabled:opacity-60">
          {locating ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" /> : <LocateFixed className="h-4 w-4" />}Use my current location
        </button>
      </Field>
      {on('stops') && f.stops.map((stop, i) => (
        <div key={i} className="flex items-end gap-2">
          <Field label={`Extra stop ${i + 1}`} className="flex-1"><AddressInput value={stop} onChange={(v) => set('stops', f.stops.map((x, j) => (j === i ? v : x)))} placeholder="Search additional pickup or stop" /></Field>
          <button type="button" className="mb-1 h-9 rounded-lg px-3 text-sm text-muted-foreground hover:bg-surface" onClick={() => set('stops', f.stops.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      {on('stops') && f.stops.length < 5 && <button type="button" onClick={() => set('stops', [...f.stops, ''])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Plus className="h-4 w-4" />Add an extra pickup or stop</button>}
      <Field label={f.journey_type === 'hourly' ? 'Final destination (if known)' : 'Destination'} error={err('destination')} required={f.journey_type !== 'hourly'}>
        <AddressInput placeholder={f.journey_type === 'hourly' ? 'As directed' : 'Search destination address'} {...addr('destination')} />
      </Field>
      <RoutePreview from={f.pickup} to={f.destination} onRoute={setRouteInfo} />
    </div>,

    <div key="when" className="space-y-4">
      {f.journey_type === 'airport' && (
        <div className="rounded-2xl bg-[#0f0f11] p-4 text-white">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><span className={cn('plane-fly inline-block', flight.dir === 'departing' && 'is-up', flight.dir === 'arriving' && 'is-down')}><Plane className="h-5 w-5 text-[#FF710F]" /></span>Arriving or departing?</div>
          <div className="grid grid-cols-2 gap-2">
            {[['arriving', 'Arriving', 'We meet you after landing'], ['departing', 'Departing', 'We get you there on time']].map(([k, l, d]) => (
              <button key={k} type="button" onClick={() => applyFlight({ dir: k })}
                className={cn('rounded-xl px-3 py-2.5 text-left transition', flight.dir === k ? 'bg-[#FF710F] text-white shadow-[0_8px_20px_rgba(255,113,15,0.4)]' : 'bg-white/10 text-white/80')}>
                <div className="text-sm font-bold">{l}</div><div className="text-[11px] opacity-80">{d}</div>
              </button>
            ))}
          </div>
          {flight.dir && (
            <label className="animate-rise mt-3 block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">{flight.dir === 'arriving' ? 'Landing time' : 'Take-off time'}</span>
              <input type="datetime-local" min={minDate} value={flight.time} onChange={(e) => applyFlight({ time: e.target.value })}
                className="mt-1 block h-11 w-full rounded-xl bg-white/10 px-3 text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-[#FF710F]/50" />
            </label>
          )}
          {flight.dir && flight.time && f.pickup_at && (
            <div key={f.pickup_at} className="pop-in mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-white/75">
              Pickup set to <b className="text-white">{whenLabel(f.pickup_at)}</b> — {flight.dir === 'arriving' ? '30 min after landing to collect bags' : `2 h before take-off plus ~${Math.ceil((routeInfo?.duration_s || 3600) / 60 / 5) * 5} min drive`}. You can adjust it below.
            </div>
          )}
        </div>
      )}
      <div>
        <div className="mb-2 text-sm font-semibold">Quick pick</div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {quick.map(([l, v]) => (
            <button key={l} type="button" onClick={() => { set('pickup_at', v); haptic(8); }}
              className={cn('whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition', f.pickup_at === v ? 'bg-ink text-white shadow' : 'bg-neutral-100 text-ink hover:bg-neutral-200')}>{l}</button>
          ))}
        </div>
      </div>
      <Field label="Pickup date and time" error={err('pickup_at')} required hint={notice ? `At least ${notice} hour${notice === 1 ? '' : 's'} ahead — call us for anything sooner` : undefined}><TextInput type="datetime-local" min={minDate} {...bind('pickup_at')} /></Field>
      {f.journey_type === 'airport' && on('flight_number') && <Field label="Flight number" error={err('flight_number')} required={!!s?.flight_number_required} hint={s?.flight_number_required ? 'So we can track your arrival' : 'Optional — helps us track your arrival'}><TextInput placeholder="e.g. BA1427" {...bind('flight_number')} /></Field>}
      {f.journey_type === 'hourly' && <Field label="Hours required" error={err('duration_hours')} required hint={minHire ? `Minimum ${minHire} hours` : undefined}><TextInput type="number" min={minHire || 1} step="0.5" {...bind('duration_hours')} /></Field>}
      {f.journey_type !== 'return' && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-surface px-4 py-3 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-[#FF5A1F]" checked={!!f.is_return} onChange={(e) => set('is_return', e.target.checked)} />
          Add a return journey
        </label>
      )}
      {isReturn && (
        <div className="animate-rise space-y-4 rounded-xl border border-dashed p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><ArrowDown className="h-4 w-4 text-primary" />Return leg</div>
          <Field label="Return pickup date and time" error={err('return_pickup_at')} required><TextInput type="datetime-local" min={f.pickup_at || minDate} {...bind('return_pickup_at')} /></Field>
          <Field label="Return pickup from" hint="Leave blank to use your destination"><AddressInput placeholder={f.destination} {...addr('return_pickup')} /></Field>
          <Field label="Return drop-off" hint="Leave blank to use your pickup"><AddressInput placeholder={f.pickup} {...addr('return_destination')} /></Field>
        </div>
      )}
    </div>,

    <div key="who" className="space-y-4">
      <Field label="Lead passenger" error={err('lead_passenger')} required><TextInput autoComplete="name" {...bind('lead_passenger')} /></Field>
      <Field label="Contact mobile on the day" error={err('contact_phone')} required><TextInput type="tel" placeholder="+44" {...bind('contact_phone')} /></Field>
      <IconStepper label="Passengers" icon={Armchair} value={Number(f.passenger_count)} min={1} onChange={(v) => set('passenger_count', v)}
        shake={overSeats} hint={overSeats ? `Let's upgrade you to the ${upgradeTo.name.replace('Mercedes-Benz ', '')} — it seats ${upgradeTo.seats}.` : null} />
      {on('passenger_names') && <Field label="Other passenger names" hint="Optional"><TextInput {...bind('passenger_names')} /></Field>}
    </div>,

    <div key="extras" className="space-y-4">
      {on('luggage') && (
        <div className="grid grid-cols-2 gap-3">
          <IconStepper label="Large cases" icon={Luggage} value={Number(f.luggage_large)} onChange={(v) => set('luggage_large', v)} shake={overBags} />
          <IconStepper label="Small bags" icon={Briefcase} value={Number(f.luggage_small)} onChange={(v) => set('luggage_small', v)} shake={overBags} />
        </div>
      )}
      {overBags && <div className="fx-shake rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">That's more luggage than the {chosen.name.replace('Mercedes-Benz ', '')} holds — let's upgrade you to the {upgradeTo.name.replace('Mercedes-Benz ', '')}. <button type="button" className="underline" onClick={() => set('preferred_category', upgradeTo.category)}>Switch</button></div>}
      {on('preferred_category') && <VehiclePicker f={f} value={f.preferred_category} onChange={(v) => set('preferred_category', v)} />}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {on('child_seats') && <Field label={<span className="inline-flex items-center gap-1.5"><Baby className="h-4 w-4" />Child seats</span>}><Stepper value={Number(f.child_seats)} max={4} onChange={(v) => set('child_seats', v)} /></Field>}
      </div>
      {on('accessibility_needs') && <Field label={<span className="inline-flex items-center gap-1.5"><Accessibility className="h-4 w-4" />Accessibility needs</span>}><TextInput placeholder="e.g. wheelchair, step assistance" {...bind('accessibility_needs')} /></Field>}
      {suggestBigger && !chosen && <Banner tone="blue">With this much luggage we may recommend a larger vehicle such as an MPV — we will advise when we quote.</Banner>}
      {on('special_instructions') && <Field label="Special instructions" hint="Meet-and-greet, refreshments, preferred route, event details"><TextArea {...bind('special_instructions')} /></Field>}
      {on('sensitive_notes') && <Field label="Private notes for your chauffeur" hint="Shared only with Encore management and your assigned chauffeur"><TextArea rows={2} {...bind('sensitive_notes')} /></Field>}
    </div>,
  ];

  const StepIcon = STEPS[step].icon;
  const last = step === STEPS.length - 1;
  return (
    <form onSubmit={submit} className="space-y-3" noValidate onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {beforeSections}
      <RoadProgress step={step} maxReached={maxReached} onJump={(i) => go(i)} />

      {/* Finished steps collapse into tappable summaries. */}
      {summaries.slice(0, step).map((text, i) => (
        <button key={STEPS[i].key} type="button" onClick={() => go(i)}
          className="step-summary flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition hover:border-primary/40">
          <span className="pop-in grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{text}</span>
          <span className="text-xs font-semibold text-primary">Edit</span>
        </button>
      ))}

      <section key={step} className={cn('rounded-2xl border bg-white p-5 shadow-sm', dir > 0 ? 'step-in-right' : 'step-in-left')}>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white"><StepIcon className="h-4 w-4" /></span>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Step {step + 1} of {STEPS.length}</div>
            <h2 className="font-heading text-lg font-bold leading-tight">{STEPS[step].title}</h2>
          </div>
        </div>
        {panes[step]}
      </section>

      <div className="sticky bottom-28 z-10 sm:bottom-4">
        {last && <p className="mb-2 rounded-2xl bg-white/90 px-3 py-2 text-center text-xs text-muted-foreground shadow-sm backdrop-blur">This is a request, not a confirmed booking — we'll send a tailored quotation.</p>}
        <div className="flex items-center gap-2 rounded-full bg-white/90 p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.14)] ring-1 ring-black/5 backdrop-blur">
          {step > 0 && (
            <button type="button" onClick={() => go(step - 1)} aria-label="Back"
              className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-neutral-100 text-ink transition hover:bg-neutral-200 active:scale-95">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <button type="submit" disabled={last && submitting}
            className="cta-glow group flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF8A3D] via-[#FF710F] to-[#FF5A1F] text-[15px] font-bold tracking-wide text-white disabled:opacity-70">
            {last && submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : last ? <Send className="h-4 w-4" /> : null}
            {last ? submitLabel : 'Continue'}
            {!last && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      </div>
    </form>
  );
}

// ---------- Progress & legs ----------
const FLOW = [
  { key: 'request', label: 'Requested', match: ['pending', 'under_review', 'clarification_needed'] },
  { key: 'quote', label: 'Quotation', match: ['quote_sent', 'change_requested', 'quote_accepted'] },
  { key: 'confirmed', label: 'Confirmed', match: ['confirmed'] },
  { key: 'assigned', label: 'Chauffeur assigned', match: ['driver_assigned'] },
  { key: 'on_the_way', label: 'On the way', match: ['on_the_way'] },
  { key: 'arrived', label: 'Arrived', match: ['arrived'] },
  { key: 'started', label: 'Under way', match: ['started'] },
  { key: 'completed', label: 'Completed', match: ['completed', 'closed'] },
];

export function BookingProgress({ status }) {
  const idx = FLOW.findIndex((s) => s.match.includes(status));
  if (idx < 0) return null;
  return (
    <ol className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
      {FLOW.map((s, i) => (
        <li key={s.key} className="flex shrink-0 items-center gap-1">
          <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            i < idx && 'bg-emerald-50 text-emerald-700', i === idx && 'bg-primary text-white', i > idx && 'bg-neutral-100 text-neutral-400')}>
            {s.label}
          </span>
          {i < FLOW.length - 1 && <span className={cn('h-px w-3', i < idx ? 'bg-emerald-300' : 'bg-neutral-200')} />}
        </li>
      ))}
    </ol>
  );
}

export function LegRoute({ leg, compact }) {
  return (
    <div className={cn('relative pl-6', compact ? 'space-y-1' : 'space-y-3')}>
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-neutral-200" />
      <div className="relative"><span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-[3px] border-primary bg-white" /><div className="text-sm font-medium text-ink">{leg.pickup}</div></div>
      {(leg.stops || []).map((s, i) => (
        <div key={i} className="relative"><span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-neutral-400" /><div className="text-sm text-muted-foreground">via {s}</div></div>
      ))}
      <div className="relative"><span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-[4px] bg-ink" /><div className="text-sm font-medium text-ink">{leg.destination}</div></div>
    </div>
  );
}

export function LegTimes({ leg }) {
  const items = [['on_the_way_at', 'On the way'], ['arrived_at', 'Arrived'], ['started_at', 'Started'], ['completed_at', 'Completed']].filter(([k]) => leg[k]);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([k, l]) => <span key={k}><span className="font-semibold text-ink">{l}</span> {shortDateTime(leg[k])}</span>)}
    </div>
  );
}

export { LEG_STATUS, dateTime };

export function MessageThread({ messages, onSend, sending, placeholder = 'Write a message…', viewerRole }) {
  const [text, setText] = useState('');
  const kindLabel = { clarification_request: 'Clarification requested', quote_change: 'Change requested', quote_decline: 'Declined', quote_accept: 'Accepted' };
  return (
    <div>
      <div className="space-y-3">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        {messages.map((m) => {
          const mine = viewerRole === 'admin' ? m.author_role === 'admin' : m.author_role !== 'admin';
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm', mine ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-surface text-ink')}>
                {kindLabel[m.kind] && <div className={cn('mb-1 text-[10px] font-bold uppercase tracking-wider', mine ? 'text-primary' : 'text-primary')}>{kindLabel[m.kind]}</div>}
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className={cn('mt-1 text-[10px]', mine ? 'text-white/50' : 'text-muted-foreground')}>{m.author_role === 'admin' ? 'Encore Executive' : m.author_name} · {shortDateTime(m.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
      {onSend && (
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onSend(text.trim(), () => setText('')); }}>
          <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
          <PrimaryButton type="submit" loading={sending} className="shrink-0 px-4" aria-label="Send"><Send className="h-4 w-4" /></PrimaryButton>
        </form>
      )}
    </div>
  );
}
