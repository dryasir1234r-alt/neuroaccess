import { EmptyState, Panel, StatusChip } from '@/components/ui';

/**
 * Finance Workspace.
 *
 * Data minimisation: finance users see financial status only. Clinical
 * narrative is NOT visible here without an explicit additional permission.
 */
export default function FinanceWorkspacePage() {
  const invoices: readonly {
    id: string;
    reference: string;
    amountPence: number;
    status: 'PAID' | 'DUE' | 'FAILED';
    patientLabel: string;
  }[] = [
    { id: 'inv_1', reference: 'INV-1001', amountPence: 25000, status: 'PAID', patientLabel: 'Patient A' },
    { id: 'inv_2', reference: 'INV-1002', amountPence: 25000, status: 'DUE', patientLabel: 'Patient B' },
    { id: 'inv_3', reference: 'INV-1003', amountPence: 15000, status: 'FAILED', patientLabel: 'Patient C' },
  ];

  const money = (pence: number) => `£${(pence / 100).toFixed(2)}`;

  return (
    <main id="main" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Finance Workspace</h1>
        <p className="mt-1 text-sm text-ink-600">
          Financial lifecycle only. Clinical records are not displayed here.
        </p>
      </div>

      <Panel title="Invoices" description="Financial status only; no clinical narrative is shown.">
        {invoices.length === 0 ? (
          <EmptyState title="No invoices" hint="Invoices appear here once raised." />
        ) : (
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Invoices and their payment status</caption>
            <thead>
              <tr className="text-left text-ink-600">
                <th scope="col" className="border-b border-ink-200 py-2">Reference</th>
                <th scope="col" className="border-b border-ink-200 py-2">Patient</th>
                <th scope="col" className="border-b border-ink-200 py-2">Amount</th>
                <th scope="col" className="border-b border-ink-200 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="border-b border-ink-100 py-2 font-medium text-ink-900">{inv.reference}</td>
                  <td className="border-b border-ink-100 py-2 text-ink-700">{inv.patientLabel}</td>
                  <td className="border-b border-ink-100 py-2 text-ink-700">{money(inv.amountPence)}</td>
                  <td className="border-b border-ink-100 py-2">
                    <StatusChip
                      label={inv.status}
                      tone={inv.status === 'PAID' ? 'success' : inv.status === 'FAILED' ? 'danger' : 'warning'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Financial blockers" description="Blockers surfaced to operations for coordination.">
        <ul className="space-y-2">
          <li className="rounded-md border border-ink-200 p-3 text-sm text-ink-800">
            INV-1003 payment failed &mdash; retry required.
          </li>
        </ul>
      </Panel>
    </main>
  );
}
