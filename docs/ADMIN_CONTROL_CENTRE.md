# Admin Control Centre

## Purpose
Operate the clinic safely and efficiently without making clinical decisions.

## Admin jobs
Referral triage · registration validation · chasing missing information · assigning
and reassigning patients · allocating reviews · managing clinician capacity ·
managing appointments and waiting lists · monitoring incomplete intake · monitoring
operational deadlines · monitoring prescription logistics · monitoring payment
blockers · managing complaints · arranging cover · escalating clinical concerns ·
reviewing operational audit history.

## Required views
Queue · kanban · capacity · calendar · filtered data grid · exceptions ·
service-level monitoring · patient activity drawer. In this slice the referral queue
and task list are implemented at `src/app/(app)/admin/page.tsx`; the remaining views
are planned.

## Decision boundaries
Admin must be able to distinguish:
- **Operational** — triage, allocation, scheduling, logistics (admin may decide).
- **Clinical** — admin may escalate but must not decide unauthorised.
- **Financial** — admin flags payment blockers; finance resolves them.

These boundaries are surfaced explicitly in the UI so a user always knows which kind
of decision they are making.
