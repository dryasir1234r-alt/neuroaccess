# AI Audit Model

## What is recorded
Every AI action writes an `AIAuditEvent` (`prisma/schema.prisma`) with:
- `actorId`, `patientId`, `draftId`, `transcriptId`
- `action` (e.g. `ai.generate.draft_created`, `ai.generate.denied`, `ai.generate.failed`)
- `modelProvider`
- `detail` (counts and reasons only — never narrative text)
- `correlationId`

## Actions recorded
| Action | Trigger |
|--------|---------|
| `ai.generate.draft_created` | A draft was produced |
| `ai.generate.denied` | Capability or consent check failed |
| `ai.generate.failed` | Model provider failure |

## Privacy
Audit detail records **counts and reasons**, not content. Specifically recorded:
unsupported statement count, contradiction count, missing-information count,
enhanced-review flag. Never recorded: transcript text, clinical narrative, prompts.

## Retention
AI audit events follow the organisation retention policy. Transcript retention is
governed separately (see `TRANSCRIPT_RETENTION.md`).

## Review
`aiAuditReview` (flag, DISABLED by default) gates the AI audit review interface for
users holding `ai:audit:read`.
