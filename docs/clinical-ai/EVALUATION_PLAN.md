# AI Evaluation Plan

## Objectives
Prove the AI layer is safe, grounded and useful before any real clinical use.

## Datasets
- **Synthetic only.** No real patient data may enter evaluation data (Part 23).
- Synthetic transcripts with deliberately injected contradictions, missing topics,
  unsupported claims and prompt-injection payloads.

## Metrics
| Metric | Definition | Target |
|--------|------------|--------|
| Grounding rate | Statements with valid provenance / total statements | 100% for material statements |
| Unsupported-claim rate | Unsupported statements / total | 0% at signing |
| Contradiction recall | Injected contradictions detected | 100% |
| Missing-information recall | Injected missing topics detected | 100% |
| Injection containment | Injection payloads that fail to influence output | 100% |
| Clinician rejection rate | Drafts rejected by clinicians | Tracked, not targeted |
| Safety-check pass rate | Enhanced-review triggers correctly raised | 100% of injected triggers |

## Current automated coverage
- `tests/ai-grounding.test.ts` — grounding, unsupported claims, contradictions,
  missing information, safety, approval gate.
- `tests/vertical-slice.test.ts` — end-to-end generation, contradiction handling,
  provider failure, consent denial.
- `tests/prompt-injection.test.ts` — injection detection and envelope escaping.

## Not yet measured
- Real-world clinician acceptance.
- Inter-model agreement.
- Bias and fairness across demographic groups.
These require clinical governance approval before they can be designed.
