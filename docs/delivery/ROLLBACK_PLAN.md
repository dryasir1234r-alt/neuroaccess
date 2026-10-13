# Rollback Plan

## Principle
Every new capability is protected by a server-side feature flag. The fastest and
safest rollback is to flip the flag, not to redeploy.

## Emergency kill switch (fastest)
Activate the emergency kill switch for a capability. Resolution priority #1 in the
flag engine means this wins over every other setting, in every environment, for
every user. Effective immediately, server-side.

Example flags and their effect:
| Flag | Disables |
|------|----------|
| `clinicalAiEnabled` | All AI generation |
| `consultationTranscription` | Transcription |
| `clinicalNoteDrafting` | Note drafting |
| `careJourneyEngine` | Journey transitions |
| `adhdAssessmentWorkflow` | Assessment workflow |

## Per-capability rollback
Set the organisation override to `DISABLED`. Existing data is untouched; only new
actions are blocked.

## Code rollback
Redeploy the previous known-good deployment. Because flags gate behaviour, code
rollback is rarely necessary.

## Schema rollback
Migrations are forward-only in production. Rollback = restore the pre-migration
snapshot, then redeploy the previous application version. See `MIGRATION_PLAN.md`.

## Data safety
No rollback path deletes clinical records. Signed notes remain versioned and
locked; amendments create new versions.

## Validation after rollback
1. Confirm the affected route returns the disabled/empty state.
2. Confirm server actions reject with `FEATURE_DISABLED`.
3. Confirm an audit event was written for the flag change.
4. Re-run `npm test` against the deployed revision.
