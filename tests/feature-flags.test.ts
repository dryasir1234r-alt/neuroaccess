import { describe, expect, it } from 'vitest';
import {
  assertFlagChangeAllowed,
  evaluateFlag,
  stableBucket,
  type FlagActor,
  type FlagDefinition,
  type FlagEvaluationDeps,
} from '@/lib/features/engine';
import { FLAG_DEFINITIONS } from '@/lib/features/definitions';

const actor: FlagActor = {
  userId: 'user_1',
  organisationId: 'org_1',
  capabilities: ['clinical:ai:generate', 'clinical:patient:read', 'clinical:assessment:create'],
};

const noDeps: FlagEvaluationDeps = {
  isEmergencyDisabled: () => false,
  organisationState: () => null,
  userOverride: () => null,
  bucket: () => 0,
};

const devCtx = { actor, environment: 'development' as const };
const prodCtx = { actor, environment: 'production' as const };

describe('feature flag engine', () => {
  it('emergency kill switch wins over everything', () => {
    const def = FLAG_DEFINITIONS.careJourneyEngine;
    const decision = evaluateFlag(def, devCtx, {
      ...noDeps,
      isEmergencyDisabled: () => true,
      organisationState: () => ({ state: 'FULL_PRODUCTION', rolloutPercent: 100 }),
    });
    expect(decision.enabled).toBe(false);
    expect(decision.resolvedBy).toBe('EMERGENCY_KILL_SWITCH');
    expect(decision.state).toBe('EMERGENCY_DISABLED');
  });

  it('environment restriction blocks AI flags in production', () => {
    const def = FLAG_DEFINITIONS.clinicalAiEnabled;
    const decision = evaluateFlag(def, prodCtx, noDeps);
    expect(decision.enabled).toBe(false);
    expect(decision.resolvedBy).toBe('ENVIRONMENT');
  });

  it('AI flags are disabled by default', () => {
    const def = FLAG_DEFINITIONS.clinicalNoteDrafting;
    const decision = evaluateFlag(def, devCtx, noDeps);
    expect(decision.enabled).toBe(false);
    expect(decision.resolvedBy).toBe('DEFAULT');
    expect(decision.state).toBe('DISABLED');
  });

  it('capability restriction blocks a flag for an actor without the capability', () => {
    const def: FlagDefinition = {
      key: 'clinicalNoteDrafting',
      defaultState: 'FULL_PRODUCTION',
      requiredCapability: 'clinical:ai:generate',
      allowedEnvironments: ['development'],
    };
    const decision = evaluateFlag(def, { actor: { ...actor, capabilities: [] }, environment: 'development' }, noDeps);
    expect(decision.enabled).toBe(false);
    expect(decision.resolvedBy).toBe('CAPABILITY');
  });

  it('user override enables a flag for internal testing', () => {
    const def = FLAG_DEFINITIONS.clinicalNoteDrafting;
    const decision = evaluateFlag(def, devCtx, {
      ...noDeps,
      userOverride: () => 'INTERNAL_TESTING',
    });
    expect(decision.enabled).toBe(true);
    expect(decision.resolvedBy).toBe('USER_OVERRIDE');
  });

  it('limited rollout is deterministic and percentage-bounded', () => {
    const def = FLAG_DEFINITIONS.adhdAssessmentWorkflow;
    const deps: FlagEvaluationDeps = {
      ...noDeps,
      organisationState: () => ({ state: 'LIMITED_ROLLOUT', rolloutPercent: 50 }),
      bucket: (userId, flag) => stableBucket(userId, flag),
    };
    const a = evaluateFlag(def, devCtx, deps);
    const b = evaluateFlag(def, devCtx, deps);
    expect(a.enabled).toBe(b.enabled);
    expect(a.resolvedBy).toBe('ROLLOUT');
  });

  it('requires actor, reason and scope for a flag change', () => {
    expect(() =>
      assertFlagChangeAllowed({ actorCapabilities: [], reason: 'x', scope: 'org_1' }),
    ).toThrow(/FORBIDDEN/);
    expect(() =>
      assertFlagChangeAllowed({ actorCapabilities: ['admin:feature:manage'], reason: '', scope: 'org_1' }),
    ).toThrow(/reason/);
    expect(() =>
      assertFlagChangeAllowed({ actorCapabilities: ['admin:feature:manage'], reason: 'rollout', scope: '' }),
    ).toThrow(/scope/);
    expect(() =>
      assertFlagChangeAllowed({
        actorCapabilities: ['admin:feature:manage'],
        reason: 'rollout to cohort',
        scope: 'org_1',
      }),
    ).not.toThrow();
  });
});
