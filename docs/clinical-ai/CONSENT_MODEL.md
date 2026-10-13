# Clinical AI Consent Model

## Principles
- Transcription NEVER starts automatically.
- Explicit, recorded consent is required before any capture or processing.
- Withdrawal is immediate, unilateral and always available.

## Recorded fields
Every consent record captures:

| Field | Purpose |
|-------|---------|
| patient | Who the consent concerns |
| encounter | Which consultation |
| type | `TRANSCRIPTION` (extensible) |
| wordingVersion | Which wording the patient agreed to |
| wording | The exact text shown |
| consentingPerson | Who consented |
| clinicianObtainingConsent | Who obtained it |
| grantedAt | Timestamp |
| restrictions | Any limits the patient set |
| withdrawnAt / withdrawnById | Withdrawal state |

Implemented in `src/lib/ai/consultation.ts` (`ConsentRecord`) and persisted via the
`Consent` Prisma model.

## Withdrawal behaviour
On `WITHDRAW_CONSENT`:
1. stop capture immediately;
2. prevent further transcription;
3. stop further AI processing;
4. apply the configured retention policy;
5. create an audit event;
6. prevent unapproved output from entering the clinical record.

The state machine transitions directly to `STOPPED`, and the orchestrator refuses
any further generation because `consentGranted` is false.

## Verification
`tests/consultation.test.ts` proves:
- listening cannot start without consent;
- processing cannot start without consent;
- withdrawal always stops capture;
- the full happy path to `SIGNED` is reachable.
