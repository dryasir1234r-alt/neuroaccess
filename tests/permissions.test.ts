import { describe, expect, it } from 'vitest';
import {
  authorizeResource,
  canSeeVisibility,
  denyAllAuthzDeps,
  hasCapability,
  permissiveAuthzDeps,
  type AuthzContext,
  type ResourceRef,
} from '@/lib/permissions/engine';

const clinician: AuthzContext = {
  userId: 'clinician_1',
  organisationId: 'org_1',
  capabilities: ['clinical:patient:read'],
};

const patient: AuthzContext = {
  userId: 'patient_user_1',
  organisationId: 'org_1',
  capabilities: ['patient:read:own'],
};

const resource: ResourceRef = {
  type: 'Patient',
  id: 'patient_1',
  organisationId: 'org_1',
  patientUserId: 'patient_user_1',
  assignedClinicianId: 'clinician_1',
};

describe('permission engine', () => {
  it('grants a capability that is present', () => {
    expect(hasCapability(clinician, 'clinical:patient:read', permissiveAuthzDeps).allowed).toBe(true);
  });

  it('denies by default when the capability is absent', () => {
    expect(hasCapability(clinician, 'finance:invoice:create', permissiveAuthzDeps).allowed).toBe(
      false,
    );
  });

  it('denies everything when the deny-all deps are used', () => {
    expect(hasCapability(clinician, 'clinical:patient:read', denyAllAuthzDeps).allowed).toBe(false);
  });

  it('prevents cross-organisation access', () => {
    const decision = authorizeResource(
      { ...clinician, organisationId: 'org_2' },
      'clinical:patient:read',
      resource,
      permissiveAuthzDeps,
    );
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe('cross_organisation_denied');
  });

  it('allows a patient to access their own record', () => {
    const decision = authorizeResource(
      patient,
      'patient:read:own',
      resource,
      permissiveAuthzDeps,
    );
    expect(decision.allowed).toBe(true);
  });

  it('prevents cross-patient access for a non-related clinician', () => {
    const otherClinician: AuthzContext = {
      userId: 'clinician_2',
      organisationId: 'org_1',
      capabilities: ['clinical:patient:read'],
    };
    const decision = authorizeResource(
      otherClinician,
      'clinical:patient:read',
      resource,
      permissiveAuthzDeps,
    );
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) expect(decision.reason).toBe('no_relationship_to_resource');
  });

  it('enforces timeline visibility by classification', () => {
    expect(canSeeVisibility(patient, 'PATIENT', resource)).toBe(true);
    expect(canSeeVisibility(patient, 'RESTRICTED', resource)).toBe(false);
    expect(canSeeVisibility(clinician, 'ASSIGNED_CLINICAL_TEAM', resource)).toBe(true);
  });
});
