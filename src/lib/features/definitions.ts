import type { Environment, FeatureFlagKey, FlagDefinition, ReleaseState } from '@/lib/features/engine';

const ALL_ENVS: readonly Environment[] = ['development', 'staging', 'production'];
const NON_PROD: readonly Environment[] = ['development', 'staging'];

interface Seed {
  readonly key: FeatureFlagKey;
  readonly defaultState: ReleaseState;
  readonly requiredCapability?: string;
  readonly allowedEnvironments: readonly Environment[];
}

/**
 * Canonical flag registry. Every flag declared here is enforceable
 * server-side. Defaults are deliberately conservative: clinical AI features
 * default to DISABLED.
 */
export const FLAG_DEFINITIONS: Readonly<Record<FeatureFlagKey, FlagDefinition>> = buildRegistry([
  { key: 'unifiedApplicationShell', defaultState: 'FULL_PRODUCTION', allowedEnvironments: ALL_ENVS },
  { key: 'patientWorkspace', defaultState: 'FULL_PRODUCTION', requiredCapability: 'patient:read:own', allowedEnvironments: ALL_ENVS },
  { key: 'clinicianWorkstation', defaultState: 'FULL_PRODUCTION', requiredCapability: 'clinical:patient:read', allowedEnvironments: ALL_ENVS },
  { key: 'adminControlCentre', defaultState: 'FULL_PRODUCTION', requiredCapability: 'admin:referral:triage', allowedEnvironments: ALL_ENVS },
  { key: 'financeWorkspace', defaultState: 'FULL_PRODUCTION', requiredCapability: 'finance:invoice:read', allowedEnvironments: ALL_ENVS },
  { key: 'careJourneyEngine', defaultState: 'FULL_PRODUCTION', requiredCapability: 'clinical:journey:transition', allowedEnvironments: ALL_ENVS },
  { key: 'unifiedPatientTimeline', defaultState: 'FULL_PRODUCTION', requiredCapability: 'clinical:patient:read', allowedEnvironments: ALL_ENVS },
  { key: 'referralWorkflow', defaultState: 'FULL_PRODUCTION', requiredCapability: 'admin:referral:triage', allowedEnvironments: ALL_ENVS },
  { key: 'intakeWorkflow', defaultState: 'FULL_PRODUCTION', requiredCapability: 'patient:questionnaire:respond', allowedEnvironments: ALL_ENVS },
  { key: 'adhdAssessmentWorkflow', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:assessment:create', allowedEnvironments: ALL_ENVS },
  { key: 'autismAssessmentWorkflow', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:assessment:create', allowedEnvironments: ALL_ENVS },
  { key: 'diagnosisWorkflow', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:diagnosis:record', allowedEnvironments: ALL_ENVS },
  { key: 'mdtWorkflow', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:mdt:participate', allowedEnvironments: ALL_ENVS },
  { key: 'titrationWorkflow', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:titration:manage', allowedEnvironments: ALL_ENVS },
  { key: 'prescribingWorkflow', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:prescription:create', allowedEnvironments: ALL_ENVS },
  { key: 'repeatPrescriptionRequests', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'patient:message:send', allowedEnvironments: ALL_ENVS },
  { key: 'prescriptionTracking', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'patient:prescription:track', allowedEnvironments: ALL_ENVS },
  { key: 'courierTracking', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:prescription:create', allowedEnvironments: ALL_ENVS },
  { key: 'physicalHealthMonitoring', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:monitoring:review', allowedEnvironments: ALL_ENVS },
  { key: 'sharedCareWorkflow', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:report:create', allowedEnvironments: ALL_ENVS },
  { key: 'annualReviewWorkflow', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:assessment:create', allowedEnvironments: ALL_ENVS },
  { key: 'complaintsWorkflow', defaultState: 'FULL_PRODUCTION', requiredCapability: 'admin:complaint:manage', allowedEnvironments: ALL_ENVS },
  { key: 'paymentTracking', defaultState: 'FULL_PRODUCTION', requiredCapability: 'finance:payment:process', allowedEnvironments: ALL_ENVS },
  { key: 'videoConsultations', defaultState: 'LIMITED_ROLLOUT', requiredCapability: 'clinical:consent:obtain', allowedEnvironments: ALL_ENVS },
  { key: 'clinicalAiEnabled', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:generate', allowedEnvironments: NON_PROD },
  { key: 'consultationTranscription', defaultState: 'DISABLED', requiredCapability: 'ai:transcription:start', allowedEnvironments: NON_PROD },
  { key: 'liveConsultationAssistant', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:generate', allowedEnvironments: NON_PROD },
  { key: 'clinicalNoteDrafting', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:generate', allowedEnvironments: NON_PROD },
  { key: 'adhdReportDrafting', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:generate', allowedEnvironments: NON_PROD },
  { key: 'autismReportDrafting', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:generate', allowedEnvironments: NON_PROD },
  { key: 'messageReplyDrafting', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:generate', allowedEnvironments: NON_PROD },
  { key: 'titrationNoteDrafting', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:generate', allowedEnvironments: NON_PROD },
  { key: 'clinicalLetterDrafting', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:generate', allowedEnvironments: NON_PROD },
  { key: 'transcriptEvidenceReview', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:review', allowedEnvironments: NON_PROD },
  { key: 'contradictionDetection', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:review', allowedEnvironments: NON_PROD },
  { key: 'missingInformationDetection', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:review', allowedEnvironments: NON_PROD },
  { key: 'aiSafetyLayer', defaultState: 'DISABLED', requiredCapability: 'clinical:ai:review', allowedEnvironments: NON_PROD },
  { key: 'localModelProvider', defaultState: 'DEVELOPMENT_ONLY', requiredCapability: 'ai:model:configure', allowedEnvironments: NON_PROD },
  { key: 'approvedCloudModelProvider', defaultState: 'DISABLED', requiredCapability: 'ai:model:configure', allowedEnvironments: NON_PROD },
  { key: 'aiAuditReview', defaultState: 'DISABLED', requiredCapability: 'ai:audit:read', allowedEnvironments: NON_PROD },
]);

function buildRegistry(seeds: readonly Seed[]): Record<FeatureFlagKey, FlagDefinition> {
  const out = {} as Record<FeatureFlagKey, FlagDefinition>;
  for (const seed of seeds) {
    out[seed.key] = {
      key: seed.key,
      defaultState: seed.defaultState,
      requiredCapability: seed.requiredCapability,
      allowedEnvironments: seed.allowedEnvironments,
    };
  }
  return out;
}
