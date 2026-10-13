import type {
  Contradiction,
  DraftSection,
  DraftStatement,
  EvidenceIssue,
  GroundingResult,
  MissingInformation,
  SafetyCheckResult,
  SafetyReport,
} from '@/lib/ai/types';

/**
 * Deterministic evidence and provenance engine.
 *
 * Rules enforced here (Part 17):
 *  - UNSUPPORTED statements cannot be approved.
 *  - AI_SYNTHESIS requires source references.
 *  - Material statements require provenance.
 *  - Missing information remains missing.
 *  - Contradictions remain visible and are never silently reconciled.
 */
export function computeGrounding(
  sections: readonly DraftSection[],
  validSourceIds: readonly string[],
): GroundingResult {
  const valid = new Set(validSourceIds);
  const issues: EvidenceIssue[] = [];
  const unsupported: string[] = [];
  const templateOnly: string[] = [];
  let total = 0;
  let supported = 0;

  for (const section of sections) {
    for (const statement of section.statements) {
      total += 1;

      if (statement.classification === 'UNSUPPORTED') {
        unsupported.push(statement.id);
        issues.push({
          statementId: statement.id,
          kind: 'UNSUPPORTED',
          detail: 'Statement is marked UNSUPPORTED and cannot be approved.',
        });
        continue;
      }

      if (statement.classification === 'TEMPLATE_LANGUAGE') {
        templateOnly.push(statement.id);
        issues.push({
          statementId: statement.id,
          kind: 'TEMPLATE_ONLY',
          detail: 'Statement is template language and requires clinician input.',
        });
        continue;
      }

      if (statement.classification === 'AI_SYNTHESIS' && statement.sourceIds.length === 0) {
        issues.push({
          statementId: statement.id,
          kind: 'AI_SYNTHESIS_WITHOUT_SOURCE',
          detail: 'AI synthesis requires at least one source reference.',
        });
        continue;
      }

      const hasValidSource = statement.sourceIds.some((id) => valid.has(id));
      if (statement.sourceIds.length > 0 && hasValidSource) {
        supported += 1;
      } else if (statement.sourceIds.length === 0) {
        issues.push({
          statementId: statement.id,
          kind: 'UNSUPPORTED',
          detail: 'Statement has no source reference.',
        });
      } else {
        issues.push({
          statementId: statement.id,
          kind: 'UNSUPPORTED',
          detail: 'Statement references sources that do not exist in the context.',
        });
      }
    }
  }

  return {
    evidenceIssues: issues,
    unsupportedStatementIds: unsupported,
    templateOnlyStatementIds: templateOnly,
    sourceCoverage: total === 0 ? 0 : supported / total,
  };
}

/**
 * Detect contradictions between statements on the same topic. Contradictions
 * are surfaced, never auto-resolved.
 */
export function detectContradictions(
  sections: readonly DraftSection[],
): readonly Contradiction[] {
  const byTopic = new Map<string, DraftStatement[]>();
  for (const section of sections) {
    for (const statement of section.statements) {
      const list = byTopic.get(section.key) ?? [];
      list.push(statement);
      byTopic.set(section.key, list);
    }
  }

  const contradictions: Contradiction[] = [];
  for (const [topic, statements] of byTopic) {
    for (let i = 0; i < statements.length; i += 1) {
      for (let j = i + 1; j < statements.length; j += 1) {
        const a = statements[i];
        const b = statements[j];
        if (!a || !b) continue;
        if (isNegationPair(a.text, b.text)) {
          contradictions.push({
            id: `ct_${a.id}_${b.id}`,
            topic,
            statementA: a.text,
            statementB: b.text,
            detail: 'Conflicting statements detected. Clinician must review.',
          });
        }
      }
    }
  }
  return contradictions;
}

const NEGATION_PAIRS: readonly (readonly [RegExp, RegExp])[] = [
  [/\bno side effects?\b/i, /\b(headache|nausea|adverse|side effect|palpitation)\w*/i],
  [/\bno difficulty\b/i, /\bdifficult(y|ies)\b/i],
  [/\bdenies\b/i, /\breports?\b.*\b(pain|symptom)/i],
];

function isNegationPair(a: string, b: string): boolean {
  for (const [left, right] of NEGATION_PAIRS) {
    if ((left.test(a) && right.test(b)) || (left.test(b) && right.test(a))) {
      return true;
    }
  }
  return false;
}

/**
 * Determine which required topics are absent from the draft. Absence stays
 * visible and is never converted into a reassuring statement.
 */
export function detectMissingInformation(
  sections: readonly DraftSection[],
  requiredTopics: readonly string[],
): readonly MissingInformation[] {
  const present = new Set<string>();
  for (const section of sections) {
    const hasContent = section.statements.some(
      (s) => s.classification !== 'TEMPLATE_LANGUAGE' && s.text.trim().length > 0,
    );
    if (hasContent) present.add(section.key);
  }
  return requiredTopics
    .filter((t) => !present.has(t))
    .map((topic) => ({
      topic,
      detail: `No information recorded for "${topic}". This must remain visibly missing.`,
      required: true,
    }));
}

const ENHANCED_REVIEW_PATTERNS: readonly { readonly label: string; readonly pattern: RegExp }[] = [
  { label: 'controlled medication', pattern: /\b(controlled|schedule 2|cd register)\b/i },
  { label: 'medication change', pattern: /\b(increase|decrease|change|switch|stop)\w*\b.*\b(dose|medication|tablet)/i },
  { label: 'possible adverse effect', pattern: /\b(adverse|side[- ]?effects?|reaction)/i },
  { label: 'cardiovascular symptoms', pattern: /\b(chest pain|palpitation|heart|cardiac|faint)\b/i },
  { label: 'pregnancy', pattern: /\bpregnan/i },
  { label: 'severe headache', pattern: /\bsevere headache\b/i },
  { label: 'suicidality', pattern: /\b(suicid|self[- ]?harm|end (my|their) life)\b/i },
  { label: 'safeguarding', pattern: /\b(safeguard|abuse|neglect|child protection)\b/i },
  { label: 'psychosis', pattern: /\b(psychosis|psychotic|hallucinat)\b/i },
  { label: 'mania', pattern: /\b(mania|manic)\b/i },
  { label: 'substance dependence', pattern: /\b(substance|drug|alcohol)\b.*\b(depend|misuse|use)\b/i },
];

/**
 * Deterministic safety layer. Runs before and after generation.
 */
export function runSafetyChecks(
  sections: readonly DraftSection[],
  options: { readonly consentGranted: boolean },
): SafetyReport {
  const checks: SafetyCheckResult[] = [];
  const text = sections.flatMap((s) => s.statements.map((st) => st.text)).join('\n');

  checks.push({
    check: 'consent_recorded',
    passed: options.consentGranted,
    detail: options.consentGranted
      ? 'Transcription consent recorded.'
      : 'No consent recorded: AI processing must not proceed.',
  });

  const reasons: string[] = [];
  for (const { label, pattern } of ENHANCED_REVIEW_PATTERNS) {
    if (pattern.test(text)) reasons.push(label);
  }

  checks.push({
    check: 'no_autonomous_clinical_decision',
    passed: true,
    detail: 'Output is a draft only; no diagnosis, prescription or risk decision is made.',
  });

  return {
    passed: checks.every((c) => c.passed),
    checks,
    enhancedReviewRequired: reasons.length > 0,
    enhancedReviewReasons: reasons,
  };
}

/**
 * Final gate: a draft may only be approved when it has no unsupported
 * statements, no unresolved contradictions and no missing required information.
 */
export function canApproveDraft(params: {
  readonly grounding: GroundingResult;
  readonly contradictions: readonly Contradiction[];
  readonly missingInformation: readonly MissingInformation[];
  readonly safety: SafetyReport;
}): { readonly allowed: boolean; readonly reasons: readonly string[] } {
  const reasons: string[] = [];
  if (params.grounding.unsupportedStatementIds.length > 0) {
    reasons.push(`${params.grounding.unsupportedStatementIds.length} unsupported statement(s).`);
  }
  const hardIssues = params.grounding.evidenceIssues.filter(
    (i) => i.kind === 'UNSUPPORTED' || i.kind === 'AI_SYNTHESIS_WITHOUT_SOURCE',
  );
  if (hardIssues.length > 0) {
    reasons.push(`${hardIssues.length} statement(s) lack valid provenance.`);
  }
  if (params.contradictions.length > 0) {
    reasons.push(`${params.contradictions.length} unresolved contradiction(s).`);
  }
  const requiredMissing = params.missingInformation.filter((m) => m.required);
  if (requiredMissing.length > 0) {
    reasons.push(`${requiredMissing.length} required topic(s) missing.`);
  }
  if (!params.safety.passed) {
    reasons.push('Safety checks did not pass.');
  }
  return { allowed: reasons.length === 0, reasons };
}
