import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { dateOnly, gbp, shortDateTime } from '@/lib/format';
import { ErrorState, Logo, PageLoader } from '@/components/common';
import { InvoiceStatus } from '@/pages/customer';
import { Button } from '@/components/ui/button';

export default function InvoiceView({ back }) {
  const { id } = useParams();
  const { data: inv, isLoading, error } = useQuery({ queryKey: ['invoice', id], queryFn: () => api.get(`/account/invoices/${id}`) });
  if (error && !inv) return <ErrorState error={error} />;
  if (isLoading || !inv) return <PageLoader />;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to={back} className="text-sm font-semibold text-muted-foreground">← Invoices</Link>
        <Button variant="outline" className="rounded-full" onClick={() => window.print()}><Printer />Print / save PDF</Button>
      </div>
      <div className="rounded-2xl border bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div><Logo /><div className="mt-3 text-sm text-muted-foreground">{inv.company.base}<br />{inv.company.phone}</div></div>
          <div className="text-right">
            <div className="font-heading text-2xl font-bold">INVOICE</div>
            <div className="font-semibold">{inv.number}</div>
            <div className="mt-1"><InvoiceStatus status={inv.status} /></div>
          </div>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billed to</div><div className="mt-1 font-semibold">{inv.organisation_name}</div><div className="whitespace-pre-line text-sm text-muted-foreground">{inv.billing_address}</div><div className="text-sm text-muted-foreground">{inv.billing_email}</div></div>
          <div className="text-sm sm:text-right">
            <div><span className="text-muted-foreground">Issued</span> {dateOnly(inv.issued_at)}</div>
            <div><span className="text-muted-foreground">Period</span> {dateOnly(inv.period_start)} – {dateOnly(new Date(new Date(inv.period_end).getTime() - 1))}</div>
            <div><span className="text-muted-foreground">Due</span> <b>{dateOnly(inv.due_date)}</b></div>
            <div className="text-muted-foreground">{inv.payment_terms}</div>
          </div>
        </div>
        <table className="mt-8 w-full text-sm">
          <thead className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"><tr><th className="py-2">Date</th><th className="py-2">Journey</th><th className="py-2 text-right">Amount</th></tr></thead>
          <tbody className="divide-y">{inv.items.map((it) => <tr key={it.id}><td className="py-2.5">{shortDateTime(it.pickup_at)}</td><td className="py-2.5">{it.description}</td><td className="py-2.5 text-right">{gbp(it.amount)}</td></tr>)}</tbody>
          <tfoot><tr className="border-t-2 border-ink"><td colSpan={2} className="py-3 font-heading text-base font-bold">Total</td><td className="py-3 text-right font-heading text-base font-bold">{gbp(inv.total)}</td></tr></tfoot>
        </table>
        {inv.notes && <p className="mt-4 text-sm text-muted-foreground">{inv.notes}</p>}
        <p className="mt-8 text-xs text-muted-foreground">Thank you for choosing {inv.company.name}.</p>
      </div>
    </div>
  );
}
