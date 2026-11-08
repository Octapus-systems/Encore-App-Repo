import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AMENITIES, ITINERARIES, ONBOARDING } from '@/lib/showcase';
import { useFleet } from '@/lib/fleet';
import { StatusBadge } from '@/components/common';
import { gbp, shortDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Icon, Img, UserAvatar, useUnread } from '@/components/app-ui';
import { preloadMapsWhenIdle } from '@/components/lazy-maps';
import { PlanJourney } from '@/components/plan-journey';
import { ShineText, SplitText, TypeRotator } from '@/components/motion-text';
import { useCurrentLocation } from '@/lib/location';
import { haptic } from '@/lib/fx';

// ======================= Welcome (Lovable screen 1) =======================
export function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [slide, setSlide] = useState(0);
  const touch = useRef(null);
  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % ONBOARDING.length), 5500);
    return () => clearInterval(t);
  }, []);
  if (user) return <Navigate to="/" replace />;
  const s = ONBOARDING[slide];
  return (
    <div className="fixed inset-0 h-[100dvh] overflow-hidden overscroll-none bg-[#070708]">
      <div className="encore-app relative mx-auto h-full w-full max-w-[480px] overflow-hidden !bg-[#070708]">
        <main className="relative flex h-full w-full flex-col"
          onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - (touch.current ?? 0);
            if (dx < -40) setSlide((v) => Math.min(ONBOARDING.length - 1, v + 1));
            if (dx > 40) setSlide((v) => Math.max(0, v - 1));
          }}>
          <div className="relative flex h-full w-full select-none flex-col overflow-hidden bg-[#070708] pb-[max(20px,env(safe-area-inset-bottom))] text-white">
            <div className="pointer-events-none absolute left-1/2 bottom-[35%] h-56 w-80 -translate-x-1/2 rounded-full bg-primary-container opacity-25 blur-[90px]" />
            <div className="relative min-h-[220px] w-full flex-1">
              <div className="fade-bottom absolute inset-0 overflow-hidden">
                {ONBOARDING.map((o, i) => (
                  <Img key={o.image} k={o.image} eager={i === slide} alt={i === slide ? 'Encore chauffeur car' : ''}
                    className={cn('absolute inset-0 h-full w-full object-cover object-center transition-all duration-1000', i === slide ? 'scale-105 opacity-100' : 'scale-100 opacity-0')}
                    placeholderClassName="absolute inset-0 h-full w-full !bg-black/50 !text-white/30" />
                ))}
              </div>
              <div className="fade-bottom absolute inset-0 bg-gradient-to-b from-black/80 via-black/20 to-[#070708]" />
              <div className="absolute left-0 right-0 top-0 z-10 flex flex-col items-center justify-center px-6 pt-5 safe-top">
                <div className="mb-4 flex w-full items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-container" />Staffordshire · UK-wide
                  </span>
                  <Link to="/login" className="rounded-full px-4 py-1.5 text-[12px] font-semibold tracking-wider text-white/70 transition-all hover:bg-white/15 hover:text-white">Skip</Link>
                </div>
                <div className="flex flex-col items-center">
                  <div className="mb-2">
                    <Img k="logo" alt="Encore Chauffeurs" className="h-14 w-14 object-contain drop-shadow-[0_4px_12px_rgba(255,113,15,0.6)]" placeholderClassName="h-14 w-14 rounded-xl" />
                  </div>
                  <div className="text-center text-[17px] font-bold uppercase tracking-[0.25em] text-white">Encore Chauffeurs</div>
                  <div className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.4em] text-primary-fixed-dim">Executive Travel</div>
                </div>
              </div>
            </div>

            <div className="z-20 -mt-8 flex shrink-0 flex-col px-6">
              <div key={slide} className="space-y-2.5 animate-[fade-in_0.7s_ease-out]">
                <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-sm">
                  {s.line1}<br /><span className="text-primary-container drop-shadow-sm">{s.line2}</span>
                </h1>
                <p className="max-w-sm text-[14px] leading-relaxed text-white/70">{s.text}</p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-[1.75rem] border border-white/12 bg-white/[0.07] p-3 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
                {[['verified_user', 'Vetted Drivers', 'Fully Licensed'], ['support_agent', 'Personal Concierge', '24/7 Support'], ['schedule', 'UK-Wide', 'Priority Fleet']].map(([icon, t, sub]) => (
                  <div key={t} className="flex flex-col items-center text-center">
                    <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/15 text-primary-container">
                      <Icon name={icon} className="!text-[16px]" />
                    </div>
                    <span className="text-[12px] font-bold text-white">{t}</span>
                    <span className="text-[10px] text-white/50">{sub}</span>
                  </div>
                ))}
              </div>

              <div className="mb-4 mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {ONBOARDING.map((_, i) => (
                    <button key={i} aria-label={`Slide ${i + 1}`} onClick={() => setSlide(i)}
                      className={cn('h-1.5 rounded-full transition-all duration-300', i === slide ? 'w-8 bg-primary-container shadow-[0_0_10px_rgba(255,113,15,0.8)]' : 'w-2 bg-white/25 hover:bg-white/40')} />
                  ))}
                </div>
                <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-container animate-pulse" />First Class Only
                </span>
              </div>

              <button onClick={() => nav('/login')} className="group relative flex h-13 w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-container via-[#ff8c38] to-tertiary-container px-6 font-bold text-white shadow-[0_12px_30px_rgba(255,113,15,0.45)] transition-all duration-300 hover:shadow-[0_16px_40px_rgba(255,113,15,0.6)] active:scale-[0.98]">
                <span className="tracking-wide text-[15px]">Get Started</span>
                <Icon name="arrow_forward" className="!text-[20px] transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>
              <div className="mt-3 text-center">
                <Link to="/book" className="py-1 text-[13px] font-semibold text-white/60 transition-colors hover:text-white">Book a journey without signing in →</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ======================= Home (Lovable screen 2) =======================
function FleetCard({ v, onBook, i = 0 }) {
  return (
    <article className="fleet-card relative flex w-[64%] max-w-[250px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-[1.6rem] bg-[#050505] text-inverse-on-surface shadow-[0_16px_36px_var(--encore-shadow-0-18)]">
      <div className={cn('pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br to-transparent blur-2xl', v.glow)} />
      <Link to={`/app/fleet/${v.slug}`} className="relative z-10 flex flex-col gap-1 p-4 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block truncate text-label-sm font-label-sm font-extrabold uppercase tracking-wider text-primary-fixed">{v.label}</span>
            <h3 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-inverse-on-surface">{v.name.replace('Mercedes-Benz ', '')}</h3>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-white">
            <Icon name="group" className="!text-[15px] text-primary-container" />
            <span className="text-label-md font-label-md font-bold">{v.seats}</span>
          </div>
        </div>
      </Link>
      <Link to={`/app/fleet/${v.slug}`} className="relative block h-[118px] w-full overflow-hidden">
        <div className="car-float absolute inset-0" style={{ animationDelay: `${i * -1.3}s` }}>
          <Img k={v.card} alt={v.name} eager={i === 0} className="fade-edges absolute inset-0 h-full w-full object-cover object-[center_52%]" placeholderClassName="mx-auto h-full w-4/5 rounded-2xl !bg-white/5 !text-white/50 !border-white/20" />
          {/* Light glint clipped to the car's own outline (a cut-out mask of the photo), so only the car shines */}
          {v.mask && <span aria-hidden className="car-glint car-glint-masked pointer-events-none absolute inset-0"
            style={{ animationDelay: `${i * 1.1}s`, '--car-mask': `url(${v.mask})` }} />}
        </div>
        {/* Floor reflection pulse */}
        <div aria-hidden className="car-floor pointer-events-none absolute bottom-1 left-1/2 h-8 w-3/4 -translate-x-1/2 rounded-full bg-primary-container/30 blur-xl" style={{ animationDelay: `${i * -0.9}s` }} />
      </Link>
      <div className="relative z-10 -mt-2 flex items-center justify-between gap-2 p-4 pt-0">
        <div>
          <span className="block text-[13px] font-extrabold text-white">Tailored</span>
          <span className="block text-[11px] text-white/60">quote</span>
        </div>
        <button onClick={onBook} className="flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r from-primary-container to-button-end px-3.5 py-2 text-[12.5px] font-bold text-on-primary shadow-[0_8px_20px_var(--encore-orange-shadow-0-4)] transition-all hover:brightness-110 active:scale-95">
          Book <Icon name="arrow_forward" className="!text-[15px]" />
        </button>
      </div>
    </article>
  );
}


/** Home header: scrolls away with the page; the search bar below it is the only pinned element. */
function HomeHero({ user, here }) {
  const unread = useUnread();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const where = here.place?.secondary?.split(',').slice(-1)[0]?.replace(/\s[A-Z]{1,2}\d.*$/, '') || user.organisation?.name || 'Staffordshire · UK-wide';
  return (
    <section className="relative isolate overflow-hidden rounded-b-[2.5rem] bg-[#0b0b0c] px-margin pb-16 text-white safe-top">
      <Img k="hero" alt="" eager className="hero-drift absolute inset-0 h-full w-full object-cover opacity-35" placeholderClassName="absolute inset-0 h-full w-full !bg-transparent !border-0 !text-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[#0b0b0c]" />
      <div className="hero-orb pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary-container/40 blur-3xl" />
      <div className="hero-layer relative z-10 flex items-center justify-between pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Img k="logo" alt="Encore" className="h-9 w-9 flex-shrink-0 object-contain drop-shadow-[0_6px_16px_rgba(255,113,15,0.5)]" placeholderClassName="h-9 w-9 rounded-full" />
          <span className="flex min-w-0 items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">
            <Icon name={here.place ? 'near_me' : 'location_on'} className="!text-[14px] text-primary-container" /><span className="truncate">{where}</span>
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Link to="/app/notifications" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full bg-white/10 transition hover:bg-white/20">
            <Icon name="notifications" className="!text-[20px]" />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary-container px-1 text-[10px] font-bold ring-2 ring-[#0b0b0c]">{unread > 9 ? '9+' : unread}</span>}
          </Link>
          <Link to="/app/account" aria-label="Profile" className="rounded-full bg-gradient-to-br from-primary-container to-button-end p-[2px]">
            <UserAvatar className="h-9 w-9 text-[15px]" />
          </Link>
        </div>
      </div>
      <div className="hero-layer relative z-10 mt-7">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-container/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-primary-fixed-dim ring-1 ring-primary-container/30">
          <Icon name="verified" className="!text-[12px]" />{user.organisation ? 'CORPORATE ACCOUNT' : 'PRIVATE CLIENT'}
        </span>
        <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight"><SplitText text={`${greeting},`} delay={150} /><br /><ShineText><SplitText text={user.name.split(' ')[0]} delay={150 + (greeting.length + 1) * 28} /></ShineText></h1>
        <p className="mt-1 text-body-md text-white/65">Your chauffeur for <TypeRotator words={['the airport run', 'the big meeting', 'a night at the theatre', 'the wedding day', 'anywhere in the UK']} className="font-semibold text-[#FFB692]" /></p>
      </div>
    </section>
  );
}

export function AppHome() {
  const VEHICLES = useFleet();
  // Warm the map code and map server while Home is idle, so "Where to?" opens with a ready map.
  useEffect(() => { preloadMapsWhenIdle(); }, []);
  const { user } = useAuth();
  const nav = useNavigate();
  const chip = 'all';
  const [planning, setPlanning] = useState(false);
  const [planFrom, setPlanFrom] = useState(null);
  const here = useCurrentLocation({ auto: true });
  const sentinel = useRef(null);
  // Cards away from the centre of the carousel sit slightly back, for depth.
  const fleetRow = useRef(null);
  useEffect(() => {
    const row = fleetRow.current;
    if (!row) return undefined;
    let raf = 0;
    const mark = () => {
      raf = 0;
      const mid = row.scrollLeft + row.clientWidth / 2;
      for (const card of row.children) {
        const c = card.offsetLeft + card.offsetWidth / 2;
        card.classList.toggle('is-side', Math.abs(c - mid) > card.offsetWidth * 0.55);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(mark); };
    mark();
    row.addEventListener('scroll', onScroll, { passive: true });
    return () => { row.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    // Checked on every scroll frame so the blur appears exactly as the bar pins.
    let raf = 0;
    const check = () => { raf = 0; const el = sentinel.current; if (el) setStuck(el.getBoundingClientRect().top < 0); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({ queryKey: ['bookings', 'upcoming'], queryFn: () => api.get('/bookings?view=upcoming&sort=pickup'), refetchInterval: 10000 });
  const attention = bookings.filter((b) => ['quote_sent', 'clarification_needed'].includes(b.status));
  const request = (params = {}, state) => {
    const p = new URLSearchParams(params);
    if (!p.get('type') && chip !== 'all') p.set('type', chip);
    nav(`/app/request?${p}`, state ? { state } : undefined);
  };

  return (
    <div className="stagger -mx-margin -mt-space-sm flex flex-col">
      <HomeHero user={user} here={here} />

      {/* Only the destination search stays pinned while scrolling. */}
      <div aria-hidden className={cn('lens-blur pointer-events-none fixed left-1/2 top-0 z-30 h-[92px] w-full max-w-[480px] -translate-x-1/2', stuck && 'is-on')}>
        <i />
      </div>
      <div ref={sentinel} className="h-px" />
      <section className={cn('sticky top-0 z-40 -mt-9 px-margin pb-space-xs pt-space-xs transition-all duration-300', stuck && 'safe-top')}>
        <button type="button" onClick={(e) => { haptic('light'); setPlanFrom(e.currentTarget.getBoundingClientRect()); setPlanning(true); }} aria-label="Plan your journey"
          className={cn('search-bar flex w-full items-center gap-space-xs rounded-full bg-surface-container-lowest p-2 text-left ring-1 ring-black/5 transition-all duration-300 active:scale-[0.985]', stuck ? 'shadow-[0_10px_28px_rgba(0,0,0,0.14)]' : 'shadow-[0_18px_40px_rgba(0,0,0,0.18)]')}>
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-container to-button-end text-white shadow-[0_6px_14px_var(--encore-orange-shadow-0-35)]"><Icon name="search" className="!text-[20px]" /></span>
          <span className="min-w-0 flex-1 px-1 text-body-lg font-semibold text-secondary">Where to?</span>
          <span className="flex h-9 flex-shrink-0 items-center gap-1 rounded-full bg-surface-container px-3 text-[12px] font-bold text-on-surface"><Icon name="schedule" className="!text-[16px] text-primary" />Plan</span>
        </button>
        {planning && (
          <PlanJourney here={here} initialType={chip} origin={planFrom} onClose={() => setPlanning(false)}
            onDone={({ pickup, destination, type, when }) => {
              setPlanning(false);
              request({ type, destination: destination.text, pickup: pickup.text, ...(when ? { when } : {}) }, {
                pickupPin: pickup.lat != null ? { lat: pickup.lat, lng: pickup.lng } : null,
                destPin: destination.lat != null ? { lat: destination.lat, lng: destination.lng } : null,
              });
            }} />
        )}
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

      {bookingsLoading && (
        // Holds the space while trips load, so the sections below don't jump down.
        <section className="flex flex-col gap-space-sm pt-space-md" aria-hidden="true">
          <div className="px-margin"><div className="sk h-6 w-44 rounded-lg" /></div>
          <div className="flex flex-col gap-space-sm px-margin"><div className="sk h-[88px] rounded-[1.5rem]" /><div className="sk h-[88px] rounded-[1.5rem]" /></div>
        </section>
      )}
      {bookings.length > 0 && (
        <section className="flex flex-col gap-space-sm pt-space-md">
          <div className="flex items-center justify-between px-margin">
            <h2 className="section-title font-headline-sm text-headline-sm tracking-tight text-on-surface">Upcoming Journeys</h2>
            <Link to="/app/bookings" className="text-label-sm font-label-sm text-primary">{bookings.length > 2 ? `See all ${bookings.length}` : 'See all'}</Link>
          </div>
          <div className="flex flex-col gap-space-sm px-margin">
            {bookings.slice(0, 2).map((b) => <JourneyTicket key={b.id} b={b} />)}
          </div>
        </section>
      )}
      <section className="px-margin pt-space-md">
        <h2 className="section-title mb-space-sm font-headline-sm text-headline-sm tracking-tight text-on-surface">Book a service</h2>
        <div className="grid grid-cols-4 gap-2">
          {ITINERARIES.map((it, i) => (
            <button key={it.type} onClick={() => { haptic('light'); request({ type: it.type }); }} style={{ animationDelay: `${i * 70}ms` }}
              className="express-tile group flex flex-col items-center gap-1.5 text-center active:scale-95 transition-transform">
              <span className="relative block aspect-square w-full overflow-hidden rounded-[1.25rem] bg-[#0f0f11] shadow-[0_8px_18px_rgba(0,0,0,0.16)]">
                <Img k={EXPRESS_ART[it.type] || 'welcome1'} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <span className="absolute inset-0 bg-black/35" />
                <Icon name={it.icon} className="absolute inset-0 m-auto h-fit w-fit !text-[24px] text-white drop-shadow" />
              </span>
              <span className="text-[11.5px] font-bold leading-tight text-on-surface">{SHORT_NAME[it.type] || it.title}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="pt-space-lg">
        <div className="mb-space-sm flex items-center justify-between px-margin">
          <div className="flex items-center gap-2">
            <h2 className="section-title font-headline-sm text-headline-sm tracking-tight text-on-surface">Featured Fleet</h2>
            <span className="rounded-full bg-tertiary-fixed px-2 py-0.5 text-label-sm font-label-sm text-on-tertiary-fixed">Company owned</span>
          </div>
          <Link to="/app/fleet" className="flex items-center text-label-md font-label-md font-bold text-primary hover:text-primary-container">View All<Icon name="chevron_right" className="!text-[18px]" /></Link>
        </div>
        {/* Extra room above/below (cancelled by negative margins) so the side-scroll box never clips the cards' shadows into a hard line. */}
        <div ref={fleetRow} className="no-scrollbar -mb-8 -mt-3 flex snap-x snap-mandatory scroll-px-margin gap-space-md overflow-x-auto px-margin pb-8 pt-3">
          {VEHICLES.map((v, i) => <FleetCard key={v.slug} v={v} i={i} onBook={() => request({ category: v.category })} />)}
        </div>
      </section>
    </div>
  );
}

// Photo behind each Express Travel tile.
const SHORT_NAME = { airport: 'Airport', corporate: 'Business', event: 'Events', hourly: 'By the hour' };
const EXPRESS_ART = { airport: 'welcome3', corporate: 'welcome1', event: 'welcome2', hourly: 'welcome4' };

/** Upcoming journey: simple card. The car icon only drives (on a moving road) while the chauffeur is on the way. */
function JourneyTicket({ b }) {
  const moving = ['on_the_way', 'started'].includes(b.status);
  return (
    <Link to={`/app/bookings/${b.id}`} className="flex w-full items-center justify-between gap-space-sm rounded-[2rem] bg-surface-container-lowest p-space-md shadow-[0_8px_24px_var(--encore-shadow-0-05)] transition-transform active:scale-[0.99]">
      <div className="flex min-w-0 items-center gap-space-md">
        <div className={cn('relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full', moving ? 'bg-primary-container text-white shadow-[0_6px_16px_rgba(255,113,15,0.35)]' : 'bg-primary-fixed text-on-primary-fixed-variant')}>
          {moving && <span className="car-road absolute inset-x-0 bottom-[11px] h-[2px]" />}
          <Icon name="directions_car" className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 !text-[22px]', moving && 'car-bob top-[9px] translate-y-0')} />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-headline-sm text-headline-sm font-bold text-on-surface">{shortDateTime(b.first_pickup)}</span>
          <span className="truncate text-body-sm font-body-sm text-secondary">{b.pickup} → {b.destination}</span>
          <StatusBadge status={b.status} className="mt-1.5 self-start" />
        </div>
      </div>
      <Icon name="chevron_right" className="flex-shrink-0 text-secondary" />
    </Link>
  );
}

// ======================= Fleet list =======================
export function FleetList() {
  const VEHICLES = useFleet();
  const nav = useNavigate();
  return (
    <div className="-mx-margin flex flex-col items-center gap-space-md pt-space-sm">
      {VEHICLES.map((v) => <FleetCard key={v.slug} v={v} onBook={() => nav(`/app/request?category=${encodeURIComponent(v.category)}`)} />)}
    </div>
  );
}

// ======================= Vehicle details (Lovable screen 3) =======================
export function CarDetails() {
  const VEHICLES = useFleet();
  const { slug } = useParams();
  const nav = useNavigate();
  const v = VEHICLES.find((x) => x.slug === slug);
  const [view, setView] = useState(0);
  if (!v) return <Navigate to="/app/fleet" replace />;
  const other = VEHICLES.find((x) => x.slug !== v.slug && (v.seats === '7' ? x.seats !== '7' : x.seats === '7'));
  const book = () => nav(`/app/request?category=${encodeURIComponent(v.category)}`);
  return (
    <div className="-mx-margin flex flex-col pb-44">
      <div className="flex items-center justify-between px-margin py-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon name="verified" className="!text-[16px]" /></span>
          <span className="text-label-md font-label-md uppercase tracking-wider text-primary">{v.label}</span>
        </div>
      </div>

      <div className="relative mt-space-xs w-full px-margin">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] bg-[#050505] shadow-[0_10px_30px_var(--encore-shadow-0-18)]">
          <Img key={view} k={v.gallery[view % v.gallery.length]} alt={v.name} className="gallery-in absolute inset-0 h-full w-full object-cover object-center" placeholderClassName="absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute left-4 top-4 z-10 rounded-full bg-black/55 px-2.5 py-1 text-white backdrop-blur-md">
            <span className="text-label-sm font-label-sm uppercase tracking-wide">First Class</span>
          </div>
          {v.gallery.length > 1 && <div className="absolute right-4 top-4 z-10 rounded-full bg-black/55 px-2.5 py-1 text-label-sm font-label-sm text-white backdrop-blur-md">{(view % v.gallery.length) + 1} / {v.gallery.length}</div>}
          {v.gallery.length > 1 && <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-space-sm">
            <button aria-label="Previous image" onClick={() => setView((x) => (x - 1 + v.gallery.length) % v.gallery.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_4px_12px_var(--encore-orange-shadow-0-35)] transition-transform active:scale-90"><Icon name="chevron_left" className="!text-[18px]" /></button>
            <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
              {v.gallery.map((_, i) => <span key={i} className={cn('rounded-full transition-all', i === view % v.gallery.length ? 'h-2 w-4 bg-primary' : 'h-1.5 w-1.5 bg-white/60')} />)}
            </div>
            <button aria-label="Next image" onClick={() => setView((x) => (x + 1) % v.gallery.length)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-on-surface shadow-[0_2px_8px_var(--encore-shadow-0-08)] transition-transform active:scale-90"><Icon name="chevron_right" className="!text-[18px]" /></button>
          </div>}
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

