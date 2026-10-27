import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AMENITIES, CHIPS, ITINERARIES, ONBOARDING, VEHICLES } from '@/lib/showcase';
import { gbp, shortDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/common';
import { Icon, Img, useUnread } from '@/components/app-ui';
import { AddressInput } from '@/components/address';
import { useCurrentLocation } from '@/lib/location';

// ======================= Welcome (Lovable screen 1) =======================
export function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [slide, setSlide] = useState(0);
  const touch = useRef(null);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % ONBOARDING.length), 5000);
    return () => clearInterval(t);
  }, []);
  if (user) return <Navigate to="/" replace />;
  const s = ONBOARDING[slide];
  return (
    <div className="min-h-screen bg-[#ECEDEF]">
      <div className="encore-app relative mx-auto min-h-screen w-full max-w-[480px] overflow-hidden !bg-on-secondary-fixed">
        <main className="relative flex w-full flex-col"
          onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
            if (dx < -40) setSlide((v) => Math.min(ONBOARDING.length - 1, v + 1));
            if (dx > 40) setSlide((v) => Math.max(0, v - 1));
          }}>
          <div className="relative flex min-h-screen w-full select-none flex-col overflow-hidden bg-on-secondary-fixed pb-8 text-surface">
            <div className="pointer-events-none absolute left-1/2 top-[400px] h-40 w-80 -translate-x-1/2 rounded-full bg-primary-container opacity-35 blur-3xl" />
            <div className="relative h-[490px] w-full">
              <div className="fade-bottom absolute inset-0 overflow-hidden">
                {ONBOARDING.map((o, i) => (
                  <Img key={o.image} k={o.image} alt={i === slide ? 'Encore chauffeur car' : ''}
                    className={cn('absolute inset-0 h-full w-full object-cover object-center', i === slide ? 'scale-105 opacity-100' : 'scale-100 opacity-0')}
                    style={{ transition: i === slide ? 'opacity 1.2s ease-in-out, transform 6s ease-out' : 'opacity 1.2s ease-in-out, transform 0s 1.2s' }}
                    placeholderClassName="absolute inset-0 h-full w-full !bg-white/5 !text-white/50 !border-white/20" />
                ))}
              </div>
              <div className="fade-bottom absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent" />
              <div className="absolute left-0 right-0 top-0 z-10 flex flex-col items-center justify-center px-margin pt-4 safe-top">
                <div className="mb-4 flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-inverse-surface/80 px-3 py-1 text-body-sm font-label-md text-white backdrop-blur-md">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary-container" />Staffordshire · UK-wide
                  </span>
                  <Link to="/login" className="rounded-full px-3 py-1.5 text-label-md font-label-md tracking-wider text-white/70 transition-colors hover:bg-white/10 hover:text-white">Skip</Link>
                </div>
                <div className="flex flex-col items-center">
                  <Img k="logo" alt="Encore Chauffeurs" className="mb-2.5 h-14 w-14 object-contain drop-shadow-[0_8px_18px_rgba(255,113,15,0.45)]" placeholderClassName="mb-2.5 h-14 w-14 rounded-2xl" />
                  <div className="text-center font-headline-sm text-body-lg font-bold uppercase tracking-[0.22em] text-white">Encore Chauffeurs</div>
                  <div className="mt-0.5 text-label-sm font-label-sm uppercase tracking-[0.35em] text-primary-fixed-dim opacity-90">Luxury Travel</div>
                </div>
              </div>
            </div>

            <div className="z-20 -mt-[30px] flex flex-col px-margin">
              <div key={slide} className="space-y-3 animate-[fade-in_0.9s_ease-out]">
                <h1 className="font-headline-lg text-headline-lg leading-[1.15] tracking-tight text-white">
                  {s.line1}<br /><span className="text-primary-container drop-shadow-sm">{s.line2}</span>
                </h1>
                <p className="max-w-sm text-body-md font-body-md leading-relaxed text-secondary-fixed">{s.text}</p>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 rounded-[1.5rem] bg-inverse-surface/60 p-3 backdrop-blur-md">
                {[['verified_user', 'Vetted Drivers', 'Licensed'], ['support_agent', 'Personal Service', 'Reviewed by us'], ['schedule', '24/7', 'UK-wide']].map(([icon, t, sub]) => (
                  <div key={t} className="flex flex-col items-center text-center">
                    <Icon name={icon} className="mb-1 !text-[18px] text-primary-container" />
                    <span className="text-label-sm font-label-sm text-white">{t}</span>
                    <span className="text-body-sm font-body-sm text-secondary-fixed-dim">{sub}</span>
                  </div>
                ))}
              </div>

              <div className="mb-5 mt-8 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ONBOARDING.map((_, i) => (
                    <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)}
                      className={cn('h-2 rounded-full transition-all duration-300', i === slide ? 'w-8 bg-primary-container' : 'w-2 bg-surface-variant/40 hover:bg-surface-variant')} />
                  ))}
                </div>
                <span className="flex items-center gap-1 text-label-sm font-label-sm uppercase tracking-wider text-secondary-fixed">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-container" />First Class Only
                </span>
              </div>

              <button onClick={() => nav('/login')} className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-primary-container via-button-mid to-tertiary-container px-6 py-4 font-headline-sm text-headline-sm text-on-primary shadow-xl shadow-primary/30 transition-all duration-300 active:scale-[0.98]">
                <span className="tracking-wide">Get Started</span>
                <Icon name="arrow_forward" className="!text-[22px] transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>
              <div className="mt-4 text-center">
                <Link to="/book" className="py-1 text-label-md font-label-md tracking-wide text-secondary-fixed transition-colors hover:text-white">Book a journey without signing in →</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ======================= Home (Lovable screen 2) =======================
function FleetCard({ v, onBook }) {
  return (
    <article className="relative flex w-[84%] max-w-[340px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-[2rem] bg-[#050505] text-inverse-on-surface shadow-[0_16px_36px_var(--encore-shadow-0-18)]">
      <div className={cn('pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br to-transparent blur-2xl', v.glow)} />
      <Link to={`/app/fleet/${v.slug}`} className="relative z-10 flex flex-col gap-space-xs p-space-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block truncate text-label-sm font-label-sm font-extrabold uppercase tracking-wider text-primary-fixed">{v.label}</span>
            <h3 className="line-clamp-2 min-h-[2lh] font-headline-md text-headline-md font-extrabold tracking-tight text-inverse-on-surface">{v.name}</h3>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-surface-container-highest/20 px-2.5 py-1 text-white backdrop-blur-md">
            <Icon name="group" className="!text-[15px] text-primary-container" />
            <span className="text-label-md font-label-md font-bold">{v.seats}</span>
          </div>
        </div>
        <p className="line-clamp-1 text-body-sm font-body-sm text-white/80">{v.summary}</p>
      </Link>
      <Link to={`/app/fleet/${v.slug}`} className="relative -mt-1 block h-[190px] w-full overflow-hidden">
        <Img k={v.card} alt={v.name} className="fade-edges absolute inset-0 h-full w-full object-cover object-[center_52%]" placeholderClassName="mx-auto h-full w-4/5 rounded-2xl !bg-white/5 !text-white/50 !border-white/20" />
        <div className="pointer-events-none absolute bottom-2 left-1/2 h-8 w-3/4 -translate-x-1/2 rounded-full bg-primary-container/25 blur-xl" />
      </Link>
      <div className="relative z-10 -mt-3 flex items-end justify-between p-space-lg pt-0">
        <div>
          <span className="block text-label-sm font-label-sm text-white/75">Pricing</span>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-md text-headline-md font-black text-white">Tailored</span>
            <span className="text-label-sm font-label-sm text-secondary-fixed">quote</span>
          </div>
        </div>
        <button onClick={onBook} className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-primary-container to-button-end px-5 py-3 text-label-md font-label-md font-bold text-on-primary shadow-[0_8px_20px_var(--encore-orange-shadow-0-4)] transition-all hover:brightness-110 active:scale-95">
          Book Now <Icon name="arrow_forward" className="!text-[16px]" />
        </button>
      </div>
    </article>
  );
}


const TRIP_TYPES = [['point_to_point', 'One way', 'east'], ['return', 'Return', 'sync_alt'], ['airport', 'Airport', 'flight'], ['hourly', 'By the hour', 'schedule']];
const localInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function whenOptions() {
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 3600000); soon.setMinutes(soon.getMinutes() < 30 ? 30 : 60, 0, 0);
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1); tomorrow.setHours(9, 0, 0, 0);
  const evening = new Date(now); evening.setHours(19, 0, 0, 0);
  const opts = [['Later today', soon]];
  if (evening > soon) opts.push(['This evening', evening]);
  opts.push(['Tomorrow 9am', tomorrow]);
  return opts.map(([l, d]) => [l, localInput(d)]);
}

/** Appears after the customer picks a destination: choose trip type and time, then continue. */
function TripSheet({ place, here, onClose, onGo }) {
  const [type, setType] = useState(place.airport ? 'airport' : 'point_to_point');
  const [when, setWhen] = useState('');
  const [pickup, setPickup] = useState(here.place?.text || '');
  const [editing, setEditing] = useState(false);
  const opts = useMemo(whenOptions, []);
  const isHere = !!here.place && pickup === here.place.text;
  // Fill in the current location when it arrives, unless the customer already chose a pickup.
  useEffect(() => { if (here.place && !pickup && !editing) setPickup(here.place.text); }, [here.place, pickup, editing]);
  return (
    <div className="animate-rise mt-3 rounded-[2rem] bg-surface-container-lowest p-4 shadow-[0_16px_40px_var(--encore-shadow-0-06)] ring-1 ring-black/5">
      <div className="relative">
        <span className="absolute bottom-[34px] left-[21px] top-[34px] w-0.5 rounded-full bg-gradient-to-b from-emerald-400 to-primary-container" />
        <div className="flex items-start gap-3">
          <span className="pop-in grid h-11 w-11 flex-shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Icon name={isHere ? 'my_location' : 'trip_origin'} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-label-sm font-label-sm uppercase tracking-wider text-secondary">
              Pickup{isHere && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-emerald-700">Current location</span>}
            </div>
            {editing ? (
              <AddressInput autoFocus value={pickup} onChange={setPickup} onSelect={(it) => { setPickup(it.text); setEditing(false); }} placeholder="Search pickup address"
                inputClassName="mt-1 w-full rounded-xl bg-surface-container px-3 py-2 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/30" />
            ) : here.status === 'loading' && !pickup ? (
              <div className="mt-1 flex items-center gap-2 text-body-md text-secondary"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-neutral-300 border-t-[#FF710F]" />Finding your location…</div>
            ) : (
              <button type="button" onClick={() => setEditing(true)} className="block w-full truncate text-left text-body-lg font-bold text-on-surface">{pickup || <span className="font-semibold text-primary">Add pickup address</span>}</button>
            )}
            {!editing && here.status === 'error' && !pickup && <div className="text-body-sm text-secondary">{here.error}</div>}
          </div>
          {!editing && !isHere && (
            <button type="button" onClick={() => (here.place ? setPickup(here.place.text) : here.fetchNow().then((p) => p && setPickup(p.text)))} aria-label="Use my current location" className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-surface-container text-emerald-600"><Icon name="my_location" className="!text-[18px]" /></button>
          )}
        </div>
        <div className="mt-4 flex items-start gap-3">
          <span className={cn('pop-in grid h-11 w-11 flex-shrink-0 place-items-center rounded-full', place.airport ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface')}><Icon name={place.airport ? 'flight' : 'location_on'} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-label-sm font-label-sm uppercase tracking-wider text-secondary">Going to</div>
            <div className="truncate text-body-lg font-bold text-on-surface">{place.main}</div>
            {place.secondary && <div className="truncate text-body-sm text-secondary">{place.secondary}</div>}
          </div>
          <button type="button" onClick={onClose} aria-label="Clear destination" className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-surface-container text-secondary"><Icon name="close" className="!text-[18px]" /></button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {TRIP_TYPES.map(([k, l, icon]) => (
          <button key={k} type="button" onClick={() => setType(k)} className={cn('flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[11px] font-bold transition', type === k ? 'bg-primary-container text-on-primary shadow-[0_8px_20px_var(--encore-orange-shadow-0-15)]' : 'bg-surface-container text-on-surface')}>
            <Icon name={icon} className="!text-[20px]" />{l}
          </button>
        ))}
      </div>
      <div className="mt-4 text-label-sm font-label-sm uppercase tracking-wider text-secondary">When?</div>
      <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
        {opts.map(([l, v]) => (
          <button key={l} type="button" onClick={() => setWhen(v)} className={cn('whitespace-nowrap rounded-full px-3.5 py-2 text-body-sm font-semibold transition', when === v ? 'bg-on-surface text-surface' : 'bg-surface-container text-on-surface')}>{l}</button>
        ))}
        <label className={cn('relative flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full px-3.5 py-2 text-body-sm font-semibold', when && !opts.some(([, v]) => v === when) ? 'bg-on-surface text-surface' : 'bg-surface-container text-on-surface')}>
          <Icon name="calendar_month" className="!text-[16px]" />Pick date
          <input type="datetime-local" className="absolute inset-0 opacity-0" min={localInput(new Date())} onChange={(e) => setWhen(e.target.value)} />
        </label>
      </div>
      <button type="button" onClick={() => onGo({ type, when, pickup })} className="cta-glow mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-container to-button-end py-3.5 font-headline-sm text-headline-sm text-on-primary">
        Continue booking<Icon name="arrow_forward" className="!text-[20px]" />
      </button>
    </div>
  );
}


/** Home header: scrolls away with the page; the search bar below it is the only pinned element. */
function HomeHero({ user, here }) {
  const unread = useUnread();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const where = here.place?.secondary?.split(',').slice(-1)[0]?.replace(/\s[A-Z]{1,2}\d.*$/, '') || user.organisation?.name || 'Staffordshire · UK-wide';
  return (
    <section className="relative overflow-hidden rounded-b-[2.5rem] bg-[#0b0b0c] px-margin pb-16 text-white safe-top">
      <Img k="hero" alt="" className="hero-drift absolute inset-0 h-full w-full object-cover opacity-35" placeholderClassName="absolute inset-0 h-full w-full !bg-transparent !border-0 !text-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0b0b0c]" />
      <div className="hero-orb pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary-container/40 blur-3xl" />
      <div className="relative flex items-center justify-between pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Img k="logo" alt="Encore" className="h-9 w-9 flex-shrink-0 object-contain drop-shadow-[0_6px_16px_rgba(255,113,15,0.5)]" placeholderClassName="h-9 w-9 rounded-full" />
          <span className="flex min-w-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-md">
            <Icon name={here.place ? 'near_me' : 'location_on'} className="!text-[14px] text-primary-container" /><span className="truncate">{where}</span>
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Link to="/app/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 backdrop-blur-md transition hover:bg-white/20">
            <Icon name="notifications" className="!text-[20px]" />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-container px-1 text-[10px] font-bold ring-2 ring-[#0b0b0c]">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <Link to="/app/account" aria-label="Profile" className="rounded-full bg-gradient-to-br from-primary-container to-button-end p-[2px]">
            <Img k="profile" alt="" className="h-9 w-9 rounded-full object-cover" placeholderClassName="h-9 w-9 rounded-full" />
          </Link>
        </div>
      </div>
      <div className="relative mt-7">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-primary-fixed-dim ring-1 ring-primary-container/30">
          <Icon name="verified" className="!text-[12px]" />{user.organisation ? 'CORPORATE ACCOUNT' : 'PRIVATE CLIENT'}
        </span>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight">{greeting},<br /><span className="text-gradient-brand">{user.name.split(' ')[0]}</span></h1>
        <p className="mt-1 text-body-md text-white/65">Where would you like to travel today?</p>
      </div>
    </section>
  );
}

export function AppHome() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [chip, setChip] = useState('all');
  const [dest, setDest] = useState('');
  const [place, setPlace] = useState(null);
  const here = useCurrentLocation({ auto: true });
  const sentinel = useRef(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const { data: bookings = [] } = useQuery({ queryKey: ['bookings', 'upcoming'], queryFn: () => api.get('/bookings?view=upcoming&sort=pickup'), refetchInterval: 10000 });
  const attention = bookings.filter((b) => ['quote_sent', 'clarification_needed'].includes(b.status));
  const request = (params = {}) => {
    const p = new URLSearchParams(params);
    if (!p.get('type') && chip !== 'all') p.set('type', chip);
    if (dest.trim()) p.set('destination', dest.trim());
    nav(`/app/request?${p}`);
  };
  const itineraries = chip === 'all' ? ITINERARIES : ITINERARIES.filter((i) => i.type === chip);

  return (
    <div className="stagger -mx-margin -mt-space-sm flex flex-col">
      <HomeHero user={user} here={here} />

      {/* Only the destination search stays pinned while scrolling. */}
      <div ref={sentinel} className="h-px" />
      <section className={cn('sticky top-0 z-40 -mt-9 px-margin pb-space-xs pt-space-xs transition-all duration-300', stuck && 'sticky-fade safe-top')}>
        <form onSubmit={(e) => { e.preventDefault(); request(); }} className={cn('flex w-full items-center gap-space-xs rounded-full bg-surface-container-lowest p-2 ring-1 ring-black/5 transition-all duration-300 focus-within:shadow-[0_12px_32px_var(--encore-orange-shadow-0-15)] focus-within:ring-primary-container/40', stuck ? '!bg-white/45 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] ring-white/60 backdrop-blur-2xl backdrop-saturate-150' : 'shadow-[0_18px_40px_rgba(0,0,0,0.18)]')}>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-button-end text-white shadow-[0_6px_14px_var(--encore-orange-shadow-0-35)]"><Icon name="search" className="!text-[20px]" /></div>
          <AddressInput value={dest} onChange={(v) => { setDest(v); if (place && v !== place.text) setPlace(null); }} onSelect={setPlace} placeholder="Where to?" className="min-w-0 flex-1" inputClassName="w-full min-w-0 bg-transparent px-1 py-2 text-body-lg font-semibold text-on-surface placeholder:font-medium placeholder:text-secondary focus:outline-none" />
          <button type="submit" aria-label="Continue" className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high"><Icon name="arrow_forward" className="!text-[18px]" /></button>
        </form>
        {place && <TripSheet place={place} onClose={() => { setPlace(null); setDest(''); }} here={here} onGo={({ type, when, pickup }) => request({ type, ...(when ? { when } : {}), ...(pickup ? { pickup } : {}) })} />}
      </section>

      <section className="pb-space-xs pt-space-md">
        <div className="no-scrollbar flex items-center gap-space-xs overflow-x-auto scroll-smooth px-margin">
          {CHIPS.map((c) => (
            <button key={c.key} onClick={() => setChip(c.key)}
              className={cn('flex flex-shrink-0 items-center gap-1.5 rounded-full py-2.5 text-label-md font-label-md transition-all active:scale-95',
                chip === c.key ? 'bg-primary-container px-5 text-on-primary shadow-[0_6px_16px_var(--encore-orange-shadow-0-32)]' : 'bg-surface-container-lowest px-4 text-secondary shadow-[0_2px_8px_var(--encore-shadow-0-04)] hover:text-on-surface')}>
              <Icon name={c.icon} className="!text-[16px]" />{c.label}
            </button>
          ))}
        </div>
      </section>

      {attention.length > 0 && (
        <section className="flex flex-col gap-space-sm px-margin pt-space-md">
          {attention.map((b) => (
            <Link key={b.id} to={`/app/bookings/${b.id}`} className="flex items-center gap-space-md rounded-[2rem] bg-inverse-surface p-space-md text-inverse-on-surface shadow-[0_10px_26px_var(--encore-shadow-0-18)]">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary"><Icon name={b.status === 'quote_sent' ? 'request_quote' : 'help'} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-label-lg font-label-lg">{b.status === 'quote_sent' ? `Your quotation is ready${b.total ? ` · ${gbp(b.total)}` : ''}` : 'We need a few more details'}</div>
                <div className="truncate text-body-sm font-body-sm text-secondary-fixed">{b.ref} · {shortDateTime(b.first_pickup)}</div>
              </div>
              <Icon name="chevron_right" />
            </Link>
          ))}
        </section>
      )}

      <section className="pt-space-md">
        <div className="mb-space-sm flex items-center justify-between px-margin">
          <div className="flex items-center gap-2">
            <h2 className="section-title font-headline-sm text-headline-sm tracking-tight text-on-surface">Featured Fleet</h2>
            <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-label-sm font-label-sm text-on-tertiary-fixed">Company owned</span>
          </div>
          <Link to="/app/fleet" className="flex items-center text-label-md font-label-md font-bold text-primary hover:text-primary-container">View All<Icon name="chevron_right" className="!text-[18px]" /></Link>
        </div>
        <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-margin gap-space-md overflow-x-auto px-margin pb-space-sm">
          {VEHICLES.map((v) => <FleetCard key={v.slug} v={v} onBook={() => request({ category: v.category })} />)}
        </div>
      </section>

      <section className="px-margin pb-space-sm pt-space-xs">
        <div className="grid grid-cols-4 gap-2 rounded-[2rem] bg-surface-container-lowest p-3 shadow-[0_6px_20px_var(--encore-shadow-0-04)]">
          {[['wifi', 'Wi-Fi'], ['water_bottle', 'Water'], ['luggage', 'Luggage help'], ['shield', 'Discreet Pro']].map(([icon, t]) => (
            <div key={t} className="flex flex-col items-center gap-1 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container text-on-surface"><Icon name={icon} className="!text-[18px]" /></div>
              <span className="text-label-sm font-label-sm text-secondary">{t}</span>
            </div>
          ))}
        </div>
      </section>

      {bookings.length > 0 && (
        <section className="flex flex-col gap-space-sm px-margin pt-space-xs">
          <div className="flex items-center justify-between">
            <h2 className="section-title font-headline-sm text-headline-sm tracking-tight text-on-surface">Upcoming Journeys</h2>
            <Link to="/app/bookings" className="text-label-sm font-label-sm text-primary">See all</Link>
          </div>
          {bookings.slice(0, 3).map((b) => (
            <Link key={b.id} to={`/app/bookings/${b.id}`} className="flex w-full items-center justify-between gap-space-sm rounded-[2rem] bg-surface-container-lowest p-space-md shadow-[0_8px_24px_var(--encore-shadow-0-05)] transition-transform active:scale-[0.99]">
              <div className="flex min-w-0 items-center gap-space-md">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant"><Icon name="event" /></div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-headline-sm text-headline-sm font-bold text-on-surface">{shortDateTime(b.first_pickup)}</span>
                  <span className="truncate text-body-sm font-body-sm text-secondary">{b.pickup} → {b.destination}</span>
                  <StatusBadge status={b.status} className="mt-1.5 self-start" />
                </div>
              </div>
              <Icon name="chevron_right" className="flex-shrink-0 text-secondary" />
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-space-sm px-margin pb-space-lg pt-space-md">
        <div className="flex items-center justify-between">
          <h2 className="section-title font-headline-sm text-headline-sm tracking-tight text-on-surface">Express Travel</h2>
          <span className="text-label-sm font-label-sm text-secondary">Tailored quotes</span>
        </div>
        {itineraries.map((it) => (
          <button key={it.type} onClick={() => request({ type: it.type })} className="flex w-full items-center justify-between gap-space-sm rounded-[2rem] bg-surface-container-lowest p-space-md text-left shadow-[0_8px_24px_var(--encore-shadow-0-05)] transition-transform hover:shadow-md active:scale-[0.99]">
            <div className="flex min-w-0 items-center gap-space-md">
              <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full', it.tone)}><Icon name={it.icon} className="!text-[24px]" /></div>
              <div className="flex min-w-0 flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-headline-sm text-headline-sm font-bold text-on-surface">{it.title}</span>
                  {it.tag && <span className="rounded bg-surface-container px-1.5 text-label-sm font-label-sm text-on-surface">{it.tag}</span>}
                </div>
                <span className="truncate text-body-sm font-body-sm text-secondary">{it.text}</span>
              </div>
            </div>
            <span className="flex-shrink-0 text-label-sm font-label-sm font-bold text-primary">Request →</span>
          </button>
        ))}
      </section>
    </div>
  );
}

// ======================= Fleet list =======================
export function FleetList() {
  const nav = useNavigate();
  return (
    <div className="-mx-margin flex flex-col items-center gap-space-md pt-space-sm">
      {VEHICLES.map((v) => <FleetCard key={v.slug} v={v} onBook={() => nav(`/app/request?category=${encodeURIComponent(v.category)}`)} />)}
    </div>
  );
}

// ======================= Vehicle details (Lovable screen 3) =======================
export function CarDetails() {
  const { slug } = useParams();
  const nav = useNavigate();
  const v = VEHICLES.find((x) => x.slug === slug);
  const [view, setView] = useState(0);
  const [fav, setFav] = useState(false);
  if (!v) return <Navigate to="/app/fleet" replace />;
  const other = VEHICLES.find((x) => x.slug !== v.slug && (v.seats === '7' ? x.seats !== '7' : x.seats === '7'));
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); toast.success('Vehicle link copied'); } catch { toast(window.location.href); }
  };
  const book = () => nav(`/app/request?category=${encodeURIComponent(v.category)}`);
  return (
    <div className="-mx-margin flex flex-col pb-44">
      <div className="flex items-center justify-between px-margin py-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon name="verified" className="!text-[16px]" /></span>
          <span className="text-label-md font-label-md uppercase tracking-wider text-primary">{v.label}</span>
        </div>
        <div className="flex items-center gap-space-sm">
          <button aria-label="Save to favourites" onClick={() => setFav(!fav)} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)] transition-all hover:text-primary active:scale-95">
            <Icon name={fav ? 'favorite' : 'favorite_border'} fill={fav} className={cn('!text-[20px]', fav && 'text-primary-container')} />
          </button>
          <button aria-label="Share vehicle" onClick={share} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-[0_4px_16px_var(--encore-shadow-0-06)] transition-all active:scale-95">
            <Icon name="share" className="!text-[20px]" />
          </button>
        </div>
      </div>

      <div className="relative mt-space-xs w-full px-margin">
        <div className="relative w-full overflow-hidden rounded-[2rem] bg-[#050505] p-space-md shadow-[0_10px_30px_var(--encore-shadow-0-18)]">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-32 w-64 rounded-full bg-primary-container/25 opacity-70 blur-2xl" /></div>
          <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full bg-surface/90 px-3 py-1 text-on-surface shadow-sm backdrop-blur-md">
            <Icon name="360" className="!text-[15px] text-primary" /><span className="text-label-sm font-label-sm">Gallery</span>
          </div>
          <div className="absolute left-4 top-4 z-10 rounded-full bg-on-background px-2.5 py-1 text-on-primary shadow-sm">
            <span className="text-label-sm font-label-sm uppercase tracking-wide">First Class</span>
          </div>
          <div className="relative z-10 -mx-space-md flex items-center justify-center pb-2 pt-6">
            <Img key={view} k={v.gallery[view % v.gallery.length]} alt={v.name} className="fade-edges aspect-[16/9] w-full object-cover object-[center_42%] transition-transform duration-500 hover:scale-[1.02]" placeholderClassName="h-44 w-full rounded-2xl" />
          </div>
          <div className="relative z-10 flex items-center justify-center gap-space-sm pt-2">
            <button aria-label="Previous image" onClick={() => setView((x) => (x - 1 + v.gallery.length) % v.gallery.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_4px_12px_var(--encore-orange-shadow-0-35)] transition-transform active:scale-90"><Icon name="chevron_left" className="!text-[18px]" /></button>
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              {v.gallery.map((_, i) => <span key={i} className={cn('rounded-full', i === view % v.gallery.length ? 'h-2 w-2 bg-primary' : 'h-1.5 w-1.5 bg-secondary-fixed-dim')} />)}
            </div>
            <button aria-label="Next image" onClick={() => setView((x) => (x + 1) % v.gallery.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface shadow-[0_2px_8px_var(--encore-shadow-0-08)] transition-transform active:scale-90"><Icon name="chevron_right" className="!text-[18px]" /></button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-space-xs px-margin pt-space-lg">
        <div className="flex items-start justify-between gap-space-sm">
          <div>
            <h2 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">{v.name}</h2>
            <p className="text-body-sm font-body-sm text-secondary">{v.variant}</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 rounded-full bg-surface-container-lowest px-2.5 py-1.5 shadow-[0_2px_8px_var(--encore-shadow-0-04)]">
            <Icon name="group" className="!text-[18px] text-tertiary-container" />
            <span className="text-label-lg font-label-lg text-on-surface">{v.seats}</span>
            <span className="text-body-sm font-body-sm text-secondary">seats</span>
          </div>
        </div>
        <p className="pt-1 text-body-md font-body-md leading-relaxed text-on-surface-variant">{v.description}</p>
      </div>

      <div className="px-margin pt-space-lg">
        <div className="flex items-center justify-between pb-space-sm">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">In-Cabin Amenities</h3>
          <span className="text-label-sm font-label-sm text-primary">On request</span>
        </div>
        <div className="grid grid-cols-3 gap-space-sm">
          {[{ icon: 'airline_seat_recline_extra', title: `${v.seats} Seats`, text: 'Leather' }, { icon: 'luggage', title: `${v.bags} Bags`, text: 'Large cases' }, ...AMENITIES.slice(2)].map((a) => (
            <div key={a.title} className="flex flex-col items-center justify-center rounded-DEFAULT bg-surface-container-lowest p-3 text-center shadow-[0_4px_16px_var(--encore-shadow-0-03)]">
              <div className="mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon name={a.icon} className="!text-[19px]" /></div>
              <span className="text-label-md font-label-md text-on-surface">{a.title}</span>
              <span className="text-body-sm font-body-sm text-secondary">{a.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-margin pt-space-lg">
        <div className="flex items-center gap-space-md rounded-DEFAULT bg-surface-container-low p-space-md shadow-[0_2px_10px_var(--encore-shadow-0-03)]">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-surface-container shadow-sm"><Img k="driver" alt="Encore chauffeur" className="h-full w-full object-cover" placeholderClassName="h-full w-full rounded-full" /></div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5"><span className="text-label-md font-label-md text-on-surface">Professional Encore Chauffeur</span><Icon name="stars" className="!text-[16px] text-primary" /></div>
            <p className="truncate text-body-sm font-body-sm text-secondary">Assigned and briefed personally by our dispatch team</p>
          </div>
        </div>
      </div>

      {other && (
        <div className="px-margin pt-space-lg">
          <div className="flex items-center justify-between pb-space-xs">
            <h3 className="font-headline-sm text-headline-sm text-on-surface">{other.seats === '7' ? 'Need More Space?' : 'Travelling Light?'}</h3>
            <span className="text-label-sm font-label-sm text-secondary">{other.seats === '7' ? 'Larger parties' : 'Smaller parties'}</span>
          </div>
          <Link to={`/app/fleet/${other.slug}`} className="group relative flex items-center justify-between rounded-DEFAULT bg-surface-container-lowest p-space-md shadow-[0_6px_20px_var(--encore-shadow-0-04)] transition-all hover:shadow-[0_10px_26px_var(--encore-shadow-0-08)]">
            <div className="flex min-w-0 items-center gap-space-md">
              <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center"><Img k={other.card} alt={other.name} className="h-full w-full object-contain transition-transform group-hover:scale-105" placeholderClassName="h-full w-full rounded-lg" /></div>
              <div className="flex min-w-0 flex-col">
                <h4 className="truncate font-headline-sm text-headline-sm text-on-surface">{other.name}</h4>
                <p className="text-body-sm font-body-sm text-secondary">Up to {other.seats} guests · {other.bags} large cases</p>
              </div>
            </div>
            <span className="flex items-center gap-0.5 pl-2 text-label-sm font-label-sm text-primary">Switch <Icon name="arrow_forward" className="!text-[14px]" /></span>
          </Link>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-[88px] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 px-margin">
        <div className="pointer-events-auto flex items-center justify-between gap-space-md rounded-full bg-surface-container-lowest/95 p-space-md shadow-[0_16px_36px_var(--encore-shadow-0-14)] backdrop-blur-xl">
          <div className="flex min-w-0 flex-col pl-2">
            <span className="text-label-sm font-label-sm uppercase tracking-wider text-secondary">Pricing</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-extrabold leading-[28px] text-on-surface">Tailored</span>
              <span className="text-body-sm font-body-sm font-medium text-secondary">quote</span>
            </div>
          </div>
          <button onClick={book} className="flex h-[52px] max-w-[210px] flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-br from-primary-container to-button-end px-6 py-3.5 text-label-lg font-label-lg text-on-primary shadow-[0_8px_24px_var(--encore-orange-shadow-0-38)] transition-all active:scale-95">
            <span>Book Now</span><Icon name="arrow_forward" className="!text-[20px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

