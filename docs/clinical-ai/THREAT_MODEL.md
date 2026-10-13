# Clinical AI Threat Model

Method: STRIDE-style, scoped to the clinical AI layer.

| # | Threat | Vector | Mitigation | Status |
|---|--------|--------|------------|--------|
| T1 | Cross-patient disclosure | Wrong patient context in prompt | Capability + resource scoping; organisation isolation at query layer | Implemented (engine), DB RLS planned |
| T2 | Cross-organisation disclosure | Shared provider / IDOR | Organisation isolation in `authorizeResource` | Implemented |
| T3 | Prompt injection via document/message/transcript | Embedded instructions | `wrapUntrustedContent` + `scanForInjection`; content treated as data | Implemented, tested |
| T4 | Consent bypass | Starting capture without consent | State machine + orchestrator consent gate | Implemented, tested |
| T5 | Unsupported claim approved | Hallucinated statement signed | `computeGrounding` + `canApproveDraft` block approval | Implemented, tested |
| T6 | Silent contradiction resolution | Conflicting facts reconciled by AI | `detectContradictions` surfaces, never resolves | Implemented, tested |
| T7 | Missing information becomes reassuring text | Absence reframed positively | `detectMissingInformation`; template/absent stays visible | Implemented, tested |
| T8 | Model provider data exfiltration | Unapproved provider receives PHI | Provider policy; cloud disabled by default; flags gate providers | Implemented (policy + flags) |
| T9 | Audit tampering | Editing audit records | Append-only audit model; separate permissions | Partial (schema), WORM storage planned |
| T10 | Sensitive data in logs | Transcript/narrative logged | Redaction rules; audit records counts only | Implemented by design |
| T11 | Privilege escalation to sign/send | Direct API call | Signing/sending live only in separately-authorised Server Actions | Implemented |
| T12 | Denial of service on AI endpoints | Unbounded generation | Rate limiting boundary + feature flags | Planned |

## Residual risks
- No independent security review has been performed.
- No penetration test has been run.
- Database row-level security is designed but not yet applied as migrations.
These are tracked in `docs/governance/PRODUCTION_READINESS_GAPS.md`.
