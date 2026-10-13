import { describe, expect, it } from 'vitest';
import { ModelGateway } from '@/lib/ai/gateway';
import { SyntheticProvider } from '@/lib/ai/providers/synthetic';
import { generateDraft, type OrchestratorAudit } from '@/lib/ai/orchestrator';
import {
  SYNTHETIC_STRUCTURED_RECORDS,
  SYNTHETIC_TRANSCRIPT,
} from '@/lib/ai/synthetic-transcript';
import { evaluateTransition } from '@/lib/journey/engine';
import type {
  ActorContext,
  JourneyCommandInput,
  JourneyProjection,
  JourneyStage,
  PrerequisiteKey,
} from '@/lib/domain/journey';

const ADMIN: ActorContext = {
  userId: 'admin_1',
  organisationId: 'org_1',
  capabilities: ['admin:referral:triage'],
};
const CLINICIAN: ActorContext = {
  userId: 'clinician_1',
  organisationId: 'org_1',
  capabilities: [
    'clinical:journey:transition',
    'clinical:assessment:create',
    'clinical:diagnosis:record',
    'clinical:ai:generate',
  ],
};

const ALL_PREREQS: readonly PrerequisiteKey[] = [
  'identity_verified',
  'registration_validated',
  'consent_recorded',
  'intake_complete',
  'questionnaires_complete',
  'documents_complete',
  'assessment_complete',
  'note_signed',
  'diagnosis_recorded',
  'baseline_observations',
];

/**
 * In-memory journey store used to drive the full vertical slice without a
 * database. Mirrors the production engine's optimistic-concurrency contract.
 */
class InMemoryJourneyStore {
  private journey: JourneyProjection = {
    patientId: 'patient_1',
    stage: 'LEAD',
    version: 1,
    assignedClinicianId: null,
    blockers: [],
  };
  readonly transitions: string[] = [];

  async run(command: JourneyCommandInput): Promise<void> {
    const result = evaluateTransition({
      current: this.journey,
      input: command,
      satisfied: ALL_PREREQS,
      featureEnabled: true,
      extraBlockers: [],
    });
    if (!result.ok) {
      throw new Error(`transition failed: ${result.code} ${result.message}`);
    }
    this.journey = result.projection;
    this.transitions.push(command.command);
  }

  get stage(): JourneyStage {
    return this.journey.stage;
  }

  get version(): number {
    return this.journey.version;
  }
}

const auditRecorder: OrchestratorAudit = {
  record: async () => {
    /* no-op: production persists to the AI audit table */
  },
};

function orchestratorDeps() {
  const gateway = new ModelGateway();
  gateway.register(new SyntheticProvider());
  return { gateway, audit: auditRecorder, now: () => Date.now(), newId: () => 'draft_1' };
}

describe('vertical slice: referral to signed assessment note', () => {
  it('drives the complete workflow with synthetic data only', async () => {
    const store = new InMemoryJourneyStore();
    const patientId = 'patient_1';

    await store.run({ patientId, command: 'CREATE_REFERRAL', actor: ADMIN, reason: 'GP referral received', expectedVersion: store.version });
    expect(store.stage).toBe('LEAD');

    await store.run({ patientId, command: 'VALIDATE_REGISTRATION', actor: ADMIN, reason: 'Identity verified', expectedVersion: store.version });
    expect(store.stage).toBe('BOOKED');

    await store.run({ patientId, command: 'COMPLETE_TRIAGE', actor: CLINICIAN, reason: 'Triage complete', expectedVersion: store.version });
    expect(store.stage).toBe('INTAKE');

    await store.run({ patientId, command: 'COMPLETE_INTAKE', actor: CLINICIAN, reason: 'Questionnaires and documents received', expectedVersion: store.version });
    expect(store.stage).toBe('ASSESSMENT');

    await store.run({ patientId, command: 'START_ASSESSMENT', actor: CLINICIAN, reason: 'Consultation started', expectedVersion: store.version });
    expect(store.stage).toBe('ASSESSMENT');

    const deps = orchestratorDeps();
    const result = await generateDraft(deps, {
      taskType: 'ASSESSMENT_NOTE',
      promptTemplateId: 'adhd_assessment_note_v1',
      patientId,
      encounterId: 'enc_1',
      actor: { userId: CLINICIAN.userId, organisationId: 'org_1', capabilities: CLINICIAN.capabilities },
      requiredCapability: 'clinical:ai:generate',
      featureFlagEnabled: true,
      providerName: 'synthetic',
      context: {
        patientId,
        encounterId: 'enc_1',
        transcriptSegments: SYNTHETIC_TRANSCRIPT,
        structuredRecords: SYNTHETIC_STRUCTURED_RECORDS,
        consentGranted: true,
      },
      requiredTopics: ['reason_for_referral', 'adhd_symptoms', 'risk'],
      seed: 'vertical-slice',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.draft.grounding.sourceCoverage).toBeGreaterThan(0);
    // Synthetic transcript deliberately contains a contradiction.
    expect(result.draft.contradictions.length).toBeGreaterThan(0);
    // Medication/cardiovascular content mandates enhanced review.
    expect(result.draft.safety.enhancedReviewRequired).toBe(true);
    // Contradictions + template plan mean approval is gated.
    expect(result.approvalGate.allowed).toBe(false);

    // Clinician resolves the contradiction; approval now passes.
    const resolved = await generateDraft(deps, {
      taskType: 'ASSESSMENT_NOTE',
      promptTemplateId: 'adhd_assessment_note_v1',
      patientId,
      encounterId: 'enc_1',
      actor: { userId: CLINICIAN.userId, organisationId: 'org_1', capabilities: CLINICIAN.capabilities },
      requiredCapability: 'clinical:ai:generate',
      featureFlagEnabled: true,
      providerName: 'synthetic',
      context: {
        patientId,
        encounterId: 'enc_1',
        transcriptSegments: SYNTHETIC_TRANSCRIPT.filter((s) => s.id !== 'seg_005'),
        structuredRecords: SYNTHETIC_STRUCTURED_RECORDS,
        consentGranted: true,
      },
      requiredTopics: ['reason_for_referral', 'adhd_symptoms', 'risk'],
      seed: 'vertical-slice-2',
    });
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.draft.contradictions.length).toBe(0);

    await store.run({ patientId, command: 'COMPLETE_ASSESSMENT', actor: CLINICIAN, reason: 'Assessment note signed', expectedVersion: store.version });
    expect(store.stage).toBe('DIAGNOSIS_REVIEW');

    await store.run({ patientId, command: 'SUBMIT_DIAGNOSIS', actor: CLINICIAN, reason: 'ADHD diagnosis confirmed', expectedVersion: store.version });
    expect(store.stage).toBe('DIAGNOSIS_CONFIRMED');

    expect(store.transitions).toEqual([
      'CREATE_REFERRAL',
      'VALIDATE_REGISTRATION',
      'COMPLETE_TRIAGE',
      'COMPLETE_INTAKE',
      'START_ASSESSMENT',
      'COMPLETE_ASSESSMENT',
      'SUBMIT_DIAGNOSIS',
    ]);
  });

  it('denies AI generation without consent', async () => {
    const deps = orchestratorDeps();
    const result = await generateDraft(deps, {
      taskType: 'ASSESSMENT_NOTE',
      promptTemplateId: 'x',
      patientId: 'patient_1',
      encounterId: 'enc_1',
      actor: { userId: 'clinician_1', organisationId: 'org_1', capabilities: ['clinical:ai:generate'] },
      requiredCapability: 'clinical:ai:generate',
      featureFlagEnabled: true,
      providerName: 'synthetic',
      context: {
        patientId: 'patient_1',
        encounterId: 'enc_1',
        transcriptSegments: SYNTHETIC_TRANSCRIPT,
        structuredRecords: [],
        consentGranted: false,
      },
      requiredTopics: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('CONSENT_REQUIRED');
  });

  it('reports model provider failure explicitly', async () => {
    const deps = orchestratorDeps();
    const result = await generateDraft(deps, {
      taskType: 'ASSESSMENT_NOTE',
      promptTemplateId: 'x',
      patientId: 'patient_1',
      encounterId: 'enc_1',
      actor: { userId: 'clinician_1', organisationId: 'org_1', capabilities: ['clinical:ai:generate'] },
      requiredCapability: 'clinical:ai:generate',
      featureFlagEnabled: true,
      providerName: 'does-not-exist',
      context: {
        patientId: 'patient_1',
        encounterId: 'enc_1',
        transcriptSegments: SYNTHETIC_TRANSCRIPT,
        structuredRecords: [],
        consentGranted: true,
      },
      requiredTopics: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('MODEL_PROVIDER_FAILURE');
  });
});
