// Company team (corporate accounts): the company admin invites colleagues, makes them admins,
// and pauses or restores their access. Everyone else on the account sees this page read-only.
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { haptic } from '@/lib/fx';
import { isNative } from '@/lib/native';
import { cn } from '@/lib/utils';
import { ErrorState, PageLoader, useAction } from '@/components/common';
import { Icon } from '@/components/app-ui';

// Invitation links must open the web app (the phone app's own address can't be shared).
const WEB_URL = import.meta.env.VITE_WEB_URL || (isNative() ? 'https://encore-app-rho.vercel.app' : window.location.origin);
const initials = (n = '') => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

async function shareLink(url, name) {
  try {
    if (navigator.share) { await navigator.share({ title: 'Join our Encore company account', text: `${name ? `${name}, you're` : "You're"} invited to book Encore chauffeurs on our company account.`, url }); return; }
  } catch { /* closed */ }
  try { await navigator.clipboard.writeText(url); toast.success('Invitation link copied.'); } catch { toast(url); }
}

export function CompanyTeam() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['company'], queryFn: () => api.get('/account/company') });
  const [form, setForm] = useState({ name: '', email: '', org_role: 'member' });
  const [last, setLast] = useState(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['company'] });
  const invite = useAction((b) => api.post('/account/company/invite', b), {
    onSuccess: (r, b) => { haptic('success'); setLast({ url: `${WEB_URL}${r.link}`, name: b.name }); setForm({ name: '', email: '', org_role: 'member' }); refresh(); },
  });
  const change = useAction(({ id, ...b }) => api.patch(`/account/company/members/${id}`, b), { success: 'Updated.', onSuccess: refresh });
  const cancelInvite = useAction((id) => api.del(`/account/company/invitations/${id}`), { success: 'Invitation cancelled.', onSuccess: refresh });

  if (error) return <ErrorState error={error} />;
  if (isLoading) return <PageLoader />;
  const admin = data.me.org_role === 'admin';

  return (
    <div className="flex flex-col gap-space-md pt-space-xs">
      <div className="rounded-[2rem] bg-inverse-surface p-5 text-inverse-on-surface">
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary-container">Company account</div>
        <div className="mt-1 text-[22px] font-extrabold text-white">{data.organisation?.name}</div>
        <div className="text-[13px] text-secondary-fixed">{data.members.length} {data.members.length === 1 ? 'person' : 'people'} · {data.organisation?.payment_terms}</div>
        {!admin && <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-[12.5px] text-secondary-fixed">Only your company admin can add or remove colleagues.</div>}
      </div>

      {admin && (
        <div className="rounded-[2rem] bg-surface-container-lowest p-4 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
          <div className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-on-surface"><Icon name="person_add" className="!text-[20px] text-primary" />Invite a colleague</div>
          <div className="space-y-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" className="h-12 w-full rounded-2xl bg-surface-container-low px-4 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container/40" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Work email" type="email" inputMode="email" className={cn('h-12 w-full rounded-2xl bg-surface-container-low px-4 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-primary-container/40', invite.fields?.email && 'ring-2 ring-amber-400')} />
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface-container-low p-1">
              {[['member', 'Can book'], ['admin', 'Company admin']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm({ ...form, org_role: v })} className={cn('h-10 rounded-xl text-[13px] font-bold transition', form.org_role === v ? 'bg-[#141416] text-white' : 'text-secondary')}>{l}</button>
              ))}
            </div>
            <button type="button" disabled={invite.isPending || !form.email.trim()} onClick={() => invite.mutate(form)}
              className="h-12 w-full rounded-full bg-primary-container text-[15px] font-bold text-white shadow-[0_10px_24px_var(--encore-orange-shadow-0-35)] transition active:scale-[0.98] disabled:opacity-50">
              {invite.isPending ? 'Creating…' : 'Create invitation'}
            </button>
          </div>
          {last && (
            <div className="pop-in mt-3 rounded-2xl bg-emerald-50 p-3">
              <div className="text-[13px] font-bold text-emerald-800">Invitation ready{last.name ? ` for ${last.name}` : ''}</div>
              <div className="mt-0.5 break-all text-[11.5px] text-emerald-700">{last.url}</div>
              <button type="button" onClick={() => shareLink(last.url, last.name)} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-2 text-[12.5px] font-bold text-white"><Icon name="ios_share" className="!text-[16px]" />Send the link</button>
              <div className="mt-1.5 text-[11px] text-emerald-700">Valid for 14 days. They set their own password when they open it.</div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[2rem] bg-surface-container-lowest p-2 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
        <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">Team</div>
        {data.members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
            <span className={cn('grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-[13px] font-bold', m.status === 'suspended' ? 'bg-neutral-200 text-neutral-500' : 'bg-[#141416] text-white')}>{initials(m.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5"><span className="truncate text-[14px] font-bold text-on-surface">{m.name}</span>
                {m.org_role === 'admin' && <span className="rounded-full bg-primary-fixed px-1.5 py-0.5 text-[10px] font-bold text-on-primary-fixed">Admin</span>}
                {m.status === 'suspended' && <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">Paused</span>}
                {m.id === data.me.id && <span className="text-[11px] text-secondary">(you)</span>}
              </div>
              <div className="truncate text-[12px] text-secondary">{m.email || m.phone}</div>
            </div>
            {admin && m.id !== data.me.id && (
              <MemberMenu m={m} onChange={(b) => change.mutate({ id: m.id, ...b })} />
            )}
          </div>
        ))}
      </div>

      {admin && data.invitations.length > 0 && (
        <div className="rounded-[2rem] bg-surface-container-lowest p-2 shadow-[0_10px_30px_var(--encore-shadow-0-04)]">
          <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">Invited · not joined yet</div>
          {data.invitations.map((i) => (
            <div key={i.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-surface-container text-secondary"><Icon name="schedule_send" className="!text-[19px]" /></span>
              <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold">{i.name || i.email}</div><div className="truncate text-[12px] text-secondary">{i.email}{i.org_role === 'admin' ? ' · Admin' : ''}</div></div>
              <button type="button" onClick={() => shareLink(`${WEB_URL}/invite/${i.token}`, i.name)} aria-label="Send link again" className="grid h-9 w-9 place-items-center rounded-full text-primary hover:bg-surface-container"><Icon name="ios_share" className="!text-[18px]" /></button>
              <button type="button" onClick={() => cancelInvite.mutate(i.id)} aria-label="Cancel invitation" className="grid h-9 w-9 place-items-center rounded-full text-secondary hover:bg-surface-container"><Icon name="close" className="!text-[18px]" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberMenu({ m, onChange }) {
  const [open, setOpen] = useState(false);
  const act = (b) => { setOpen(false); onChange(b); };
  return (
    <div className="relative">
      <button type="button" aria-label={`Options for ${m.name}`} onClick={() => setOpen((o) => !o)} className="grid h-9 w-9 place-items-center rounded-full text-secondary hover:bg-surface-container"><Icon name="more_horiz" className="!text-[20px]" /></button>
      {open && (
        <div className="pop-in absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-2xl bg-white py-1 text-[13.5px] font-semibold shadow-[0_18px_40px_rgba(0,0,0,0.2)] ring-1 ring-black/5">
          <button type="button" onClick={() => act({ org_role: m.org_role === 'admin' ? 'member' : 'admin' })} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-neutral-50"><Icon name="admin_panel_settings" className="!text-[18px] text-primary" />{m.org_role === 'admin' ? 'Remove admin' : 'Make admin'}</button>
          {m.status === 'suspended'
            ? <button type="button" onClick={() => act({ status: 'active' })} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left hover:bg-neutral-50"><Icon name="play_circle" className="!text-[18px] text-emerald-600" />Restore access</button>
            : <button type="button" onClick={() => act({ status: 'suspended' })} className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-red-600 hover:bg-red-50"><Icon name="block" className="!text-[18px]" />Remove access</button>}
        </div>
      )}
    </div>
  );
}
