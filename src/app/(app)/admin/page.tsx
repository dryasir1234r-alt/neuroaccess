import { EmptyState, Panel, StatusChip } from '@/components/ui';
import { DEMO_PATIENTS, DEMO_TASKS, patientStageLabel } from '@/lib/demo/data';

/**
 * Admin Control Centre.
 *
 * Operational decisions only. Admin may escalate clinical matters but must not
 * make unauthorised clinical decisions. Clinical, operational and financial
 * decisions are visually and semantically distinguished.
 */
export default function AdminControlCentrePage() {
  const referrals = DEMO_PATIENTS.filter((p) => p.stage === 'LEAD');
  const adminTasks = DEMO_TASKS.filter((t) => t.owner === 'ADMIN' && t.status === 'OPEN');

  return (
    <main id="main" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Admin Control Centre</h1>
        <p className="mt-1 text-sm text-ink-600">
          Triage, allocation and operational oversight. You cannot make clinical decisions here.
        </p>
      </div>

      <Panel title="Referral queue" description="New referrals awaiting registration validation.">
        {referrals.length === 0 ? (
          <EmptyState title="No referrals waiting" hint="New referrals will appear here." />
        ) : (
          <ul className="space-y-3">
            {referrals.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-200 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{p.name}</p>
                  <p className="text-sm text-ink-600">{patientStageLabel(p.stage)}</p>
                  {p.blockers.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {p.blockers.map((b) => (
                        <li key={b}>
                          <StatusChip label={b} tone="warning" glyph="!" />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <span className="status-chip border-ink-300 bg-ink-100 text-ink-700">
                  <span aria-hidden="true">•</span>
                  <span>Operational decision</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="My operational tasks">
        {adminTasks.length === 0 ? (
          <EmptyState title="No open tasks" hint="Operational tasks assigned to you appear here." />
        ) : (
          <ul className="space-y-2">
            {adminTasks.map((t) => (
              <li key={t.id} className="rounded-md border border-ink-200 p-3 text-sm text-ink-800">
                {t.title}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Decision boundaries" description="What each type of decision covers.">
        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-ink-200 p-3">
            <dt className="text-sm font-semibold text-ink-900">Operational</dt>
            <dd className="text-sm text-ink-600">Triage, allocation, scheduling, logistics.</dd>
          </div>
          <div className="rounded-md border border-ink-200 p-3">
            <dt className="text-sm font-semibold text-ink-900">Clinical</dt>
            <dd className="text-sm text-ink-600">Escalate only. Never decide unauthorised.</dd>
          </div>
          <div className="rounded-md border border-ink-200 p-3">
            <dt className="text-sm font-semibold text-ink-900">Financial</dt>
            <dd className="text-sm text-ink-600">Payment blockers are flagged, not resolved here.</dd>
          </div>
        </dl>
      </Panel>
    </main>
  );
}
