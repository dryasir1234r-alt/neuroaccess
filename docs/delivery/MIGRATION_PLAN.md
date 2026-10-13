# Migration Plan

## Baseline
This repository is greenfield. There is no legacy NeuroAssess database to migrate
from, so the first migration creates the canonical schema.

## Generating the first migration
```bash
export DATABASE_URL="postgresql://<user>:<pass>@<host>:5432/neuroassess?schema=public"
npx prisma migrate dev --name init
```

## Applying in each environment
```bash
npx prisma migrate deploy
```

## Post-migration steps
1. Seed capabilities, roles and synthetic demo users: `npm run db:seed`.
2. Register feature-flag rows from `src/lib/features/definitions.ts` (all default
   to their conservative states).
3. Apply row-level security policies (cross-patient isolation) — tracked as a gap.

## Risk register
| Risk | Impact | Mitigation |
|------|--------|------------|
| Destructive change to a clinical table | Data loss | No destructive migration without backup + review |
| Long-running migration locks | Downtime | Additive-first; batched backfills |
| Enum change | Prisma/client mismatch | Add new value, backfill, then remove old in a later release |
| Seed run against production | Synthetic data pollution | Seed is idempotent and demo-scoped; never run in prod |

## Rollback
Migrations are forward-only in production. Rollback is achieved by restoring the
pre-migration snapshot and redeploying the previous application version. Feature
flags allow disabling new behaviour without a schema rollback.
