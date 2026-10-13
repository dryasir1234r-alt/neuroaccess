import type {
  ActorContext,
  Blocker,
  JourneyCommandInput,
  JourneyProjection,
  JourneyStage,
  PrerequisiteKey,
  TransitionOutcome,
  CreatedTask,
  TimelineDraft,
} from '@/lib/domain/journey';
import { findTransition } from '@/lib/journey/transitions';

/**
 * Dependencies injected into the journey engine. This keeps the engine pure
 * and unit-testable while the production wiring supplies database-backed
 * implementations.
 */
export interface JourneyEngineDeps {
  /** Current persisted journey projection for the patient. */
  loadJourney(patientId: string): Promise<JourneyProjection | null>;
  /** Which prerequisites are currently satisfied for the patient. */
  satisfiedPrerequisites(patientId: string): Promise<readonly PrerequisiteKey[]>;
  /** Server-side feature-flag evaluation. */
  isFeatureEnabled(flag: string, actor: ActorContext): Promise<boolean>;
  /** Idempotency: returns true if this key was already applied. */
  hasAppliedIdempotencyKey(key: string): Promise<boolean>;
  /** Optional extra blockers supplied by other engines (payments, safety). */
  extraBlockers?(patientId: string): Promise<readonly Blocker[]>;
}

/**
 * Pure decision core: given the current journey and satisfied prerequisites,
 * decide whether a command may proceed. Side-effect free, exhaustively typed.
 */
export function evaluateTransition(params: {
  readonly current: JourneyProjection;
  readonly input: JourneyCommandInput;
  readonly satisfied: readonly PrerequisiteKey[];
  readonly featureEnabled: boolean;
  readonly extraBlockers: readonly Blocker[];
}): TransitionOutcome {
  const { current, input, satisfied, featureEnabled, extraBlockers } = params;

  // 2. Capability check (deny by default).
  const rule = findTransition(input.command, current.stage);
  if (!rule) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: `Command ${input.command} is not permitted from stage ${current.stage}.`,
    };
  }

  if (!input.actor.capabilities.includes(rule.requiredCapability)) {
    return {
      ok: false,
      code: 'FORBIDDEN',
      message: `Missing capability: ${rule.requiredCapability}.`,
    };
  }

  // 3. Feature availability.
  if (!featureEnabled) {
    return {
      ok: false,
      code: 'FEATURE_DISABLED',
      message: `Feature ${rule.requiredFeatureFlag} is disabled.`,
    };
  }

  // 4. Optimistic concurrency.
  if (input.expectedVersion !== current.version) {
    return {
      ok: false,
      code: 'VERSION_CONFLICT',
      message: 'The care journey changed since you loaded it. Reload and retry.',
      currentVersion: current.version,
    };
  }

  // 5. Prerequisites.
  const missing = rule.prerequisites.filter((p) => !satisfied.includes(p));
  if (missing.length > 0) {
    return {
      ok: false,
      code: 'MISSING_PREREQUISITES',
      message: `Missing prerequisites: ${missing.join(', ')}.`,
      missing,
    };
  }

  // 6. Blockers.
  if (extraBlockers.length > 0) {
    return {
      ok: false,
      code: 'BLOCKED',
      message: 'This patient has unresolved blockers.',
      blockers: extraBlockers,
    };
  }

  // 7-13. Compose the transactional result.
  const nextVersion = current.version + 1;
  const projection: JourneyProjection = {
    ...current,
    stage: rule.to,
    version: nextVersion,
  };

  const tasks: CreatedTask[] = rule.createsTaskFor
    ? [
        {
          patientId: input.patientId,
          type: `JOURNEY_${rule.command}`,
          title: rule.taskTitle ?? `Action required for ${rule.command}`,
          owner: rule.createsTaskFor,
          journeyStage: rule.to,
        },
      ]
    : [];

  const timeline: TimelineDraft = {
    patientId: input.patientId,
    eventType: `JOURNEY_${rule.command}`,
    title: plainLanguageTitle(rule.command, rule.to),
    summary: input.reason,
    visibility: visibilityFor(rule.command),
    provenance: 'CLINICIAN_ENTERED',
  };

  return {
    ok: true,
    projection,
    transitionId: `jt_${input.patientId}_${nextVersion}`,
    tasks,
    timelineEvents: [timeline],
    auditEvent: {
      actorId: input.actor.userId,
      action: `journey.${rule.command.toLowerCase()}`,
      resourceType: 'Journey',
      resourceId: input.patientId,
      reason: input.reason,
    },
    notification: {
      recipientRole: rule.createsTaskFor ?? 'ADMIN',
      patientId: input.patientId,
      title: plainLanguageTitle(rule.command, rule.to),
      body: input.reason,
    },
  };
}

/**
 * Full transition flow with idempotency, used by the server action layer.
 * The database transaction is supplied by the caller; this function performs
 * the decision and returns the outcome plus the transition to persist.
 */
export async function transitionCareJourney(
  deps: JourneyEngineDeps,
  input: JourneyCommandInput,
): Promise<TransitionOutcome> {
  if (input.idempotencyKey && (await deps.hasAppliedIdempotencyKey(input.idempotencyKey))) {
    return {
      ok: false,
      code: 'DUPLICATE',
      message: 'This action was already applied.',
    };
  }

  const current = await deps.loadJourney(input.patientId);
  if (!current) {
    return {
      ok: false,
      code: 'INVALID_TRANSITION',
      message: 'No care journey exists for this patient.',
    };
  }

  const rule = findTransition(input.command, current.stage);
  const featureEnabled = rule
    ? await deps.isFeatureEnabled(rule.requiredFeatureFlag, input.actor)
    : false;
  const satisfied = await deps.satisfiedPrerequisites(input.patientId);
  const extraBlockers = deps.extraBlockers ? await deps.extraBlockers(input.patientId) : [];

  return evaluateTransition({ current, input, satisfied, featureEnabled, extraBlockers });
}

/** Patient-facing plain-language description of a stage. */
export function plainLanguageStage(stage: JourneyStage): string {
  switch (stage) {
    case 'LEAD':
      return 'We have received your referral';
    case 'BOOKED':
      return 'Your appointment is booked';
    case 'TRIAGE':
      return 'We are reviewing your information';
    case 'INTAKE':
      return 'Please complete your questionnaires';
    case 'ASSESSMENT':
      return 'Your assessment is in progress';
    case 'MORE_INFORMATION_REQUIRED':
      return 'We need a little more information from you';
    case 'DIAGNOSIS_REVIEW':
      return 'Your clinician is reviewing the assessment';
    case 'DIAGNOSIS_CONFIRMED':
      return 'Your assessment outcome is confirmed';
    case 'DIAGNOSIS_NOT_CONFIRMED':
      return 'Your assessment has concluded';
    case 'ECG_REQUESTED':
      return 'We have asked for a heart (ECG) check';
    case 'MDT_REVIEW':
      return 'A specialist team is reviewing your care';
    case 'TITRATION':
      return 'We are finding the right dose for you';
    case 'PRESCRIBING':
      return 'Your prescription is being prepared';
    case 'MAINTENANCE':
      return 'You are on a stable treatment plan';
    case 'SHARED_CARE':
      return 'Your GP is now helping with your care';
    case 'ANNUAL_REVIEW':
      return 'It is time for your yearly review';
    case 'OUTCOME':
      return 'Your care episode is being concluded';
    case 'DISCHARGE':
      return 'Your care with us has ended';
    default: {
      const exhaustive: never = stage;
      return exhaustive;
    }
  }
}

function plainLanguageTitle(command: string, to: JourneyStage): string {
  return `${command.replace(/_/g, ' ').toLowerCase()} → ${plainLanguageStage(to)}`;
}

function visibilityFor(command: string): TimelineDraft['visibility'] {
  if (command === 'START_PRESCRIBING' || command === 'START_TITRATION') {
    return 'ASSIGNED_CLINICAL_TEAM';
  }
  if (command === 'SUBMIT_DIAGNOSIS') {
    return 'ASSIGNED_CLINICAL_TEAM';
  }
  return 'PATIENT';
}

