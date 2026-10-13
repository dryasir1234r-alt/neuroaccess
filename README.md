# NeuroAssess

Unified remote ADHD and Autism clinic operating system.

> **Status:** synthetic vertical slice. No real patient data, no live audio, no live
> cloud model processing of clinical data. See
> `docs/governance/PRODUCTION_READINESS_GAPS.md`.

## What this is
One platform with one patient record, one care journey, one timeline, one permission
engine, one audit system and one clinical AI assistance layer. Four capability-based
workstations are different views of the same data:

- Patient Workspace
- Clinician Workstation
- Admin Control Centre
- Finance Workspace

## Stack
Next.js 14 (App Router) · TypeScript (strict) · Prisma + PostgreSQL · Tailwind ·
Vitest.

## Quick start
```bash
npm install
cp .env.example .env.local          # then set DATABASE_URL and NEXTAUTH_SECRET
npx prisma generate
npx prisma migrate dev --name init  # requires a Postgres database
npm run db:seed                     # synthetic data only
npm run dev                         # http://localhost:3000
```

## Validation
```bash
npm test              # 71 tests
npm run typecheck     # strict TypeScript, no errors
npx prisma validate   # schema
npx next build        # production build
```

## Layout
```
src/
  app/                Next.js routes (public + (app) workstations)
  components/         design-system primitives
  lib/
    domain/           journey types
    journey/          care-journey state machine + transition table
    permissions/      capability-based authorisation engine
    features/         server-side feature-flag engine + registry
    ai/               orchestrator, gateway, grounding, consent, specialists,
                      message-drafts, providers
    demo/             synthetic demo data
prisma/
  schema.prisma       canonical domain model
  seed.ts             synthetic seed (never real data)
tests/                unit, state-machine, permission, flag, AI, E2E-slice
docs/                 architecture, domain, journey, permissions, flags, AI, delivery
```

## Documentation
Start with `docs/ARCHITECTURE.md`, then `docs/DOMAIN_MODEL.md`,
`docs/CARE_JOURNEY.md`, `docs/PERMISSION_MODEL.md`, `docs/FEATURE_FLAGS.md` and
`docs/clinical-ai/`.
