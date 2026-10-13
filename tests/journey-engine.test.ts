import { describe, expect, it } from 'vitest';
import { evaluateTransition } from '@/lib/journey/engine';
import type {
  ActorContext,
  JourneyCommandInput,
  JourneyProjection,
  PrerequisiteKey,
} from '@/lib/domain/journey';

const CLINICIAN: ActorContext = {
  userId: 'clinician_1',
  organisationId: 'org_1',
  capabilities: [
    'clinical:journey:transition',
    'clinical:assessment:create',
    'clinical:diagnosis:record',
    'clinical:titration:manage',
  ],
};

const ADMIN: ActorContext = {
  userId: 'admin_1',
  organisationId: 'org_1',
  capabilities: ['admin:referral:triage'],
};

function journey(stage: JourneyProjection['stage'], version = 1): JourneyProjection {
  return {
    patientId: 'patient_1',
    stage,
    version,
    assignedClinicianId: 'clinician_1',
    blockers: [],
  };
}

function input(overrides: Partial<JourneyCommandInput>): JourneyCommandInput {
  return {
    patientId: 'patient_1',
    command: 'COMPLETE_INTAKE',
    actor: CLINICIAN,
    reason: 'Intake complete',
    expectedVersion: 1,
    ...overrides,
  };
}

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
  'ecg_received',
  'mdt_outcome',
  'prescription_signed',
  'stable_dose',
  'gp_agreement',
  'annual_review_due',
];

describe('care journey state machine', () => {
  it('permits a valid transition when capability, feature and prerequisites hold', () => {
    const result = evaluateTransition({
      current: journey('INTAKE'),
      input: input({}),
      satisfied: ALL_PREREQS,
      featureEnabled: true,
      extraBlockers: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.projection.stage).toBe('ASSESSMENT');
      expect(result.projection.version).toBe(2);
      expect(result.tasks).toHaveLength(1);
      expect(result.auditEvent.action).toBe('journey.complete_intake');
    }
  });

  it('denies a command from an invalid stage', () => {
    const result = evaluateTransition({
      current: journey('DISCHARGE'),
      input: input({}),
      satisfied: ALL_PREREQS,
      featureEnabled: true,
      extraBlockers: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_TRANSITION');
  });

  it('denies when the actor lacks the capability (deny by default)', () => {
    const result = evaluateTransition({
      current: journey('INTAKE'),
      input: input({ actor: { ...CLINICIAN, capabilities: [] } }),
      satisfied: ALL_PREREQS,
      featureEnabled: true,
      extraBlockers: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
  });

  it('denies when the feature flag is disabled', () => {
    const result = evaluateTransition({
      current: journey('INTAKE'),
      input: input({}),
      satisfied: ALL_PREREQS,
      featureEnabled: false,
      extraBlockers: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FEATURE_DISABLED');
  });

  it('rejects stale versions (optimistic concurrency)', () => {
    const result = evaluateTransition({
      current: journey('INTAKE', 5),
      input: input({ expectedVersion: 4 }),
      satisfied: ALL_PREREQS,
      featureEnabled: true,
      extraBlockers: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('VERSION_CONFLICT');
      expect(result.currentVersion).toBe(5);
    }
  });

  it('reports missing prerequisites explicitly', () => {
    const result = evaluateTransition({
      current: journey('INTAKE'),
      input: input({}),
      satisfied: ['intake_complete'],
      featureEnabled: true,
      extraBlockers: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('MISSING_PREREQUISITES');
      expect(result.missing).toContain('questionnaires_complete');
      expect(result.missing).toContain('documents_complete');
    }
  });

  it('blocks on unresolved blockers', () => {
    const result = evaluateTransition({
      current: journey('INTAKE'),
      input: input({}),
      satisfied: ALL_PREREQS,
      featureEnabled: true,
      extraBlockers: [{ key: 'unpaid_invoice', label: 'Unpaid invoice', owner: 'FINANCE' }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('BLOCKED');
  });

  it('admin can validate registration from LEAD', () => {
    const result = evaluateTransition({
      current: journey('LEAD'),
      input: input({ command: 'VALIDATE_REGISTRATION', actor: ADMIN }),
      satisfied: ALL_PREREQS,
      featureEnabled: true,
      extraBlockers: [],
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.projection.stage).toBe('BOOKED');
  });
});
