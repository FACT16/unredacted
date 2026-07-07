import Link from "next/link";

const SOURCES = [
  "Federal Register",
  "govinfo (GPO)",
  "Library of Congress",
  "National Archives (NARA)",
  "ODNI",
  "FBI Records: The Vault",
  "U.S. Dept. of State",
  "CIA FOIA Reading Room",
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <div className="text-sm font-semibold text-ink">Just the Files</div>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Search declassified and publicly released U.S. government documents in one
              place. Every result links to its original source.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-faint">
              Browse
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              <li><Link href="/search">Search</Link></li>
              <li><Link href="/topics">Topics</Link></li>
              <li><Link href="/about">About &amp; method</Link></li>
              <li>
                <a
                  href="https://github.com/FACT16/justthefiles"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Source on GitHub
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-faint">
              Sources
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
              {SOURCES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-8 border-t border-line-soft pt-4 text-xs leading-relaxed text-faint">
          All documents referenced here are public records published by U.S. government
          agencies and courts. Just the Files is an independent research tool and is not
          affiliated with, or endorsed by, any government agency.
        </p>
      </div>
    </footer>
  );
}
