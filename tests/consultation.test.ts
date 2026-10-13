import { describe, expect, it } from 'vitest';
import {
  isListening,
  transitionConsultation,
  type ConsentRecord,
  type ConsultationContext,
} from '@/lib/ai/consultation';

const grantedConsent: ConsentRecord = {
  id: 'consent_1',
  patientId: 'patient_1',
  encounterId: 'enc_1',
  type: 'TRANSCRIPTION',
  wordingVersion: 'v1.0',
  wording: 'synthetic',
  granted: true,
  grantedById: 'clinician_1',
  grantedAt: '2024-01-01T00:00:00.000Z',
  withdrawnById: null,
  withdrawnAt: null,
  restrictions: {},
};

const ctx = (state: ConsultationContext['state'], consent: ConsentRecord | null): ConsultationContext => ({
  state,
  consent,
});

describe('consultation consent state machine', () => {
  it('cannot start listening without consent', () => {
    const result = transitionConsultation(ctx('READY', null), 'START_LISTENING');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('CONSENT_REQUIRED');
  });

  it('cannot process without consent', () => {
    const result = transitionConsultation(ctx('STOPPED', null), 'PROCESS');
    expect(result.ok).toBe(false);
  });

  it('starts listening once consent is recorded', () => {
    const result = transitionConsultation(ctx('READY', grantedConsent), 'START_LISTENING');
    expect(result.ok).toBe(true);
    if (result.ok) expect(isListening(result.state)).toBe(true);
  });

  it('withdrawal always stops capture immediately', () => {
    const result = transitionConsultation(ctx('LISTENING', grantedConsent), 'WITHDRAW_CONSENT');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state).toBe('STOPPED');
      expect(isListening(result.state)).toBe(false);
    }
  });

  it('pause and resume work while consent is held', () => {
    const paused = transitionConsultation(ctx('LISTENING', grantedConsent), 'PAUSE');
    expect(paused.ok && paused.state).toBe('PAUSED');
    const resumed = transitionConsultation(ctx('PAUSED', grantedConsent), 'RESUME');
    expect(resumed.ok && resumed.state).toBe('LISTENING');
  });

  it('rejects an out-of-order transition', () => {
    const result = transitionConsultation(ctx('NOT_STARTED', grantedConsent), 'SIGN');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_CONSULTATION_TRANSITION');
  });

  it('follows the full happy path to SIGNED', () => {
    let state: ConsultationContext = ctx('NOT_STARTED', null);
    const step = (event: Parameters<typeof transitionConsultation>[1]) => {
      const r = transitionConsultation(state, event);
      expect(r.ok).toBe(true);
      if (r.ok) state = { state: r.state, consent: grantedConsent };
    };
    step('REQUEST_CONSENT');
    step('RECORD_CONSENT');
    step('START_LISTENING');
    step('STOP');
    step('PROCESS');
    step('DRAFT_READY');
    step('BEGIN_REVIEW');
    step('SIGN');
    expect(state.state).toBe('SIGNED');
  });
});
