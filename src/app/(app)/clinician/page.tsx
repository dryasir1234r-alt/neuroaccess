import Link from 'next/link';
import { EmptyState, Panel, StatusChip } from '@/components/ui';
import { DEMO_PATIENTS, DEMO_TASKS, patientStageLabel } from '@/lib/demo/data';

/**
 * Clinician Workstation.
 *
 * Pending work across the clinician's caseload, with a persistent patient
 * context header and a link into the three-panel AI review interface.
 */
export default function ClinicianWorkstationPage() {
  const clinicianTasks = DEMO_TASKS.filter((t) => t.owner === 'CLINICIAN' && t.status === 'OPEN');
  const caseload = DEMO_PATIENTS.filter((p) => p.assignedClinician !== null);

  return (
    <main id="main" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Clinician Workstation</h1>
        <p className="mt-1 text-sm text-ink-600">
          Work needing clinical attention. AI outputs are drafts only and always require your review.
        </p>
      </div>

      <Panel title="Needs your action" description="Highest priority first.">
        {clinicianTasks.length === 0 ? (
          <EmptyState title="Nothing outstanding" hint="Clinical work assigned to you appears here." />
        ) : (
          <ul className="space-y-3">
            {clinicianTasks.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-200 p-3"
              >
                <span className="text-sm text-ink-800">{t.title}</span>
                {t.title.toLowerCase().includes('assessment note') ? (
                  <Link
                    href="/clinician/review"
                    className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
                  >
                    Review AI draft
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Caseload" description="Patients allocated to you, with current care stage.">
        <ul className="space-y-3">
          {caseload.map((p) => (
            <li key={p.id} className="rounded-md border border-ink-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-900">{p.name}</span>
                <StatusChip label={patientStageLabel(p.stage)} tone="info" glyph="→" />
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Persistent context: verified identity · allocated clinician · next appointment ·
                observations due · open blockers.
              </p>
            </li>
          ))}
        </ul>
      </Panel>
    </main>
  );
}
