import type { AIDraft, ClinicalContext, DraftStatus } from '@/lib/ai/types';
import { generateDraft, type OrchestratorActor, type OrchestratorDeps } from '@/lib/ai/orchestrator';

/**
 * Message-Drafting Engine.
 *
 * Produces THREE deliberately distinct reply drafts for a patient message. The
 * engine is assistive only: it can never send. There is no send path in this
 * module — sending requires a separate human-review Server Action guarded by
 * `MESSAGE_SEND_CAPABILITY` and an explicit attestation, authorised by
 * `canSendMessageDraft`. Every draft is produced through the full orchestrator
 * flow, so each carries its own grounding, contradiction, missing-information
 * and safety result.
 */

export const MESSAGE_REPLY_VARIANTS = ['warm', 'concise', 'detailed'] as const;
export type MessageReplyVariant = (typeof MESSAGE_REPLY_VARIANTS)[number];

/** Capability required to actually send a reply (never held by the engine). */
export const MESSAGE_SEND_CAPABILITY = 'clinical:message:reply';

/** Explicit attestation required before any reply may be sent. */
export const MESSAGE_SEND_ATTESTATION =
  'I have read this reply, checked it against the patient record, and accept ' +
  'responsibility for sending it.';

export interface ApprovalGate {
  readonly allowed: boolean;
  readonly reasons: readonly string[];
}

export interface MessageReplyDraftRequest {
  readonly patientId: string;
  readonly encounterId: string;
  readonly actor: OrchestratorActor;
  readonly providerName: string;
  readonly featureFlagEnabled: boolean;
  readonly context: ClinicalContext;
  readonly promptTemplateId: string;
  readonly requiredTopics: readonly string[];
  readonly requiredCapability: string;
  readonly seed?: string;
}

export type MessageReplyResult =
  | {
      readonly ok: true;
      readonly drafts: readonly AIDraft[];
      readonly approvalGates: readonly ApprovalGate[];
      readonly variants: readonly MessageReplyVariant[];
    }
  | { readonly ok: false; readonly code: string; readonly message: string };

/**
 * Generate the three distinct reply drafts. If any variant fails (capability,
 * consent, feature flag or provider failure) the whole operation fails and no
 * partial set is returned.
 */
export async function generateMessageReplyDrafts(
  deps: OrchestratorDeps,
  request: MessageReplyDraftRequest,
): Promise<MessageReplyResult> {
  const drafts: AIDraft[] = [];
  const approvalGates: ApprovalGate[] = [];

  for (const variant of MESSAGE_REPLY_VARIANTS) {
    const result = await generateDraft(deps, {
      taskType: 'MESSAGE_REPLY',
      promptTemplateId: `${request.promptTemplateId}_${variant}`,
      patientId: request.patientId,
      encounterId: request.encounterId,
      actor: request.actor,
      requiredCapability: request.requiredCapability,
      featureFlagEnabled: request.featureFlagEnabled,
      providerName: request.providerName,
      context: request.context,
      requiredTopics: request.requiredTopics,
      seed: request.seed ? `${request.seed}:${variant}` : variant,
      variant,
    });

    if (!result.ok) {
      return { ok: false, code: result.code, message: result.message };
    }
    drafts.push(result.draft);
    approvalGates.push(result.approvalGate);
  }

  return { ok: true, drafts, approvalGates, variants: MESSAGE_REPLY_VARIANTS };
}

const SENDABLE_STATUSES: readonly DraftStatus[] = [
  'DRAFT_READY',
  'CLINICIAN_REVIEW',
  'APPROVED',
  'AMENDED',
];

/**
 * Authorise sending. This function only ever returns a decision; it performs no
 * send. Sending requires the capability, a passed approval gate, an accepted
 * attestation and a draft that is no longer generating/failed/rejected.
 */
export function canSendMessageDraft(params: {
  readonly actorCapabilities: readonly string[];
  readonly draftStatus: DraftStatus;
  readonly approvalGate: ApprovalGate;
  readonly attestationAccepted: boolean;
}): ApprovalGate {
  const reasons: string[] = [];

  if (!params.actorCapabilities.includes(MESSAGE_SEND_CAPABILITY)) {
    reasons.push(`Missing capability: ${MESSAGE_SEND_CAPABILITY}.`);
  }
  if (!params.approvalGate.allowed) {
    reasons.push('The approval gate has not passed.');
  }
  if (!params.attestationAccepted) {
    reasons.push('The clinician attestation has not been accepted.');
  }
  if (!SENDABLE_STATUSES.includes(params.draftStatus)) {
    reasons.push(`Draft status ${params.draftStatus} is not sendable.`);
  }

  return { allowed: reasons.length === 0, reasons };
}
