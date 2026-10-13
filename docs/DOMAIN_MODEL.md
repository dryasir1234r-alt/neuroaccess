# NeuroAssess Domain Model

## Core Entities

### Identity & Access
```
User
  - id: CUID
  - email: String (unique)
  - emailVerified: DateTime?
  - passwordHash: String?
  - name: String
  - avatarUrl: String?
  - roles: Role[]
  - capabilities: Capability[]
  - organisationId: String
  - mfaEnabled: Boolean
  - mfaSecret: String?
  - lastLoginAt: DateTime?
  - createdAt: DateTime
  - updatedAt: DateTime
  - deletedAt: DateTime?

Role
  - id: CUID
  - name: String (unique)
  - description: String
  - capabilities: Capability[]

Capability
  - id: CUID
  - code: String (unique)  // e.g., "patient:read", "clinician:prescribe"
  - description: String
  - category: CapabilityCategory

Organisation
  - id: CUID
  - name: String
  - slug: String (unique)
  - settings: Json (workflow config, feature flags)
  - subscriptionTier: SubscriptionTier
  - createdAt: DateTime
  - updatedAt: DateTime
```

### Care Journey
```
Patient
  - id: CUID
  - userId: String (unique, FK to User)
  - organisationId: String
  - nhsNumber: String? (encrypted)
  - dateOfBirth: DateTime
  - gender: Gender
  - address: Address (encrypted)
  - phone: String (encrypted)
  - emergencyContact: EmergencyContact?
  - gpPractice: String?
  - gpContact: String?
  - referralSource: ReferralSource?
  - journey: Journey?
  - assessments: Assessment[]
  - prescriptions: Prescription[]
  - documents: Document[]
  - messages: Message[]
  - timelineEvents: TimelineEvent[]
  - createdAt: DateTime
  - updatedAt: DateTime
  - deletedAt: DateTime?

Journey
  - id: CUID
  - patientId: String (unique)
  - stage: JourneyStage
  - version: Int (optimistic lock)
  - assignedClinicianId: String?
  - currentTaskId: String?
  - blockers: Json[]
  - startedAt: DateTime
  - updatedAt: DateTime
  - transitions: JourneyTransition[]

JourneyTransition
  - id: CUID
  - journeyId: String
  - fromStage: JourneyStage
  - toStage: JourneyStage
  - command: String
  - actorId: String
  - reason: String
  - expectedVersion: Int
  - supportingRecordIds: String[]
  - createdAt: DateTime
  - metadata: Json

Task
  - id: CUID
  - patientId: String
  - type: TaskType
  - status: TaskStatus
  - title: String
  - description: String?
  - assigneeId: String?
  - dueAt: DateTime?
  - completedAt: DateTime?
  - journeyStage: JourneyStage?
  - createdAt: DateTime
  - updatedAt: DateTime
```

### Clinical
```
Assessment
  - id: CUID
  - patientId: String
  - type: AssessmentType (ADHD, AUTISM, COMBINED)
  - status: AssessmentStatus
  - clinicianId: String
  - startedAt: DateTime
  - completedAt: DateTime?
  - questionnaires: QuestionnaireResponse[]
  - documents: Document[]
  - notes: ClinicalNote[]
  - outcome: AssessmentOutcome?
  - createdAt: DateTime
  - updatedAt: DateTime

QuestionnaireResponse
  - id: CUID
  - assessmentId: String
  - questionnaireId: String
  - respondentId: String (patient or informant)
  - responses: Json
  - score: Json?
  - completedAt: DateTime?
  - createdAt: DateTime

ClinicalNote
  - id: CUID
  - assessmentId: String?
  - patientId: String
  - clinicianId: String
  - type: NoteType
  - content: Json (structured sections)
  - narrative: String?
  - status: NoteStatus (DRAFT, REVIEW, SIGNED, AMENDED)
  - version: Int
  - signedAt: DateTime?
  - signedById: String?
  - previousVersionId: String?
  - aiDraftId: String?
  - createdAt: DateTime
  - updatedAt: DateTime

Diagnosis
  - id: CUID
  - patientId: String
  - assessmentId: String
  - clinicianId: String
  - type: DiagnosisType (ADHD, AUTISM, BOTH, NEITHER)
  - subtype: String?
  - severity: Severity?
  - criteria: Json (DSM-5/ICD-11 criteria met)
  - confidence: ConfidenceLevel
  - differentialDiagnoses: String[]
  - recommendedTreatment: String?
  - status: DiagnosisStatus (PROVISIONAL, CONFIRMED, REJECTED)
  - reviewedById: String?
  - reviewedAt: DateTime?
  - createdAt: DateTime
  - updatedAt: DateTime
```

### Medication
```
Prescription
  - id: CUID
  - patientId: String
  - clinicianId: String
  - medication: Medication
  - dose: String
  - frequency: String
  - route: Route
  - quantity: Int
  - repeats: Int
  - status: PrescriptionStatus
  - signedAt: DateTime?
  - sentToPharmacyAt: DateTime?
  - pharmacyId: String?
  - dispensedAt: DateTime?
  - dispatchedAt: DateTime?
  - deliveredAt: DateTime?
  - trackingNumber: String?
  - courier: String?
  - createdAt: DateTime
  - updatedAt: DateTime

Titration
  - id: CUID
  - patientId: String
  - prescriptionId: String
  - clinicianId: String
  - stage: TitrationStage
  - currentDose: String
  - targetDose: String
  - reviewIntervalDays: Int
  - lastReviewAt: DateTime?
  - nextReviewAt: DateTime?
  - observations: TitrationObservation[]
  - outcome: TitrationOutcome?
  - createdAt: DateTime
  - updatedAt: DateTime

MonitoringEntry
  - id: CUID
  - patientId: String
  - titrationId: String?
  - type: MonitoringType (BP, PULSE, WEIGHT, ECG, SYMPTOMS, SIDE_EFFECTS)
  - value: Json
  - recordedAt: DateTime
  - recordedById: String
  - flagged: Boolean
  - flagReason: String?
  - createdAt: DateTime
```

### Communications
```
Message
  - id: CUID
  - threadId: String
  - senderId: String
  - recipientId: String
  - subject: String?
  - content: String
  - attachments: Document[]
  - readAt: DateTime?
  - aiDraftId: String?
  - priority: MessagePriority
  - category: MessageCategory
  - createdAt: DateTime

Thread
  - id: CUID
  - patientId: String
  - subject: String
  - status: ThreadStatus (OPEN, CLOSED, ESCALATED)
  - participants: String[] (user IDs)
  - createdAt: DateTime
  - updatedAt: DateTime

Consent
  - id: CUID
  - patientId: String
  - type: ConsentType (TRANSCRIPTION, DATA_SHARING, TREATMENT, AI_PROCESSING)
  - version: String
  - wording: String
  - granted: Boolean
  - grantedAt: DateTime?
  - grantedById: String?
  - withdrawnAt: DateTime?
  - withdrawnById: String?
  - restrictions: Json?
  - createdAt: DateTime
```

### AI
```
AIDraft
  - id: CUID
  - type: AIDraftType (NOTE, REPORT, LETTER, MESSAGE_REPLY, SUMMARY)
  - status: AIDraftStatus (GENERATING, DRAFT_READY, CLINICIAN_REVIEW, APPROVED, REJECTED)
  - patientId: String
  - clinicianId: String
  - encounterId: String?
  - content: Json
  - evidenceMap: Json (sentenceId -> evidence[])
  - provenance: Json (source references)
  - safetyChecks: Json
  - unsupportedClaims: String[]
  - contradictions: String[]
  - missingInformation: String[]
  - modelProvider: String
  - modelVersion: String
  - tokensUsed: Int
  - generationTimeMs: Int
  - reviewedById: String?
  - reviewedAt: DateTime?
  - approvedById: String?
  - approvedAt: DateTime?
  - createdAt: DateTime
  - updatedAt: DateTime

Transcript
  - id: CUID
  - encounterId: String
  - patientId: String
  - clinicianId: String
  - status: TranscriptStatus
  - segments: TranscriptSegment[]
  - speakerMap: Json
  - language: String
  - durationSeconds: Int
  - consentId: String
  - createdAt: DateTime
  - updatedAt: DateTime

TranscriptSegment
  - id: CUID
  - transcriptId: String
  - speakerId: String
  - speakerLabel: String
  - text: String
  - startTimeMs: Int
  - endTimeMs: Int
  - confidence: Float
  - bookmarked: Boolean
  - excluded: Boolean
  - correctedText: String?
  - correctedById: String?
  - createdAt: DateTime
```

### Operations
```
Appointment
  - id: CUID
  - patientId: String
  - clinicianId: String
  - type: AppointmentType
  - status: AppointmentStatus
  - scheduledAt: DateTime
  - durationMinutes: Int
  - videoRoomId: String?
  - notes: String?
  - createdAt: DateTime
  - updatedAt: DateTime

Queue
  - id: CUID
  - name: String
  - organisationId: String
  - type: QueueType (REFERRAL, INTAKE, ASSESSMENT, TITRATION, PRESCRIBING)
  - patients: QueueEntry[]

QueueEntry
  - id: CUID
  - queueId: String
  - patientId: String
  - priority: Int
  - stage: JourneyStage
  - assignedClinicianId: String?
  - waitingSince: DateTime
  - metadata: Json

Complaint
  - id: CUID
  - patientId: String
  - subject: String
  - description: String
  - status: ComplaintStatus
  - severity: ComplaintSeverity
  - assignedToId: String?
  - resolution: String?
  - resolvedAt: DateTime?
  - createdAt: DateTime
  - updatedAt: DateTime
```

### Financial
```
Invoice
  - id: CUID
  - patientId: String
  - organisationId: String
  - amount: Decimal
  - currency: String
  - status: InvoiceStatus
  - dueAt: DateTime
  - paidAt: DateTime?
  - items: InvoiceItem[]
  - createdAt: DateTime
  - updatedAt: DateTime

Payment
  - id: CUID
  - invoiceId: String
  - amount: Decimal
  - method: PaymentMethod
  - status: PaymentStatus
  - transactionId: String?
  - processedAt: DateTime?
  - createdAt: DateTime
```

### Audit & Timeline
```
TimelineEvent
  - id: CUID
  - patientId: String
  - eventId: String (unique per event)
  - eventType: String
  - occurredAt: DateTime
  - recordedAt: DateTime
  - actorId: String
  - title: String
  - summary: String
  - relatedEntityType: String?
  - relatedEntityId: String?
  - visibility: VisibilityLevel
  - provenance: ProvenanceType
  - amendmentState: AmendmentState
  - metadata: Json

AuditEvent
  - id: CUID
  - actorId: String
  - action: String
  - resourceType: String
  - resourceId: String
  - oldValue: Json?
  - newValue: Json?
  - ipAddress: String?
  - userAgent: String?
  - correlationId: String
  - createdAt: DateTime
```

## Enumerations

### JourneyStage
LEAD, BOOKED, TRIAGE, INTAKE, ASSESSMENT, MORE_INFORMATION_REQUIRED, DIAGNOSIS_REVIEW, DIAGNOSIS_CONFIRMED, DIAGNOSIS_NOT_CONFIRMED, ECG_REQUESTED, MDT_REVIEW, TITRATION, PRESCRIBING, MAINTENANCE, SHARED_CARE, ANNUAL_REVIEW, OUTCOME, DISCHARGE

### CapabilityCategory
PATIENT, CLINICAL, ADMIN, FINANCE, AI, SYSTEM

### VisibilityLevel
PATIENT, ASSIGNED_CLINICAL_TEAM, CLINICAL_ORGANISATION, ADMIN, FINANCE, RESTRICTED

### ProvenanceType
DIRECT_TRANSCRIPT, STRUCTURED_RECORD, CLINICIAN_ENTERED, CALCULATED, TEMPLATE_LANGUAGE, AI_SYNTHESIS, UNSUPPORTED

### AIDraftStatus
GENERATING, DRAFT_READY, CLINICIAN_REVIEW, APPROVED, REJECTED, AMENDED

### PrescriptionStatus
DRAFT, PENDING_REVIEW, PENDING_SIGNATURE, SIGNED, SENT_TO_PHARMACY, PHARMACY_ACKNOWLEDGED, DISPENSED, DISPATCHED, DELIVERED, ON_HOLD, CANCELLED, RETURNED, FAILED