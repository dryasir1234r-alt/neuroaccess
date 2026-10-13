# Human Review Workflow

## Three-panel interface
Route: `/clinician/review` (`src/app/(app)/clinician/review/page.tsx`).

- **Left** — timestamped, speaker-labelled transcript with confidence, correction,
  bookmark and exclusion controls.
- **Centre** — generated note with editable structured sections and sentence-level
  evidence status. Selecting a sentence highlights its supporting transcript segments.
- **Right** — source coverage, missing information, contradictions, safety checks and
  audit information.

## Document workflow states
`SOURCE_SELECTION → OUTLINE → SECTION_DRAFTING → EVIDENCE_MAPPING →
CONTRADICTION_REVIEW → MISSING_INFORMATION_REVIEW → SAFETY_REVIEW →
CLINICIAN_EDIT → CLINICIAN_APPROVAL → SIGNED → SHARED → AMENDED`

## Before signing, the clinician is shown
- unsupported statements;
- unresolved conflicts;
- missing required information;
- safety status;
- consent status;
- source coverage;
- template-only sections.

## Attestation
Signing requires the explicit statement:

> "I have reviewed this document and accept clinical responsibility for the final content."

The Sign button is disabled until the approval gate passes AND the attestation is
checked. Signing is versioned and locked; amendment creates a new version.

## Accessibility
- All controls are native buttons/inputs with visible focus.
- Status is conveyed by text + glyph, never colour alone.
- Panels are labelled with `aria-label`; the transcript is an ordered list.
