import type { TranscriptSegmentInput } from '@/lib/ai/types';

/**
 * SYNTHETIC consultation transcript.
 *
 * This is fabricated test data. It contains no real patient information.
 * It exists so the transcription → note-drafting → clinician-review workflow
 * can be exercised end to end before any real audio is ever connected.
 */
export const SYNTHETIC_TRANSCRIPT: readonly TranscriptSegmentInput[] = [
  {
    id: 'seg_001',
    speakerLabel: 'Clinician',
    text: 'Thanks for joining today. Can you tell me what prompted you to seek an assessment?',
    startTimeMs: 0,
    endTimeMs: 4200,
    confidence: 0.97,
    topicTags: ['presenting'],
  },
  {
    id: 'seg_002',
    speakerLabel: 'Patient',
    text: 'I have always struggled to focus. I start tasks and never finish them, and I lose things constantly.',
    startTimeMs: 4200,
    endTimeMs: 11000,
    confidence: 0.95,
    topicTags: ['presenting', 'adhd'],
  },
  {
    id: 'seg_003',
    speakerLabel: 'Patient',
    text: 'At school I was told I was disruptive and could not sit still. My reports mentioned I did not complete work.',
    startTimeMs: 11000,
    endTimeMs: 19000,
    confidence: 0.93,
    topicTags: ['childhood', 'adhd'],
  },
  {
    id: 'seg_004',
    speakerLabel: 'Patient',
    text: 'It affects my job now. I miss deadlines and I find meetings very hard to follow.',
    startTimeMs: 19000,
    endTimeMs: 26000,
    confidence: 0.94,
    topicTags: ['impact'],
  },
  {
    id: 'seg_005',
    speakerLabel: 'Patient',
    text: 'I am not on any medication at the moment. I have no side effects because I take nothing.',
    startTimeMs: 26000,
    endTimeMs: 32000,
    confidence: 0.92,
    topicTags: ['medication'],
  },
  {
    id: 'seg_006',
    speakerLabel: 'Patient',
    text: 'Actually, I have been getting headaches and nausea most days recently, which worries me.',
    startTimeMs: 32000,
    endTimeMs: 39000,
    confidence: 0.91,
    topicTags: ['medication', 'risk'],
  },
  {
    id: 'seg_007',
    speakerLabel: 'Patient',
    text: 'I do not have any thoughts of harming myself. I feel safe.',
    startTimeMs: 39000,
    endTimeMs: 44000,
    confidence: 0.96,
    topicTags: ['risk'],
  },
  {
    id: 'seg_008',
    speakerLabel: 'Clinician',
    text: 'Thank you. I will write up my assessment and we will meet again to discuss the outcome.',
    startTimeMs: 44000,
    endTimeMs: 51000,
    confidence: 0.98,
    topicTags: ['presenting'],
  },
];

export const SYNTHETIC_STRUCTURED_RECORDS = [
  {
    id: 'rec_referral',
    summary: 'Referral received from GP for assessment of longstanding attention difficulties.',
  },
] as const;
