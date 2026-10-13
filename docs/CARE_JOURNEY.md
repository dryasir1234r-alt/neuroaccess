# NeuroAssess Care Journey State Machine

## Journey Stages

```typescript
type JourneyStage =
  | 'LEAD'
  | 'BOOKED'
  | 'TRIAGE'
  | 'INTAKE'
  | 'ASSESSMENT'
  | 'MORE_INFORMATION_REQUIRED'
  | 'DIAGNOSIS_REVIEW'
  | 'DIAGNOSIS_CONFIRMED'
  | 'DIAGNOSIS_NOT_CONFIRMED'
  | 'ECG_REQUESTED'
  | 'MDT_REVIEW'
  | 'TITRATION'
  | 'PRESCRIBING'
  | 'MAINTENANCE'
  | 'SHARED_CARE'
  | 'ANNUAL_REVIEW'
  | 'OUTCOME'
  | 'DISCHARGE';
```

## Stage Definitions

| Stage | Description | Entry Criteria | Exit Criteria |
|-------|-------------|----------------|---------------|
| LEAD | Initial referral received | Referral created | Registration validated |
| BOOKED | Appointment scheduled | Admin validates registration | Intake appointment attended |
| TRIAGE | Clinical triage assessment | Patient attends triage | Triage complete, pathway determined |
| INTAKE | Questionnaires & document collection | Triage complete | All required intake complete |
| ASSESSMENT | Clinical assessment consultation | Intake complete | Assessment consultation done |
| MORE_INFORMATION_REQUIRED | Missing info blocking progress | Blocker identified | Missing info provided |
| DIAGNOSIS_REVIEW | Clinician reviewing evidence | Assessment complete | Diagnosis decision made |
| DIAGNOSIS_CONFIRMED | ADHD and/or Autism diagnosed | Diagnosis confirmed | Treatment planning starts |
| DIAGNOSIS_NOT_CONFIRMED | Diagnosis not supported | Diagnosis rejected | Feedback provided, discharge or redirect |
| ECG_REQUESTED | Cardiac screening required | Cardiovascular risk identified | ECG results received |
| MDT_REVIEW | Multi-disciplinary team review | Complex case or disagreement | MDT consensus reached |
| TITRATION | Medication dose optimisation | Prescribing initiated | Stable effective dose reached |
| PRESCRIBING | Prescription management | Medication indicated | Prescription issued |
| MAINTENANCE | Stable ongoing treatment | Titration complete | Annual review due or change needed |
| SHARED_CARE | GP shared care arrangement | Stable on treatment | GP agreement, annual review |
| ANNUAL_REVIEW | Yearly comprehensive review | 12 months since last review | Review complete |
| OUTCOME | Final outcome recorded | Care episode ending | Discharge or transfer |
| DISCHARGE | Patient discharged | Outcome recorded | No further active care |

## Valid Transitions

```mermaid
LEAD --> BOOKED
LEAD --> TRIAGE
BOOKED --> TRIAGE
BOOKED --> INTAKE
TRIAGE --> INTAKE
TRIAGE --> MORE_INFORMATION_REQUIRED
INTAKE --> ASSESSMENT
INTAKE --> MORE_INFORMATION_REQUIRED
ASSESSMENT --> DIAGNOSIS_REVIEW
ASSESSMENT --> MORE_INFORMATION_REQUIRED
MORE_INFORMATION_REQUIRED --> INTAKE
MORE_INFORMATION_REQUIRED --> ASSESSMENT
DIAGNOSIS_REVIEW --> DIAGNOSIS_CONFIRMED
DIAGNOSIS_REVIEW --> DIAGNOSIS_NOT_CONFIRMED
DIAGNOSIS_REVIEW --> ECG_REQUESTED
DIAGNOSIS_REVIEW --> MDT_REVIEW
DIAGNOSIS_CONFIRMED --> PRESCRIBING
DIAGNOSIS_CONFIRMED --> TITRATION
DIAGNOSIS_NOT_CONFIRMED --> OUTCOME
ECG_REQUESTED --> DIAGNOSIS_REVIEW
MDT_REVIEW --> DIAGNOSIS_REVIEW
MDT_REVIEW --> DIAGNOSIS_CONFIRMED
MDT_REVIEW --> DIAGNOSIS_NOT_CONFIRMED
PRESCRIBING --> TITRATION
TITRATION --> MAINTENANCE
TITRATION --> MDT_REVIEW
TITRATION --> MORE_INFORMATION_REQUIRED
MAINTENANCE --> SHARED_CARE
MAINTENANCE --> ANNUAL_REVIEW
MAINTENANCE --> TITRATION
SHARED_CARE --> ANNUAL_REVIEW
SHARED_CARE --> MAINTENANCE
ANNUAL_REVIEW --> MAINTENANCE
ANNUAL_REVIEW --> SHARED_CARE
ANNUAL_REVIEW --> TITRATION
ANNUAL_REVIEW --> OUTCOME
OUTCOME --> DISCHARGE
DISCHARGE --> LEAD (re-referral)
```

## Commands

Each transition is triggered by a typed command:

```typescript
type JourneyCommand =
  | { type: 'CREATE_REFERRAL'; patientId: string; actorId: string; referralData: ReferralData }
  | { type: 'VALIDATE_REGISTRATION'; patientId: string; actorId: string; validationResult: ValidationResult }
  | { type: 'SCHEDULE_APPOINTMENT'; patientId: string; actorId: string; appointmentId: string }
  | { type: 'COMPLETE_TRIAGE'; patientId: string; actorId: string; triageOutcome: TriageOutcome }
  | { type: 'START_INTAKE'; patientId: string; actorId: string }
  | { type: 'COMPLETE_INTAKE'; patientId: string; actorId: string; completeness: IntakeCompleteness }
  | { type: 'REQUEST_INFORMATION'; patientId: string; actorId: string; missingItems: string[] }
  | { type: 'PROVIDE_INFORMATION'; patientId: string; actorId: string; providedItems: string[] }
  | { type: 'START_ASSESSMENT'; patientId: string; actorId: string; encounterId: string }
  | { type: 'COMPLETE_ASSESSMENT'; patientId: string; actorId: string; assessmentId: string }
  | { type: 'SUBMIT_DIAGNOSIS'; patientId: string; actorId: string; diagnosis: Diagnosis }
  | { type: 'REQUEST_ECG'; patientId: string; actorId: string; reason: string }
  | { type: 'RECEIVE_ECG'; patientId: string; actorId: string; ecgResult: EcgResult }
  | { type: 'REQUEST_MDT'; patientId: string; actorId: string; reason: string }
  | { type: 'COMPLETE_MDT'; patientId: string; actorId: string; outcome: MdtOutcome }
  | { type: 'START_PRESCRIBING'; patientId: string; actorId: string; medication: MedicationPlan }
  | { type: 'START_TITRATION'; patientId: string; actorId: string; prescriptionId: string }
  | { type: 'COMPLETE_TITRATION'; patientId: string; actorId: string; outcome: TitrationOutcome }
  | { type: 'START_MAINTENANCE'; patientId: string; actorId: string }
  | { type: 'INITIATE_SHARED_CARE'; patientId: string; actorId: string; gpDetails: GpDetails }
  | { type: 'COMPLETE_ANNUAL_REVIEW'; patientId: string; actorId: string; review: AnnualReview }
  | { type: 'RECORD_OUTCOME'; patientId: string; actorId: string; outcome: CareOutcome }
  | { type: 'DISCHARGE'; patientId: string; actorId: string; reason: string }
  | { type: 'RE_REFER'; patientId: string; actorId: string; referralData: ReferralData };
```

## Transition Rules

Every transition MUST:
1. Authenticate the user
2. Verify capability (`care:journey:transition`)
3. Verify feature flag (`careJourneyEngine`)
4. Validate current journey version (optimistic concurrency)
5. Validate prerequisites for target stage
6. Detect blockers
7. Update state transactionally
8. Create immutable transition event
9. Create tasks
10. Update queues
11. Create authorised notifications
12. Create audit event
13. Return new projection

## Prerequisites by Stage

| Target Stage | Prerequisites |
|--------------|---------------|
| BOOKED | Validated registration, NHS number verified |
| TRIAGE | Referral validated, patient consent |
| INTAKE | Triage complete, questionnaires assigned |
| ASSESSMENT | All required intake complete, clinician assigned |
| DIAGNOSIS_REVIEW | Assessment complete, notes signed |
| DIAGNOSIS_CONFIRMED | Diagnostic criteria met, evidence documented |
| DIAGNOSIS_NOT_CONFIRMED | Criteria not met, differential considered |
| ECG_REQUESTED | Cardiovascular risk factors identified |
| MDT_REVIEW | Complex case, diagnostic uncertainty, or risk |
| PRESCRIBING | Diagnosis confirmed, no contraindications |
| TITRATION | Prescription signed, baseline observations |
| MAINTENANCE | Stable dose 3+ months, no safety concerns |
| SHARED_CARE | Stable 6+ months, GP agreement, monitoring plan |
| ANNUAL_REVIEW | 12 months since last review |
| OUTCOME | Care episode complete |
| DISCHARGE | Outcome recorded, no outstanding tasks |

## Blockers

Blockers prevent progression and create admin tasks:
- Missing identity verification
- Missing GP summary
- Missing questionnaires
- Missing documents
- Unpaid invoices (configurable)
- Unresolved complaints
- Safety alerts
- Missing ECG
- Missing baseline observations

## Version Control

- Journey has `version: Int` (optimistic lock)
- Every transition requires `expectedVersion`
- On conflict: reject with current version, allow retry
- Transition history immutable (append-only)

## Queue Integration

Each stage maps to operational queues:
- LEAD/BOOKED → Referral Triage Queue
- TRIAGE → Triage Queue
- INTAKE → Intake Queue
- ASSESSMENT → Assessment Queue
- DIAGNOSIS_REVIEW → Diagnosis Queue
- TITRATION → Titration Queue
- PRESCRIBING → Prescribing Queue
- MAINTENANCE/SHARED_CARE → Maintenance Queue
- ANNUAL_REVIEW → Annual Review Queue