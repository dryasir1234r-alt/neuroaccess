/**
 * NeuroAssess feature-flag engine.
 *
 * Server-side, priority-ordered evaluation. Front-end hiding is never
 * sufficient; callers must consult this engine before performing an action.
 *
 * Resolution priority (highest first):
 *   1. Emergency global kill switch
 *   2. Environment restriction
 *   3. Organisation-level setting
 *   4. Capability restriction
 *   5. User-level testing override
 *   6. Cohort / percentage rollout
 *   7. Default state
 */

export const FEATURE_FLAG_KEYS = [
  'unifiedApplicationShell',
  'patientWorkspace',
  'clinicianWorkstation',
  'adminControlCentre',
  'financeWorkspace',
  'careJourneyEngine',
  'unifiedPatientTimeline',
  'referralWorkflow',
  'intakeWorkflow',
  'adhdAssessmentWorkflow',
  'autismAssessmentWorkflow',
  'diagnosisWorkflow',
  'mdtWorkflow',
  'titrationWorkflow',
  'prescribingWorkflow',
  'repeatPrescriptionRequests',
  'prescriptionTracking',
  'courierTracking',
  'physicalHealthMonitoring',
  'sharedCareWorkflow',
  'annualReviewWorkflow',
  'complaintsWorkflow',
  'paymentTracking',
  'videoConsultations',
  'clinicalAiEnabled',
  'consultationTranscription',
  'liveConsultationAssistant',
  'clinicalNoteDrafting',
  'adhdReportDrafting',
  'autismReportDrafting',
  'messageReplyDrafting',
  'titrationNoteDrafting',
  'clinicalLetterDrafting',
  'transcriptEvidenceReview',
  'contradictionDetection',
  'missingInformationDetection',
  'aiSafetyLayer',
  'localModelProvider',
  'approvedCloudModelProvider',
  'aiAuditReview',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type ReleaseState =
  | 'DISABLED'
  | 'DEVELOPMENT_ONLY'
  | 'INTERNAL_TESTING'
  | 'SELECTED_CLINICIANS'
  | 'SELECTED_PATIENTS'
  | 'LIMITED_ROLLOUT'
  | 'FULL_PRODUCTION'
  | 'EMERGENCY_DISABLED';

export type Environment = 'development' | 'staging' | 'production';

export interface FlagActor {
  readonly userId: string;
  readonly organisationId: string;
  readonly capabilities: readonly string[];
}

export interface FlagContext {
  readonly actor: FlagActor;
  readonly environment: Environment;
}

export interface FlagDefinition {
  readonly key: FeatureFlagKey;
  readonly defaultState: ReleaseState;
  readonly requiredCapability?: string;
  /** Environments in which the flag may ever be enabled. */
  readonly allowedEnvironments: readonly Environment[];
}

export interface FlagEvaluationDeps {
  /** Whether the emergency global kill switch is active for the flag. */
  isEmergencyDisabled(flag: FeatureFlagKey): boolean;
  /** Organisation override, if any. */
  organisationState(
    organisationId: string,
    flag: FeatureFlagKey,
  ): { state: ReleaseState; rolloutPercent: number } | null;
  /** Per-user testing override, if any. */
  userOverride(userId: string, flag: FeatureFlagKey): ReleaseState | null;
  /** Deterministic cohort bucketing in [0,100). */
  bucket(userId: string, flag: FeatureFlagKey): number;
}

export interface FlagDecision {
  readonly key: FeatureFlagKey;
  readonly enabled: boolean;
  readonly resolvedBy:
    | 'EMERGENCY_KILL_SWITCH'
    | 'ENVIRONMENT'
    | 'ORGANISATION'
    | 'CAPABILITY'
    | 'USER_OVERRIDE'
    | 'ROLLOUT'
    | 'DEFAULT';
  readonly state: ReleaseState;
}

/**
 * Pure evaluation of a single flag.
 */
export function evaluateFlag(
  definition: FlagDefinition,
  ctx: FlagContext,
  deps: FlagEvaluationDeps,
): FlagDecision {
  // 1. Emergency global kill switch.
  if (deps.isEmergencyDisabled(definition.key)) {
    return {
      key: definition.key,
      enabled: false,
      resolvedBy: 'EMERGENCY_KILL_SWITCH',
      state: 'EMERGENCY_DISABLED',
    };
  }

  // 2. Environment restriction.
  if (!definition.allowedEnvironments.includes(ctx.environment)) {
    return {
      key: definition.key,
      enabled: false,
      resolvedBy: 'ENVIRONMENT',
      state: 'DISABLED',
    };
  }

  // 3. Organisation-level setting.
  const org = deps.organisationState(ctx.actor.organisationId, definition.key);
  if (org && org.state === 'DISABLED') {
    return { key: definition.key, enabled: false, resolvedBy: 'ORGANISATION', state: 'DISABLED' };
  }
  if (org && org.state === 'FULL_PRODUCTION') {
    return {
      key: definition.key,
      enabled: true,
      resolvedBy: 'ORGANISATION',
      state: 'FULL_PRODUCTION',
    };
  }

  // 4. Capability restriction.
  if (
    definition.requiredCapability &&
    !ctx.actor.capabilities.includes(definition.requiredCapability)
  ) {
    return {
      key: definition.key,
      enabled: false,
      resolvedBy: 'CAPABILITY',
      state: 'DISABLED',
    };
  }

  // 5. User-level testing override.
  const override = deps.userOverride(ctx.actor.userId, definition.key);
  if (override) {
    const enabled =
      override === 'FULL_PRODUCTION' ||
      override === 'INTERNAL_TESTING' ||
      override === 'SELECTED_CLINICIANS' ||
      override === 'SELECTED_PATIENTS' ||
      override === 'LIMITED_ROLLOUT' ||
      override === 'DEVELOPMENT_ONLY';
    return { key: definition.key, enabled, resolvedBy: 'USER_OVERRIDE', state: override };
  }

  // 6. Cohort / percentage rollout (organisation-scoped limited rollout).
  if (org && org.state === 'LIMITED_ROLLOUT') {
    const bucket = deps.bucket(ctx.actor.userId, definition.key);
    const enabled = bucket < org.rolloutPercent;
    return {
      key: definition.key,
      enabled,
      resolvedBy: 'ROLLOUT',
      state: 'LIMITED_ROLLOUT',
    };
  }

  // 7. Default state.
  const enabled = definition.defaultState === 'FULL_PRODUCTION';
  return { key: definition.key, enabled, resolvedBy: 'DEFAULT', state: definition.defaultState };
}

/** Deterministic bucket function used in production. */
export function stableBucket(userId: string, flag: string): number {
  // FNV-1a 32-bit hash -> [0, 100).
  let hash = 0x811c9dc5;
  const input = `${userId}:${flag}`;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
}

export interface FlagChangeRecord {
  readonly flagKey: FeatureFlagKey;
  readonly actorId: string;
  readonly reason: string;
  readonly previousState: ReleaseState;
  readonly newState: ReleaseState;
  readonly scope: string;
  readonly timestamp: string;
}

/**
 * Validate a flag change request. Throws when the change is not permitted,
 * guaranteeing every mutation carries an actor, reason and scope.
 */
export function assertFlagChangeAllowed(params: {
  readonly actorCapabilities: readonly string[];
  readonly reason: string;
  readonly scope: string;
}): void {
  if (
    !params.actorCapabilities.includes('admin:feature:manage') &&
    !params.actorCapabilities.includes('system:feature:manage')
  ) {
    throw new Error('FORBIDDEN: missing admin:feature:manage capability');
  }
  if (params.reason.trim().length < 3) {
    throw new Error('INVALID: a reason is required for every flag change');
  }
  if (params.scope.trim().length === 0) {
    throw new Error('INVALID: a scope is required for every flag change');
  }
}
