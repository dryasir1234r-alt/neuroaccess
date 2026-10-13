import { EmptyState, Panel, PrimaryAction, StatusChip } from '@/components/ui';
import {
  DEMO_PATIENTS,
  DEMO_TIMELINE,
  DEMO_TASKS,
  patientStageLabel,
} from '@/lib/demo/data';

/**
 * Patient Workspace.
 *
 * Prioritised dynamically by stage, urgency and blockers - not a static card
 * grid. Plain language only; no internal queues, no unapproved documents, no
 * hidden clinical notes, and no information belonging to another patient.
 */
export default function PatientWorkspacePage() {
  // Synthetic: the signed-in patient is always patient_1 in this slice.
  const patient = DEMO_PATIENTS.find((p) => p.id === 'patient_1');
  if (!patient) return null;

  const myTasks = DEMO_TASKS.filter((t) => t.patientId === patient.id && t.status === 'OPEN');
  const timeline = DEMO_TIMELINE.filter(
    (e) => e.patientId === patient.id && e.visibility === 'PATIENT',
  );

  const nextAction = myTasks[0];

  return (
    <main id="main" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-950">Your care</h1>
        <p className="mt-1 text-sm text-ink-600">Hello {patient.name.split(' ')[0]}.</p>
      </div>

      {/* 1. Current care stage in plain language */}
      <Panel title="Where you are now" description="This is your current stage in your care.">
        <StatusChip label={patientStageLabel(patient.stage)} tone="info" glyph="→" />
      </Panel>

      {/* 2. Most important next action - exactly one primary action */}
      <Panel
        title="Your next step"
        description="Do this first. Everything else can wait."
        actions={nextAction ? <PrimaryAction href="/patient">Start</PrimaryAction> : undefined}
      >
        {nextAction ? (
          <p className="text-sm text-ink-800">{nextAction.title}</p>
        ) : (
          <EmptyState
            title="Nothing needs your attention"
            hint="We will let you know when there is something to do."
          />
        )}
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Upcoming appointment">
          <EmptyState title="No appointment booked" hint="Your clinic will contact you to arrange one." />
        </Panel>
        <Panel title="Messages">
          <EmptyState title="No unread messages" hint="You can message your care team any time." />
        </Panel>
      </div>

      <Panel title="Your recent history" description="Only information shared with you is shown.">
        {timeline.length === 0 ? (
          <EmptyState title="Nothing to show yet" hint="Updates will appear here as your care progresses." />
        ) : (
          <ol className="space-y-3">
            {timeline.map((event) => (
              <li key={event.id} className="rounded-md border border-ink-200 p-3">
                <p className="text-sm font-medium text-ink-900">{event.title}</p>
                <p className="text-sm text-ink-600">{event.summary}</p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </main>
  );
}
