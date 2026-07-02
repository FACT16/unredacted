// Core domain model for Unredacted.
//
// These types are the contract between the UI and the data layer. In Phase 1 the
// data layer is `lib/data.ts` (in-memory fixtures). In Phase 2 the same shapes are
// served by the FastAPI backend over a real Postgres corpus — the UI should not
// need to change when that swap happens. Keep this file backend-agnostic.

export type AgencyCode =
  | "CIA"
  | "FBI"
  | "NSA"
  | "DOD"
  | "DOJ"
  | "ODNI"
  | "AARO"
  | "NARA"
  | "STATE"
  | "USAF"
  | "SENATE"
  | "COMMISSION"
  | "COURT"
  | "WH"
  // Catch-all for ingested records whose originating agency isn't one of the above.
  | "OTHER";

export interface Agency {
  code: AgencyCode;
  /** Full official name, e.g. "Central Intelligence Agency". */
  name: string;
  /** Short label for chips, e.g. "CIA". */
  short: string;
}

export interface DocumentPage {
  pageNumber: number;
  /** Extracted page text. In Phase 1 this is an illustrative excerpt (see `textIsIllustrative`). */
  text: string;
}

export interface GovDocument {
  /** Stable slug used in URLs (/documents/<id>). */
  id: string;
  title: string;
  agency: AgencyCode;
  /** Primary topic slug (epstein, uap, jfk, mkultra, sept-11, ...). */
  collection: string;
  /** All topic slugs this document belongs to (cross-agency / cross-topic). */
  topics: string[];
  /** ISO date the document itself was created, when known. */
  docDate: string | null;
  /** Human label when the exact creation date is unknown, e.g. "c. October 1963". */
  docDateLabel?: string;
  /** ISO date the document was released to the public. */
  releaseDate: string;
  /** e.g. "Formerly Top Secret", "Confidential", "Unclassified". Optional for ingested records. */
  classificationEra?: string;
  /** Link to the authoritative government source for this document. */
  originalUrl: string;
  /** Where the record was obtained, e.g. "National Archives Catalog", "CourtListener". */
  sourceName: string;
  pageCount?: number;
  /** OCR confidence, 0..1. Surfaced in the UI for transparency. Optional when unknown. */
  ocrConfidence?: number;
  language: string;
  /** Neutral, factual one-paragraph description. No interpretation. */
  summary: string;
  /** Page-level excerpts. Phase 1: illustrative; Phase 2: real OCR text. */
  pages: DocumentPage[];
  /** Canonical entity names mentioned in the document. */
  entities: string[];
  tags: string[];
  /**
   * Integrity flag: body text is representative, not verbatim OCR. The UI surfaces
   * this so the curated demo records never misrepresent a source.
   */
  textIsIllustrative?: boolean;
  /**
   * Honest note about the body text for ingested records (e.g. "catalog description"),
   * shown in the document viewer in place of the illustrative-text notice.
   */
  sourceNote?: string;
}

export interface Collection {
  slug: string;
  title: string;
  /** Short, SEO-friendly description (used in <meta> and cards). */
  blurb: string;
  /** Plain-English overview paragraphs. Factual; the UI links claims to documents. */
  overview: string[];
  /** The question a visitor is really asking. */
  heroQuestion: string;
  documentIds: string[];
}

export interface TimelineEvent {
  /** ISO date or a sortable approximation. */
  date: string;
  /** Display label when the date is approximate, e.g. "July 2004". */
  dateLabel?: string;
  title: string;
  /** Source document for this event (every event is citable). */
  documentId: string;
  page?: number;
}

export interface Entity {
  name: string;
  type: "person" | "org" | "place" | "program";
  blurb?: string;
}

export interface SearchHit {
  document: GovDocument;
  score: number;
  /** Snippet with matched terms wrapped in <mark>. Pre-escaped, safe to render. */
  snippetHtml: string;
  /** Page the snippet was drawn from — the citation target. */
  page: number;
  matchedTerms: string[];
}

export interface SearchFilters {
  agencies?: AgencyCode[];
  collections?: string[];
  yearFrom?: number;
  yearTo?: number;
}

export interface FacetCount {
  value: string;
  label: string;
  count: number;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
  total: number;
  /** Facet counts computed over the unfiltered result set (for the sidebar). */
  facets: {
    agencies: FacetCount[];
    collections: FacetCount[];
  };
  /** Measured query time, surfaced as "N results in M ms". */
  tookMs: number;
}
