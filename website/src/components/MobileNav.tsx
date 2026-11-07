import { useState } from 'react';

type NavLink = {
  href: string;
  label: string;
};

type Props = {
  links: NavLink[];
};

export default function MobileNav({ links }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--fg)]"
        aria-expanded={open}
        aria-label="Open navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <nav
          className="absolute right-0 z-40 mt-2 w-48 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-2 shadow-lg"
          aria-label="Mobile"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block rounded px-3 py-2 text-sm text-[var(--fg)] hover:bg-[var(--accent-soft)]"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
