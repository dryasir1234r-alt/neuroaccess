# Clinical AI Architecture

## Components (Part 15)

1. **Clinical AI Orchestrator** — `src/lib/ai/orchestrator.ts`. Runs the mandated 18-step flow.
2. **Authorised Context Builder** — assembles minimum-necessary context only after capability + consent checks.
3. **Consent Gateway** — `src/lib/ai/consultation.ts`. Blocks capture/processing without granted consent.
4. **Audio Ingestion Boundary** — not connected in this slice. Synthetic transcripts only.
5. **Transcription Worker** — synthetic only (`SYNTHETIC_TRANSCRIPT`).
6. **Speaker-Diarisation Layer** — speaker labels carried on synthetic segments.
7. **Consultation-State Engine** — typed state machine (`NOT_STARTED` … `SIGNED`/`FAILED`).
8. **Specialist Documentation Engines** — selected by `taskType` (assessment note, ADHD/Autism report, letters, message reply).
9. **Message-Drafting Engine** — three distinct drafts; never sends automatically.
10. **Evidence and Provenance Engine** — `src/lib/ai/grounding.ts` (`computeGrounding`).
11. **Missing-Information Engine** — `detectMissingInformation`.
12. **Contradiction Engine** — `detectContradictions`.
13. **Deterministic Safety Layer** — `runSafetyChecks` + `canApproveDraft`.
14. **Provider-Independent Model Gateway** — `src/lib/ai/gateway.ts`. Providers are replaceable.
15. **Human Review Gateway** — three-panel clinician interface (`/clinician/review`).
16. **AI Audit Engine** — `AIAuditEvent` model; orchestrator records every generation/denial.
17. **Evaluation Framework** — `docs/clinical-ai/EVALUATION_PLAN.md`.

## Non-negotiable boundaries

The AI must never diagnose, prescribe, determine dose, start/stop medication, sign,
send, share, make final risk decisions, conceal uncertainty, or infer unsupported facts.
Every output begins as `AI_DRAFT_REQUIRES_CLINICIAN_REVIEW`.

## Provider independence

Clinical workflow code depends only on the `ModelProvider` interface. The gateway is
the only place that knows provider names. No vendor SDK is imported by clinical code.
