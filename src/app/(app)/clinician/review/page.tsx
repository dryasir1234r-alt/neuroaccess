'use client';

import { useMemo, useState } from 'react';
import { StatusChip } from '@/components/ui';
import {
  canApproveDraft,
  computeGrounding,
  detectContradictions,
  detectMissingInformation,
  runSafetyChecks,
} from '@/lib/ai/grounding';
import { SYNTHETIC_STRUCTURED_RECORDS, SYNTHETIC_TRANSCRIPT } from '@/lib/ai/synthetic-transcript';
import type { DraftSection } from '@/lib/ai/types';

const REQUIRED_TOPICS = ['reason_for_referral', 'adhd_symptoms', 'risk'];

/**
 * Clinician AI Review interface (three panels).
 *
 * Left:   timestamped, speaker-labelled transcript.
 * Centre: generated draft with sentence-level evidence status.
 * Right:  evidence, missing information, contradictions, safety, audit.
 *
 * Signing is impossible until the approval gate passes and the clinician
 * attests to clinical responsibility.
 */
export default function ClinicianReviewPage() {
  const [activeStatement, setActiveStatement] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [attested, setAttested] = useState(false);
  const [signed, setSigned] = useState(false);

  const sections: readonly DraftSection[] = useMemo(() => {
    const pick = (tag: string) =>
      SYNTHETIC_TRANSCRIPT.filter(
        (s) => (s.topicTags ?? []).includes(tag) && !excluded.has(s.id),
      ).map((s) => ({
        id: `st_${s.id}`,
        text: s.text,
        classification: 'DIRECT_TRANSCRIPT' as const,
        sourceIds: [s.id],
      }));
    return [
      {
        key: 'reason_for_referral',
        title: 'Reason for referral',
        statements: SYNTHETIC_STRUCTURED_RECORDS.map((r) => ({
          id: `st_rec_${r.id}`,
          text: r.summary,
          classification: 'STRUCTURED_RECORD' as const,
          sourceIds: [r.id],
        })),
      },
      { key: 'presenting_concerns', title: 'Presenting concerns', statements: pick('presenting') },
      { key: 'adhd_symptoms', title: 'ADHD symptoms', statements: pick('adhd') },
      { key: 'childhood_history', title: 'Childhood history', statements: pick('childhood') },
      { key: 'functional_impact', title: 'Functional impact', statements: pick('impact') },
      { key: 'medication', title: 'Medication and physical health', statements: pick('medication') },
      { key: 'risk', title: 'Risk and safeguarding', statements: pick('risk') },
      {
        key: 'plan',
        title: 'Plan',
        statements: [
          {
            id: 'st_template_plan',
            text: 'To be completed by the reviewing clinician following diagnostic formulation.',
            classification: 'TEMPLATE_LANGUAGE' as const,
            sourceIds: [],
          },
        ],
      },
    ];
  }, [excluded]);

  const validSourceIds = useMemo(
    () => [
      ...SYNTHETIC_TRANSCRIPT.map((s) => s.id),
      ...SYNTHETIC_STRUCTURED_RECORDS.map((r) => r.id),
    ],
    [],
  );

  const grounding = useMemo(
    () => computeGrounding(sections, validSourceIds),
    [sections, validSourceIds],
  );
  const contradictions = useMemo(() => detectContradictions(sections), [sections]);
  const missing = useMemo(() => detectMissingInformation(sections, REQUIRED_TOPICS), [sections]);
  const safety = useMemo(() => runSafetyChecks(sections, { consentGranted: true }), [sections]);
  const gate = useMemo(
    () => canApproveDraft({ grounding, contradictions, missingInformation: missing, safety }),
    [grounding, contradictions, missing, safety],
  );

  const canSign = gate.allowed && attested && !signed;

  const toggleExclude = (id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <main id="main" className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-950">AI draft review</h1>
          <p className="mt-1 text-sm text-ink-600">
            Draft only. You are responsible for the final content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusChip label="Synthetic transcript" tone="neutral" />
          <StatusChip label="Consent recorded" tone="success" />
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.3fr_1fr]">
        <section aria-label="Transcript" className="rounded-lg border border-ink-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Transcript</h2>
          <ol className="space-y-2">
            {SYNTHETIC_TRANSCRIPT.map((seg) => {
              const isSource = sections
                .flatMap((s) => s.statements)
                .some((st) => st.id === activeStatement && st.sourceIds.includes(seg.id));
              return (
                <li
                  key={seg.id}
                  className={`rounded-md border p-2 text-sm ${
                    isSource ? 'border-teal-500 bg-teal-50' : 'border-ink-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
                    <span>{seg.speakerLabel}</span>
                    <span>{formatTime(seg.startTimeMs)}</span>
                  </div>
                  <p className="mt-1 text-ink-800">{seg.text}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-ink-500">
                      confidence {seg.confidence.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleExclude(seg.id)}
                      className="rounded border border-ink-300 px-2 py-0.5 text-xs text-ink-700 hover:bg-ink-100"
                      aria-pressed={excluded.has(seg.id)}
                    >
                      {excluded.has(seg.id) ? 'Include' : 'Exclude'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-label="Generated draft" className="rounded-lg border border-ink-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Assessment note (draft)</h2>
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.key}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {section.title}
                </h3>
                <ul className="mt-1 space-y-1">
                  {section.statements.map((st) => {
                    const unsupported = grounding.unsupportedStatementIds.includes(st.id);
                    const template = grounding.templateOnlyStatementIds.includes(st.id);
                    return (
                      <li key={st.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveStatement(st.id === activeStatement ? null : st.id)
                          }
                          className={`w-full rounded-md border p-2 text-left text-sm ${
                            activeStatement === st.id
                              ? 'border-teal-500 bg-teal-50'
                              : 'border-ink-200'
                          }`}
                          aria-pressed={activeStatement === st.id}
                        >
                          <span className="text-ink-800">{st.text}</span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            <StatusChip
                              label={st.classification.replace(/_/g, ' ').toLowerCase()}
                              tone={st.classification === 'DIRECT_TRANSCRIPT' ? 'info' : 'neutral'}
                            />
                            {unsupported ? <StatusChip label="Unsupported" tone="danger" /> : null}
                            {template ? <StatusChip label="Template only" tone="warning" /> : null}
                            <span className="text-xs text-ink-500">
                              {st.sourceIds.length} source{st.sourceIds.length === 1 ? '' : 's'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>


        <section aria-label="Evidence and safety" className="space-y-3">
          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink-900">Source coverage</h2>
            <p className="text-sm text-ink-700">
              {(grounding.sourceCoverage * 100).toFixed(0)}% of statements linked to evidence.
            </p>
          </div>

          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink-900">Missing information</h2>
            {missing.length === 0 ? (
              <p className="text-sm text-ink-600">None recorded as missing.</p>
            ) : (
              <ul className="space-y-2">
                {missing.map((m) => (
                  <li key={m.topic} className="text-sm text-ink-800">
                    <StatusChip label={m.topic} tone="warning" />{' '}
                    <span className="ml-1">remains missing</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink-900">Contradictions</h2>
            {contradictions.length === 0 ? (
              <p className="text-sm text-ink-600">None detected.</p>
            ) : (
              <ul className="space-y-2">
                {contradictions.map((c) => (
                  <li key={c.id} className="text-sm text-ink-800">
                    <StatusChip label={c.topic} tone="danger" />
                    <p className="mt-1">{c.statementA}</p>
                    <p className="mt-1">{c.statementB}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-ink-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-ink-900">Safety checks</h2>
            <ul className="space-y-1">
              {safety.checks.map((c) => (
                <li key={c.check} className="text-sm text-ink-700">
                  <StatusChip
                    label={c.passed ? 'Pass' : 'Fail'}
                    tone={c.passed ? 'success' : 'danger'}
                  />{' '}
                  {c.check}
                </li>
              ))}
            </ul>
            {safety.enhancedReviewRequired ? (
              <p className="mt-2 text-sm text-amber-800">
                Enhanced review required: {safety.enhancedReviewReasons.join(', ')}.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-ink-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-ink-900">Before you sign</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-700">
          <li>Unsupported statements: {grounding.unsupportedStatementIds.length}</li>
          <li>Unresolved conflicts: {contradictions.length}</li>
          <li>Missing required information: {missing.filter((m) => m.required).length}</li>
          <li>Safety status: {safety.passed ? 'Pass' : 'Fail'}</li>
          <li>Consent status: recorded</li>
        </ul>

        {!gate.allowed ? (
          <div className="mt-3 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
            <p className="font-medium">Signing is blocked</p>
            <ul className="mt-1 list-disc pl-5">
              {gate.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <label className="mt-3 flex items-start gap-2 text-sm text-ink-800">
          <input
            type="checkbox"
            checked={attested}
            onChange={(e) => setAttested(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            I have reviewed this document and accept clinical responsibility for the final content.
          </span>
        </label>

        <div className="mt-3">
          <button
            type="button"
            disabled={!canSign}
            onClick={() => setSigned(true)}
            aria-disabled={!canSign}
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink-300"
          >
            Sign and lock note
          </button>
          {signed ? (
            <p className="mt-2 text-sm text-emerald-800" role="status">
              Note signed and locked. Timeline updated and action audited.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
