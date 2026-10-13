# Clinical AI Safety Boundaries

## Absolute prohibitions
The AI must never:
- diagnose autonomously;
- prescribe or issue prescriptions;
- determine dose;
- start or stop medication;
- sign documentation;
- send patient messages;
- share reports;
- make final risk decisions;
- conceal uncertainty;
- infer unsupported facts;
- replace clinician judgement.

These are enforced structurally: the orchestrator has no capability to sign, send or
share. Those actions live only behind human-review Server Actions requiring
`clinical:note:sign` / `clinical:message:reply`. The message send gate is
`canSendMessageDraft` (`src/lib/ai/message-drafts.ts`): it requires the
`clinical:message:reply` capability, a passed approval gate, an accepted
attestation and a sendable draft status, and it only ever returns a decision — it
performs no send.

## Evidence classifications
Every generated statement carries one of:
`DIRECT_TRANSCRIPT`, `STRUCTURED_RECORD`, `CLINICIAN_ENTERED`, `CALCULATED`,
`TEMPLATE_LANGUAGE`, `AI_SYNTHESIS`, `UNSUPPORTED`.

Rules:
- `UNSUPPORTED` statements cannot be approved.
- `AI_SYNTHESIS` requires source references.
- Material statements require provenance.
- Missing information remains missing.
- Lack of documentation is never converted into a reassuring statement.
- Conflicts are displayed, never silently reconciled.
- The clinician can inspect sources sentence by sentence.

## Approval gate
`canApproveDraft` blocks signing when any of the following hold:
- unsupported statements exist;
- statements lack valid provenance;
- unresolved contradictions exist;
- required information is missing;
- safety checks did not pass.

Implemented in `src/lib/ai/grounding.ts`; verified by `tests/ai-grounding.test.ts`
and `tests/vertical-slice.test.ts`.

## Enhanced-review triggers
Controlled medication, medication change, possible adverse effect, cardiovascular
symptoms, pregnancy, severe headache, suicidality, safeguarding, psychosis, mania,
substance dependence, legal communication and formal complaints all raise
`enhancedReviewRequired`.

## Untrusted content
Uploaded documents, messages and transcripts are untrusted data. Instruction-like
content is detected and wrapped in an explicit data envelope
(`src/lib/ai/untrusted.ts`) so it can never control the system.
