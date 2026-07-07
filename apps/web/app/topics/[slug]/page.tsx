import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultCard } from "@/components/result-card";
import { Timeline } from "@/components/timeline";
import { buildSnippet } from "@/lib/search";
import {
  getCollection,
  getCollectionDocuments,
  getTimeline,
  listCollections,
  listImages,
} from "@/lib/api";
import type { SearchHit } from "@/lib/types";

// Pre-render every topic page at build time -> static, fully server-rendered HTML
// that search engines can index. This is the organic-traffic surface.
export const dynamicParams = false;

export async function generateStaticParams() {
  const collections = await listCollections();
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const collection = await getCollection((await params).slug);
  if (!collection) return { title: "Topic not found" };
  return { title: collection.title, description: collection.blurb };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await getCollection(slug);
  if (!collection) notFound();

  const [docs, timeline, images] = await Promise.all([
    getCollectionDocuments(slug),
    getTimeline(slug),
    listImages(slug),
  ]);

  const docTitleById = Object.fromEntries(docs.map((d) => [d.id, d.title]));
  const hits: SearchHit[] = docs.map((d) => ({
    document: d,
    score: 0,
    page: d.pages[0]?.pageNumber ?? 1,
    matchedTerms: [],
    snippetHtml: buildSnippet(d.summary, []),
  }));
  const entities = [...new Set(docs.flatMap((d) => d.entities))];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-xs text-muted">
        <Link href="/">Home</Link>
        <span className="px-1.5 text-faint">/</span>
        <Link href="/topics">Topics</Link>
        <span className="px-1.5 text-faint">/</span>
        <span className="text-faint">{collection.title}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
        {collection.title}
      </h1>
      <p className="mt-1 text-muted">{collection.heroQuestion}</p>

      <div className="doc-prose mt-4 max-w-2xl space-y-3">
        {collection.overview.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {images.length > 0 && (
        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-faint">
              Images ({images.length})
            </h2>
            <Link href={`/images?topic=${collection.slug}`} className="text-sm">
              All images →
            </Link>
          </div>
          <ul className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
            {images.slice(0, 6).map((img) => (
              <li key={img.id} className="rounded border border-line bg-paper">
                <Link
                  href={`/images?topic=${collection.slug}`}
                  className="block hover:no-underline"
                  title={img.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked archive media */}
                  <img
                    src={img.thumbUrl}
                    alt={img.title}
                    loading="lazy"
                    className="h-24 w-full rounded-t object-cover"
                  />
                  <div className="truncate px-1.5 py-1 text-[11px] text-muted">{img.title}</div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-faint">
              Documents ({docs.length})
            </h2>
            <Link href={`/search?topic=${collection.slug}`} className="text-sm">
              Search within this topic →
            </Link>
          </div>
          <div className="mt-2 border-t border-line-soft">
            {hits.map((hit) => (
              <ResultCard key={hit.document.id} hit={hit} />
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {timeline.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">
                Timeline
              </h2>
              <Timeline events={timeline} docTitleById={docTitleById} />
            </div>
          )}

          {entities.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-faint">
                Key entities
              </h2>
              <ul className="flex flex-wrap gap-2">
                {entities.map((e) => (
                  <li key={e}>
                    <Link
                      href={`/search?q=${encodeURIComponent(e)}`}
                      className="rounded-sm border border-line bg-paper px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-ink hover:no-underline"
                    >
                      {e}
                    </Link>
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
