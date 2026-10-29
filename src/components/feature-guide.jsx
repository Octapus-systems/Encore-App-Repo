import { useEffect, useState } from 'react';
import { Icon } from '@/components/app-ui';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';

// PDF feature 2: a first-time walkthrough of the app's main sections. Skippable, and
// reopenable later from Profile → "How Encore works".
const SLIDES = [
  { icon: 'add_road', title: 'Request a journey', text: 'Tell us your pickup, destination, date and time. Press Book from Home or the dock below — your request goes straight to our team for a tailored quote.' },
  { icon: 'event_note', title: 'Track your bookings', text: 'Trips shows every journey you\'ve requested: upcoming and past, with live status from "Request received" right through to "Completed".' },
  { icon: 'luggage', title: 'Luggage & passengers', text: 'When you book, tell us how many passengers and bags you have. We\'ll recommend the right vehicle, and flag it if your luggage needs a bigger car.' },
  { icon: 'payments', title: 'Payments made simple', text: 'Check your payment status on each booking. We\'ll send a secure payment link when it\'s time to pay — your card details are never stored in the app.' },
  { icon: 'person', title: 'Your profile', text: 'Update your mobile number, password and notification preferences any time from Profile. Corporate clients can also see their account details there.' },
  { icon: 'support_agent', title: "Need help? We're here", text: 'Tap the Help button on any screen for step-by-step fixes to common problems, or to contact our team directly. Available 24/7.' },
];

const seenKey = (userId) => `encore.guideSeen.${userId}`;

export function hasSeenGuide(userId) {
  try { return localStorage.getItem(seenKey(userId)) === '1'; } catch { return true; }
}
function markSeen(userId) {
  try { localStorage.setItem(seenKey(userId), '1'); } catch { /* storage unavailable */ }
}

/** Auto-shows once per account on first login; also reopenable via the `open`/`onClose` props. */
export function FeatureGuide({ user, open: controlledOpen, onClose }) {
  const [autoOpen, setAutoOpen] = useState(false);
  const [i, setI] = useState(0);
  const controlled = controlledOpen !== undefined;
  const isOpen = controlled ? controlledOpen : autoOpen;

  useEffect(() => {
    if (controlled || !user) return;
    if (!hasSeenGuide(user.id)) {
      const t = setTimeout(() => setAutoOpen(true), 500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user, controlled]);

  const close = () => {
    if (user) markSeen(user.id);
    haptic('light');
    if (controlled) onClose?.(); else setAutoOpen(false);
    setTimeout(() => setI(0), 300);
  };
  const next = () => {
    haptic('select');
    if (i < SLIDES.length - 1) setI(i + 1); else close();
  };

  if (!isOpen) return null;
  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="How Encore works">
      <div className="guide-sheet encore-app w-full max-w-[480px] rounded-t-[2rem] !bg-[#121214] px-6 pb-8 pt-5 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">How Encore works</span>
          <button type="button" onClick={close} className="press text-[13px] font-semibold text-white/60">Skip</button>
        </div>

        <div className="mb-1 mt-5 flex justify-center gap-1.5">
          {SLIDES.map((_, idx) => (
            <span key={idx} className={cn('h-1.5 rounded-full transition-all duration-300', idx === i ? 'w-6 bg-primary-container' : 'w-1.5 bg-white/20')} />
          ))}
        </div>

        <div key={i} className="guide-slide flex flex-col items-center px-2 py-8 text-center">
          <div className="pop-in grid h-20 w-20 place-items-center rounded-[1.75rem] bg-gradient-to-br from-primary-container/25 to-tertiary-container/15 text-primary-container ring-1 ring-primary-container/25">
            <Icon name={s.icon} className="!text-[38px]" />
          </div>
          <h2 className="mt-5 font-headline-md text-headline-md font-bold text-white">{s.title}</h2>
          <p className="mt-2 max-w-[320px] text-[14.5px] leading-relaxed text-white/65">{s.text}</p>
        </div>

        <div className="flex items-center gap-2">
          {i > 0 && (
            <button type="button" onClick={() => setI(i - 1)} aria-label="Back" className="press grid h-12 w-12 flex-shrink-0 place-items-center rounded-full bg-white/10 text-white">
              <Icon name="arrow_back" className="!text-[20px]" />
            </button>
          )}
          <button type="button" onClick={next} className="cta-glow flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF8A3D] via-[#FF710F] to-[#FF5A1F] text-[15px] font-bold text-white">
            {last ? "Let's go" : 'Next'}<Icon name={last ? 'check' : 'arrow_forward'} className="!text-[20px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Row for Profile: "How Encore works" reopens the guide on demand. */
export function ReopenGuideRow({ Row }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <>
      <Row icon="auto_awesome" label="How Encore works" sub="Replay the quick feature guide" onClick={() => setOpen(true)} />
      <FeatureGuide user={user} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
