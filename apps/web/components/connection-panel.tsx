"use client";

import { Fragment } from "react";
import Link from "next/link";
import { getConnectionSync } from "@/lib/api";
import { displayTitle } from "@/lib/doc-meta";
import { formatDate } from "@/lib/format";

// Shown when a search names 2+ known entities. Displays the documents whose text
// names all of them, a simple correlation map, and the other names that co-occur.
// All computed client-side from entity membership baked in by scripts/enrich.mjs.
export function ConnectionPanel({ entities }: { entities: string[] }) {
  const conn = getConnectionSync(entities);
  if (!conn) return null;

  const names = entities.join(" · ");

  if (conn.documents.length === 0) {
    return (
      <section className="mb-6 rounded border border-line bg-paper p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-faint">Connection</div>
        <p className="mt-1 text-sm text-ink">
          No document in the archive names <span className="font-medium">{names}</span> together — yet.
        </p>
        <p className="mt-1 text-xs text-faint">
          Connections are drawn from the full text of released documents; the archive grows nightly.
        </p>
      </section>
    );
  }

  const { documents, related } = conn;

  return (
    <section className="mb-6 rounded border border-line bg-paper p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-faint">Connection</div>
        <div className="text-xs text-faint">from full document text</div>
      </div>

      <p className="mt-1 text-ink">
        {entities.map((e, i) => (
          <Fragment key={e}>
            {i > 0 && <span className="text-muted"> and </span>}
            <strong>{e}</strong>
          </Fragment>
        ))}{" "}
        appear together in <strong>{documents.length}</strong>{" "}
        document{documents.length === 1 ? "" : "s"}.
      </p>

      {/* Correlation map: entity pills linked by the shared-document count. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1 rounded bg-canvas px-3 py-4">
        {entities.map((e, i) => (
          <Fragment key={e}>
            {i > 0 && (
              <span className="flex items-center gap-1 text-faint" aria-hidden>
                <span className="h-px w-6 bg-line-2" />
                <span className="rounded-sm border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-muted">
                  {documents.length}
                </span>
                <span className="h-px w-6 bg-line-2" />
              </span>
            )}
            <Link
              href={`/search?q=${encodeURIComponent(e)}`}
              className="rounded border border-line bg-paper px-3 py-1.5 text-sm font-medium text-ink hover:border-accent hover:no-underline"
            >
              {e}
            </Link>
          </Fragment>
        ))}
      </div>

      <ul className="mt-3 divide-y divide-line-soft border-t border-line-soft">
        {documents.slice(0, 8).map((d) => (
          <li key={d.id} className="py-2">
            <Link href={`/documents/${d.id}`} className="text-sm text-link">
              {displayTitle(d.title)}
            </Link>
            <div className="mt-0.5 text-xs text-faint">
              {d.sourceName} · {formatDate(d.releaseDate)}
            </div>
          </li>
        ))}
      </ul>

      {related.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1 text-xs">
          <span className="text-faint">Also connected:</span>
          {related.map((r) => (
            <Link
              key={r.name}
              href={`/search?q=${encodeURIComponent([...entities, r.name].join(" "))}`}
              className="rounded-sm border border-line bg-paper px-1.5 py-0.5 text-muted hover:border-accent hover:text-ink hover:no-underline"
            >
              {r.name} <span className="text-faint">({r.count})</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
