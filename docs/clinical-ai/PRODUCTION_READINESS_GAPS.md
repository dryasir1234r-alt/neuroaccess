# Clinical AI Production Readiness Gaps

The canonical, organisation-wide production-readiness register lives at
[`docs/governance/PRODUCTION_READINESS_GAPS.md`](../governance/PRODUCTION_READINESS_GAPS.md).

This file records the AI-specific subset so the clinical-AI documentation set is
self-contained.

## Implemented (AI)
- Consent gateway; transcription cannot start or process without consent.
- Consultation state machine with immediate withdrawal.
- Provider-independent model gateway; clinical code has no vendor dependency.
- Orchestrator with the mandated 18-step flow.
- Evidence/provenance engine; per-statement classification.
- Contradiction detection (surfaced, never resolved).
- Missing-information detection (stays visibly missing).
- Deterministic safety layer + approval gate.
- Untrusted-content envelope and prompt-injection detection.
- AI audit events (counts/reasons only; never narrative).
- Synthetic transcript workflow end to end.

## Partially implemented (AI)
- Message-reply assistant (three-draft design specified; engine not yet wired).
- Titration/medication-review drafting engines (types defined; generation pending).
- Report/letter engines (registry exists; generation pending).
- AI audit review interface (flag + capability exist; UI pending).

## Requiring clinical approval (AI)
- Any real use of AI-generated content in clinical documentation.
- Enhanced-review trigger list and escalation routes.
- Report/letter templates and diagnostic criteria mapping.

## Requiring information-governance approval (AI)
- Connecting real audio or real patient content.
- Enabling any approved cloud model provider on clinical data.
- Cross-border transfer for AI processing.
- Transcript and AI-draft retention/purge schedules.

## Unverified (AI)
- Behaviour with real transcripts.
- Clinician acceptance rate.
- Bias/fairness across demographics.
- Adversarial robustness beyond the prompt-injection unit tests.

## Non-claim
Nothing here constitutes a compliance claim. No real clinical data has been processed.
