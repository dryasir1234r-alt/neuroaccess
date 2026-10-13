# Clinician Workstation

## Purpose
Help clinicians complete safe clinical work with less administrative burden.

## Default view
Today's schedule · consultations ready to start · patients needing action ·
incomplete notes · reports requiring review · prescriptions requiring action ·
unanswered messages · abnormal or missing monitoring · MDT outcomes requiring
action · shared-care tasks · overdue work. Implemented at
`src/app/(app)/clinician/page.tsx`.

## Unified patient record sections
Overview · Timeline · Intake · Assessment · Diagnosis · Medication · Titration ·
Monitoring · Appointments · Consultation · Messages · Documents · Reports ·
Prescriptions · Shared Care · Risk and Safeguarding · Administration · Relevant
Payment Status.

## Persistent patient context header
Verified identity · current care stage · allocated clinician · active treatment ·
observations due · next appointment · open blockers · authorised clinical alerts ·
permitted quick actions.

## Documentation functions
Autosave · draft recovery · structured fields · narrative fields · templates ·
version history · sign and lock · amendment workflow · task generation · handover ·
MDT escalation · report generation · prescribing workflow · end-of-titration review ·
shared-care preparation.

## Consequential actions
Every consequential action requires a review screen. Signing is versioned and
locked; amendment creates a new version. See `docs/clinical-ai/HUMAN_REVIEW_WORKFLOW.md`.

## AI review
The three-panel review interface lives at `/clinician/review`.
