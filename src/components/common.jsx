import { forwardRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAYMENT_STATUS, STATUS } from '@/lib/format';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function Logo({ dark = false, className }) {
  return (
    <div className={cn('flex items-center gap-2.5 select-none', className)}>
      <img src="/images/logo.png" alt="Encore" className="h-9 w-9 rounded-xl object-contain" />
      <div className="leading-none">
        <div className={cn('font-heading text-[15px] font-bold tracking-wide', dark ? 'text-white' : 'text-ink')}>ENCORE</div>
        <div className={cn('text-[10px] font-semibold tracking-[0.22em]', dark ? 'text-white/60' : 'text-muted-foreground')}>EXECUTIVE</div>
      </div>
    </div>
  );
}

const TONES = {
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  blue: 'bg-sky-100 text-sky-800 ring-sky-200',
  green: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  brand: 'bg-orange-100 text-orange-800 ring-orange-200',
  dark: 'bg-neutral-900 text-white ring-neutral-900',
  grey: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  red: 'bg-red-100 text-red-700 ring-red-200',
};

export function Pill({ tone = 'grey', children, className }) {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', TONES[tone], className)}>{children}</span>;
}

export function StatusBadge({ status, admin = false, className }) {
  const s = STATUS[status] || { label: status, tone: 'grey' };
  return <Pill tone={s.tone} className={className}>{admin ? s.admin : s.label}</Pill>;
}

export function PaymentBadge({ status }) {
  const s = PAYMENT_STATUS[status] || { label: status, tone: 'grey' };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function Spinner({ className }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-muted-foreground', className)} />;
}

export function PageLoader() {
  return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="h-7 w-7" /></div>;
}

export function ErrorState({ error }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error?.message || 'Something went wrong.'}</div>;
}

export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-6 py-12 text-center">
      {Icon && <Icon className="mb-3 h-8 w-8 text-muted-foreground" />}
      <div className="font-heading text-base font-semibold">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cn('mb-5 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className, bodyClassName }) {
  return (
    <section className={cn('rounded-2xl border bg-white shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <h2 className="font-heading text-[15px] font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function KV({ label, children, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-words text-sm text-ink">{children ?? '—'}</div>
    </div>
  );
}

export function Field({ label, error, hint, children, className, required }) {
  return (
    <label className={cn('block', className)}>
      {label && <span className="mb-1.5 block text-sm font-medium text-ink">{label}{required && <span className="text-primary"> *</span>}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

const inputCls = 'block w-full rounded-xl border border-input bg-white px-3.5 text-[15px] text-ink shadow-sm transition placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-neutral-50 disabled:text-muted-foreground';

export const TextInput = forwardRef(function TextInput({ className, invalid, ...props }, ref) {
  return <input ref={ref} className={cn(inputCls, 'h-11', invalid && 'border-red-400', className)} {...props} />;
});

export const TextArea = forwardRef(function TextArea({ className, invalid, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(inputCls, 'py-2.5', invalid && 'border-red-400', className)} {...props} />;
});

export const SelectInput = forwardRef(function SelectInput({ className, invalid, children, ...props }, ref) {
  return <select ref={ref} className={cn(inputCls, 'h-11 pr-8', invalid && 'border-red-400', className)} {...props}>{children}</select>;
});

export function PrimaryButton({ className, loading, children, ...props }) {
  return (
    <Button className={cn('h-11 rounded-xl px-5 text-[15px] font-semibold', className)} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="animate-spin" />}{children}
    </Button>
  );
}

export function Stat({ label, value, tone, to, icon: Icon }) {
  const body = (
    <div className={cn('rounded-2xl border bg-white p-4 shadow-sm transition', to && 'hover:border-primary/40 hover:shadow')}>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}{Icon && <Icon className="h-4 w-4" />}
      </div>
      <div className={cn('mt-2 font-heading text-3xl font-bold', tone === 'alert' && Number(value) > 0 ? 'text-primary' : 'text-ink')}>{value}</div>
    </div>
  );
  return body;
}

/** Mutation with toast feedback, field errors and query invalidation. */
export function useAction(fn, { success, invalidate = [], onSuccess, onError } = {}) {
  const qc = useQueryClient();
  const [fields, setFields] = useState({});
  const m = useMutation({
    mutationFn: fn,
    onMutate: () => setFields({}),
    onSuccess: (data, vars) => {
      if (success) toast.success(typeof success === 'function' ? success(data, vars) : success);
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
      onSuccess?.(data, vars);
    },
    onError: (err, vars) => {
      setFields(err.fields || {});
      if (onError?.(err, vars) !== true) toast.error(err.message);
    },
  });
  return { ...m, fields, setFields };
}

export function Modal({ open, onOpenChange, title, description, children, footer, wide }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[92vh] overflow-y-auto rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter className="gap-2">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

export function Banner({ tone = 'amber', icon: Icon, title, children, className }) {
  const styles = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    blue: 'border-sky-200 bg-sky-50 text-sky-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    red: 'border-red-200 bg-red-50 text-red-800',
    dark: 'border-neutral-800 bg-neutral-900 text-white',
  };
  return (
    <div className={cn('flex gap-3 rounded-2xl border p-4', styles[tone], className)}>
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 text-sm">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
    </div>
  );
}
