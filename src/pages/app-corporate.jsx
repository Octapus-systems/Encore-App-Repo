// Profile → Upgrade to a corporate account. The customer sends company details and documents;
// Encore checks them and approves. This screen shows the form, or the status of the request.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { ErrorState, PageLoader } from '@/components/common';
import { Icon } from '@/components/app-ui';

const STEPS = ['Send details', 'Encore checks', 'Company account ready'];

function Field({ label, error, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-bold uppercase tracking-[0.1em] text-secondary">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] font-semibold text-amber-700">{error}</span> : hint ? <span className="mt-1 block text-[11.5px] text-secondary">{hint}</span> : null}
    </label>
  );
}
const inputCls = (err) => cn('h-12 w-full rounded-2xl bg-surface-container-low px-4 text-[14.5px] font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary-container/40', err && 'ring-2 ring-amber-400');

function Upload({ kind, label, hint, files, onAdd, onRemove, error }) {
  const [busy, setBusy] = useState(false);
  const mine = files.filter((f) => f.kind === kind);
  const pick = async (list) => {
    for (const file of [...(list || [])].slice(0, 5)) {
      if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(file.type)) { toast.error('Use a PDF, JPG or PNG.'); continue; }
      if (file.size > 8 * 1024 * 1024) { toast.error(`${file.name} is over 8 MB.`); continue; }
      setBusy(true);
      try { onAdd(await api.upload(`/account/corporate-request/files?kind=${kind}&name=${encodeURIComponent(file.name)}`, file)); }
      catch (e) { toast.error(e.body?.error || 'Upload failed — try again.'); }
      finally { setBusy(false); }
    }
  };
  return (
    <div className={cn('rounded-2xl border-2 border-dashed p-3', error ? 'border-amber-400' : 'border-outline-variant')}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><div className="text-[14px] font-bold text-on-surface">{label}</div><div className="text-[12px] text-secondary">{hint}</div></div>
        <label className={cn('flex h-10 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-[#141416] px-3.5 text-[13px] font-bold text-white', busy && 'opacity-60')}>
          <Icon name={busy ? 'progress_activity' : 'upload'} className={cn('!text-[17px]', busy && 'animate-spin')} />{busy ? 'Uploading' : 'Add'}
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
        </label>
      </div>
      {mine.map((f) => (
        <div key={f.id} className="mt-2 flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2 text-[13px]">
          <Icon name={f.mime === 'application/pdf' ? 'picture_as_pdf' : 'image'} className="!text-[18px] text-primary" />
          <span className="min-w-0 flex-1 truncate font-semibold">{f.name}</span>
          <button type="button" aria-label={`Remove ${f.name}`} onClick={() => onRemove(f.id)} className="grid h-7 w-7 place-items-center rounded-full text-secondary hover:bg-surface-container"><Icon name="close" className="!text-[16px]" /></button>
        </div>
      ))}
      {error && <div className="mt-1.5 text-[12px] font-semibold text-amber-700">{error}</div>}
    </div>
  );
}

export function CorporateUpgrade() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: req, isLoading, error } = useQuery({ queryKey: ['corporate-request'], queryFn: () => api.get('/account/corporate-request') });
  const [f, setF] = useState(() => ({ company_name: '', registration_number: '', business_email: '', business_phone: '', company_domain: '', billing_address: '', requester_name: user?.name || '', requester_role: '', requester_phone: user?.phone || '' }));
  const [docs, setDocs] = useState([]);
  const [errs, setErrs] = useState({});
  const [sending, setSending] = useState(false);
  const [again, setAgain] = useState(false);
  const bind = (k) => ({ value: f[k], onChange: (e) => { setF({ ...f, [k]: e.target.value }); setErrs((x) => ({ ...x, [k]: undefined })); } });

  if (error) return <ErrorState error={error} />;
  if (isLoading) return <PageLoader />;
  if (user?.role === 'corporate') {
    return <Status icon="verified" tone="green" title="You already have a company account" text={`${user.organisation?.name || 'Your company'} is set up. Manage colleagues from Profile → Company team.`} />;
  }
  if (req && !again && req.status === 'pending') {
    return <Status icon="hourglass_top" tone="amber" step={1} title="Request with Encore" text={`We’re checking ${req.company_name}’s details and documents. We’ll let you know here as soon as it’s approved.`} />;
  }
  if (req && !again && req.status === 'rejected') {
    return <Status icon="error" tone="red" title="Request not approved" text={req.admin_note || 'Encore could not approve this request.'} action={<button type="button" onClick={() => setAgain(true)} className="mt-4 h-12 w-full rounded-full bg-[#141416] text-[15px] font-bold text-white">Send a new request</button>} />;
  }

  const submit = async () => {
    setSending(true); setErrs({});
    try {
      await api.post('/account/corporate-request', { ...f, files: docs });
      haptic('success'); toast.success('Request sent to Encore.');
      setAgain(false); qc.invalidateQueries({ queryKey: ['corporate-request'] });
    } catch (e) {
      setErrs(e.body?.fields || {}); toast.error(e.body?.error || 'Could not send — try again.');
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col gap-space-md pt-space-xs">
      <div className="rounded-[2rem] bg-inverse-surface p-5 text-inverse-on-surface">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-container">Corporate account</div>
        <div className="mt-1 text-[21px] font-extrabold leading-tight text-white">Book for your company, pay monthly</div>
        <div className="mt-1 text-[13px] text-secondary-fixed">Your team books on one account and Encore sends one invoice each month.</div>
        <ol className="mt-4 grid grid-cols-3 gap-2">
          {STEPS.map((s, i) => <li key={s} className={cn('rounded-xl px-2.5 py-2 text-[11.5px] font-semibold', i === 0 ? 'bg-primary-container text-white' : 'bg-white/5 text-secondary-fixed')}><span className="block text-[10px] opacity-70">Step {i + 1}</span>{s}</li>)}
        </ol>
      </div>

      <section className="space-y-3 rounded-[2rem] bg-surface-container-lowest p-4 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
        <h2 className="text-[15px] font-extrabold">Company</h2>
        <Field label="Company name" error={errs.company_name}><input className={inputCls(errs.company_name)} {...bind('company_name')} autoComplete="organization" /></Field>
        <Field label="Company registration number" error={errs.registration_number} hint="Companies House number, e.g. 01234567"><input className={inputCls(errs.registration_number)} {...bind('registration_number')} /></Field>
        <Field label="Business email" error={errs.business_email} hint="Becomes your sign-in email once approved"><input className={inputCls(errs.business_email)} {...bind('business_email')} type="email" inputMode="email" autoComplete="email" /></Field>
        <Field label="Business phone" error={errs.business_phone}><input className={inputCls(errs.business_phone)} {...bind('business_phone')} inputMode="tel" /></Field>
        <Field label="Company website / domain" hint="Optional, e.g. hallam.co.uk"><input className={inputCls()} {...bind('company_domain')} inputMode="url" /></Field>
        <Field label="Billing address" hint="Optional — printed on invoices"><input className={inputCls()} {...bind('billing_address')} /></Field>
      </section>

      <section className="space-y-3 rounded-[2rem] bg-surface-container-lowest p-4 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
        <h2 className="text-[15px] font-extrabold">Person requesting</h2>
        <Field label="Full name"><input className={inputCls()} {...bind('requester_name')} autoComplete="name" /></Field>
        <Field label="Job title" hint="Optional, e.g. Office Manager"><input className={inputCls()} {...bind('requester_role')} /></Field>
        <Field label="Mobile"><input className={inputCls()} {...bind('requester_phone')} inputMode="tel" autoComplete="tel" /></Field>
      </section>

      <section className="space-y-3 rounded-[2rem] bg-surface-container-lowest p-4 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
        <h2 className="text-[15px] font-extrabold">Documents</h2>
        <Upload kind="legal" label="Business documents" hint="e.g. certificate of incorporation · PDF/JPG, max 8 MB" files={docs} error={errs.legal}
          onAdd={(d) => { setDocs((x) => [...x, d]); setErrs((e) => ({ ...e, legal: undefined })); }} onRemove={(id) => setDocs((x) => x.filter((d) => d.id !== id))} />
        <Upload kind="id" label="Your photo ID" hint="Passport or driving licence" files={docs} error={errs.id}
          onAdd={(d) => { setDocs((x) => [...x, d]); setErrs((e) => ({ ...e, id: undefined })); }} onRemove={(id) => setDocs((x) => x.filter((d) => d.id !== id))} />
        <p className="text-[11.5px] text-secondary"><Icon name="lock" className="!text-[13px] align-[-2px]" /> Only Encore staff can see your documents. They are used to verify the company.</p>
      </section>

      <button type="button" disabled={sending} onClick={submit}
        className="h-14 w-full rounded-full bg-primary-container text-[16px] font-bold text-white shadow-[0_10px_24px_var(--encore-orange-shadow-0-35)] transition active:scale-[0.98] disabled:opacity-60">
        {sending ? 'Sending…' : 'Send request to Encore'}
      </button>
    </div>
  );
}

function Status({ icon, tone, title, text, step, action }) {
  const c = { green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600' }[tone];
  return (
    <div className="pt-space-md">
      <div className="rounded-[2rem] bg-surface-container-lowest p-6 text-center shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
        <div className={cn('mx-auto grid h-16 w-16 place-items-center rounded-full', c)}><Icon name={icon} className="!text-[32px]" /></div>
        <div className="mt-3 text-[19px] font-extrabold">{title}</div>
        <p className="mt-1 text-[14px] text-secondary">{text}</p>
        {step != null && (
          <ol className="mt-5 grid grid-cols-3 gap-2 text-left">
            {STEPS.map((s, i) => <li key={s} className={cn('rounded-xl px-2.5 py-2 text-[11.5px] font-semibold', i < step ? 'bg-emerald-50 text-emerald-700' : i === step ? 'bg-primary-container text-white' : 'bg-surface-container-low text-secondary')}><span className="block text-[10px] opacity-70">Step {i + 1}</span>{s}</li>)}
          </ol>
        )}
        {action}
      </div>
    </div>
  );
}
