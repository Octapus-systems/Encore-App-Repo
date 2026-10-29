import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Icon, Img } from '@/components/app-ui';
import { ShineText, SplitText } from '@/components/motion-text';
import { homeFor, useAuth, usePublicSettings } from '@/lib/auth';
import { Banner, ErrorState, PageLoader, useAction } from '@/components/common';

function Shell({ children, title, subtitle, eyebrow = 'Private client access' }) {
  return (
    <div className="fixed inset-0 h-[100dvh] overflow-hidden overscroll-none bg-[#0b0b0c]">
      <div className="encore-app relative mx-auto flex h-full w-full max-w-[480px] flex-col overflow-hidden !bg-[#0b0b0c]">
        <Img k="loginBg" alt="" className="auth-kenburns absolute inset-0 h-full w-full object-cover object-[center_30%]" placeholderClassName="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-[#0b0b0c]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_115%,rgba(255,113,15,0.35),transparent_60%)]" />

        <div className="relative z-10 flex h-full min-h-0 flex-col px-margin pb-[max(12px,env(safe-area-inset-bottom))] safe-top">
          <div className="flex shrink-0 items-center justify-between pt-3">
            <Link to="/welcome" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20">
              <Icon name="arrow_back" className="!text-[20px]" />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-label-sm font-label-sm uppercase tracking-wider text-white/80 backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-container" />24/7 · UK-wide
            </span>
          </div>

          <div className="mt-5 flex shrink-0 items-center gap-3 [@media(max-height:720px)]:mt-2">
            <Img k="logo" alt="Encore Chauffeurs" className="h-12 w-12 [@media(max-height:720px)]:h-10 [@media(max-height:720px)]:w-10 object-contain drop-shadow-[0_8px_20px_rgba(255,113,15,0.5)]" placeholderClassName="h-12 w-12 rounded-2xl" />
            <div className="leading-tight">
              <div className="text-body-lg font-bold uppercase tracking-[0.2em] text-white">Encore</div>
              <div className="text-label-sm font-label-sm uppercase tracking-[0.35em] text-primary-fixed-dim">Chauffeurs</div>
            </div>
          </div>

          <div className="mt-auto flex min-h-0 flex-col pt-3">
            <span className="text-label-sm font-label-sm uppercase tracking-[0.3em] text-primary-container">{eyebrow}</span>
            <h1 className="mt-1.5 text-[36px] [@media(max-height:720px)]:text-[28px] font-extrabold leading-[1.05] tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-2 max-w-sm text-body-md font-body-md text-white/70 [@media(max-height:720px)]:hidden">{subtitle}</p>}

            <div className="no-scrollbar mt-4 min-h-0 overflow-y-auto overscroll-contain rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              {children}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-white/40">
                <Icon name="lock" className="!text-[14px]" />Secure sign-in · Card details never stored
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlassInput({ icon, label, error, type = 'text', ...props }) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <label className="block">
      <div className={`group flex items-center gap-3 rounded-2xl border bg-black/30 px-4 transition focus-within:border-primary-container focus-within:bg-black/40 focus-within:shadow-[0_0_0_4px_rgba(255,113,15,0.15)] ${error ? 'border-red-400/70' : 'border-white/10'}`}>
        <Icon name={icon} className="!text-[20px] text-white/50 transition group-focus-within:text-primary-container" />
        <div className="flex-1 py-2.5 [@media(max-height:720px)]:py-1.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/50">{label}</span>
          <input type={isPw && show ? 'text' : type} className="glass-input w-full bg-transparent text-body-lg font-body-lg text-white outline-none placeholder:text-white/30" {...props} />
        </div>
        {isPw && (
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} className="text-white/50 hover:text-white">
            <Icon name={show ? 'visibility_off' : 'visibility'} className="!text-[20px]" />
          </button>
        )}
      </div>
      {error && <span className="mt-1 block px-2 text-body-sm text-red-300">{error}</span>}
    </label>
  );
}

function GlowButton({ loading, children }) {
  return (
    <button type="submit" disabled={loading} className="group relative flex h-14 [@media(max-height:720px)]:h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary-container via-button-mid to-tertiary-container text-headline-sm font-headline-sm text-white shadow-[0_14px_34px_rgba(255,113,15,0.45)] transition active:scale-[0.98] disabled:opacity-70">
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
      {loading && <Icon name="progress_activity" className="animate-spin" />}
      {children}
      {!loading && <Icon name="arrow_forward" className="!text-[22px] transition-transform group-hover:translate-x-1" />}
    </button>
  );
}

const COUNTRIES = [
  ['GB', '🇬🇧', '44', 'United Kingdom'], ['IE', '🇮🇪', '353', 'Ireland'], ['IN', '🇮🇳', '91', 'India'], ['AE', '🇦🇪', '971', 'UAE'],
  ['US', '🇺🇸', '1', 'United States'], ['FR', '🇫🇷', '33', 'France'], ['DE', '🇩🇪', '49', 'Germany'], ['ES', '🇪🇸', '34', 'Spain'],
  ['IT', '🇮🇹', '39', 'Italy'], ['NL', '🇳🇱', '31', 'Netherlands'], ['PK', '🇵🇰', '92', 'Pakistan'], ['PL', '🇵🇱', '48', 'Poland'],
];

/** Split a typed number into dial code + national digits (defaults to UK). */
function splitPhone(raw) {
  const t = String(raw || '').trim();
  if (t.startsWith('+') || t.startsWith('00')) {
    const digits = t.replace(/\D/g, '').replace(/^00/, '');
    const hit = [...COUNTRIES].sort((a, b) => b[2].length - a[2].length).find((c) => digits.startsWith(c[2]));
    if (hit) return { dial: hit[2], national: digits.slice(hit[2].length) };
  }
  return { dial: '44', national: t.replace(/\D/g, '') };
}
const fullNumber = (dial, national) => `+${dial}${String(national).replace(/\D/g, '').replace(/^0+/, '')}`;

/** Six separate digit boxes: auto-advance, backspace, paste and SMS autofill. */
function CodeBoxes({ value, onChange, onComplete, status, disabled }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const focus = (i) => refs.current[Math.max(0, Math.min(5, i))]?.focus();
  const setAt = (i, ch) => {
    const next = digits.slice(); next[i] = ch;
    const joined = next.join('');
    onChange(joined);
    if (joined.length === 6 && !next.includes('')) onComplete?.(joined);
  };
  const onPaste = (e) => {
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!t) return;
    e.preventDefault();
    onChange(t);
    focus(t.length >= 6 ? 5 : t.length);
    if (t.length === 6) onComplete?.(t);
  };
  useEffect(() => { focus(0); }, []);
  return (
    <div className={`flex justify-between gap-2 ${status === 'error' ? 'fx-shake' : ''}`} onPaste={onPaste}>
      {digits.map((d, i) => (
        <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} disabled={disabled} inputMode="numeric" maxLength={1}
          autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`Digit ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            if (!ch) return;
            setAt(i, ch); focus(i + 1);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') { e.preventDefault(); if (d) setAt(i, ''); else { focus(i - 1); setAt(Math.max(0, i - 1), ''); } }
            else if (e.key === 'ArrowLeft') focus(i - 1);
            else if (e.key === 'ArrowRight') focus(i + 1);
          }}
          className={`glass-input h-14 w-full min-w-0 rounded-2xl border text-center text-2xl font-bold text-white outline-none transition focus:border-primary-container focus:shadow-[0_0_0_4px_rgba(255,113,15,0.18)] ${
            status === 'ok' ? 'border-emerald-400 bg-emerald-500/20' : status === 'error' ? 'border-red-400/70 bg-black/30' : d ? 'border-white/30 bg-white/10' : 'border-white/10 bg-black/30'}`}
          style={status === 'ok' ? { transition: 'all .3s', transitionDelay: `${i * 40}ms` } : undefined} />
      ))}
    </div>
  );
}

/**
 * Mobile number sign-in with a one-time code. New customers add their name on the code step.
 * Used on the sign-in screen and when a guest sends a booking request.
 */
export function OtpSignIn({ defaultPhone = '', defaultName = '', onDone, cta = 'Continue' }) {
  const init = splitPhone(defaultPhone);
  const [step, setStep] = useState('phone');
  const [dial, setDial] = useState(init.dial);
  const [national, setNational] = useState(init.national);
  const [code, setCode] = useState('');
  const [name, setName] = useState(defaultName);
  const [needsName, setNeedsName] = useState(false);
  const [demo, setDemo] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | ok | error
  const [resendIn, setResendIn] = useState(0);
  const phone = fullNumber(dial, national);
  const country = COUNTRIES.find((c) => c[2] === dial) || COUNTRIES[0];
  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);
  const send = useAction((p) => api.post('/auth/otp/request', { phone: p }), {
    onSuccess: (d) => { setStep('code'); setDemo(d.demo_code || null); setCode(''); setStatus('idle'); setResendIn(30); },
  });
  const verify = useAction((b) => api.post('/auth/otp/verify', b), {
    onSuccess: (d) => { setStatus('ok'); setTimeout(() => onDone(d), 650); },
    onError: (err) => {
      if (err.body?.code === 'needs_name') { setNeedsName(true); return true; }
      setStatus('error'); setTimeout(() => { setStatus('idle'); setCode(''); }, 600);
      return false;
    },
  });
  const submitCode = (c) => { if (!needsName && !verify.isPending) verify.mutate({ phone, code: c, name: undefined }); };
  if (step === 'phone') {
    return (
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); send.mutate(phone); }}>
        <label className="block">
          <div className={`flex items-stretch rounded-2xl border bg-black/30 transition focus-within:border-primary-container focus-within:shadow-[0_0_0_4px_rgba(255,113,15,0.15)] ${send.fields?.phone ? 'border-red-400/70' : 'border-white/10'}`}>
            <div className="relative flex items-center border-r border-white/10 pl-4 pr-2">
              <span className="pointer-events-none flex items-center gap-1 text-body-lg text-white"><span className="text-xl">{country[1]}</span>+{dial}<Icon name="expand_more" className="!text-[18px] text-white/50" /></span>
              <select aria-label="Country code" value={dial} onChange={(e) => setDial(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0">
                {COUNTRIES.map((c) => <option key={c[0]} value={c[2]} className="text-black">{c[1]} {c[3]} (+{c[2]})</option>)}
              </select>
            </div>
            <div className="flex-1 px-3 py-2.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/50">Mobile number</span>
              <input type="tel" autoComplete="tel-national" required placeholder="7700 900123" value={national} onChange={(e) => setNational(e.target.value)} className="glass-input w-full bg-transparent text-body-lg font-body-lg text-white outline-none placeholder:text-white/30" />
            </div>
          </div>
          {send.fields?.phone && <span className="mt-1 block px-2 text-body-sm text-red-300">{send.fields.phone}</span>}
        </label>
        <GlowButton loading={send.isPending}>Send code</GlowButton>
        <p className="px-1 text-center text-[12px] text-white/50">We'll text you a 6-digit code. No password needed.</p>
      </form>
    );
  }
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); verify.mutate({ phone, code, name: needsName ? name : undefined }); }}>
      <p className="px-1 text-body-sm text-white/70">Enter the code sent to <b className="text-white">{country[1]} {phone}</b>. <button type="button" className="font-semibold text-primary-container" onClick={() => { setStep('phone'); setNeedsName(false); }}>Change</button></p>
      {demo && <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-body-sm text-amber-200">Demo mode — no SMS provider yet. Your code is <b className="tracking-widest">{demo}</b></div>}
      <CodeBoxes value={code} onChange={setCode} onComplete={submitCode} status={status} disabled={verify.isPending || status === 'ok'} />
      {verify.fields?.code && status !== 'ok' && <span className="block px-1 text-body-sm text-red-300">{verify.fields.code}</span>}
      {needsName && <GlassInput icon="person" label="Your name" autoComplete="name" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} error={verify.fields?.name} />}
      {needsName && <p className="px-1 text-body-sm text-white/60">Welcome to Encore — tell us your name to finish.</p>}
      <GlowButton loading={verify.isPending}>{needsName ? 'Create my account' : cta}</GlowButton>
      <button type="button" disabled={resendIn > 0 || send.isPending} onClick={() => send.mutate(phone)} className="w-full text-center text-body-sm text-white/50 enabled:hover:text-white disabled:opacity-60">{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</button>
    </form>
  );
}

export function Login() {
  const { user, signIn } = useAuth();
  const { data: s } = usePublicSettings();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [mode, setMode] = useState(null);
  const useOtp = (mode ?? (s?.otp_login ? 'mobile' : 'email')) === 'mobile';
  const done = (data) => { signIn(data); nav(loc.state?.from || homeFor(data.user), { replace: true }); };
  const login = useAction((f) => api.post('/auth/login', { ...f, portal: 'app' }), {
    onSuccess: (data) => { signIn(data); nav(loc.state?.from || homeFor(data.user), { replace: true }); },
  });
  if (user) return <Navigate to={homeFor(user)} replace />;
  return (
    <Shell title={<><SplitText text="Welcome" delay={200} step={40} /><br /><ShineText><SplitText text="back." delay={500} step={40} /></ShineText></>} subtitle="Sign in to request journeys, review quotations and follow your chauffeur.">
      {s?.otp_login && (
        <div className="mb-4 [@media(max-height:720px)]:mb-3 grid grid-cols-2 rounded-full bg-black/30 p-1 text-label-md font-label-md">
          {[['mobile', 'Mobile'], ['email', 'Email']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-full py-2 transition ${(useOtp ? 'mobile' : 'email') === k ? 'bg-white text-black shadow' : 'text-white/60 hover:text-white'}`}>{l}</button>
          ))}
        </div>
      )}
      {useOtp ? <OtpSignIn onDone={done} cta="Sign in" /> : (
      <form className="space-y-3 [@media(max-height:720px)]:space-y-2" onSubmit={(e) => { e.preventDefault(); login.mutate(form); }}>
        <GlassInput icon="mail" label="Email" type="email" autoComplete="email" required placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <GlassInput icon="lock" label="Password" type="password" autoComplete="current-password" required placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex justify-end px-1">
          <a href={s ? `tel:${s.dispatcher_phone}` : undefined} className="text-body-sm font-body-sm text-white/60 hover:text-white">Forgot password? Call us</a>
        </div>
        <GlowButton loading={login.isPending}>Sign in</GlowButton>
      </form>)}
      <div className="mt-4 [@media(max-height:720px)]:mt-3 flex items-center gap-3 text-[12px] text-white/40"><span className="h-px flex-1 bg-white/10" />or<span className="h-px flex-1 bg-white/10" /></div>
      <div className={`mt-3 grid gap-2 ${s?.guest_booking && s?.admission_mode !== 'invitation' ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {s?.guest_booking && <Link to="/book" className="press flex h-11 items-center justify-center gap-1.5 rounded-full bg-white/10 text-[13px] font-semibold text-white transition hover:bg-white/15"><Icon name="directions_car" className="!text-[18px]" />Book as guest</Link>}
        {s?.admission_mode !== 'invitation' && <Link to="/register" className="press flex h-11 items-center justify-center gap-1.5 rounded-full border border-white/15 text-[13px] font-semibold text-white transition hover:bg-white/10"><Icon name="person_add" className="!text-[18px]" />Request access</Link>}
      </div>
      {s?.admission_mode === 'invitation' && <p className="mt-3 text-center text-body-sm text-white/70">Access is by invitation. Call {s.dispatcher_phone} to request one.</p>}
    </Shell>
  );
}

export function Register() {
  const { data: s, isLoading } = usePublicSettings();
  const [form, setForm] = useState({ name: '', email: '', phone: '', company_name: '', password: '' });
  const [done, setDone] = useState(null);
  const reg = useAction((f) => api.post('/auth/register', f), { onSuccess: (d) => setDone(d.message) });
  if (isLoading) return <PageLoader />;
  if (s?.admission_mode === 'invitation') {
    return <Shell title="By invitation"><Banner tone="blue" title="Encore Executive admits clients by invitation.">Please call {s.dispatcher_phone} to request an invitation.</Banner><Link to="/login" className="mt-5 block text-center text-body-md font-semibold text-primary-container">Back to sign in</Link></Shell>;
  }
  if (done) {
    return <Shell title="Request received"><Banner tone="green" icon={CheckCircle2} title="Thank you">{done}</Banner><Link to="/login" className="mt-5 block text-center text-body-md font-semibold text-primary-container">Back to sign in</Link></Shell>;
  }
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Shell eyebrow="Join Encore" title="Request access" subtitle="Encore Executive serves a selective client base. Your request is reviewed by our team before you can book.">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); reg.mutate(form); }}>
        <GlassInput icon="person" label="Full name" error={reg.fields.name} value={form.name} onChange={set('name')} autoComplete="name" />
        <GlassInput icon="mail" label="Email" error={reg.fields.email} type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        <GlassInput icon="smartphone" label="Mobile (for WhatsApp updates)" error={reg.fields.phone} type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="+44" />
        <GlassInput icon="business_center" label="Company (if booking for a business)" value={form.company_name} onChange={set('company_name')} autoComplete="organization" />
        <GlassInput icon="lock" label="Password" error={reg.fields.password} type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        <GlowButton loading={reg.isPending}>Send request</GlowButton>
      </form>
      <p className="mt-5 text-center text-body-sm text-white/60">Already approved? <Link to="/login" className="font-semibold text-primary-container">Sign in</Link></p>
    </Shell>
  );
}

export function Invite() {
  const { token } = useParams();
  const { signIn } = useAuth();
  const nav = useNavigate();
  const inv = useQuery({ queryKey: ['invite', token], queryFn: () => api.get(`/auth/invitations/${token}`), retry: false });
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const accept = useAction((f) => api.post(`/auth/invitations/${token}/accept`, f), {
    onSuccess: (d) => { signIn(d); nav(homeFor(d.user), { replace: true }); },
  });
  if (inv.isLoading) return <PageLoader />;
  if (inv.error) return <Shell title="Invitation"><ErrorState error={inv.error} /></Shell>;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <Shell title="You're invited" subtitle={`Create your account for ${inv.data.email}${inv.data.organisation_name ? ` on behalf of ${inv.data.organisation_name}` : ''}.`}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); accept.mutate({ ...form, name: form.name || inv.data.name || '' }); }}>
        <GlassInput icon="person" label="Full name" error={accept.fields.name} value={form.name} placeholder={inv.data.name || ''} onChange={set('name')} />
        <GlassInput icon="smartphone" label="Mobile (for WhatsApp updates)" error={accept.fields.phone} type="tel" value={form.phone} onChange={set('phone')} placeholder="+44" />
        <GlassInput icon="lock" label="Choose a password" error={accept.fields.password} type="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
        <GlowButton loading={accept.isPending}>Create account</GlowButton>
      </form>
    </Shell>
  );
}

/** Management accounts use the separate Command Center web app. */
export function StaffNotice() {
  const { signOut } = useAuth();
  const url = import.meta.env.VITE_MANAGEMENT_URL || 'http://localhost:5180';
  return (
    <Shell eyebrow="Encore management" title="Command Center" subtitle="Management accounts sign in to the separate Encore Command Center web app.">
      <a href={url} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary-container via-button-mid to-tertiary-container text-headline-sm font-headline-sm text-white shadow-[0_14px_34px_rgba(255,113,15,0.45)]">
        Open Command Center <Icon name="open_in_new" className="!text-[20px]" />
      </a>
      <button onClick={signOut} className="mt-3 flex h-12 w-full items-center justify-center rounded-full border border-white/15 text-label-lg font-label-lg text-white hover:bg-white/10">Sign out of the app</button>
    </Shell>
  );
}
