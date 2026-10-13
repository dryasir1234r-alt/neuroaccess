/**
 * Shared design-system primitives.
 *
 * Status is never communicated by colour alone: every status chip renders a
 * text label and a glyph, satisfying WCAG 2.2 AA "use of colour" guidance.
 */

export function StatusChip({
  label,
  tone = 'neutral',
  glyph,
}: {
  label: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  glyph?: string;
}) {
  const toneClasses: Record<string, string> = {
    neutral: 'border-ink-300 bg-ink-100 text-ink-800',
    info: 'border-teal-300 bg-teal-50 text-teal-900',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    danger: 'border-rose-300 bg-rose-50 text-rose-900',
  };
  const glyphs: Record<string, string> = {
    neutral: '•',
    info: 'i',
    success: '✓',
    warning: '!',
    danger: '✕',
  };
  return (
    <span className={`status-chip ${toneClasses[tone]}`}>
      <span aria-hidden="true">{glyph ?? glyphs[tone]}</span>
      <span>{label}</span>
    </span>
  );
}

export function Panel({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-ink-200 bg-white p-5 shadow-sm">
      <header className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-ink-600">{description}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-md border border-dashed border-ink-300 bg-ink-50 p-6 text-center">
      <p className="text-sm font-medium text-ink-800">{title}</p>
      <p className="mt-1 text-sm text-ink-600">{hint}</p>
    </div>
  );
}

export function PrimaryAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center justify-center rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
    >
      {children}
    </a>
  );
}
