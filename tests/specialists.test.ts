import { describe, expect, it } from 'vitest';
import { ModelGateway } from '@/lib/ai/gateway';
import { SyntheticProvider } from '@/lib/ai/providers/synthetic';
import type { OrchestratorAudit, OrchestratorDeps } from '@/lib/ai/orchestrator';
import { SPECIALIST_ENGINES, resolveSpecialist, runSpecialist } from '@/lib/ai/specialists';
import { AI_DRAFT_TYPES, type ClinicalContext } from '@/lib/ai/types';
import { FEATURE_FLAG_KEYS } from '@/lib/features/engine';
import {
  SYNTHETIC_STRUCTURED_RECORDS,
  SYNTHETIC_TRANSCRIPT,
} from '@/lib/ai/synthetic-transcript';

const audit: OrchestratorAudit = { record: async () => {} };

function deps(): OrchestratorDeps {
  const gateway = new ModelGateway();
  gateway.register(new SyntheticProvider());
  let n = 0;
  return { gateway, audit, now: () => Date.now(), newId: () => `draft_${(n += 1)}` };
}

const CONTEXT: ClinicalContext = {
  patientId: 'patient_1',
  encounterId: 'enc_1',
  transcriptSegments: SYNTHETIC_TRANSCRIPT,
  structuredRecords: SYNTHETIC_STRUCTURED_RECORDS,
  consentGranted: true,
};

const CLINICIAN = {
  userId: 'clinician_1',
  organisationId: 'org_1',
  capabilities: ['clinical:ai:generate'],
};

function request(overrides: Record<string, unknown> = {}) {
  return {
    taskType: 'ASSESSMENT_NOTE',
    patientId: 'patient_1',
    encounterId: 'enc_1',
    actor: CLINICIAN,
    providerName: 'synthetic',
    featureFlagEnabled: true,
    context: CONTEXT,
    seed: 'specialists-test',
    ...overrides,
  };
}

describe('specialist engine registry', () => {
  it('declares exactly one engine for every AI draft type', () => {
    for (const type of AI_DRAFT_TYPES) {
      const def = SPECIALIST_ENGINES[type];
      expect(def, `missing specialist engine for ${type}`).toBeDefined();
      expect(def.taskType).toBe(type);
    }
    expect(Object.keys(SPECIALIST_ENGINES).length).toBe(AI_DRAFT_TYPES.length);
  });

  it('gives every engine a template, capability and real feature flag', () => {
    for (const def of Object.values(SPECIALIST_ENGINES)) {
      expect(def.promptTemplateId.length).toBeGreaterThan(0);
      expect(def.requiredCapability.length).toBeGreaterThan(0);
      expect(FEATURE_FLAG_KEYS).toContain(def.featureFlag);
      expect([1, 3]).toContain(def.draftCount);
    }
  });

  it('only the message-reply engine produces three drafts', () => {
    const multi = Object.values(SPECIALIST_ENGINES).filter((d) => d.draftCount === 3);
    expect(multi.map((d) => d.taskType)).toEqual(['MESSAGE_REPLY']);
  });

  it('resolves known engines and rejects unknown task types', () => {
    expect(resolveSpecialist('ADHD_REPORT')?.taskType).toBe('ADHD_REPORT');
    expect(resolveSpecialist('NOT_A_TASK')).toBeNull();
  });
});

describe('runSpecialist', () => {
  it('returns a single grounded draft for a single-draft engine', async () => {
    const result = await runSpecialist(deps(), request());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.drafts).toHaveLength(1);
      expect(result.drafts[0]?.type).toBe('ASSESSMENT_NOTE');
      expect(result.drafts[0]?.status).toBe('DRAFT_READY');
      expect(result.definition.featureFlag).toBe('clinicalNoteDrafting');
    }
  });

  it('keeps a report formulation visibly missing rather than inventing it', async () => {
    const result = await runSpecialist(deps(), request({ taskType: 'ADHD_REPORT' }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      const draft = result.drafts[0];
      expect(draft?.type).toBe('ADHD_REPORT');
      expect(draft?.missingInformation.map((m) => m.topic)).toContain('diagnostic_formulation');
      expect(result.approvalGates[0]?.allowed).toBe(false);
    }
  });

  it('produces three distinct message-reply drafts that are never sent', async () => {
    const result = await runSpecialist(
      deps(),
      request({ taskType: 'MESSAGE_REPLY', seed: 'msg' }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.drafts).toHaveLength(3);
    const templates = result.drafts.map((d) => d.promptTemplateId);
    expect(new Set(templates).size).toBe(3);

    const greetings = result.drafts.map(
      (d) => d.sections.find((s) => s.key === 'greeting')?.statements[0]?.text ?? '',
    );
    expect(new Set(greetings).size).toBe(3);
    expect(result.drafts.every((d) => d.status === 'DRAFT_READY')).toBe(true);
  });

  it('denies generation without the capability', async () => {
    const result = await runSpecialist(
      deps(),
      request({ actor: { userId: 'x', organisationId: 'org_1', capabilities: [] } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FORBIDDEN');
  });

  it('denies generation when the feature flag is disabled', async () => {
    const result = await runSpecialist(deps(), request({ featureFlagEnabled: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('FEATURE_DISABLED');
  });

  it('denies generation without consent', async () => {
    const result = await runSpecialist(
      deps(),
      request({ context: { ...CONTEXT, consentGranted: false } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('CONSENT_REQUIRED');
  });

  it('reports an unknown task type explicitly', async () => {
    const result = await runSpecialist(deps(), request({ taskType: 'UNREGISTERED' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('UNKNOWN_TASK_TYPE');
  });
});
