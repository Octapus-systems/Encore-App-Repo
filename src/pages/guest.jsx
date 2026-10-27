import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuth, usePublicSettings } from '@/lib/auth';
import { JOURNEY_TYPES } from '@/lib/format';
import { PageLoader, useAction } from '@/components/common';
import { RequestForm, emptyRequest } from '@/components/booking';
import { Icon } from '@/components/app-ui';
import { OtpSignIn } from '@/pages/auth';

/**
 * Book without signing in first: the customer fills in the journey, then verifies their
 * mobile number once at the end. Returning customers are recognised by that number.
 */
export function GuestBook() {
  const { user, signIn } = useAuth();
  const { data: s, isLoading } = usePublicSettings();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [draft, setDraft] = useState(null);
  const type = params.get('type');
  const initial = {
    ...emptyRequest(user),
    ...(type && JOURNEY_TYPES[type] ? { journey_type: type } : {}),
    ...(params.get('destination') ? { destination: params.get('destination') } : {}),
    ...(params.get('category') ? { preferred_category: params.get('category') } : {}),
    ...(params.get('when') ? { pickup_at: params.get('when') } : {}),
  };
  const create = useAction((body) => api.post('/bookings', body), {
    success: 'Request sent — we will be in touch with a quotation.',
    onSuccess: (b) => nav(`/app/bookings/${b.id}/sent`, { replace: true }),
  });

  if (isLoading) return <PageLoader />;
  if (user && user.role !== 'customer' && user.role !== 'corporate') return <Navigate to="/" replace />;
  if (s && !s.guest_booking && !user) return <Navigate to="/login" replace />;

  const submit = (body) => {
    if (user) return create.mutate(body);
    setDraft(body);
  };
  const verified = (data) => {
    signIn(data);
    const body = draft;
    setDraft(null);
    create.mutate(body);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="encore-app mx-auto min-h-screen w-full max-w-[480px] bg-background">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/90 px-margin py-4 backdrop-blur">
          <Link to={user ? '/app' : '/welcome'} aria-label="Back" className="press flex h-10 w-10 items-center justify-center rounded-full bg-surface-container"><Icon name="arrow_back" /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-headline-sm font-headline-sm">Request a Journey</h1>
            {!user && <p className="text-body-sm text-secondary">No account needed — verify your mobile at the end.</p>}
          </div>
          {!user && <Link to="/login" className="text-label-md font-label-md text-primary">Sign in</Link>}
        </header>
        <main className="page-enter px-margin pb-10 pt-2">
          <RequestForm initial={initial} onSubmit={submit} submitting={create.isPending} fields={create.fields} submitLabel={user ? 'Send request' : 'Continue'} />
        </main>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDraft(null)}>
          <div className="encore-app animate-rise w-full max-w-[480px] rounded-t-[2rem] !bg-[#121214] p-6 pb-10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-white/20" />
            <h2 className="text-headline-sm font-headline-sm text-white">Verify your mobile</h2>
            <p className="mb-5 mt-1 text-body-sm text-white/60">One quick step so we can send your quotation and journey updates. We'll remember you next time.</p>
            <OtpSignIn defaultPhone={draft.contact_phone} defaultName={draft.lead_passenger} onDone={verified} cta="Verify and send request" />
          </div>
        </div>
      )}
    </div>
  );
}
