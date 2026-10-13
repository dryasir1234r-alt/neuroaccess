# Performance Budget

## Measured values (this build, local production build)
Measured with `npx next build` on the sandbox. These are **actual** numbers, not
claims.

| Route | First Load JS |
|-------|---------------|
| `/` (public) | 94.1 kB |
| `/patient` | 87.2 kB |
| `/clinician` | 94.1 kB |
| `/clinician/review` | 92.1 kB |
| `/admin` | 87.2 kB |
| `/finance` | 87.2 kB |
| Shared by all | 87.1 kB |

Test suite: 46 tests in ~0.6 s (pure logic; no database required).

## Budgets (targets)
| Metric | Budget |
|--------|--------|
| Initial JS (shared) | ≤ 110 kB gzipped |
| Route transition | ≤ 200 ms |
| Server action (non-AI) | ≤ 300 ms p95 |
| Database query (indexed) | ≤ 50 ms p95 |
| Timeline render (first page) | ≤ 150 ms |
| Autosave round-trip | ≤ 400 ms p95 |
| AI draft (synthetic) | ≤ 100 ms |
| AI streaming first token | ≤ 1.5 s p95 |

## Techniques in use / planned
In use: static prerendering of workstations, route-level code splitting, pure
isomorphic engines (no client fetch for the slice), server components.

Planned: streaming SSR, cursor pagination, virtualised lists, request cancellation,
prefetching, background jobs, idempotent mutations, safe optimistic updates.

## Cache policies
| Data class | Policy |
|------------|--------|
| Public | long-lived CDN cache |
| Operational | short TTL, revalidate on mutation |
| Financial | private, no shared cache |
| Clinical | private, no shared cache, per-user |
| Restricted | never cached |
| Real-time | no cache |
| Immutable events | long-lived, content-addressed |

Sensitive clinical data is never cached in shared caches.

## Honesty
No load tests have been run. The numbers above are build-time bundle sizes and
local test timings only. Server latency under load is unverified.
