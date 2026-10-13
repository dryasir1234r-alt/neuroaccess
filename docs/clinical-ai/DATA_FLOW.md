# Clinical AI Data Flow

```
Consultation (synthetic in this slice)
        │
        ▼
Consent Gateway ──(no consent)──▶ BLOCKED + audit event
        │ (consent granted)
        ▼
Transcript (synthetic, speaker-labelled, timestamped)
        │
        ▼
Orchestrator
  1. authenticate requester
  2. verify capability (clinical:ai:generate)
  3. verify feature flag (clinicalNoteDrafting / clinicalAiEnabled)
  4. verify consent + purpose
  5. build minimum-necessary context
  6. classify task → specialist engine
  7. pre-generation safety check
  8. model gateway call (provider-independent)
  9. require structured output
 10. validate output schema
 11. compute grounding (per-statement provenance)
 12. detect unsupported claims
 13. detect contradictions
 14. determine missing information
 15. post-generation safety check
 16. persist auditable draft
 17. return to human review interface
        │
        ▼
Clinician review (3 panels) ──▶ edit ──▶ attest ──▶ sign
        │
        ▼
Versioned, locked clinical note + timeline event + audit event
```

## What leaves the boundary
- **Never** in this slice: real audio, real video, real patient content, live cloud
  model processing of clinical data.
- Only synthetic transcript text and synthetic structured records are processed.

## What is never logged
Full transcript text, clinical narrative, passwords, tokens, unnecessary identifiers,
or model prompts containing sensitive information. Audit events record counts and
identifiers only (see `docs/clinical-ai/AI_AUDIT_MODEL.md`).
