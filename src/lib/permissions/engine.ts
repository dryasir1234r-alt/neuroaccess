/**
 * NeuroAssess permission engine.
 *
 * Deny-by-default, capability-based authorisation. All checks are intended to
 * run server-side. The engine is pure so it can be exhaustively unit tested;
 * persistence and flag lookups are injected.
 */

export interface AuthzContext {
  readonly userId: string;
  readonly organisationId: string;
  readonly capabilities: readonly string[];
}

export interface ResourceRef {
  readonly type: string;
  readonly id: string;
  readonly organisationId: string;
  /** For patient-scoped resources: the owning user id of the patient. */
  readonly patientUserId?: string;
  /** For patient-scoped resources: the clinician currently assigned. */
  readonly assignedClinicianId?: string | null;
}

export interface AuthzDeps {
  /** Emergency global kill switch for a capability. */
  isEmergencyDisabled(capability: string): boolean;
  /** Environment-level allow-list (e.g. clinical capabilities off in prod). */
  isAllowedInEnvironment(capability: string): boolean;
  /** Organisation setting: DISABLED removes the capability for the org. */
  organisationSetting(
    organisationId: string,
    capability: string,
  ): 'ENABLED' | 'DISABLED' | 'DEFAULT';
}

export type AuthzDecision =
  | { readonly allowed: true; readonly reason: string }
  | { readonly allowed: false; readonly reason: string };

/**
 * Capability-only authorisation (no resource scoping).
 */
export function hasCapability(
  ctx: AuthzContext,
  capability: string,
  deps: AuthzDeps,
): AuthzDecision {
  if (deps.isEmergencyDisabled(capability)) {
    return { allowed: false, reason: 'capability_emergency_disabled' };
  }
  if (!deps.isAllowedInEnvironment(capability)) {
    return { allowed: false, reason: 'capability_not_allowed_in_environment' };
  }
  const orgSetting = deps.organisationSetting(ctx.organisationId, capability);
  if (orgSetting === 'DISABLED') {
    return { allowed: false, reason: 'capability_disabled_for_organisation' };
  }
  if (!ctx.capabilities.includes(capability)) {
    return { allowed: false, reason: 'capability_missing' };
  }
  return { allowed: true, reason: 'capability_granted' };
}

/**
 * Resource-scoped authorisation. Enforces organisation isolation and
 * cross-patient isolation in addition to the capability check.
 */
export function authorizeResource(
  ctx: AuthzContext,
  capability: string,
  resource: ResourceRef,
  deps: AuthzDeps,
): AuthzDecision {
  const base = hasCapability(ctx, capability, deps);
  if (!base.allowed) return base;

  // Organisation isolation: never allow cross-organisation access.
  if (ctx.organisationId !== resource.organisationId) {
    return { allowed: false, reason: 'cross_organisation_denied' };
  }

  // Patient self-access.
  if (resource.patientUserId && resource.patientUserId === ctx.userId) {
    return { allowed: true, reason: 'patient_self_access' };
  }

  // Assigned clinician access.
  if (resource.assignedClinicianId && resource.assignedClinicianId === ctx.userId) {
    return { allowed: true, reason: 'assigned_clinician_access' };
  }

  // Broad clinical / admin capabilities grant organisation-wide access.
  const orgWide = [
    'clinical:patient:read:all',
    'admin:patient:assign',
    'admin:patient:reassign',
    'admin:audit:read',
    'system:audit:read:all',
  ];
  if (orgWide.some((c) => ctx.capabilities.includes(c))) {
    return { allowed: true, reason: 'organisation_wide_access' };
  }

  return { allowed: false, reason: 'no_relationship_to_resource' };
}

/**
 * Determine whether a user may see a timeline event of a given visibility.
 */
export function canSeeVisibility(
  ctx: AuthzContext,
  visibility:
    | 'PATIENT'
    | 'ASSIGNED_CLINICAL_TEAM'
    | 'CLINICAL_ORGANISATION'
    | 'ADMIN'
    | 'FINANCE'
    | 'RESTRICTED',
  resource: ResourceRef,
): boolean {
  switch (visibility) {
    case 'PATIENT':
      return (
        resource.patientUserId === ctx.userId ||
        ctx.capabilities.includes('clinical:patient:read') ||
        ctx.capabilities.includes('admin:patient:assign')
      );
    case 'ASSIGNED_CLINICAL_TEAM':
      return (
        resource.assignedClinicianId === ctx.userId ||
        ctx.capabilities.includes('clinical:patient:read:all') ||
        ctx.capabilities.includes('admin:patient:assign')
      );
    case 'CLINICAL_ORGANISATION':
      return (
        ctx.capabilities.includes('clinical:patient:read') ||
        ctx.capabilities.includes('clinical:patient:read:all')
      );
    case 'ADMIN':
      return ctx.capabilities.includes('admin:audit:read');
    case 'FINANCE':
      return (
        ctx.capabilities.includes('finance:invoice:read') ||
        ctx.capabilities.includes('admin:audit:read')
      );
    case 'RESTRICTED':
      return (
        ctx.capabilities.includes('system:audit:read:all') ||
        ctx.capabilities.includes('clinical:patient:read:all')
      );
    default: {
      const exhaustive: never = visibility;
      return exhaustive;
    }
  }
}

/** A permissive deps implementation for development and unit tests. */
export const permissiveAuthzDeps: AuthzDeps = {
  isEmergencyDisabled: () => false,
  isAllowedInEnvironment: () => true,
  organisationSetting: () => 'DEFAULT',
};

/** A deny-everything deps implementation used to prove deny-by-default. */
export const denyAllAuthzDeps: AuthzDeps = {
  isEmergencyDisabled: () => true,
  isAllowedInEnvironment: () => false,
  organisationSetting: () => 'DISABLED',
};
