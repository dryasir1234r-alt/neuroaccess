# Branch Plan

## Naming
The repository had no established convention (greenfield). The directive's
suggested convention is adopted.

## Branch sequence
Branches are completed one at a time; each solves one problem.

| # | Branch | Scope | Status |
|---|--------|-------|--------|
| 1 | `chore/neuroassess-repository-lock` | Repository identity + audit | Done (docs) |
| 2 | `feat/platform-foundation` | Next.js app, Prisma schema, design system, app shell | Done (this slice) |
| 3 | `feat/feature-flag-engine` | Typed flag engine + registry | Done (this slice) |
| 4 | `feat/capability-permissions` | Capability engine + visibility | Done (this slice) |
| 5 | `feat/care-journey-engine` | Journey state machine | Done (this slice) |
| 6 | `feat/unified-patient-timeline` | Normalised timeline | Scaffolded (schema + drafts) |
| 7 | `feat/unified-application-shell` | One shell, four workstations | Done (this slice) |
| 8–11 | patient/clinician/admin/finance workspaces | Workstation UIs | Done (this slice) |
| 12 | `feat/adhd-assessment-workflow` | Assessment + AI note | Done (this slice) |
| 17 | `feat/clinical-ai-foundation` | AI orchestrator, gateway, grounding | Done (this slice) |
| 18 | `feat/consultation-transcription` | Consultation state + consent | Done (synthetic) |
| 19 | `feat/clinical-note-assistant` | Note drafting | Done (synthetic) |
| 20 | `feat/specialist-documentation-engines` | Report/letter/titration engines + registry | Done (this slice) |
| 21 | `feat/message-reply-drafts` | Three-draft message engine + send gate | Done (this slice) |
| 22 | `feat/transcript-evidence-review` | Three-panel review | Done (this slice) |
| 23 | `feat/ai-clinical-safety` | Safety layer + approval gate | Done (this slice) |
| 24–28 | hardening/* | Performance, security, a11y, observability, governance | Planned |

## Working branch
All work for the current session is committed to `cline/ftreetng` (the sandbox
backup branch) so nothing is lost. The branch sequence above documents how the
work would be split into controlled, reviewable branches before merge to `main`.

## Rules per branch
Every branch must include: problem statement, scope, acceptance criteria, affected
files, database changes, permission changes, tests, documentation, migration
instructions, manual validation and rollback procedure.
