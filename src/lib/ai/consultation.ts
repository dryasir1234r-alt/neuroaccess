/**
 * Consultation and transcription state machine + consent gateway.
 *
 * Transcription NEVER starts automatically. Explicit, recorded consent is
 * required before any capture or processing. Withdrawing consent immediately
 * stops capture and blocks further AI processing.
 */

export const CONSULTATION_STATES = [
  'NOT_STARTED',
  'CONSENT_REQUIRED',
  'READY',
  'LISTENING',
  'PAUSED',
  'STOPPED',
  'PROCESSING',
  'DRAFT_READY',
  'CLINICIAN_REVIEW',
  'SIGNED',
  'AMENDED',
  'FAILED',
] as const;

export type ConsultationState = (typeof CONSULTATION_STATES)[number];

export const CONSULTATION_EVENTS = [
  'REQUEST_CONSENT',
  'RECORD_CONSENT',
  'WITHDRAW_CONSENT',
  'START_LISTENING',
  'PAUSE',
  'RESUME',
  'STOP',
  'PROCESS',
  'DRAFT_READY',
  'BEGIN_REVIEW',
  'SIGN',
  'AMEND',
  'FAIL',
] as const;

export type ConsultationEvent = (typeof CONSULTATION_EVENTS)[number];

/** Consent wording version. Changing wording requires a new version. */
export const CONSENT_WORDING_VERSION = 'v1.0';

export const CONSENT_WORDING =
  'I consent to this consultation being transcribed and processed by NeuroAssess ' +
  'clinical AI for the purpose of drafting clinical documentation. I understand ' +
  'that a draft will be reviewed and approved by a clinician, that I may withdraw ' +
  'consent at any time, and that withdrawing consent stops capture immediately.';

export interface ConsentRecord {
  readonly id: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly type: 'TRANSCRIPTION';
  readonly wordingVersion: string;
  readonly wording: string;
  readonly granted: boolean;
  readonly grantedById: string | null;
  readonly grantedAt: string | null;
  readonly withdrawnById: string | null;
  readonly withdrawnAt: string | null;
  readonly restrictions: Record<string, unknown>;
}

export interface ConsultationContext {
  readonly state: ConsultationState;
  readonly consent: ConsentRecord | null;
}

export type ConsultationTransitionResult =
  | { readonly ok: true; readonly state: ConsultationState }
  | { readonly ok: false; readonly code: string; readonly message: string };

/**
 * Pure consultation transition function. Enforces the consent gate: the
 * machine cannot enter LISTENING or PROCESSING without granted consent, and
 * WITHDRAW_CONSENT is always permitted and always halts the machine.
 */
export function transitionConsultation(
  ctx: ConsultationContext,
  event: ConsultationEvent,
): ConsultationTransitionResult {
  // Withdrawal is always allowed and always terminates capture.
  if (event === 'WITHDRAW_CONSENT') {
    return { ok: true, state: 'STOPPED' };
  }

  const consentGranted = ctx.consent?.granted === true;

  const requireConsent = (): ConsultationTransitionResult | null =>
    consentGranted
      ? null
      : { ok: false, code: 'CONSENT_REQUIRED', message: 'Consent must be recorded first.' };

  switch (event) {
    case 'REQUEST_CONSENT':
      return { ok: true, state: 'CONSENT_REQUIRED' };
    case 'RECORD_CONSENT':
      return { ok: true, state: 'READY' };
    case 'START_LISTENING': {
      const blocked = requireConsent();
      if (blocked) return blocked;
      return { ok: true, state: 'LISTENING' };
    }
    case 'PAUSE':
      if (ctx.state !== 'LISTENING') return invalid(ctx.state, event);
      return { ok: true, state: 'PAUSED' };
    case 'RESUME': {
      const blocked = requireConsent();
      if (blocked) return blocked;
      if (ctx.state !== 'PAUSED') return invalid(ctx.state, event);
      return { ok: true, state: 'LISTENING' };
    }
    case 'STOP':
      if (ctx.state !== 'LISTENING' && ctx.state !== 'PAUSED') return invalid(ctx.state, event);
      return { ok: true, state: 'STOPPED' };
    case 'PROCESS': {
      const blocked = requireConsent();
      if (blocked) return blocked;
      if (ctx.state !== 'STOPPED') return invalid(ctx.state, event);
      return { ok: true, state: 'PROCESSING' };
    }
    case 'DRAFT_READY':
      if (ctx.state !== 'PROCESSING') return invalid(ctx.state, event);
      return { ok: true, state: 'DRAFT_READY' };
    case 'BEGIN_REVIEW':
      if (ctx.state !== 'DRAFT_READY') return invalid(ctx.state, event);
      return { ok: true, state: 'CLINICIAN_REVIEW' };
    case 'SIGN':
      if (ctx.state !== 'CLINICIAN_REVIEW') return invalid(ctx.state, event);
      return { ok: true, state: 'SIGNED' };
    case 'AMEND':
      if (ctx.state !== 'SIGNED') return invalid(ctx.state, event);
      return { ok: true, state: 'AMENDED' };
    case 'FAIL':
      return { ok: true, state: 'FAILED' };
    default: {
      const exhaustive: never = event;
      return { ok: false, code: 'UNKNOWN_EVENT', message: String(exhaustive) };
    }
  }
}

function invalid(state: ConsultationState, event: ConsultationEvent): ConsultationTransitionResult {
  return {
    ok: false,
    code: 'INVALID_CONSULTATION_TRANSITION',
    message: `Event ${event} is not permitted from state ${state}.`,
  };
}

/**
 * The listening state must remain visibly displayed. This helper is used by
 * the UI to render the persistent indicator.
 */
export function isListening(state: ConsultationState): boolean {
  return state === 'LISTENING' || state === 'PAUSED';
}
