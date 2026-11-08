// Encore's own pickup date & time picker. The phone's built-in picker can't hide times, so customers
// could choose a pickup only minutes away. This sheet shows only the times that are allowed:
// a strip of days, then 15-minute slots from the earliest permitted pickup onwards.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from '@/lib/fx';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/app-ui';

const toLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
/** Earliest pickup customers may choose: now + the notice period (Settings → min_notice_hours), rounded up to 5 minutes. */
export function earliestPickup(noticeHours = 2) {
  const ms = Date.now() + Math.max(15, Number(noticeHours || 0) * 60) * 60000;
  return toLocal(new Date(Math.ceil(ms / 300000) * 300000));
}

const DAYS_AHEAD = 60;
const STEP_MIN = 15;
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hm = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** Button that opens the picker sheet. Same props as before: value / min are "YYYY-MM-DDTHH:mm" local strings. */
export function PickDateTime({ value, min, onChange, className, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => { haptic('light'); setOpen(true); }} className={cn('relative', className)}>{children}</button>
      {open && <PickerSheet value={value} min={min} onClose={() => setOpen(false)} onPick={(v) => { onChange(v); setOpen(false); }} />}
    </>
  );
}

function PickerSheet({ value, min, onClose, onPick }) {
  const earliest = useMemo(() => new Date(min || earliestPickup()), [min]);
  const days = useMemo(() => {
    const out = []; const d = new Date(earliest); d.setHours(0, 0, 0, 0);
    for (let i = 0; i < DAYS_AHEAD; i++) { out.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return out;
  }, [earliest]);
  const startVal = value && new Date(value) >= earliest ? new Date(value) : null;
  const [day, setDay] = useState(dayKey(startVal || earliest));
  const [time, setTime] = useState(startVal ? hm(startVal) : null);
  const [closing, setClosing] = useState(false);
  const close = (after) => { setClosing(true); setTimeout(() => (after ? after() : onClose()), 180); };

  // Slots for the chosen day: every 15 min, starting at the earliest allowed time on the first day.
  const slots = useMemo(() => {
    const base = new Date(`${day}T00:00`);
    const out = [];
    for (let m = 0; m < 24 * 60; m += STEP_MIN) {
      const t = new Date(base.getTime() + m * 60000);
      if (t >= earliest) out.push(t);
    }
    // the exact earliest time (e.g. 05:35) as the first option on the first day
    if (dayKey(earliest) === day && (!out.length || out[0].getTime() !== earliest.getTime())) out.unshift(new Date(earliest));
    return out;
  }, [day, earliest]);

  useEffect(() => { if (time && !slots.some((t) => hm(t) === time)) setTime(null); }, [slots]); // eslint-disable-line react-hooks/exhaustive-deps
  const dayRow = useRef(null);
  const grid = useRef(null);
  useLayoutEffect(() => {
    dayRow.current?.querySelector('[data-on="1"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);
  useLayoutEffect(() => {
    const on = grid.current?.querySelector('[data-on="1"]');
    if (on) on.scrollIntoView({ block: 'center' });
    else if (grid.current) {
      // otherwise show the morning onwards (or the first slot on the earliest day)
      const nine = grid.current.querySelector('[data-h="09"]');
      (dayKey(earliest) === day ? grid.current.firstElementChild : nine)?.scrollIntoView({ block: 'start' });
    }
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = time ? new Date(`${day}T${time}`) : null;
  const label = (d) => {
    const diff = Math.round((d - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000);
    return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' });
  };
  const groups = [['Morning', (h) => h < 12], ['Afternoon', (h) => h >= 12 && h < 17], ['Evening', (h) => h >= 17]];

  return createPortal(
    <div className={cn('pick-sheet fixed inset-0 z-[96] flex items-end justify-center bg-black/45', closing && 'is-closing')} onClick={() => close()}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Choose pickup date and time"
        className="pick-panel flex max-h-[86vh] w-full max-w-[480px] flex-col rounded-t-[28px] bg-white pb-[max(14px,env(safe-area-inset-bottom))] shadow-[0_-20px_50px_rgba(0,0,0,0.25)]">
        <div className="mx-auto mb-1 mt-2.5 h-1 w-10 flex-shrink-0 rounded-full bg-neutral-200" />
        <div className="flex flex-shrink-0 items-center justify-between px-5 pb-2 pt-1">
          <div>
            <div className="text-[17px] font-extrabold text-neutral-950">Pickup date & time</div>
            <div className="text-[12px] text-neutral-500">Earliest available: {earliest.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, {hm(earliest)}</div>
          </div>
          <button type="button" aria-label="Close" onClick={() => close()} className="grid h-9 w-9 place-items-center rounded-full bg-neutral-100 text-neutral-700"><Icon name="close" className="!text-[19px]" /></button>
        </div>

        {/* Days */}
        <div ref={dayRow} className="no-scrollbar flex flex-shrink-0 gap-2 overflow-x-auto px-5 pb-3 pt-1">
          {days.map((d) => {
            const k = dayKey(d); const on = k === day;
            return (
              <button key={k} type="button" data-on={on ? '1' : '0'} onClick={() => { haptic('select'); setDay(k); }}
                className={cn('flex min-w-[60px] flex-shrink-0 flex-col items-center whitespace-nowrap rounded-2xl px-2.5 py-2 transition', on ? 'bg-[#141416] text-white shadow-md' : 'bg-neutral-100 text-neutral-800')}>
                <span className={cn('text-[10.5px] font-bold uppercase tracking-wide', on ? 'text-[#FF8A3D]' : 'text-neutral-500')}>{label(d)}</span>
                <span className="text-[19px] font-extrabold leading-tight">{d.getDate()}</span>
                <span className={cn('text-[10.5px] font-semibold', on ? 'text-white/60' : 'text-neutral-400')}>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
              </button>
            );
          })}
        </div>

        {/* Times — only allowed ones exist */}
        <div ref={grid} className="no-scrollbar min-h-0 flex-1 overflow-y-auto border-t border-neutral-100 px-5 pb-2 pt-2">
          {groups.map(([name, test]) => {
            const list = slots.filter((t) => test(t.getHours()));
            if (!list.length) return null;
            return (
              <div key={name} className="mb-2">
                <div className="sticky top-0 z-10 bg-white py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">{name}</div>
                <div className="grid grid-cols-4 gap-2">
                  {list.map((t) => {
                    const v = hm(t); const on = v === time;
                    return (
                      <button key={v} type="button" data-on={on ? '1' : '0'} data-h={v.slice(0, 2)} onClick={() => { haptic('select'); setTime(v); }}
                        className={cn('h-11 scroll-mt-10 rounded-xl text-[14px] font-bold tabular-nums transition', on ? 'bg-[#FF710F] text-white shadow-[0_6px_16px_rgba(255,113,15,0.4)]' : 'bg-neutral-100 text-neutral-800 active:bg-neutral-200')}>
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex-shrink-0 px-5 pt-2">
          <button type="button" disabled={!chosen} onClick={() => { haptic('success'); close(() => onPick(toLocal(chosen))); }}
            className="h-14 w-full rounded-full bg-[#141416] text-[15.5px] font-bold text-white transition active:scale-[0.98] disabled:opacity-40">
            {chosen ? `Set pickup · ${chosen.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}` : 'Choose a time'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
