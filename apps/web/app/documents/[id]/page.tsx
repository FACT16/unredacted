import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProvenancePanel } from "@/components/provenance-panel";
import { AgencyBadge, agencyName } from "@/components/agency-badge";
import {
  getCollection,
  getDocument,
  getDocumentContext,
  listDocumentIds,
} from "@/lib/api";
import { docTypeLabel, displayTitle } from "@/lib/doc-meta";
import { formatDate } from "@/lib/format";
import type { GovDocument } from "@/lib/types";

// Static export: pre-render every document page at build time. Unknown ids 404.
export const dynamicParams = false;

export async function generateStaticParams() {
  const ids = await listDocumentIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const doc = await getDocument((await params).id);
  if (!doc) return { title: "Document not found" };
  return { title: displayTitle(doc.title), description: doc.summary };
}

function docDateLabel(doc: GovDocument): string {
  return doc.docDateLabel ?? (doc.docDate ? formatDate(doc.docDate) : "Date unknown");
}

function TimelineRow({
  doc,
  current = false,
}: {
  doc: GovDocument;
  current?: boolean;
}) {
  return (
    <li className="grid grid-cols-[6.5rem_1fr] gap-3">
      <div className="pt-0.5 font-mono text-xs text-muted">{docDateLabel(doc)}</div>
      <div className={`border-l pl-3 ${current ? "border-ink" : "border-line"}`}>
        {current ? (
          <div className="text-sm font-medium text-ink">
            {displayTitle(doc.title)}
            <span className="ml-2 rounded-sm border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
              This document
            </span>
          </div>
        ) : (
          <Link href={`/documents/${doc.id}`} className="text-sm text-link">
            {displayTitle(doc.title)}
          </Link>
        )}
      </div>
    </li>
  );
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getDocument(id);
  if (!doc) notFound();

  const [context, collection] = await Promise.all([
    getDocumentContext(doc),
    getCollection(doc.collection),
  ]);
  const title = displayTitle(doc.title);
  const typeLabel = docTypeLabel(doc);
  const hasTimeline = context.before.length + context.after.length > 0;
  const topEntities = context.entityCounts.slice(0, 2).map((e) => e.name);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <nav className="text-xs text-muted">
        <Link href="/">Home</Link>
        <span className="px-1.5 text-faint">/</span>
        {collection ? (
          <>
            <Link href={`/topics/${collection.slug}`}>{collection.title}</Link>
            <span className="px-1.5 text-faint">/</span>
          </>
        ) : null}
        <span className="text-faint">Document</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <AgencyBadge code={doc.agency} />
        <span>{agencyName(doc.agency)}</span>
        <span aria-hidden>·</span>
        <span className="font-medium text-ink-soft">{typeLabel}</span>
        {doc.classificationEra && (
          <>
            <span aria-hidden>·</span>
            <span>{doc.classificationEra}</span>
          </>
        )}
      </div>

      <h1 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-ink">
        {title}
      </h1>
      <div className="mt-1 text-sm text-muted">
        {docDateLabel(doc)}
        {" · "}Released {formatDate(doc.releaseDate)}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* Reading column */}
        <article className="min-w-0">
          {/* What this document says about itself — the extracted purpose text. */}
          <p className="max-w-2xl text-[0.95rem] leading-relaxed text-ink-soft">{doc.summary}</p>

          {/* At a glance: hard facts, no interpretation. */}
          <div className="mt-5 rounded border border-line bg-paper">
            <div className="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-faint">
              At a glance
            </div>
            <dl className="divide-y divide-line-soft text-sm">
              <div className="flex gap-3 px-4 py-2">
                <dt className="w-28 shrink-0 text-muted">What it is</dt>
                <dd className="text-ink-soft">
                  {typeLabel} · {agencyName(doc.agency)}
                </dd>
              </div>
              {collection && (
                <div className="flex gap-3 px-4 py-2">
                  <dt className="w-28 shrink-0 text-muted">Collection</dt>
                  <dd className="text-ink-soft">
                    <Link href={`/topics/${collection.slug}`}>{collection.title}</Link>{" "}
                    <span className="text-faint">
                      — one of {context.topicSize.toLocaleString()} documents
                    </span>
                  </dd>
                </div>
              )}
              {context.entityCounts.length > 0 && (
                <div className="flex gap-3 px-4 py-2">
                  <dt className="w-28 shrink-0 text-muted">Names</dt>
                  <dd className="flex flex-wrap gap-1.5">
                    {context.entityCounts.map((e) => (
                      <Link
                        key={e.name}
                        href={`/search?q=${encodeURIComponent(e.name)}`}
                        className="rounded-sm border border-line bg-paper px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-ink hover:no-underline"
                        title={`${e.name} appears in ${e.count} documents`}
                      >
                        {e.name} <span className="text-faint">({e.count})</span>
                      </Link>
                    ))}
                  </dd>
                </div>
              )}
              {topEntities.length >= 2 && (
                <div className="flex gap-3 px-4 py-2">
                  <dt className="w-28 shrink-0 text-muted">Connections</dt>
                  <dd className="text-ink-soft">
                    <Link href={`/search?q=${encodeURIComponent(topEntities.join(" "))}`}>
                      See every document naming {topEntities[0]} and {topEntities[1]} →
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Where it fits: chronological neighbors within its collection. */}
          {hasTimeline && (
            <div className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
                Where it fits{collection ? ` in ${collection.title}` : ""}
              </h2>
              <ol className="mt-3 space-y-3">
                {context.before.map((d) => (
                  <TimelineRow key={d.id} doc={d} />
                ))}
                <TimelineRow doc={doc} current />
                {context.after.map((d) => (
                  <TimelineRow key={d.id} doc={d} />
                ))}
              </ol>
              {collection && (
                <div className="mt-2 pl-[6.5rem]">
                  <Link href={`/topics/${collection.slug}`} className="pl-3 text-xs">
                    Full {collection.title} timeline →
                  </Link>
                </div>
              )}
            </div>
          )}

          {doc.sourceNote ? (
            <div className="mt-8 rounded border border-line bg-canvas px-3 py-2 text-xs leading-relaxed text-muted">
              {doc.sourceNote}
            </div>
          ) : doc.textIsIllustrative ? (
            <div className="mt-8 rounded border border-line bg-canvas px-3 py-2 text-xs leading-relaxed text-muted">
              <span className="font-medium text-ink-soft">Sample text.</span> The excerpts below
              are illustrative representations of this record for the demo — not verbatim OCR. Use{" "}
              <span className="font-medium">View original</span> to read the authoritative document
              at the source.
            </div>
          ) : null}

          <div className="mt-4 space-y-6">
            {doc.pages.map((p) => (
              <section
                key={p.pageNumber}
                id={`page-${p.pageNumber}`}
                className="scroll-mt-24 border-t border-line-soft pt-4"
              >
                <div className="mb-1.5 font-mono text-xs text-faint">
                  From the document — page {p.pageNumber}
                </div>
                <p className="doc-prose">{p.text}</p>
              </section>
            ))}
          </div>

          <div className="mt-6">
            <a
              href={doc.originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink-soft hover:no-underline"
            >
              Read the full document at {doc.sourceName} ↗
            </a>
          </div>
        </article>

        {/* Sidebar */}
        <div className="space-y-6">
          <ProvenancePanel doc={doc} />

          {context.related.length > 0 && (
            <div className="rounded border border-line bg-paper">
              <div className="border-b border-line px-4 py-2 text-xs font-semibold uppercase tracking-wide text-faint">
                Related documents
              </div>
              <ul className="divide-y divide-line-soft">
                {context.related.map((r) => (
                  <li key={r.doc.id} className="px-4 py-3">
                    <Link href={`/documents/${r.doc.id}`} className="text-sm text-link">
                      {displayTitle(r.doc.title)}
                    </Link>
                    <div className="mt-0.5 text-xs text-faint">
                      {agencyName(r.doc.agency)} · {formatDate(r.doc.releaseDate)}
                    </div>
                    {r.shared.length > 0 && (
                      <div className="mt-0.5 text-xs text-muted">
                        Also names {r.shared.slice(0, 3).join(", ")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
