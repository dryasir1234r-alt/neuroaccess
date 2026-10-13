# Model Provider Policy

## Replaceability
Clinical workflow code depends only on the `ModelProvider` interface
(`src/lib/ai/gateway.ts`). The `ModelGateway` is the single place that maps a
provider name to an implementation. No vendor SDK is imported by clinical code.

## Registered providers
| Provider | Status | Environments |
|----------|--------|--------------|
| `synthetic` | Enabled (default in this slice) | all |
| `local` | Scaffolded (`localModelProvider` flag, `DEVELOPMENT_ONLY`) | development, staging |
| `approvedCloud` | Scaffolded (`approvedCloudModelProvider` flag, `DISABLED`) | none until approved |

## Rules
1. A cloud provider may only be enabled through `approvedCloudModelProvider` after
   information-governance and clinical approval.
2. Cloud providers are never enabled in `production` by default.
3. Clinical data is never sent to a provider that has not been explicitly approved.
4. Provider failure is surfaced explicitly (`MODEL_PROVIDER_FAILURE`); it is never
   swallowed or silently retried with a different provider.
5. Every generation records provider name and version for audit.
6. A single engine may request several deliberately distinct drafts by passing a
   `variant` on the generation request (used by the message-reply engine); the
   provider contract is otherwise unchanged.

## Failure behaviour
`ModelProviderError` carries `provider` and `retryable`. The orchestrator records an
`ai.generate.failed` audit event and returns a typed failure to the caller. No draft
is persisted on failure. Verified by `tests/vertical-slice.test.ts`.
