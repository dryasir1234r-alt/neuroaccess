# Transcript Retention

## Default posture
- Transcripts are retained only for as long as clinically necessary and per the
  organisation's configured retention policy.
- This slice stores **synthetic** transcripts only; no real audio is captured.
- Retention is configurable (Part 23) and change-controlled.

## On consent withdrawal
1. capture stops immediately;
2. transcription halts;
3. AI processing halts;
4. the configured retention policy is applied;
5. an audit event is written;
6. unapproved output cannot enter the clinical record.

## Storage
- Transcript text is stored in `TranscriptSegment.text` (synthetic in this slice).
- Clinical documents use signed, time-limited download URLs.
- Malware scanning is a boundary on upload (`Document.scanStatus`).

## Deletion
Deletion is soft-first (`deletedAt`) with a hard-purge job governed by policy.
Purge actions are audited. No transcript content is written to logs.
