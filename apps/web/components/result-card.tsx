import Link from "next/link";
import type { SearchHit } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { displayTitle, docTypeLabel } from "@/lib/doc-meta";
import { AgencyBadge, agencyName } from "./agency-badge";

export function ResultCard({ hit }: { hit: SearchHit }) {
  const d = hit.document;
  return (
    <article className="border-b border-line-soft py-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <AgencyBadge code={d.agency} />
        <span>{agencyName(d.agency)}</span>
        <span aria-hidden>·</span>
        <span className="text-ink-soft">{docTypeLabel(d)}</span>
        <span aria-hidden>·</span>
        <span>Released {formatDate(d.releaseDate)}</span>
        {typeof d.pageCount === "number" && (
          <>
            <span aria-hidden>·</span>
            <span>{d.pageCount.toLocaleString()} pages</span>
          </>
        )}
      </div>

      <h3 className="mt-1.5 text-[1.0625rem] leading-snug">
        <Link href={`/documents/${d.id}`} className="font-medium text-link">
          {displayTitle(d.title)}
        </Link>
      </h3>

      <p
        className="mt-1.5 text-sm leading-relaxed text-ink-soft"
        // Snippet text is HTML-escaped in buildSnippet(); only <mark> is injected.
        dangerouslySetInnerHTML={{ __html: hit.snippetHtml }}
      />

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <Link href={`/documents/${d.id}#page-${hit.page}`} className="text-muted hover:text-ink">
          Cited on p. {hit.page}
        </Link>
        <span className="text-faint">{d.sourceName}</span>
        <a
          href={d.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-link"
        >
          View original ↗
        </a>
      </div>
    </article>
  );
}
