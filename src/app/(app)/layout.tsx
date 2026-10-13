import Link from 'next/link';

const NAV = [
  { href: '/patient', label: 'Patient Workspace' },
  { href: '/clinician', label: 'Clinician Workstation' },
  { href: '/admin', label: 'Admin Control Centre' },
  { href: '/finance', label: 'Finance Workspace' },
];

/**
 * Unified application shell. One shell, four capability-based workstations.
 * A user with multiple capabilities can switch without signing into another
 * application. No separate databases or duplicated business logic.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/" className="text-lg font-bold text-ink-950">
            NeuroAssess
          </Link>
          <nav aria-label="Workstations" className="flex flex-wrap gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto text-xs text-ink-500">Synthetic data only</span>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
    </div>
  );
}
