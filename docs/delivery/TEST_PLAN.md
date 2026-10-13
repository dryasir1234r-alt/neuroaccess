# Test Plan

## Layers
| Layer | Tool | Location |
|-------|------|----------|
| Unit | Vitest | `tests/*.test.ts` |
| State-machine | Vitest | `tests/journey-engine.test.ts`, `tests/consultation.test.ts` |
| Permission | Vitest | `tests/permissions.test.ts` |
| Feature flag | Vitest | `tests/feature-flags.test.ts` |
| AI grounding | Vitest | `tests/ai-grounding.test.ts` |
| Prompt injection | Vitest | `tests/prompt-injection.test.ts` |
| End-to-end (slice) | Vitest | `tests/vertical-slice.test.ts` |
| Component / a11y / browser E2E | Planned | Playwright + axe (not yet added) |

## Critical scenarios (Part 24) and current coverage
| # | Scenario | Covered by |
|---|----------|------------|
| 1 | Referral to intake | `vertical-slice.test.ts` |
| 2 | Intake to assessment | `vertical-slice.test.ts` |
| 3 | Admin assignment | `journey-engine.test.ts` |
| 6 | Clinician assessment | `vertical-slice.test.ts` |
| 7 | Assessment outcome | `vertical-slice.test.ts` |
| 17 | Transcript to approved note | `vertical-slice.test.ts` |
| 19 | Permission denial | `permissions.test.ts` |
| 20 | Feature kill switch | `feature-flags.test.ts` |
| 22 | Model-provider failure | `vertical-slice.test.ts` |
| 24 | Cross-patient access attempt | `permissions.test.ts` |
| 25 | Prompt injection in a document | `prompt-injection.test.ts` |
| — | Consent gate / withdrawal | `consultation.test.ts` |
| — | Unsupported claims / contradictions / missing info | `ai-grounding.test.ts` |

## Not yet automated (honest gaps)
- Browser end-to-end (Playwright) for the UI flows.
- Automated accessibility (axe) checks.
- Database integration tests against a live Postgres.
- Load/performance tests.
- Full set of 25 scenarios (remaining ones are planned).

## Gate
Failed safety, permission or patient-isolation tests block release.

## Running
```bash
npm test            # unit + slice suite
npm run typecheck   # strict TypeScript
npx prisma validate # schema
npx next build      # production build
```
