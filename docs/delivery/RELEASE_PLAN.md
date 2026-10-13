# Release Plan

## Environments
- `development` — local + preview deployments.
- `staging` — full mirror with synthetic data only.
- `production` — live clinical data (not yet enabled).

## Rollout states used
`DISABLED → DEVELOPMENT_ONLY → INTERNAL_TESTING → SELECTED_CLINICIANS →
LIMITED_ROLLOUT → FULL_PRODUCTION`, plus `EMERGENCY_DISABLED`.

## Recommended first-release order
1. `unifiedApplicationShell`, `patientWorkspace`, `clinicianWorkstation`,
   `adminControlCentre`, `financeWorkspace` — already `FULL_PRODUCTION`.
2. `careJourneyEngine`, `referralWorkflow`, `intakeWorkflow` — `FULL_PRODUCTION`.
3. Assessment/diagnosis/titration workflows — `LIMITED_ROLLOUT`, expand gradually.
4. AI features — remain `DISABLED` until clinical governance sign-off. Enable via
   `INTERNAL_TESTING` → `SELECTED_CLINICIANS` → `LIMITED_ROLLOUT` only after the
   synthetic evaluation plan passes and governance approves.

## Pre-release checklist
- [ ] `npm test` green (46/46).
- [ ] `npm run typecheck` clean.
- [ ] `npx prisma validate` clean.
- [ ] `npx next build` succeeds.
- [ ] Feature flags reviewed; AI flags still disabled.
- [ ] Rollback procedure verified.
- [ ] Production-readiness gaps reviewed.

## Post-release
- Watch failed transitions, permission denials, AI generation failures and
  unsupported-claim rate.
- Any failed safety/permission/isolation test blocks release and triggers rollback.

## Constraints
- No real patient data and no live consultation audio in any environment until the
  synthetic workflow has passed its safety, privacy and end-to-end tests and
  governance has approved.
