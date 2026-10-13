import type { ClinicalContext } from '@/lib/ai/types';
import type { AIDraft } from '@/lib/ai/types';
import { ModelGateway, ModelProviderError } from '@/lib/ai/gateway';
import {
  canApproveDraft,
  computeGrounding,
  detectContradictions,
  detectMissingInformation,
  runSafetyChecks,
} from '@/lib/ai/grounding';

/**
 * Clinical AI Orchestrator.
 *
 * Implements the mandated 18-step flow. It is assistive only: it never
 * diagnoses, prescribes, signs or sends. Every output is persisted as a draft
 * requiring clinician review.
 */

export interface OrchestratorActor {
  readonly userId: string;
  readonly organisationId: string;
  readonly capabilities: readonly string[];
}

export interface OrchestratorRequest {
  readonly taskType: string;
  readonly promptTemplateId: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly actor: OrchestratorActor;
  readonly requiredCapability: string;
  readonly featureFlagEnabled: boolean;
  readonly providerName: string;
  readonly context: ClinicalContext;
  readonly requiredTopics: readonly string[];
  readonly seed?: string;
  /** Optional named variant (e.g. message-reply tone) passed to the provider. */
  readonly variant?: string;
}

export interface OrchestratorAudit {
  record(event: {
    readonly actorId: string;
    readonly patientId: string;
    readonly action: string;
    readonly modelProvider: string;
    readonly detail: Record<string, unknown>;
  }): Promise<void>;
}

export interface OrchestratorDeps {
  readonly gateway: ModelGateway;
  readonly audit: OrchestratorAudit;
  readonly now: () => number;
  readonly newId: () => string;
}

export type OrchestratorResult =
  | { readonly ok: true; readonly draft: AIDraft; readonly approvalGate: { readonly allowed: boolean; readonly reasons: readonly string[] } }
  | { readonly ok: false; readonly code: string; readonly message: string };

export async function generateDraft(
  deps: OrchestratorDeps,
  request: OrchestratorRequest,
): Promise<OrchestratorResult> {
  // 1. authenticate (actor supplied by caller session).
  // 2. verify capability.
  if (!request.actor.capabilities.includes(request.requiredCapability)) {
    await deps.audit.record({
      actorId: request.actor.userId,
      patientId: request.patientId,
      action: 'ai.generate.denied',
      modelProvider: request.providerName,
      detail: { reason: 'missing_capability', capability: request.requiredCapability },
    });
    return { ok: false, code: 'FORBIDDEN', message: 'Missing capability for AI generation.' };
  }

  // 3. verify feature flags.
  if (!request.featureFlagEnabled) {
    return { ok: false, code: 'FEATURE_DISABLED', message: 'Clinical AI is disabled.' };
  }

  // 4. verify consent and purpose.
  if (!request.context.consentGranted) {
    await deps.audit.record({
      actorId: request.actor.userId,
      patientId: request.patientId,
      action: 'ai.generate.denied',
      modelProvider: request.providerName,
      detail: { reason: 'consent_missing' },
    });
    return { ok: false, code: 'CONSENT_REQUIRED', message: 'Transcription consent is required.' };
  }

  // 7. pre-generation safety check (consent + boundary).
  const preSafety = runSafetyChecks([], { consentGranted: request.context.consentGranted });
  if (!preSafety.passed) {
    return { ok: false, code: 'SAFETY_BLOCKED', message: 'Pre-generation safety check failed.' };
  }

  // 8-10. select specialist engine (taskType) and call model through gateway.
  let response;
  try {
    response = await deps.gateway.generate(request.providerName, {
      taskType: request.taskType,
      promptTemplateId: request.promptTemplateId,
      context: request.context,
      seed: request.seed,
      variant: request.variant,
    });
  } catch (err) {
    const message = err instanceof ModelProviderError ? err.message : 'Model provider failure.';
    await deps.audit.record({
      actorId: request.actor.userId,
      patientId: request.patientId,
      action: 'ai.generate.failed',
      modelProvider: request.providerName,
      detail: { message },
    });
    return { ok: false, code: 'MODEL_PROVIDER_FAILURE', message };
  }

  // 12-15. grounding, contradictions, missing information.
  const validSourceIds = request.context.transcriptSegments.map((s) => s.id).concat(
    request.context.structuredRecords.map((r) => r.id),
  );
  const grounding = computeGrounding(response.sections, validSourceIds);
  const contradictions = detectContradictions(response.sections);
  const missingInformation = detectMissingInformation(response.sections, request.requiredTopics);

  // 16. post-generation safety check.
  const safety = runSafetyChecks(response.sections, {
    consentGranted: request.context.consentGranted,
  });

  const draft: AIDraft = {
    id: deps.newId(),
    type: request.taskType,
    status: 'DRAFT_READY',
    patientId: request.patientId,
    clinicianId: request.actor.userId,
    sections: response.sections,
    grounding,
    contradictions,
    missingInformation,
    safety,
    modelProvider: response.modelProvider,
    modelVersion: response.modelVersion,
    promptTemplateId: request.promptTemplateId,
  };

  // 17. persist an auditable draft event.
  await deps.audit.record({
    actorId: request.actor.userId,
    patientId: request.patientId,
    action: 'ai.generate.draft_created',
    modelProvider: response.modelProvider,
    detail: {
      draftId: draft.id,
      unsupported: grounding.unsupportedStatementIds.length,
      contradictions: contradictions.length,
      missing: missingInformation.length,
      enhancedReview: safety.enhancedReviewRequired,
    },
  });

  // 18. return draft to human review interface with approval gate.
  const approvalGate = canApproveDraft({ grounding, contradictions, missingInformation, safety });
  return { ok: true, draft, approvalGate };
}
