# Production Readiness Gaps

This document is deliberately honest. Implementing a control does not constitute
legal, regulatory or clinical compliance. Nothing here should be read as a
compliance claim.

## Implemented
- Capability-based, deny-by-default permission engine (`src/lib/permissions/engine.ts`).
- Organisation isolation and cross-patient isolation in the resource authoriser.
- Typed care-journey state machine with optimistic concurrency and idempotency hooks.
- Typed, server-side feature-flag engine with emergency kill switch, environment,
  organisation, capability, user-override, rollout and default resolution.
- Clinical AI orchestrator with consent gate, provider-independent gateway,
  evidence mapping, contradiction detection, missing-information detection,
  deterministic safety layer and approval gate.
- Untrusted-content envelope + prompt-injection detection.
- Consultation consent state machine with immediate withdrawal.
- Synthetic transcript workflow end to end.
- Audit model for AI actions (counts/reasons only).
- Strict TypeScript, no `any` in domain code, exhaustive enum handling.
- 46 automated tests, all passing; production build succeeds.

## Partially implemented
- **Authentication/MFA**: capability model is complete; NextAuth wiring is
  scaffolded via dependencies but not yet wired to real credentials/OAuth.
- **Timeline**: model + draft events exist; query/policy layer partially built.
- **Audit**: append-only schema exists; tamper-evident/WORM storage not yet applied.
- **Document security**: signed-URL and malware-scan boundaries are modelled
  (`Document.scanStatus`), not implemented.
- **Observability**: structured logging and correlation IDs are designed; runtime
  wiring (OpenTelemetry/Pino) not yet added.
- **Row-level security**: designed, not yet applied as Postgres policies.

## Planned
- Playwright browser E2E and axe accessibility automation.
- Database integration tests against a live Postgres.
- Rate limiting, CSRF double-submit, CORS allow-list enforcement at runtime.
- Session revocation UI and break-glass access with reason + audit.
- Virtualised queues/timelines; streaming SSR; background job processing.
- Load and performance testing.

## Requiring clinical approval
- Any real use of AI-generated content in clinical documentation.
- Diagnostic criteria mappings and report templates.
- Titration workflow defaults, monitoring intervals and safety thresholds.
- Enhanced-review trigger list and escalation routes.
- Annual-review and shared-care readiness criteria.

## Requiring legal approval
- Consent wording (`CONSENT_WORDING`, version `v1.0`).
- Data-processing agreements with any cloud model provider.
- Retention and deletion policy specifics.
- Terms for GP shared care and courier fulfilment.

## Requiring information-governance approval
- Any connection of real audio or real patient content.
- Any cloud model provider processing clinical data.
- Cross-border data transfer for AI processing.
- Retention periods and purge schedules for transcripts and AI drafts.

## Unverified
- Security posture under adversarial conditions (no penetration test).
- Accessibility conformance (no automated or manual audit run yet).
- Performance under realistic load.
- Behaviour with real (non-synthetic) transcripts.
- Cross-model robustness and bias.

## Explicit non-claims
This project does **not** claim compliance with UK GDPR, DPA 2018, NHS DSPT,
MHRA, or any clinical standard. Those determinations require the approvals listed
above.
