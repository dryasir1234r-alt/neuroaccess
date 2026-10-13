import Link from 'next/link';

/**
 * Public entry point for the synthetic vertical slice. In production this is
 * the marketing / sign-in boundary; here it routes to the four workstations
 * using synthetic demo identities only.
 */
export default function HomePage() {
  const workstations = [
    { href: '/patient', title: 'Patient Workspace', desc: 'Status, next action, questionnaires, documents, messages.' },
    { href: '/clinician', title: 'Clinician Workstation', desc: 'Pending work, assessments, AI draft review, signing.' },
    { href: '/admin', title: 'Admin Control Centre', desc: 'Referral triage, assignment, queues, audit.' },
    { href: '/finance', title: 'Finance Workspace', desc: 'Invoices, payments, blockers (data-minimised).' },
  ];

  return (
    <main id="main" className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink-950">NeuroAssess</h1>
      <p className="mt-3 text-ink-700">
        Unified remote ADHD and Autism clinic operating system. This build contains a synthetic
        vertical slice only &mdash; no real patient data and no live audio.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {workstations.map((w) => (
          <li key={w.href}>
            <Link
              href={w.href}
              className="block h-full rounded-lg border border-ink-200 bg-white p-5 shadow-sm transition hover:border-teal-500"
            >
              <h2 className="text-base font-semibold text-ink-950">{w.title}</h2>
              <p className="mt-2 text-sm text-ink-600">{w.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
