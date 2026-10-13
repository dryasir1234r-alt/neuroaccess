import { describe, expect, it } from 'vitest';
import { ModelGateway } from '@/lib/ai/gateway';
import { SyntheticProvider } from '@/lib/ai/providers/synthetic';
import type { OrchestratorAudit, OrchestratorDeps } from '@/lib/ai/orchestrator';
import {
  canSendMessageDraft,
  generateMessageReplyDrafts,
  MESSAGE_REPLY_VARIANTS,
  MESSAGE_SEND_ATTESTATION,
  MESSAGE_SEND_CAPABILITY,
} from '@/lib/ai/message-drafts';
import type { ClinicalContext } from '@/lib/ai/types';
import {
  SYNTHETIC_STRUCTURED_RECORDS,
  SYNTHETIC_TRANSCRIPT,
} from '@/lib/ai/synthetic-transcript';

const audit: OrchestratorAudit = { record: async () => {} };

function deps(): OrchestratorDeps {
  const gateway = new ModelGateway();
  gateway.register(new SyntheticProvider());
  let n = 0;
  return { gateway, audit, now: () => Date.now(), newId: () => `msg_draft_${(n += 1)}` };
}

const CONTEXT: ClinicalContext = {
  patientId: 'patient_1',
  encounterId: 'enc_1',
  transcriptSegments: SYNTHETIC_TRANSCRIPT,
  structuredRecords: [
    ...SYNTHETIC_STRUCTURED_RECORDS,
    { id: 'rec_message', summary: 'Patient message: asking whether a repeat prescription is due.' },
  ],
  consentGranted: true,
};

function replyRequest(overrides: Record<string, unknown> = {}) {
  return {
    patientId: 'patient_1',
    encounterId: 'enc_1',
    actor: {
      userId: 'clinician_1',
      organisationId: 'org_1',
      capabilities: ['clinical:ai:generate'],
    },
    providerName: 'synthetic',
    featureFlagEnabled: true,
    context: CONTEXT,
    promptTemplateId: 'message_reply_v1',
    requiredTopics: ['response_body'],
    requiredCapability: 'clinical:ai:generate',
    seed: 'reply',
    ...overrides,
  };
}

describe('message-drafting engine (three distinct drafts)', () => {
  it('produces exactly three drafts, one per tone variant', async () => {
    const result = await generateMessageReplyDrafts(deps(), replyRequest());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.drafts).toHaveLength(3);
    expect(result.variants).toEqual(MESSAGE_REPLY_VARIANTS);
    expect(result.approvalGates).toHaveLength(3);
  });

  it('produces genuinely distinct drafts', async () => {
    const result = await generateMessageReplyDrafts(deps(), replyRequest());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const templates = result.drafts.map((d) => d.promptTemplateId);
    const bodies = result.drafts.map((d) => JSON.stringify(d.sections));
    expect(new Set(templates).size).toBe(3);
    expect(new Set(bodies).size).toBe(3);
  });

  it('never marks a draft as sent or approved', async () => {
    const result = await generateMessageReplyDrafts(deps(), replyRequest());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const draft of result.drafts) {
      expect(draft.status).toBe('DRAFT_READY');
      expect(draft.status).not.toBe('APPROVED');
    }
  });

  it('fails the whole operation when consent is absent', async () => {
    const result = await generateMessageReplyDrafts(
      deps(),
      replyRequest({ context: { ...CONTEXT, consentGranted: false } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('CONSENT_REQUIRED');
  });
});

describe('canSendMessageDraft', () => {
  const passed = { allowed: true, reasons: [] as readonly string[] };

  it('requires the send capability', () => {
    const decision = canSendMessageDraft({
      actorCapabilities: ['clinical:ai:generate'],
      draftStatus: 'DRAFT_READY',
      approvalGate: passed,
      attestationAccepted: true,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(' ')).toMatch(/capability/i);
  });

  it('requires the approval gate to pass', () => {
    const decision = canSendMessageDraft({
      actorCapabilities: [MESSAGE_SEND_CAPABILITY],
      draftStatus: 'DRAFT_READY',
      approvalGate: { allowed: false, reasons: ['unsupported'] },
      attestationAccepted: true,
    });
    expect(decision.allowed).toBe(false);
  });

  it('requires the clinician attestation', () => {
    expect(MESSAGE_SEND_ATTESTATION.length).toBeGreaterThan(0);
    const decision = canSendMessageDraft({
      actorCapabilities: [MESSAGE_SEND_CAPABILITY],
      draftStatus: 'DRAFT_READY',
      approvalGate: passed,
      attestationAccepted: false,
    });
    expect(decision.allowed).toBe(false);
  });

  it('allows sending only when every condition is met', () => {
    const decision = canSendMessageDraft({
      actorCapabilities: [MESSAGE_SEND_CAPABILITY],
      draftStatus: 'CLINICIAN_REVIEW',
      approvalGate: passed,
      attestationAccepted: true,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.reasons).toEqual([]);
  });
});
