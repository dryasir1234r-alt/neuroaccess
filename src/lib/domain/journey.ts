/**
 * NeuroAssess care-journey domain types.
 *
 * The journey is a typed state machine. UI components MUST NOT set the stage
 * directly; every change flows through a typed command handled by the engine.
 */

export const JOURNEY_STAGES = [
  'LEAD',
  'BOOKED',
  'TRIAGE',
  'INTAKE',
  'ASSESSMENT',
  'MORE_INFORMATION_REQUIRED',
  'DIAGNOSIS_REVIEW',
  'DIAGNOSIS_CONFIRMED',
  'DIAGNOSIS_NOT_CONFIRMED',
  'ECG_REQUESTED',
  'MDT_REVIEW',
  'TITRATION',
  'PRESCRIBING',
  'MAINTENANCE',
  'SHARED_CARE',
  'ANNUAL_REVIEW',
  'OUTCOME',
  'DISCHARGE',
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const JOURNEY_COMMANDS = [
  'CREATE_REFERRAL',
  'VALIDATE_REGISTRATION',
  'SCHEDULE_APPOINTMENT',
  'COMPLETE_TRIAGE',
  'START_INTAKE',
  'COMPLETE_INTAKE',
  'REQUEST_INFORMATION',
  'PROVIDE_INFORMATION',
  'START_ASSESSMENT',
  'COMPLETE_ASSESSMENT',
  'SUBMIT_DIAGNOSIS',
  'REQUEST_ECG',
  'RECEIVE_ECG',
  'REQUEST_MDT',
  'COMPLETE_MDT',
  'START_PRESCRIBING',
  'START_TITRATION',
  'COMPLETE_TITRATION',
  'START_MAINTENANCE',
  'INITIATE_SHARED_CARE',
  'COMPLETE_ANNUAL_REVIEW',
  'RECORD_OUTCOME',
  'DISCHARGE',
  'RE_REFER',
] as const;

export type JourneyCommandType = (typeof JOURNEY_COMMANDS)[number];

/** A transition definition: from-stage -> to-stage for a given command. */
export interface TransitionRule {
  readonly command: JourneyCommandType;
  readonly from: readonly JourneyStage[];
  readonly to: JourneyStage;
  readonly requiredCapability: string;
  readonly requiredFeatureFlag: string;
  /** Prerequisite keys that must be satisfied before the transition. */
  readonly prerequisites: readonly PrerequisiteKey[];
  /** Creates a task for the given role when this transition fires. */
  readonly createsTaskFor: TaskOwner | null;
  readonly taskTitle?: string;
}

export type PrerequisiteKey =
  | 'identity_verified'
  | 'registration_validated'
  | 'consent_recorded'
  | 'intake_complete'
  | 'questionnaires_complete'
  | 'documents_complete'
  | 'assessment_complete'
  | 'note_signed'
  | 'diagnosis_recorded'
  | 'baseline_observations'
  | 'ecg_received'
  | 'mdt_outcome'
  | 'prescription_signed'
  | 'stable_dose'
  | 'gp_agreement'
  | 'annual_review_due';

export type TaskOwner = 'ADMIN' | 'CLINICIAN' | 'PATIENT' | 'FINANCE';

export interface JourneyCommandInput {
  readonly patientId: string;
  readonly command: JourneyCommandType;
  readonly actor: ActorContext;
  readonly reason: string;
  readonly expectedVersion: number;
  readonly supportingRecordIds?: readonly string[];
  readonly idempotencyKey?: string;
}

export interface ActorContext {
  readonly userId: string;
  readonly organisationId: string;
  readonly capabilities: readonly string[];
}

export interface JourneyProjection {
  readonly patientId: string;
  readonly stage: JourneyStage;
  readonly version: number;
  readonly assignedClinicianId: string | null;
  readonly blockers: readonly Blocker[];
}

export interface Blocker {
  readonly key: string;
  readonly label: string;
  readonly owner: TaskOwner;
}

export interface TransitionResult {
  readonly ok: true;
  readonly projection: JourneyProjection;
  readonly transitionId: string;
  readonly tasks: readonly CreatedTask[];
  readonly timelineEvents: readonly TimelineDraft[];
  readonly auditEvent: AuditDraft;
  readonly notification: NotificationDraft | null;
}

export interface CreatedTask {
  readonly patientId: string;
  readonly type: string;
  readonly title: string;
  readonly owner: TaskOwner;
  readonly journeyStage: JourneyStage;
}

export interface TimelineDraft {
  readonly patientId: string;
  readonly eventType: string;
  readonly title: string;
  readonly summary: string;
  readonly visibility: 'PATIENT' | 'ASSIGNED_CLINICAL_TEAM' | 'CLINICAL_ORGANISATION' | 'ADMIN' | 'FINANCE' | 'RESTRICTED';
  readonly provenance: 'DIRECT_TRANSCRIPT' | 'STRUCTURED_RECORD' | 'CLINICIAN_ENTERED' | 'CALCULATED' | 'TEMPLATE_LANGUAGE' | 'AI_SYNTHESIS' | 'UNSUPPORTED';
}

export interface AuditDraft {
  readonly actorId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly reason: string;
}

export interface NotificationDraft {
  readonly recipientRole: 'PATIENT' | 'CLINICIAN' | 'ADMIN' | 'FINANCE';
  readonly patientId: string;
  readonly title: string;
  readonly body: string;
}

export type TransitionOutcome =
  | TransitionResult
  | {
      readonly ok: false;
      readonly code:
        | 'FORBIDDEN'
        | 'FEATURE_DISABLED'
        | 'VERSION_CONFLICT'
        | 'INVALID_TRANSITION'
        | 'MISSING_PREREQUISITES'
        | 'BLOCKED'
        | 'DUPLICATE';
      readonly message: string;
      readonly currentVersion?: number;
      readonly missing?: readonly PrerequisiteKey[];
      readonly blockers?: readonly Blocker[];
    };
