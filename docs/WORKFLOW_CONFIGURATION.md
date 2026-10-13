# Workflow Configuration

## Principle
Organisation clinical policy must never be embedded directly in UI components.
Configuration is versioned, scoped, effective-dated, auditable and change-controlled.

## Settings model
Each configurable requirement takes one of three values:

- `REQUIRED` — must be satisfied before the dependent transition.
- `OPTIONAL` — may be provided; absence does not block.
- `DISABLED` — not collected at all.

Persisted via `OrganisationWorkflowConfig` with `version`, `effectiveFrom`,
`effectiveTo` and `actorId`.

## Configurable requirements
| Key | Applies to |
|-----|-----------|
| `structuredAdhdInterview` | Assessment |
| `structuredAutismInterview` | Assessment |
| `informantQuestionnaire` | Intake |
| `childhoodEvidence` | Assessment |
| `schoolRecords` | Intake |
| `gpSummary` | Intake |
| `physicalHealthHistory` | Assessment |
| `cardiovascularHistory` | Pre-prescribing |
| `baselineBP` | Pre-prescribing |
| `baselinePulse` | Pre-prescribing |
| `baselineWeight` | Pre-prescribing |
| `ecgReview` | Pre-prescribing |
| `substanceUseReview` | Assessment |
| `diagnosticReport` | Diagnosis |
| `feedbackAppointment` | Outcome |
| `mdtReview` | Diagnosis |
| `monitoringQuestionnaire` | Titration |
| `clinicianReviewBeforePrescribing` | Prescribing |
| `sharedCareReadinessReview` | Shared care |

## How it is consumed
1. The journey engine asks the workflow-config provider which prerequisites apply.
2. `REQUIRED` settings become prerequisites; `OPTIONAL` do not block; `DISABLED`
   settings are not collected and never surface as blockers.
3. UI reads configuration from the server; it never hard-codes policy.

## Change control
Every change records actor, reason, previous value, new value, scope and timestamp,
and writes an audit event. Changes are effective-dated so historical decisions can
be reconstructed.
