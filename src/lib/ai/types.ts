/**
 * NeuroAssess Clinical AI domain types.
 *
 * The AI is assistive only. Every output begins as a draft requiring clinician
 * review and every material statement carries an evidence classification.
 */

export type EvidenceClassification =
  | 'DIRECT_TRANSCRIPT'
  | 'STRUCTURED_RECORD'
  | 'CLINICIAN_ENTERED'
  | 'CALCULATED'
  | 'TEMPLATE_LANGUAGE'
  | 'AI_SYNTHESIS'
  | 'UNSUPPORTED';

/** A single generated statement with its provenance. */
export interface DraftStatement {
  readonly id: string;
  readonly text: string;
  readonly classification: EvidenceClassification;
  /** Source references (transcript segment ids, record ids). */
  readonly sourceIds: readonly string[];
}

export interface DraftSection {
  readonly key: string;
  readonly title: string;
  readonly statements: readonly DraftStatement[];
}

export type DraftStatus =
  | 'GENERATING'
  | 'DRAFT_READY'
  | 'CLINICIAN_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'AMENDED'
  | 'FAILED';

export interface EvidenceIssue {
  readonly statementId: string;
  readonly kind: 'UNSUPPORTED' | 'AI_SYNTHESIS_WITHOUT_SOURCE' | 'TEMPLATE_ONLY';
  readonly detail: string;
}

export interface Contradiction {
  readonly id: string;
  readonly topic: string;
  readonly statementA: string;
  readonly statementB: string;
  readonly detail: string;
}

export interface MissingInformation {
  readonly topic: string;
  readonly detail: string;
  readonly required: boolean;
}

export interface SafetyCheckResult {
  readonly check: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface SafetyReport {
  readonly passed: boolean;
  readonly checks: readonly SafetyCheckResult[];
  /** Topics that mandate enhanced human review. */
  readonly enhancedReviewRequired: boolean;
  readonly enhancedReviewReasons: readonly string[];
}

export interface GroundingResult {
  readonly evidenceIssues: readonly EvidenceIssue[];
  readonly unsupportedStatementIds: readonly string[];
  readonly templateOnlyStatementIds: readonly string[];
  readonly sourceCoverage: number;
}

export interface AIDraft {
  readonly id: string;
  readonly type: string;
  readonly status: DraftStatus;
  readonly patientId: string;
  readonly clinicianId: string;
  readonly sections: readonly DraftSection[];
  readonly grounding: GroundingResult;
  readonly contradictions: readonly Contradiction[];
  readonly missingInformation: readonly MissingInformation[];
  readonly safety: SafetyReport;
  readonly modelProvider: string;
  readonly modelVersion: string;
  readonly promptTemplateId: string;
}

export interface TranscriptSegmentInput {
  readonly id: string;
  readonly speakerLabel: string;
  readonly text: string;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly confidence: number;
  readonly topicTags?: readonly string[];
}

export interface ClinicalContext {
  readonly patientId: string;
  readonly encounterId: string;
  readonly transcriptSegments: readonly TranscriptSegmentInput[];
  readonly structuredRecords: readonly { readonly id: string; readonly summary: string }[];
  readonly consentGranted: boolean;
}
