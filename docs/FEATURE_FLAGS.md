# NeuroAssess Feature Flag Engine

## Overview
Server-side feature flag evaluation with priority-based resolution. Frontend hiding is NOT sufficient - all flags enforced at API/Server Action layer.

## Flag Resolution Priority

1. **Emergency Global Kill Switch** - Immediate disable across all environments
2. **Environment Restriction** - Dev/staging/prod specific
3. **Organisation-Level Setting** - REQUIRED / OPTIONAL / DISABLED per org
4. **Capability Restriction** - Requires specific capability
5. **User-Level Testing Override** - Individual user enable/disable
6. **Cohort/Percentage Rollout** - Gradual rollout
7. **Default State** - Fallback value

## Release States

| State | Description |
|-------|-------------|
| `DISABLED` | Completely off |
| `DEVELOPMENT_ONLY` | Only in development |
| `INTERNAL_TESTING` | Internal team only |
| `SELECTED_CLINICIANS` | Specific clinician users |
| `SELECTED_PATIENTS` | Specific patient users |
| `LIMITED_ROLLOUT` | Percentage-based |
| `FULL_PRODUCTION` | Fully enabled |

## Initial Feature Flags

All 40 flags are declared in `src/lib/features/definitions.ts`. Clinical AI flags
default to `DISABLED` and are restricted to non-production environments until
governance approves otherwise.

### Platform
| Flag | Default | Capability |
|------|---------|------------|
| `unifiedApplicationShell` | FULL_PRODUCTION | — |
| `patientWorkspace` | FULL_PRODUCTION | patient:read:own |
| `clinicianWorkstation` | FULL_PRODUCTION | clinical:patient:read |
| `adminControlCentre` | FULL_PRODUCTION | admin:referral:triage |
| `financeWorkspace` | FULL_PRODUCTION | finance:invoice:read |

### Workflow
`careJourneyEngine`, `unifiedPatientTimeline`, `referralWorkflow`, `intakeWorkflow`,
`adhdAssessmentWorkflow`, `autismAssessmentWorkflow`, `diagnosisWorkflow`,
`mdtWorkflow`, `titrationWorkflow`, `prescribingWorkflow`,
`repeatPrescriptionRequests`, `prescriptionTracking`, `courierTracking`,
`physicalHealthMonitoring`, `sharedCareWorkflow`, `annualReviewWorkflow`,
`complaintsWorkflow`, `paymentTracking`, `videoConsultations`.

### AI (all DISABLED by default, non-production only)
`clinicalAiEnabled`, `consultationTranscription`, `liveConsultationAssistant`,
`clinicalNoteDrafting`, `adhdReportDrafting`, `autismReportDrafting`,
`messageReplyDrafting`, `titrationNoteDrafting`, `clinicalLetterDrafting`,
`transcriptEvidenceReview`, `contradictionDetection`, `missingInformationDetection`,
`aiSafetyLayer`, `localModelProvider`, `approvedCloudModelProvider`, `aiAuditReview`.

## Flag change requirements
Every change requires: authorised capability (`admin:feature:manage` or
`system:feature:manage`), a reason, actor, timestamp, previous value, new value,
affected scope, and an audit event. Enforced by `assertFlagChangeAllowed`.

## Organisation workflow settings
Separate from flags, using `REQUIRED` / `OPTIONAL` / `DISABLED`. See
`WORKFLOW_CONFIGURATION.md`.

## Internal interface
A restricted feature-management interface is intended for users holding
`admin:feature:manage` / `system:feature:manage`. Internal flags are never exposed
to patients.

| `EMERGENCY_DISABLED` | Emergency kill switch active |