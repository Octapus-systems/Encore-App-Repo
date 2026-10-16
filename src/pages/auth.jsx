import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Icon, Img } from '@/components/app-ui';
import { homeFor, useAuth, usePublicSettings } from '@/lib/auth';
import { Banner, ErrorState, PageLoader, useAction } from '@/components/common';

function Shell({ children, title, subtitle, eyebrow = 'Private client access' }) {
  return (
    <div className="min-h-screen bg-[#0b0b0c]">
      <div className="encore-app relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col overflow-hidden !bg-[#0b0b0c]">
        <Img k="loginBg" alt="" className="auth-kenburns absolute inset-0 h-full w-full object-cover object-[center_30%]" placeholderClassName="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/35 to-[#0b0b0c]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_115%,rgba(255,113,15,0.35),transparent_60%)]" />

        <div className="relative z-10 flex flex-1 flex-col px-margin pb-8 safe-top">
          <div className="flex items-center justify-between pt-5">
            <Link to="/welcome" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20">
              <Icon name="arrow_back" className="!text-[20px]" />
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-label-sm font-label-sm uppercase tracking-wider text-white/80 backdrop-blur-md">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-container" />24/7 · UK-wide
            </span>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Img k="logo" alt="Encore Chauffeurs" className="h-12 w-12 object-contain drop-shadow-[0_8px_20px_rgba(255,113,15,0.5)]" placeholderClassName="h-12 w-12 rounded-2xl" />
            <div className="leading-tight">
              <div className="text-body-lg font-bold uppercase tracking-[0.2em] text-white">Encore</div>
              <div className="text-label-sm font-label-sm uppercase tracking-[0.35em] text-primary-fixed-dim">Chauffeurs</div>
            </div>
          </div>

          <div className="mt-auto pt-16">
            <span className="text-label-sm font-label-sm uppercase tracking-[0.3em] text-primary-container">{eyebrow}</span>
            <h1 className="mt-2 text-[38px] font-extrabold leading-[1.05] tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-2 max-w-sm text-body-md font-body-md text-white/70">{subtitle}</p>}

            <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              {children}
            </div>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-body-sm font-body-sm text-white/45">
              <Icon name="verified_user" className="!text-[16px]" />Secure sign-in · Card details never stored
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
        <div className="flex-1 py-2.5">
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
    <button type="submit" disabled={loading} className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-primary-container via-button-mid to-tertiary-container text-headline-sm font-headline-sm text-white shadow-[0_14px_34px_rgba(255,113,15,0.45)] transition active:scale-[0.98] disabled:opacity-70">
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
      {loading && <Icon name="progress_activity" className="animate-spin" />}
      {children}
      {!loading && <Icon name="arrow_forward" className="!text-[22px] transition-transform group-hover:translate-x-1" />}
    </button>
  );
}

export function Login() {
  const { user, signIn } = useAuth();
  const { data: s } = usePublicSettings();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const login = useAction((f) => api.post('/auth/login', f), {
    onSuccess: (data) => { signIn(data); nav(loc.state?.from || homeFor(data.user), { replace: true }); },
  });
  if (user) return <Navigate to={homeFor(user)} replace />;
  return (
    <Shell title={<>Welcome<br /><span className="text-primary-container">back.</span></>} subtitle="Sign in to request journeys, review quotations and follow your chauffeur.">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); login.mutate(form); }}>
        <GlassInput icon="mail" label="Email" type="email" autoComplete="email" required placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <GlassInput icon="lock" label="Password" type="password" autoComplete="current-password" required placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <div className="flex justify-end px-1">
          <a href={s ? `tel:${s.dispatcher_phone}` : undefined} className="text-body-sm font-body-sm text-white/60 hover:text-white">Forgot password? Call us</a>
        </div>
        <GlowButton loading={login.isPending}>Sign in</GlowButton>
      </form>
      <div className="mt-5 flex items-center gap-3 text-body-sm text-white/40"><span className="h-px flex-1 bg-white/10" />New to Encore?<span className="h-px flex-1 bg-white/10" /></div>
      {s?.admission_mode === 'invitation'
        ? <p className="mt-3 text-center text-body-sm text-white/70">Access is by invitation. Call {s.dispatcher_phone} to request one.</p>
        : <Link to="/register" className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/15 text-label-lg font-label-lg text-white transition hover:bg-white/10"><Icon name="person_add" className="!text-[20px]" />Request access</Link>}
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
