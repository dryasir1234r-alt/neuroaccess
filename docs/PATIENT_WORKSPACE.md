# Patient Workspace

## Purpose
Reduce executive-function burden and let people manage their care without
understanding the clinic's internal structure.

## Primary jobs
Understand current status · understand the next action · book/manage appointments ·
join video consultations · complete forms · upload documents · provide monitoring ·
send messages · request repeat prescriptions · track prescriptions · track delivery ·
view approved reports · view plain-language care plans · pay invoices · raise
concerns or complaints.

## Dashboard priority (dynamic, not a static grid)
1. Current care stage in plain language
2. Most important next action (exactly one primary action)
3. Upcoming appointment
4. Medication summary (where applicable)
5. Prescription and delivery status
6. Outstanding questionnaires
7. Monitoring required
8. Unread messages
9. Payment action
10. Approved reports

The order is recomputed from stage, urgency and blockers. In this slice the
implementation is at `src/app/(app)/patient/page.tsx`.

## Design requirements
Mobile-first · one clear primary action per section · save and return · plain
language · low visual noise · persistent progress · accessible reminders · clear
completed and failure states.

## Explicit exclusions
No unexplained internal terminology · no internal queues · no unapproved documents ·
no hidden clinical notes · no information belonging to another patient.
