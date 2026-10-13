# Finance Workspace

## Purpose
Manage the financial lifecycle using the same appointments and patient records.

## Capabilities
Invoices · payments · failed payments · refunds · subscriptions · payment plans ·
reconciliation · clinician earnings · financial exports · revenue reporting ·
financial blockers.

## Data minimisation
- Clinical users see only the financial status needed for care coordination.
- Finance users must **not** see clinical narrative without an explicit additional
  permission.
- The finance workspace never renders clinical notes, transcripts or assessments.

Implemented at `src/app/(app)/finance/page.tsx`, which displays invoice status only
and labels patients by a non-clinical reference.

## Capabilities required
`finance:invoice:read`, `finance:invoice:create`, `finance:payment:process`,
`finance:reconciliation:run`, `finance:earnings:read`, `finance:export:generate`,
`finance:report:read`.

## Blockers
Financial blockers (e.g. failed payment) are surfaced to operations for coordination
via the journey blocker mechanism; they do not silently block clinical care unless the
organisation configures them to.
