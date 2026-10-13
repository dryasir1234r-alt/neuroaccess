import { describe, expect, it } from 'vitest';
import {
  canApproveDraft,
  computeGrounding,
  detectContradictions,
  detectMissingInformation,
  runSafetyChecks,
} from '@/lib/ai/grounding';
import type { DraftSection } from '@/lib/ai/types';

const sections: readonly DraftSection[] = [
  {
    key: 'adhd_symptoms',
    title: 'ADHD symptoms',
    statements: [
      { id: 's1', text: 'Reports longstanding difficulty focusing.', classification: 'DIRECT_TRANSCRIPT', sourceIds: ['seg_002'] },
    ],
  },
  {
    key: 'plan',
    title: 'Plan',
    statements: [
      { id: 's2', text: 'To be completed by clinician.', classification: 'TEMPLATE_LANGUAGE', sourceIds: [] },
    ],
  },
];

describe('AI grounding engine', () => {
  it('marks statements with valid sources as supported', () => {
    const g = computeGrounding(sections, ['seg_002']);
    expect(g.unsupportedStatementIds).toEqual([]);
    expect(g.templateOnlyStatementIds).toEqual(['s2']);
    expect(g.sourceCoverage).toBeCloseTo(0.5, 5);
  });

  it('flags a statement whose source does not exist', () => {
    const bad: DraftSection[] = [
      {
        key: 'adhd_symptoms',
        title: 'ADHD',
        statements: [{ id: 's9', text: 'Fabricated.', classification: 'DIRECT_TRANSCRIPT', sourceIds: ['nope'] }],
      },
    ];
    const g = computeGrounding(bad, ['seg_002']);
    expect(g.evidenceIssues.some((i) => i.kind === 'UNSUPPORTED')).toBe(true);
  });

  it('rejects AI_SYNTHESIS without a source', () => {
    const bad: DraftSection[] = [
      {
        key: 'adhd_symptoms',
        title: 'ADHD',
        statements: [{ id: 's10', text: 'Synthesised claim.', classification: 'AI_SYNTHESIS', sourceIds: [] }],
      },
    ];
    const g = computeGrounding(bad, []);
    expect(g.evidenceIssues.some((i) => i.kind === 'AI_SYNTHESIS_WITHOUT_SOURCE')).toBe(true);
  });

  it('detects contradictions and never auto-resolves them', () => {
    const conflicting: DraftSection[] = [
      {
        key: 'medication',
        title: 'Medication',
        statements: [
          { id: 'a', text: 'Patient reports no side effects.', classification: 'DIRECT_TRANSCRIPT', sourceIds: ['seg_005'] },
          { id: 'b', text: 'Patient reports headaches and nausea.', classification: 'DIRECT_TRANSCRIPT', sourceIds: ['seg_006'] },
        ],
      },
    ];
    const c = detectContradictions(conflicting);
    expect(c.length).toBe(1);
    expect(c[0]?.topic).toBe('medication');
  });

  it('keeps missing information visible', () => {
    const missing = detectMissingInformation(sections, ['childhood_history', 'risk']);
    expect(missing.map((m) => m.topic).sort()).toEqual(['childhood_history', 'risk']);
    expect(missing.every((m) => m.required)).toBe(true);
  });

  it('blocks approval when unsupported statements exist', () => {
    const bad: DraftSection[] = [
      {
        key: 'x',
        title: 'x',
        statements: [{ id: 'u', text: 'Unsupported.', classification: 'UNSUPPORTED', sourceIds: [] }],
      },
    ];
    const grounding = computeGrounding(bad, []);
    const gate = canApproveDraft({
      grounding,
      contradictions: [],
      missingInformation: [],
      safety: runSafetyChecks(bad, { consentGranted: true }),
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.join(' ')).toMatch(/unsupported/i);
  });

  it('blocks approval when required information is missing', () => {
    const gate = canApproveDraft({
      grounding: computeGrounding(sections, ['seg_002']),
      contradictions: [],
      missingInformation: [{ topic: 'risk', detail: 'missing', required: true }],
      safety: runSafetyChecks(sections, { consentGranted: true }),
    });
    expect(gate.allowed).toBe(false);
  });

  it('blocks approval when consent is absent', () => {
    const gate = canApproveDraft({
      grounding: computeGrounding(sections, ['seg_002']),
      contradictions: [],
      missingInformation: [],
      safety: runSafetyChecks(sections, { consentGranted: false }),
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.join(' ')).toMatch(/safety/i);
  });

  it('requires enhanced review for safety-relevant content', () => {
    const risky: DraftSection[] = [
      {
        key: 'risk',
        title: 'Risk',
        statements: [
          { id: 'r', text: 'Patient reports chest pain and palpitations.', classification: 'DIRECT_TRANSCRIPT', sourceIds: ['seg_x'] },
        ],
      },
    ];
    const safety = runSafetyChecks(risky, { consentGranted: true });
    expect(safety.enhancedReviewRequired).toBe(true);
    expect(safety.enhancedReviewReasons).toContain('cardiovascular symptoms');
  });

  it('allows approval when everything is clean', () => {
    const gate = canApproveDraft({
      grounding: computeGrounding(sections, ['seg_002']),
      contradictions: [],
      missingInformation: [],
      safety: runSafetyChecks(sections, { consentGranted: true }),
    });
    expect(gate.allowed).toBe(true);
  });
});
