import { useState } from 'react';
import { ArrowDown, Baby, Briefcase, Clock, MapPin, Minus, Plane, Plus, Repeat, Send, Users, Accessibility, Car } from 'lucide-react';
import { usePublicSettings } from '@/lib/auth';
import { JOURNEY_TYPES, LEG_STATUS, dateTime, shortDateTime, toLocalInput } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Banner, Field, PrimaryButton, SelectInput, TextArea, TextInput } from '@/components/common';
import { AddressInput } from '@/components/address';

const TYPE_ICONS = { point_to_point: MapPin, airport: Plane, return: Repeat, event: Users, corporate: Briefcase, hourly: Clock };

function Stepper({ value, onChange, min = 0, max = 60 }) {
  return (
    <div className="flex h-11 items-center justify-between rounded-xl border bg-white px-1.5 shadow-sm">
      <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface disabled:opacity-30" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} aria-label="Decrease"><Minus className="h-4 w-4" /></button>
      <span className="font-semibold tabular-nums">{value}</span>
      <button type="button" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-surface disabled:opacity-30" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} aria-label="Increase"><Plus className="h-4 w-4" /></button>
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs font-bold text-white">{n}</span>
        <h2 className="font-heading text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export const emptyRequest = (user) => ({
  journey_type: 'point_to_point', pickup: '', destination: '', stops: [], pickup_at: '', flight_number: '', duration_hours: 3,
  is_return: false, return_pickup_at: '', return_pickup: '', return_destination: '',
  lead_passenger: user?.role === 'customer' ? user.name : '', contact_phone: user?.role === 'customer' ? user.phone || '' : '',
  passenger_count: 1, passenger_names: '', luggage_large: 0, luggage_small: 0, child_seats: 0,
  accessibility_needs: '', special_instructions: '', sensitive_notes: '', preferred_category: '',
});

/** Journey request form (CUS-2). Used by customers and by staff booking on a customer's behalf. */
export function RequestForm({ initial, onSubmit, submitting, fields = {}, submitLabel = 'Send request', beforeSections }) {
  const { data: s } = usePublicSettings();
  const [f, setF] = useState(initial);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const bind = (k) => ({ value: f[k] ?? '', onChange: (e) => set(k, e.target.value), invalid: !!fields[k] });
  const addr = (k) => ({ value: f[k] ?? '', onChange: (v) => set(k, v), invalid: !!fields[k] });
  const isReturn = f.journey_type === 'return' || f.is_return;
  const minDate = toLocalInput(new Date(Date.now() + 15 * 60000));

  const submit = (e) => {
    e.preventDefault();
    onSubmit({
      ...f,
      is_return: isReturn,
      pickup_at: f.pickup_at ? new Date(f.pickup_at).toISOString() : '',
      return_pickup_at: isReturn && f.return_pickup_at ? new Date(f.return_pickup_at).toISOString() : '',
      stops: f.stops.filter((x) => x.trim()),
    });
  };

  const bags = Number(f.luggage_large) + Number(f.luggage_small);
  const suggestBigger = (Number(f.passenger_count) <= 3 && Number(f.luggage_large) >= 3) || bags >= 5;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {beforeSections}
      <Section n={1} title="Type of journey">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(JOURNEY_TYPES).map(([k, label]) => {
            const Icon = TYPE_ICONS[k];
            return (
              <button type="button" key={k} onClick={() => set('journey_type', k)}
                className={cn('flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-sm font-medium transition', f.journey_type === k ? 'border-primary bg-orange-50 text-ink ring-2 ring-primary/20' : 'bg-white hover:border-neutral-300')}>
                <Icon className={cn('h-4 w-4 shrink-0', f.journey_type === k ? 'text-primary' : 'text-muted-foreground')} />{label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={2} title="Where and when">
        <div className="space-y-4">
          <Field label="Pickup address" error={fields.pickup} required><AddressInput placeholder="Search address, station or airport" {...addr('pickup')} /></Field>
          {f.stops.map((stop, i) => (
            <div key={i} className="flex items-end gap-2">
              <Field label={`Extra stop ${i + 1}`} className="flex-1"><AddressInput value={stop} onChange={(v) => set('stops', f.stops.map((x, j) => (j === i ? v : x)))} placeholder="Search additional pickup or stop" /></Field>
              <button type="button" className="mb-1 h-9 rounded-lg px-3 text-sm text-muted-foreground hover:bg-surface" onClick={() => set('stops', f.stops.filter((_, j) => j !== i))}>Remove</button>
            </div>
          ))}
          {f.stops.length < 5 && <button type="button" onClick={() => set('stops', [...f.stops, ''])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary"><Plus className="h-4 w-4" />Add an extra pickup or stop</button>}
          <Field label={f.journey_type === 'hourly' ? 'Final destination (if known)' : 'Destination'} error={fields.destination} required={f.journey_type !== 'hourly'}>
            <AddressInput placeholder={f.journey_type === 'hourly' ? 'As directed' : 'Search destination address'} {...addr('destination')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pickup date and time" error={fields.pickup_at} required><TextInput type="datetime-local" min={minDate} {...bind('pickup_at')} /></Field>
            {f.journey_type === 'airport' && <Field label="Flight number" error={fields.flight_number} required hint="So we can track your arrival"><TextInput placeholder="e.g. BA1427" {...bind('flight_number')} /></Field>}
            {f.journey_type === 'hourly' && <Field label="Hours required" error={fields.duration_hours} required><TextInput type="number" min="1" step="0.5" {...bind('duration_hours')} /></Field>}
          </div>
          {f.journey_type !== 'return' && (
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border bg-surface px-4 py-3 text-sm font-medium">
              <input type="checkbox" className="h-4 w-4 accent-[#FF5A1F]" checked={!!f.is_return} onChange={(e) => set('is_return', e.target.checked)} />
              Add a return journey
            </label>
          )}
          {isReturn && (
            <div className="space-y-4 rounded-xl border border-dashed p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><ArrowDown className="h-4 w-4 text-primary" />Return leg</div>
              <Field label="Return pickup date and time" error={fields.return_pickup_at} required><TextInput type="datetime-local" min={f.pickup_at || minDate} {...bind('return_pickup_at')} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Return pickup from" hint="Leave blank to use your destination"><AddressInput placeholder={f.destination} {...addr('return_pickup')} /></Field>
                <Field label="Return drop-off" hint="Leave blank to use your pickup"><AddressInput placeholder={f.pickup} {...addr('return_destination')} /></Field>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section n={3} title="Passengers">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Lead passenger" error={fields.lead_passenger} required><TextInput autoComplete="name" {...bind('lead_passenger')} /></Field>
          <Field label="Contact mobile on the day" error={fields.contact_phone} required><TextInput type="tel" placeholder="+44" {...bind('contact_phone')} /></Field>
          <Field label="Number of passengers" error={fields.passenger_count}><Stepper value={Number(f.passenger_count)} min={1} onChange={(v) => set('passenger_count', v)} /></Field>
          <Field label="Other passenger names" hint="Optional"><TextInput {...bind('passenger_names')} /></Field>
        </div>
      </Section>

      <Section n={4} title="Luggage and requirements">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Large cases"><Stepper value={Number(f.luggage_large)} onChange={(v) => set('luggage_large', v)} /></Field>
          <Field label="Small bags"><Stepper value={Number(f.luggage_small)} onChange={(v) => set('luggage_small', v)} /></Field>
          <Field label={<span className="inline-flex items-center gap-1.5"><Baby className="h-4 w-4" />Child seats</span>}><Stepper value={Number(f.child_seats)} max={4} onChange={(v) => set('child_seats', v)} /></Field>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label={<span className="inline-flex items-center gap-1.5"><Car className="h-4 w-4" />Preferred vehicle</span>} hint="You may request a larger vehicle than your party needs">
            <SelectInput {...bind('preferred_category')}>
              <option value="">No preference — Encore to advise</option>
              {(s?.vehicle_categories || []).map((c) => <option key={c}>{c}</option>)}
            </SelectInput>
          </Field>
          <Field label={<span className="inline-flex items-center gap-1.5"><Accessibility className="h-4 w-4" />Accessibility needs</span>}><TextInput placeholder="e.g. wheelchair, step assistance" {...bind('accessibility_needs')} /></Field>
        </div>
        {suggestBigger && <Banner tone="blue" className="mt-4">With this much luggage we may recommend a larger vehicle such as an MPV — we will advise when we quote.</Banner>}
        <div className="mt-4 grid gap-4">
          <Field label="Special instructions" hint="Meet-and-greet, refreshments, preferred route, event details"><TextArea {...bind('special_instructions')} /></Field>
          <Field label="Private notes for your chauffeur" hint="Shared only with Encore management and your assigned chauffeur"><TextArea rows={2} {...bind('sensitive_notes')} /></Field>
        </div>
      </Section>

      <div className="sticky bottom-24 z-10 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur sm:bottom-4">
        <p className="mb-3 text-xs text-muted-foreground">This is a request, not a confirmed booking. Encore Executive will review it and send a tailored quotation.</p>
        <PrimaryButton type="submit" className="w-full" loading={submitting}><Send className="h-4 w-4" />{submitLabel}</PrimaryButton>
      </div>
    </form>
  );
}

// ---------- Progress & legs ----------
const FLOW = [
  { key: 'request', label: 'Requested', match: ['pending', 'under_review', 'clarification_needed'] },
  { key: 'quote', label: 'Quotation', match: ['quote_sent', 'change_requested', 'quote_accepted'] },
  { key: 'confirmed', label: 'Confirmed', match: ['confirmed'] },
  { key: 'assigned', label: 'Chauffeur assigned', match: ['driver_assigned'] },
  { key: 'on_the_way', label: 'On the way', match: ['on_the_way'] },
  { key: 'arrived', label: 'Arrived', match: ['arrived'] },
  { key: 'started', label: 'Under way', match: ['started'] },
  { key: 'completed', label: 'Completed', match: ['completed', 'closed'] },
];

export function BookingProgress({ status }) {
  const idx = FLOW.findIndex((s) => s.match.includes(status));
  if (idx < 0) return null;
  return (
    <ol className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
      {FLOW.map((s, i) => (
        <li key={s.key} className="flex shrink-0 items-center gap-1">
          <span className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            i < idx && 'bg-emerald-50 text-emerald-700', i === idx && 'bg-primary text-white', i > idx && 'bg-neutral-100 text-neutral-400')}>
            {s.label}
          </span>
          {i < FLOW.length - 1 && <span className={cn('h-px w-3', i < idx ? 'bg-emerald-300' : 'bg-neutral-200')} />}
        </li>
      ))}
    </ol>
  );
}

export function LegRoute({ leg, compact }) {
  return (
    <div className={cn('relative pl-6', compact ? 'space-y-1' : 'space-y-3')}>
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-neutral-200" />
      <div className="relative"><span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-[3px] border-primary bg-white" /><div className="text-sm font-medium text-ink">{leg.pickup}</div></div>
      {(leg.stops || []).map((s, i) => (
        <div key={i} className="relative"><span className="absolute -left-[22px] top-1.5 h-2 w-2 rounded-full bg-neutral-400" /><div className="text-sm text-muted-foreground">via {s}</div></div>
      ))}
      <div className="relative"><span className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-[4px] bg-ink" /><div className="text-sm font-medium text-ink">{leg.destination}</div></div>
    </div>
  );
}

export function LegTimes({ leg }) {
  const items = [['on_the_way_at', 'On the way'], ['arrived_at', 'Arrived'], ['started_at', 'Started'], ['completed_at', 'Completed']].filter(([k]) => leg[k]);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map(([k, l]) => <span key={k}><span className="font-semibold text-ink">{l}</span> {shortDateTime(leg[k])}</span>)}
    </div>
  );
}

export { LEG_STATUS, dateTime };

export function MessageThread({ messages, onSend, sending, placeholder = 'Write a message…', viewerRole }) {
  const [text, setText] = useState('');
  const kindLabel = { clarification_request: 'Clarification requested', quote_change: 'Change requested', quote_decline: 'Declined', quote_accept: 'Accepted' };
  return (
    <div>
      <div className="space-y-3">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
        {messages.map((m) => {
          const mine = viewerRole === 'admin' ? m.author_role === 'admin' : m.author_role !== 'admin';
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-2xl px-4 py-2.5 text-sm', mine ? 'rounded-br-md bg-ink text-white' : 'rounded-bl-md bg-surface text-ink')}>
                {kindLabel[m.kind] && <div className={cn('mb-1 text-[10px] font-bold uppercase tracking-wider', mine ? 'text-primary' : 'text-primary')}>{kindLabel[m.kind]}</div>}
                <div className="whitespace-pre-wrap">{m.body}</div>
                <div className={cn('mt-1 text-[10px]', mine ? 'text-white/50' : 'text-muted-foreground')}>{m.author_role === 'admin' ? 'Encore Executive' : m.author_name} · {shortDateTime(m.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
      {onSend && (
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) onSend(text.trim(), () => setText('')); }}>
          <TextInput value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
          <PrimaryButton type="submit" loading={sending} className="shrink-0 px-4" aria-label="Send"><Send className="h-4 w-4" /></PrimaryButton>
        </form>
      )}
    </div>
  );
}
