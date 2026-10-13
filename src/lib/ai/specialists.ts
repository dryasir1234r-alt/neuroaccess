import type { AIDraft, AIDraftType, ClinicalContext } from '@/lib/ai/types';
import type { FeatureFlagKey } from '@/lib/features/engine';
import { generateDraft, type OrchestratorActor, type OrchestratorDeps } from '@/lib/ai/orchestrator';
import {
  generateMessageReplyDrafts,
  MESSAGE_REPLY_VARIANTS,
  type ApprovalGate,
} from '@/lib/ai/message-drafts';

/**
 * Specialist documentation engine registry.
 *
 * The orchestrator is generic; this registry is the single source of truth for
 * which specialist engines exist, the capability and feature flag each requires,
 * the topics each must cover, and how many independent drafts each produces
 * before human review. Every `AIDraftType` must have exactly one entry — the
 * `Record` type makes a missing engine a compile error.
 */

const AI_GENERATE = 'clinical:ai:generate';

export interface SpecialistDefinition {
  readonly taskType: AIDraftType;
  readonly promptTemplateId: string;
  readonly requiredCapability: string;
  readonly featureFlag: FeatureFlagKey;
  /** Topics that must be present; absence is reported, never invented. */
  readonly requiredTopics: readonly string[];
  /** Number of independent drafts produced for human review (1 or 3). */
  readonly draftCount: 1 | 3;
  readonly title: string;
}

function define(
  taskType: AIDraftType,
  promptTemplateId: string,
  featureFlag: FeatureFlagKey,
  requiredTopics: readonly string[],
  title: string,
  draftCount: 1 | 3 = 1,
): SpecialistDefinition {
  return {
    taskType,
    promptTemplateId,
    requiredCapability: AI_GENERATE,
    featureFlag,
    requiredTopics,
    draftCount,
    title,
  };
}

export const SPECIALIST_ENGINES: Readonly<Record<AIDraftType, SpecialistDefinition>> = {
  ASSESSMENT_NOTE: define('ASSESSMENT_NOTE', 'adhd_assessment_note_v1', 'clinicalNoteDrafting', ['reason_for_referral', 'adhd_symptoms', 'risk'], 'Assessment note'),
  ADHD_REPORT: define('ADHD_REPORT', 'adhd_report_v1', 'adhdReportDrafting', ['current_presentation', 'diagnostic_formulation'], 'ADHD assessment report'),
  AUTISM_REPORT: define('AUTISM_REPORT', 'autism_report_v1', 'autismReportDrafting', ['current_presentation', 'diagnostic_formulation'], 'Autism assessment report'),
  TITRATION_NOTE: define('TITRATION_NOTE', 'titration_note_v1', 'titrationNoteDrafting', ['current_medication', 'adverse_effects'], 'Titration note'),
  MEDICATION_REVIEW: define('MEDICATION_REVIEW', 'medication_review_v1', 'titrationNoteDrafting', ['current_medication', 'adverse_effects'], 'Medication review'),
  DIAGNOSTIC_FEEDBACK: define('DIAGNOSTIC_FEEDBACK', 'diagnostic_feedback_v1', 'clinicalLetterDrafting', ['clinical_summary'], 'Diagnostic feedback letter'),
  ANNUAL_REVIEW: define('ANNUAL_REVIEW', 'annual_review_note_v1', 'clinicalNoteDrafting', ['summary'], 'Annual review note'),
  SHARED_CARE_REVIEW: define('SHARED_CARE_REVIEW', 'shared_care_review_v1', 'clinicalLetterDrafting', ['clinical_summary'], 'Shared-care review'),
  RISK_REVIEW: define('RISK_REVIEW', 'risk_review_v1', 'clinicalNoteDrafting', ['risk'], 'Risk review'),
  MDT_REVIEW: define('MDT_REVIEW', 'mdt_review_v1', 'clinicalNoteDrafting', ['summary'], 'MDT review note'),
  FOLLOW_UP: define('FOLLOW_UP', 'follow_up_note_v1', 'clinicalNoteDrafting', ['summary'], 'Follow-up note'),
  TELEPHONE_CONTACT: define('TELEPHONE_CONTACT', 'telephone_contact_v1', 'clinicalNoteDrafting', ['summary'], 'Telephone contact note'),
  GP_LETTER: define('GP_LETTER', 'gp_letter_v1', 'clinicalLetterDrafting', ['clinical_summary'], 'GP letter'),
  SUPPORT_LETTER: define('SUPPORT_LETTER', 'support_letter_v1', 'clinicalLetterDrafting', ['clinical_summary'], 'Support letter'),
  OCCUPATIONAL_HEALTH_LETTER: define('OCCUPATIONAL_HEALTH_LETTER', 'occupational_health_letter_v1', 'clinicalLetterDrafting', ['clinical_summary'], 'Occupational health letter'),
  TITRATION_SUMMARY: define('TITRATION_SUMMARY', 'titration_summary_v1', 'titrationNoteDrafting', ['current_medication', 'adverse_effects'], 'Titration summary'),
  END_OF_TITRATION_LETTER: define('END_OF_TITRATION_LETTER', 'end_of_titration_letter_v1', 'clinicalLetterDrafting', ['clinical_summary'], 'End-of-titration letter'),
  SHARED_CARE_REQUEST: define('SHARED_CARE_REQUEST', 'shared_care_request_v1', 'clinicalLetterDrafting', ['clinical_summary'], 'Shared-care request'),
  ANNUAL_REVIEW_REPORT: define('ANNUAL_REVIEW_REPORT', 'annual_review_report_v1', 'adhdReportDrafting', ['current_presentation'], 'Annual review report'),
  DISCHARGE_LETTER: define('DISCHARGE_LETTER', 'discharge_letter_v1', 'clinicalLetterDrafting', ['clinical_summary'], 'Discharge letter'),
  MESSAGE_REPLY: define('MESSAGE_REPLY', 'message_reply_v1', 'messageReplyDrafting', ['response_body'], 'Message reply', 3),
};

/** Resolve the specialist engine for a task type, or null when unregistered. */
export function resolveSpecialist(taskType: string): SpecialistDefinition | null {
  const registry: Readonly<Record<string, SpecialistDefinition>> = SPECIALIST_ENGINES;
  return registry[taskType] ?? null;
}

export { MESSAGE_REPLY_VARIANTS };

export interface SpecialistRequest {
  readonly taskType: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly actor: OrchestratorActor;
  readonly providerName: string;
  readonly featureFlagEnabled: boolean;
  readonly context: ClinicalContext;
  readonly seed?: string;
}

export type SpecialistResult =
  | {
      readonly ok: true;
      readonly definition: SpecialistDefinition;
      readonly drafts: readonly AIDraft[];
      readonly approvalGates: readonly ApprovalGate[];
    }
  | { readonly ok: false; readonly code: string; readonly message: string };

/**
 * Run a specialist engine through the mandated orchestrator flow. Single-draft
 * engines return one draft; the message-reply engine returns three deliberately
 * distinct drafts. Nothing is ever signed, sent or shared by this layer.
 */
export async function runSpecialist(
  deps: OrchestratorDeps,
  request: SpecialistRequest,
): Promise<SpecialistResult> {
  const definition = resolveSpecialist(request.taskType);
  if (!definition) {
    return {
      ok: false,
      code: 'UNKNOWN_TASK_TYPE',
      message: `No specialist engine is registered for task type "${request.taskType}".`,
    };
  }

  if (definition.draftCount === 3) {
    const result = await generateMessageReplyDrafts(deps, {
      patientId: request.patientId,
      encounterId: request.encounterId,
      actor: request.actor,
      providerName: request.providerName,
      featureFlagEnabled: request.featureFlagEnabled,
      context: request.context,
      promptTemplateId: definition.promptTemplateId,
      requiredTopics: definition.requiredTopics,
      requiredCapability: definition.requiredCapability,
      seed: request.seed,
    });
    if (!result.ok) return result;
    return { ok: true, definition, drafts: result.drafts, approvalGates: result.approvalGates };
  }

  const result = await generateDraft(deps, {
    taskType: definition.taskType,
    promptTemplateId: definition.promptTemplateId,
    patientId: request.patientId,
    encounterId: request.encounterId,
    actor: request.actor,
    requiredCapability: definition.requiredCapability,
    featureFlagEnabled: request.featureFlagEnabled,
    providerName: request.providerName,
    context: request.context,
    requiredTopics: definition.requiredTopics,
    seed: request.seed,
  });
  if (!result.ok) return result;
  return { ok: true, definition, drafts: [result.draft], approvalGates: [result.approvalGate] };
}
