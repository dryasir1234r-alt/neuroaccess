import type { DraftSection, DraftStatement } from '@/lib/ai/types';
import type { GenerationRequest, GenerationResponse, ModelProvider } from '@/lib/ai/gateway';

/**
 * Deterministic synthetic provider.
 *
 * Used by the vertical slice, tests and development. It never calls a network
 * service and never processes real patient audio. It maps synthetic transcript
 * segments into a structured assessment-note draft, attaching explicit source
 * references to every statement so the grounding engine can verify provenance.
 */
export class SyntheticProvider implements ModelProvider {
  readonly name = 'synthetic';
  readonly version = 'synthetic-1.0.0';

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const started = Date.now();
    const segments = request.context.transcriptSegments;

    const pick = (tag: string): DraftStatement[] =>
      segments
        .filter((s) => (s.topicTags ?? []).includes(tag))
        .map((s) => ({
          id: `st_${s.id}`,
          text: s.text,
          classification: 'DIRECT_TRANSCRIPT' as const,
          sourceIds: [s.id],
        }));

    const sections: DraftSection[] = [
      {
        key: 'reason_for_referral',
        title: 'Reason for referral',
        statements: request.context.structuredRecords.map((r) => ({
          id: `st_rec_${r.id}`,
          text: r.summary,
          classification: 'STRUCTURED_RECORD' as const,
          sourceIds: [r.id],
        })),
      },
      {
        key: 'presenting_concerns',
        title: 'Presenting concerns',
        statements: pick('presenting'),
      },
      {
        key: 'adhd_symptoms',
        title: 'ADHD symptoms',
        statements: pick('adhd'),
      },
      {
        key: 'childhood_history',
        title: 'Childhood history',
        statements: pick('childhood'),
      },
      {
        key: 'functional_impact',
        title: 'Functional impact',
        statements: pick('impact'),
      },
      {
        key: 'medication',
        title: 'Medication and physical health',
        statements: pick('medication'),
      },
      {
        key: 'risk',
        title: 'Risk and safeguarding',
        statements: pick('risk'),
      },
      {
        key: 'plan',
        title: 'Plan',
        statements: [
          {
            id: 'st_template_plan',
            text: 'To be completed by the reviewing clinician following diagnostic formulation.',
            classification: 'TEMPLATE_LANGUAGE',
            sourceIds: [],
          },
        ],
      },
    ];

    return {
      sections,
      modelProvider: this.name,
      modelVersion: this.version,
      tokensUsed: 0,
      generationTimeMs: Date.now() - started,
    };
  }
}
