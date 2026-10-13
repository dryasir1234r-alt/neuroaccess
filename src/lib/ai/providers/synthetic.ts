import type { DraftSection, DraftStatement } from '@/lib/ai/types';
import type { GenerationRequest, GenerationResponse, ModelProvider } from '@/lib/ai/gateway';

/**
 * Deterministic synthetic provider.
 *
 * Used by the vertical slice, tests and development. It never calls a network
 * service and never processes real patient audio. It maps synthetic transcript
 * segments and structured records into structured specialist drafts (assessment
 * note, reports, letters, titration/medication review, message reply), attaching
 * explicit source references to every statement so the grounding engine can
 * verify provenance.
 */
export class SyntheticProvider implements ModelProvider {
  readonly name = 'synthetic';
  readonly version = 'synthetic-1.1.0';

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const started = Date.now();
    return {
      sections: this.sectionsFor(request),
      modelProvider: this.name,
      modelVersion: this.version,
      tokensUsed: 0,
      generationTimeMs: Date.now() - started,
    };
  }

  /** Deterministic structured output selected by task type. */
  private sectionsFor(request: GenerationRequest): DraftSection[] {
    switch (request.taskType) {
      case 'MESSAGE_REPLY':
        return this.messageReplySections(request);
      case 'ADHD_REPORT':
      case 'AUTISM_REPORT':
      case 'ANNUAL_REVIEW_REPORT':
        return this.reportSections(request);
      case 'TITRATION_NOTE':
      case 'MEDICATION_REVIEW':
      case 'TITRATION_SUMMARY':
        return this.medicationSections(request);
      case 'GP_LETTER':
      case 'SUPPORT_LETTER':
      case 'OCCUPATIONAL_HEALTH_LETTER':
      case 'END_OF_TITRATION_LETTER':
      case 'SHARED_CARE_REQUEST':
      case 'DISCHARGE_LETTER':
      case 'DIAGNOSTIC_FEEDBACK':
      case 'SHARED_CARE_REVIEW':
        return this.letterSections(request);
      case 'ASSESSMENT_NOTE':
      case 'ANNUAL_REVIEW':
      case 'FOLLOW_UP':
      case 'TELEPHONE_CONTACT':
      case 'RISK_REVIEW':
      case 'MDT_REVIEW':
        return this.assessmentSections(request);
      default:
        return this.genericSections(request);
    }
  }

  /** Shared readers over the synthetic context. */
  private readers(request: GenerationRequest): {
    readonly pick: (...tags: string[]) => DraftStatement[];
    readonly records: () => DraftStatement[];
  } {
    const segments = request.context.transcriptSegments;
    const structured = request.context.structuredRecords;
    return {
      pick: (...tags: string[]): DraftStatement[] =>
        segments
          .filter((s) => (s.topicTags ?? []).some((t) => tags.includes(t)))
          .map((s) => ({
            id: `st_${s.id}`,
            text: s.text,
            classification: 'DIRECT_TRANSCRIPT' as const,
            sourceIds: [s.id],
          })),
      records: (): DraftStatement[] =>
        structured.map((r) => ({
          id: `st_rec_${r.id}`,
          text: r.summary,
          classification: 'STRUCTURED_RECORD' as const,
          sourceIds: [r.id],
        })),
    };
  }

  private assessmentSections(request: GenerationRequest): DraftSection[] {
    const { pick, records } = this.readers(request);
    return [
      { key: 'reason_for_referral', title: 'Reason for referral', statements: records() },
      { key: 'presenting_concerns', title: 'Presenting concerns', statements: pick('presenting') },
      { key: 'adhd_symptoms', title: 'ADHD symptoms', statements: pick('adhd') },
      { key: 'childhood_history', title: 'Childhood history', statements: pick('childhood') },
      { key: 'functional_impact', title: 'Functional impact', statements: pick('impact') },
      { key: 'medication', title: 'Medication and physical health', statements: pick('medication') },
      { key: 'risk', title: 'Risk and safeguarding', statements: pick('risk') },
      { key: 'plan', title: 'Plan', statements: [template('st_template_plan', PLACEHOLDER_PLAN)] },
    ];
  }
  private reportSections(request: GenerationRequest): DraftSection[] {
    const { pick, records } = this.readers(request);
    return [
      { key: 'developmental_history', title: 'Developmental history', statements: pick('childhood') },
      {
        key: 'current_presentation',
        title: 'Current presentation',
        statements: [...records(), ...pick('presenting'), ...pick('adhd')],
      },
      { key: 'functional_impact', title: 'Functional impact', statements: pick('impact') },
      { key: 'risk', title: 'Risk and safeguarding', statements: pick('risk') },
      {
        key: 'diagnostic_formulation',
        title: 'Diagnostic formulation',
        statements: [
          template(
            'st_template_formulation',
            'Diagnostic formulation to be completed by the assessing clinician against the relevant criteria.',
          ),
        ],
      },
      { key: 'plan', title: 'Plan', statements: [template('st_template_plan', PLACEHOLDER_PLAN)] },
    ];
  }

  private medicationSections(request: GenerationRequest): DraftSection[] {
    const { pick } = this.readers(request);
    return [
      { key: 'current_medication', title: 'Current medication', statements: pick('medication') },
      { key: 'response', title: 'Response to treatment', statements: pick('impact') },
      { key: 'adverse_effects', title: 'Adverse effects and physical health', statements: pick('risk') },
      {
        key: 'plan',
        title: 'Plan',
        statements: [
          template(
            'st_template_titration_plan',
            'Titration plan and next dose decision to be made by the prescribing clinician.',
          ),
        ],
      },
    ];
  }

  private letterSections(request: GenerationRequest): DraftSection[] {
    const { pick, records } = this.readers(request);
    return [
      { key: 'context', title: 'Context', statements: records() },
      {
        key: 'clinical_summary',
        title: 'Clinical summary',
        statements: [...pick('presenting'), ...pick('adhd'), ...pick('impact')],
      },
      {
        key: 'request',
        title: 'Request',
        statements: [
          template(
            'st_template_request',
            'Specific request to the recipient to be completed by the clinician before sending.',
          ),
        ],
      },
      {
        key: 'closing',
        title: 'Closing',
        statements: [template('st_template_closing', 'Clinician sign-off and contact details.')],
      },
    ];
  }

  private messageReplySections(request: GenerationRequest): DraftSection[] {
    const { pick, records } = this.readers(request);
    const variant = request.variant ?? 'warm';
    const tone = MESSAGE_REPLY_TEMPLATES[variant] ?? DEFAULT_MESSAGE_TONE;
    return [
      {
        key: 'greeting',
        title: 'Greeting',
        statements: [template(`st_template_greeting_${variant}`, tone.greeting)],
      },
      { key: 'response_body', title: 'Response', statements: [...records(), ...pick('presenting')] },
      {
        key: 'next_steps',
        title: 'Next steps',
        statements: [template(`st_template_next_steps_${variant}`, tone.nextSteps)],
      },
    ];
  }

  private genericSections(request: GenerationRequest): DraftSection[] {
    const { pick, records } = this.readers(request);
    return [
      {
        key: 'summary',
        title: 'Summary',
        statements: [...records(), ...pick('presenting'), ...pick('adhd')],
      },
      {
        key: 'detail',
        title: 'Detail',
        statements: [...pick('impact'), ...pick('childhood'), ...pick('medication'), ...pick('risk')],
      },
      { key: 'plan', title: 'Plan', statements: [template('st_template_plan', PLACEHOLDER_PLAN)] },
    ];
  }
}

function template(id: string, text: string): DraftStatement {
  return { id, text, classification: 'TEMPLATE_LANGUAGE', sourceIds: [] };
}

const PLACEHOLDER_PLAN =
  'To be completed by the reviewing clinician following diagnostic formulation.';

/** Tone-specific template language so the three message drafts are distinct. */
const DEFAULT_MESSAGE_TONE = {
  greeting: 'Thank you for getting in touch — I hope you are keeping well.',
  nextSteps:
    'I would be glad to talk this through with you; please let us know a time that suits you.',
};

const MESSAGE_REPLY_TEMPLATES: Readonly<
  Record<string, { readonly greeting: string; readonly nextSteps: string }>
> = {
  warm: DEFAULT_MESSAGE_TONE,
  concise: {
    greeting: 'Thanks for your message.',
    nextSteps: 'We will reply within two working days.',
  },
  detailed: {
    greeting: 'Thank you for your message; I have read it carefully.',
    nextSteps:
      'Here is a full summary of the next steps and the options available to you, with what each one involves.',
  },
};
