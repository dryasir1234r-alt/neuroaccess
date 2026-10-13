import type { ClinicalContext, DraftSection } from '@/lib/ai/types';

/**
 * Provider-independent model gateway.
 *
 * Clinical workflow code depends only on this interface, never on a specific
 * vendor. Providers are replaceable and can be swapped without touching
 * clinical logic.
 */

export interface GenerationRequest {
  readonly taskType: string;
  readonly promptTemplateId: string;
  readonly context: ClinicalContext;
  /** Deterministic seed so synthetic/test output is reproducible. */
  readonly seed?: string;
}

export interface GenerationResponse {
  readonly sections: readonly DraftSection[];
  readonly modelProvider: string;
  readonly modelVersion: string;
  readonly tokensUsed: number;
  readonly generationTimeMs: number;
}

export interface ModelProvider {
  readonly name: string;
  readonly version: string;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}

export class ModelProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ModelProviderError';
  }
}

/**
 * The gateway selects a provider by name and enforces that a provider is
 * registered. Clinical code never constructs providers directly.
 */
export class ModelGateway {
  private readonly providers = new Map<string, ModelProvider>();

  register(provider: ModelProvider): void {
    this.providers.set(provider.name, provider);
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  async generate(providerName: string, request: GenerationRequest): Promise<GenerationResponse> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new ModelProviderError(
        `Model provider "${providerName}" is not registered.`,
        providerName,
        false,
      );
    }
    return provider.generate(request);
  }
}
