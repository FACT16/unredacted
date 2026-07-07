// ── THE SEAM ────────────────────────────────────────────────────────────────
// Every component reads data through these functions and nothing else. Right now
// they run over the in-memory fixtures in `lib/data.ts`. In Phase 2 each body is
// replaced with a `fetch()` to the FastAPI backend (search, documents, entities,
// collections) — the signatures and return shapes stay identical, so the UI does
// not change. Keep all functions async for exactly that reason.
// ─────────────────────────────────────────────────────────────────────────────

import { AGENCIES, COLLECTIONS, DOCUMENTS, ENTITIES, TIMELINES } from "./data";
import generatedImages from "./generated-images.json";
import { buildSnippet, scoreDocument, tokenize } from "./search";
import { findEntitiesInQuery } from "./entities";
import type {
  Agency,
  AgencyCode,
  Collection,
  Entity,
  FacetCount,
  GovDocument,
  SearchFilters,
  SearchResponse,
  SearchHit,
  TimelineEvent,
} from "./types";

function docYear(doc: GovDocument): number {
  const iso = doc.docDate ?? doc.releaseDate;
  return Number(iso.slice(0, 4));
}

function passesFilters(doc: GovDocument, filters: SearchFilters): boolean {
  if (filters.agencies?.length && !filters.agencies.includes(doc.agency)) return false;
  if (filters.collections?.length && !doc.topics.some((t) => filters.collections!.includes(t))) {
    return false;
  }
  const year = docYear(doc);
  if (filters.yearFrom && year < filters.yearFrom) return false;
  if (filters.yearTo && year > filters.yearTo) return false;
  return true;
}

/**
 * Search the corpus. With an empty query this becomes a browse (all documents,
 * newest release first). Facet counts are computed over the query match set
 * *before* agency/collection filters are applied, so the sidebar stays useful.
 *
 * The sync form exists because the static build runs search in the browser
 * (no server). The async wrapper below is the seam the Phase 2 API replaces.
 */
export function searchDocumentsSync(
  query: string,
  filters: SearchFilters = {},
): SearchResponse {
  const startedAt = performance.now();
  const tokens = tokenize(query);
  const browsing = tokens.length === 0;

  // 1. Score every document against the query.
  const scored = DOCUMENTS.map((document) => {
    const { score, bestPage, matchedTerms } = scoreDocument(document, tokens);
    return { document, score, bestPage, matchedTerms };
  }).filter((r) => browsing || r.score > 0);

  // 2. Facets over the query-matched set (independent of the chosen facets).
  const agencyCounts = new Map<AgencyCode, number>();
  const collectionCounts = new Map<string, number>();
  for (const r of scored) {
    agencyCounts.set(r.document.agency, (agencyCounts.get(r.document.agency) ?? 0) + 1);
    for (const topic of r.document.topics) {
      collectionCounts.set(topic, (collectionCounts.get(topic) ?? 0) + 1);
    }
  }

  // 3. Apply the active filters, then build hits.
  const hits: SearchHit[] = scored
    .filter((r) => passesFilters(r.document, filters))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.document.releaseDate.localeCompare(a.document.releaseDate);
    })
    .map((r) => {
      const page =
        r.document.pages.find((p) => p.pageNumber === r.bestPage) ?? r.document.pages[0];
      const snippetSource = browsing ? r.document.summary : page?.text ?? r.document.summary;
      return {
        document: r.document,
        score: r.score,
        page: r.bestPage,
        matchedTerms: r.matchedTerms,
        snippetHtml: buildSnippet(snippetSource, tokens),
      };
    });

  const agencies: FacetCount[] = [...agencyCounts.entries()]
    .map(([code, count]) => ({ value: code, label: AGENCIES[code].short, count }))
    .sort((a, b) => b.count - a.count);

  const collections: FacetCount[] = [...collectionCounts.entries()]
    .map(([slug, count]) => ({
      value: slug,
      label: COLLECTIONS.find((c) => c.slug === slug)?.title ?? slug,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    query,
    hits,
    total: hits.length,
    facets: { agencies, collections },
    tookMs: Math.max(1, Math.round((performance.now() - startedAt) * 100) / 100),
  };
}

export async function searchDocuments(
  query: string,
  filters: SearchFilters = {},
): Promise<SearchResponse> {
  return searchDocumentsSync(query, filters);
}

/** All document ids — used by generateStaticParams to pre-render every document page. */
export async function listDocumentIds(): Promise<string[]> {
  return DOCUMENTS.map((d) => d.id);
}

export interface Connection {
  /** The entities named in the query, in the order matched. */
  entities: string[];
  /** Documents whose text names ALL of those entities. */
  documents: GovDocument[];
  /** Other entities that co-occur with them, by document count. */
  related: { name: string; count: number }[];
}

/**
 * The connection between 2+ entities: every document that names all of them, plus
 * the other names that show up alongside. Powered by entity membership baked onto
 * each document from its full text (scripts/enrich.mjs) — no backend required.
 */
export function getConnectionSync(entities: string[]): Connection | null {
  if (entities.length < 2) return null;
  const documents = DOCUMENTS.filter((d) => entities.every((e) => d.entities.includes(e))).sort(
    (a, b) => b.releaseDate.localeCompare(a.releaseDate),
  );
  const rel = new Map<string, number>();
  for (const d of documents) {
    for (const e of d.entities) {
      if (!entities.includes(e)) rel.set(e, (rel.get(e) ?? 0) + 1);
    }
  }
  const related = [...rel.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return { entities, documents, related };
}

/** Re-exported for the search UI so it can detect entities in the query. */
export { findEntitiesInQuery };

// ── Images (official digitized imagery, hotlinked from the source archive) ────
const IMAGES = generatedImages as unknown as import("./types").GalleryImage[];

export function listImagesSync(topic?: string): import("./types").GalleryImage[] {
  return topic ? IMAGES.filter((i) => i.topics.includes(topic)) : IMAGES;
}

export async function listImages(topic?: string) {
  return listImagesSync(topic);
}

/** Topic slugs that actually have imagery, with counts (for filter chips). */
export function imageTopicsSync(): { slug: string; title: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const img of IMAGES) for (const t of img.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([slug, count]) => ({
      slug,
      title: COLLECTIONS.find((c) => c.slug === slug)?.title ?? slug,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getDocument(id: string): Promise<GovDocument | null> {
  return DOCUMENTS.find((d) => d.id === id) ?? null;
}

function collectionSize(slug: string): number {
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  const ids = new Set(collection?.documentIds ?? []);
  let n = 0;
  for (const d of DOCUMENTS) if (ids.has(d.id) || d.topics.includes(slug)) n++;
  return n;
}

export type CollectionWithCount = Collection & { documentCount: number };

export async function listCollections(): Promise<CollectionWithCount[]> {
  // Only surface topics that actually have documents, so a topic never renders an
  // empty page. documentCount is the real membership (curated + ingested), which the
  // topic cards display — not documentIds.length, which is curated-only.
  return COLLECTIONS.map((c) => ({ ...c, documentCount: collectionSize(c.slug) })).filter(
    (c) => c.documentCount > 0,
  );
}

export async function getCollection(slug: string): Promise<Collection | null> {
  return COLLECTIONS.find((c) => c.slug === slug) ?? null;
}

export async function getCollectionDocuments(slug: string): Promise<GovDocument[]> {
  const collection = COLLECTIONS.find((c) => c.slug === slug);
  const seen = new Set<string>();
  const result: GovDocument[] = [];

  // Curated documents first, in their hand-ordered sequence.
  for (const id of collection?.documentIds ?? []) {
    const doc = DOCUMENTS.find((d) => d.id === id);
    if (doc && !seen.has(doc.id)) {
      seen.add(doc.id);
      result.push(doc);
    }
  }

  // Then any other document (e.g. ingested records) tagged with this topic.
  for (const doc of DOCUMENTS) {
    if (!seen.has(doc.id) && doc.topics.includes(slug)) {
      seen.add(doc.id);
      result.push(doc);
    }
  }

  return result;
}

export async function getTimeline(slug: string): Promise<TimelineEvent[]> {
  return (TIMELINES[slug] ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
}

export async function getRecentReleases(limit = 6): Promise<GovDocument[]> {
  return DOCUMENTS.slice()
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))
    .slice(0, limit);
}

/** Related = shares a topic or a named entity. Used in the document viewer. */
export async function getRelatedDocuments(doc: GovDocument, limit = 4): Promise<GovDocument[]> {
  const entitySet = new Set(doc.entities);
  return DOCUMENTS.filter((d) => d.id !== doc.id)
    .map((d) => {
      const sharedTopics = d.topics.filter((t) => doc.topics.includes(t)).length;
      const sharedEntities = d.entities.filter((e) => entitySet.has(e)).length;
      return { d, relevance: sharedTopics * 2 + sharedEntities };
    })
    .filter((r) => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map((r) => r.d);
}

export async function getAgency(code: AgencyCode): Promise<Agency> {
  return AGENCIES[code];
}

export async function getEntities(): Promise<Entity[]> {
  return ENTITIES;
}

export interface CorpusStats {
  documentCount: number;
  pageCount: number;
  agencyCount: number;
  collectionCount: number;
}

/** Headline counts for the home page. Plain numbers, no rounding theatrics. */
export async function getStats(): Promise<CorpusStats> {
  const agencies = new Set(DOCUMENTS.map((d) => d.agency));
  const topics = new Set(DOCUMENTS.flatMap((d) => d.topics));
  return {
    documentCount: DOCUMENTS.length,
    pageCount: DOCUMENTS.reduce((sum, d) => sum + (d.pageCount ?? 0), 0),
    agencyCount: agencies.size,
    collectionCount: topics.size,
  };
}
