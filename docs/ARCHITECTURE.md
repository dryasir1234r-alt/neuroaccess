# NeuroAssess System Architecture

## Overview
NeuroAssess is a unified remote ADHD and Autism clinic operating system built as a single Next.js application with a PostgreSQL database, implementing a capability-based unified workstation model.

## Technology Stack

### Core Framework
- **Framework**: Next.js 14+ (App Router, Server Components, Server Actions)
- **Language**: TypeScript (strict mode)
- **Package Manager**: pnpm
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 with credentials + OAuth providers
- **Deployment**: Vercel (primary), Docker-ready for self-hosting

### Key Libraries
- **UI**: Radix UI primitives + Tailwind CSS + custom design system
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack Query (server state) + Zustand (client state)
- **Real-time**: Pusher/Ably for notifications, WebRTC for video
- **AI**: Provider-agnostic gateway (OpenAI, Anthropic, local models)
- **Testing**: Vitest (unit), Playwright (e2e), Testing Library (component)
- **Observability**: OpenTelemetry + structured logging (Pino)

## Architectural Patterns

### 1. Unified Application Shell
Single Next.js application with capability-based routing:
```
/(app)
  /(public)          # Marketing, auth pages
  /(authenticated)   # Protected shell
    /patient         # Patient Workspace
    /clinician       # Clinician Workstation
    /admin           # Admin Control Centre
    /finance         # Finance Workspace
    /api             # Server Actions + Route Handlers
```

### 2. Domain-Driven Design
Bounded contexts as Prisma models + service layers:
- **Identity & Access**: User, Role, Capability, Organisation, Session
- **Care Journey**: JourneyStage, Transition, Task
- **Clinical**: Assessment, Questionnaire, Document, Note, Report, Diagnosis
- **Medication**: Prescription, Titration, Monitoring, SharedCare
- **Communications**: Message, Thread, Notification, Consent
- **Operations**: Appointment, Queue, Calendar, Complaint, Audit
- **Financial**: Invoice, Payment, Subscription, ClinicianEarnings
- **AI**: AIDraft, Transcript, Evidence, SafetyCheck, ModelProvider

### 3. Typed State Machines
All critical workflows use discriminated unions with exhaustive handling:
```typescript
type JourneyStage = 
  | 'LEAD' | 'BOOKED' | 'TRIAGE' | 'INTAKE' | 'ASSESSMENT'
  | 'MORE_INFORMATION_REQUIRED' | 'DIAGNOSIS_REVIEW' 
  | 'DIAGNOSIS_CONFIRMED' | 'DIAGNOSIS_NOT_CONFIRMED'
  | 'ECG_REQUESTED' | 'MDT_REVIEW' | 'TITRATION' | 'PRESCRIBING'
  | 'MAINTENANCE' | 'SHARED_CARE' | 'ANNUAL_REVIEW' | 'OUTCOME' | 'DISCHARGE';

type JourneyCommand = 
  | { type: 'START_INTAKE'; patientId: string; actorId: string }
  | { type: 'ASSIGN_CLINICIAN'; patientId: string; clinicianId: string; actorId: string }
  // ... all transitions
```

### 4. Server-Side Permission Enforcement
- Capability-based authorisation (not role-based)
- Every Server Action validates capabilities via `authorize(capability, resource)`
- Deny-by-default with explicit grants
- Organisation isolation at query level

### 5. Feature Flag Engine
Server-side evaluation with priority resolution:
1. Emergency kill switch
2. Environment restriction
3. Organisation setting
4. Capability restriction
5. User override
6. Cohort rollout
7. Default state

### 6. Audit & Provenance
- Immutable event store for all consequential actions
- AI outputs carry evidence classification per statement
- Optimistic concurrency on all mutations

## Data Architecture

### Database: PostgreSQL + Prisma
- Single database, single schema
- Row-level security policies for cross-patient isolation
- Soft deletes with `deletedAt` timestamps
- Optimistic locking via `version` fields
- Partitioned audit tables by month

### Key Models
```prisma
model Patient {
  id              String   @id @default(cuid())
  organisationId  String
  userId          String   @unique
  journey         Journey?
  assessments     Assessment[]
  prescriptions   Prescription[]
  messages        Message[]
  timelineEvents  TimelineEvent[]
  // ...
}

model Journey {
  id              String   @id @default(cuid())
  patientId       String   @unique
  stage           JourneyStage
  version         Int      @default(1)
  transitions     JourneyTransition[]
  // ...
}

model AIDraft {
  id              String   @id @default(cuid())
  type            AIDraftType
  status          AIDraftStatus
  content         Json
  evidenceMap     Json     // sentence -> evidence mapping
  provenance      Json     // source references per claim
  safetyChecks    Json
  clinicianId     String
  patientId       String
  // ...
}
```

## API Layer

### Server Actions (Primary)
- All mutations via Server Actions with built-in CSRF protection
- Typed input/output with Zod schemas
- Automatic audit logging wrapper

### Route Handlers (Secondary)
- Webhooks, file uploads, streaming responses
- Long-running AI generation via Server-Sent Events

### tRPC (Optional Future)
- Not initially - Server Actions + TanStack Query sufficient

## AI Architecture

### Provider-Independent Gateway
```typescript
interface ModelProvider {
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  stream(request: GenerationRequest): AsyncIterable<StreamChunk>;
  validateSchema(output: unknown, schema: z.ZodSchema): ValidationResult;
}

const providers = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  local: new LocalModelProvider(),
};
```

### Orchestrator Flow
1. Authenticate & verify capability
2. Verify feature flags
3. Verify consent & purpose
4. Build minimum necessary context
5. Classify task → select specialist engine
6. Pre-generation safety checks
7. Call model via gateway
8. Validate output schema
9. Evidence mapping & contradiction detection
10. Post-generation safety checks
11. Persist auditable draft
12. Return to human review interface

## Security Architecture

### Defence in Depth
- **Transport**: TLS 1.3, HSTS, CSP, COOP, CORP
- **Application**: CSRF (double-submit), XSS (CSP + sanitization), SQLi (Prisma)
- **Data**: Encryption at rest (AWS KMS), field-level encryption for PII
- **Access**: Deny-by-default, capability checks on every mutation, session revocation
- **Audit**: Immutable logs, tamper-evident chains

### Clinical Safety Boundaries
- AI outputs always `AI_DRAFT_REQUIRES_CLINICIAN_REVIEW`
- No autonomous diagnosis, prescribing, or risk decisions
- Mandatory human review gateway
- Provenance required for every material statement

## Deployment Architecture

### Vercel (Primary)
- Next.js App Router with Edge Runtime for auth/middleware
- Serverless functions for API routes
- Cron jobs for scheduled tasks
- Blob storage for documents

### Infrastructure
- **Database**: Vercel Postgres / Neon / Supabase (PostgreSQL)
- **Cache**: Vercel KV / Redis
- **Queue**: Vercel Cron + Inngest for background jobs
- **Real-time**: Pusher Channels
- **AI**: Dedicated inference endpoints (not in web process)

### Environments
- `development` - Local + preview deployments
- `staging` - Full mirror with synthetic data
- `production` - Live clinical data