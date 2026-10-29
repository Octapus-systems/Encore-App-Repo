import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HELP_TOPICS, CONTACT_PROMPT } from '@/lib/help-content';
import { usePublicSettings } from '@/lib/auth';
import { Icon } from '@/components/app-ui';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';

/**
 * Help & Troubleshooting (PDF feature 1). A bottom sheet reachable from anywhere in the
 * customer app: pick a problem, follow numbered steps, retry the action, or contact Encore
 * if it's still not fixed.
 */
export function HelpCenter({ open, onClose }) {
  const { data: s } = usePublicSettings();
  const [topic, setTopic] = useState(null);
  const [done, setDone] = useState(() => new Set());
  if (!open) return null;

  const close = () => { onClose(); setTimeout(() => { setTopic(null); setDone(new Set()); }, 300); };
  const toggle = (i) => {
    haptic('select');
    setDone((d) => { const n = new Set(d); n.has(i) ? n.delete(i) : n.add(i); return n; });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/55 backdrop-blur-sm" onClick={close} role="dialog" aria-modal="true" aria-label="Help and troubleshooting">
      <div className="help-sheet encore-app w-full max-w-[480px] rounded-t-[2rem] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-neutral-200" />
        <div className="flex max-h-[80vh] flex-col overflow-y-auto px-5 pb-8 pt-4">
          {!topic ? (
            <>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-primary-container/15 text-primary-container"><Icon name="support_agent" className="!text-[24px]" /></div>
                <div>
                  <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">Help &amp; Troubleshooting</h2>
                  <p className="text-body-sm text-secondary">What's the problem? Pick one below.</p>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {HELP_TOPICS.map((t) => (
                  <button key={t.key} type="button" onClick={() => { haptic('select'); setTopic(t); }}
                    className="help-topic flex w-full items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-sm transition hover:border-primary-container/40">
                    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-surface-container text-on-surface"><Icon name={t.icon} className="!text-[20px]" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-bold text-on-surface">{t.title}</div>
                      <div className="truncate text-[12.5px] text-secondary">{t.summary}</div>
                    </div>
                    <Icon name="chevron_right" className="text-secondary" />
                  </button>
                ))}
              </div>
              {s && (
                <a href={`tel:${s.dispatcher_phone}`} className="press mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white">
                  <Icon name="call" className="!text-[18px]" />Call Encore · {s.dispatcher_phone}
                </a>
              )}
            </>
          ) : (
            <>
              <button type="button" onClick={() => setTopic(null)} className="press -ml-1 mb-3 flex w-fit items-center gap-1 text-sm font-semibold text-secondary">
                <Icon name="arrow_back" className="!text-[18px]" />All topics
              </button>
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl bg-primary-container/15 text-primary-container"><Icon name={topic.icon} className="!text-[24px]" /></div>
                <h2 className="font-headline-sm text-headline-sm font-bold leading-tight text-on-surface">{topic.title}</h2>
              </div>
              <ol className="mt-5 space-y-2.5">
                {topic.steps.map((step, i) => {
                  const checked = done.has(i);
                  return (
                    <li key={i}>
                      <button type="button" onClick={() => toggle(i)} className="flex w-full items-start gap-3 rounded-2xl border bg-white p-3.5 text-left transition">
                        <span className={cn('help-check mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border-2 text-[13px] font-bold transition-all', checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-neutral-300 text-neutral-400')}>
                          {checked ? <Icon name="check" className="!text-[16px]" /> : i + 1}
                        </span>
                        <span className={cn('text-[14px] leading-relaxed transition-colors', checked ? 'text-secondary line-through decoration-emerald-400' : 'text-on-surface')}>{step}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {topic.retry && (
                <Link to={topic.retry.to} onClick={close} className="cta-glow mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#FF5A1F] text-sm font-bold text-white">
                  <Icon name="refresh" className="!text-[18px]" />{topic.retry.label}
                </Link>
              )}
              <div className="mt-5 rounded-2xl bg-surface-container-low p-4">
                <p className="text-[13px] text-secondary">{CONTACT_PROMPT}</p>
                {s && (
                  <a href={`tel:${s.dispatcher_phone}`} className="press mt-3 flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-sm font-bold text-white">
                    <Icon name="call" className="!text-[18px]" />Contact Encore
                  </a>
                )}
              </div>
            </>
          )}
          <button type="button" onClick={close} className="press mt-4 text-center text-sm font-semibold text-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

/** Floating button that opens the Help Center, fixed above the dock. */
export function HelpLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { haptic('medium'); setOpen(true); }} aria-label="Help and troubleshooting"
        className="press fixed bottom-[108px] right-4 z-40 grid h-13 w-13 place-items-center rounded-full bg-ink text-white shadow-[0_10px_26px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
        style={{ width: 52, height: 52 }}>
        <Icon name="support_agent" className="!text-[24px]" />
      </button>
      <HelpCenter open={open} onClose={() => setOpen(false)} />
    </>
  );
}
