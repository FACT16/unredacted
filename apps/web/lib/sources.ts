// The source registry — the auditable catalog of U.S. government release channels.
//
// This is the answer to "are we actually watching the places where files drop?".
// Every channel we monitor (or intend to) is declared here with HOW it is watched
// and what its coverage status is. The ingest pipeline (scripts/ingest.mjs) writes
// a per-source run report to lib/generated-ingest-report.json using the same ids,
// and the /sources page renders both together so coverage — and any silent
// breakage — is visible at a glance instead of buried in a workflow log.
//
// Adding a new channel = add an entry here + an ingester in scripts/ingest.mjs
// that reports under the same id.

export type MonitorMethod =
  /** A documented API or machine-readable feed. */
  | "api"
  /** We fetch the public listing page itself and extract the file links. */
  | "page-watch"
  /** No automation yet — releases are added by hand when they happen. */
  | "manual";

export type SourceStatus =
  /** Ingested automatically on every scheduled run. */
  | "automated"
  /** Ingester exists but only runs when its API key secret is configured. */
  | "key-required"
  /** Known release channel we do not ingest yet. */
  | "planned";

export interface MonitoredSource {
  /** Stable id — must match the ingest report's source ids. */
  id: string;
  name: string;
  publisher: string;
  url: string;
  /** What kind of files this channel releases. */
  what: string;
  /** How often the channel itself tends to publish. */
  cadence: string;
  method: MonitorMethod;
  status: SourceStatus;
  note?: string;
}

export const SOURCE_REGISTRY: MonitoredSource[] = [
  // ── Watched on every scheduled run ─────────────────────────────────────────
  {
    id: "pursue",
    name: "PURSUE — war.gov/UFO",
    publisher: "U.S. Department of War",
    url: "https://www.war.gov/ufo/",
    what: "Declassified UAP/UFO records — documents, videos, audio, and images from the Pentagon, CIA, FBI, NASA, and the Department of Energy, posted in tranches.",
    cadence: "New tranches every few weeks (launched May 8, 2026)",
    method: "page-watch",
    status: "automated",
    note: "No API — the portal's public file listing is fetched and every hosted file link is extracted. If the page changes shape, previously captured records are kept and the failed check is flagged here.",
  },
  {
    id: "federal-register",
    name: "Federal Register — presidential documents",
    publisher: "Office of the Federal Register (NARA/GPO)",
    url: "https://www.federalregister.gov/",
    what: "Executive orders, proclamations, and presidential memoranda, as published in the government's official daily journal.",
    cadence: "Daily (business days)",
    method: "api",
    status: "automated",
  },
  {
    id: "govinfo-latest",
    name: "GovInfo — new additions to the official record",
    publisher: "U.S. Government Publishing Office",
    url: "https://www.govinfo.gov/",
    what: "Committee reports, congressional hearings, public laws, and congressional documents, as GPO adds them to the official record.",
    cadence: "Continuous",
    method: "api",
    status: "automated",
  },
  {
    id: "govinfo-search",
    name: "GovInfo — topic backfile",
    publisher: "U.S. Government Publishing Office",
    url: "https://www.govinfo.gov/",
    what: "Published records matching each tracked topic (UAP, JFK, MKUltra, Epstein, September 11, and more).",
    cadence: "Re-queried every run",
    method: "api",
    status: "automated",
  },
  {
    id: "loc-images",
    name: "Library of Congress — digitized imagery",
    publisher: "Library of Congress",
    url: "https://www.loc.gov/",
    what: "Official digitized photographs for the image galleries, hotlinked from LOC with links back to each catalog record.",
    cadence: "Refreshed every run",
    method: "api",
    status: "automated",
    note: "Runs as its own step (scripts/images.mjs) in the same scheduled job.",
  },

  // ── Ready, pending an API key ──────────────────────────────────────────────
  {
    id: "nara-uap-rg615",
    name: "NARA UAP Records Collection (Record Group 615)",
    publisher: "National Archives and Records Administration",
    url: "https://www.archives.gov/research/topics/uaps/rg-615",
    what: "UAP records that every federal agency is required to transfer to the National Archives under the 2024 NDAA, released on a rolling basis through the National Archives Catalog.",
    cadence: "Rolling, as agencies transfer records",
    method: "api",
    status: "key-required",
    note: "Ingested via the NARA Catalog API when the NARA_API_KEY repository secret is set (free key from catalog.archives.gov).",
  },
  {
    id: "nara-catalog",
    name: "National Archives Catalog — topic backfile",
    publisher: "National Archives and Records Administration",
    url: "https://catalog.archives.gov/",
    what: "Archival records matching each tracked topic.",
    cadence: "Re-queried every run",
    method: "api",
    status: "key-required",
    note: "Runs when the NARA_API_KEY repository secret is set.",
  },

  // ── On the roadmap (known release channels, not yet automated) ─────────────
  {
    id: "fbi-vault",
    name: "FBI Records: The Vault",
    publisher: "Federal Bureau of Investigation",
    url: "https://vault.fbi.gov/",
    what: "The FBI's FOIA reading room — released investigative files (Epstein, MLK, UFO files, and thousands more).",
    cadence: "Irregular; major drops make news",
    method: "manual",
    status: "planned",
    note: "The Vault blocks automated clients, so major releases are added as curated records until a compliant watcher is built.",
  },
  {
    id: "cia-readingroom",
    name: "CIA FOIA Electronic Reading Room",
    publisher: "Central Intelligence Agency",
    url: "https://www.cia.gov/readingroom/",
    what: "Declassified CIA records (CREST), including the MKUltra and Family Jewels collections.",
    cadence: "Rolling FOIA releases",
    method: "manual",
    status: "planned",
  },
  {
    id: "nsa-foia",
    name: "NSA declassification & transparency releases",
    publisher: "National Security Agency",
    url: "https://www.nsa.gov/helpful-links/nsa-foia/",
    what: "Declassified NSA records, including the 2026 release of formerly Top Secret UMBRA UAP records.",
    cadence: "Irregular",
    method: "manual",
    status: "planned",
  },
  {
    id: "odni",
    name: "ODNI reports & publications",
    publisher: "Office of the Director of National Intelligence",
    url: "https://www.dni.gov/",
    what: "UAP annual reports, declassified assessments, and IC transparency releases.",
    cadence: "Irregular",
    method: "manual",
    status: "planned",
  },
  {
    id: "aaro",
    name: "AARO — UAP records & information papers",
    publisher: "All-domain Anomaly Resolution Office (DoW)",
    url: "https://www.aaro.mil/UAP-Records/",
    what: "AARO's released UAP case resolutions, historical-record reports, and information papers.",
    cadence: "Irregular",
    method: "manual",
    status: "planned",
  },
  {
    id: "gao",
    name: "GAO reports",
    publisher: "U.S. Government Accountability Office",
    url: "https://www.gao.gov/",
    what: "Audit and investigation reports to Congress.",
    cadence: "Near-daily",
    method: "manual",
    status: "planned",
  },
  {
    id: "state-frus",
    name: "Foreign Relations of the United States (FRUS)",
    publisher: "U.S. Department of State, Office of the Historian",
    url: "https://history.state.gov/historicaldocuments",
    what: "Declassified diplomatic and intelligence records published volume by volume.",
    cadence: "Several volumes a year",
    method: "manual",
    status: "planned",
  },
  {
    id: "courtlistener",
    name: "Federal court records (CourtListener/RECAP)",
    publisher: "Free Law Project (court records)",
    url: "https://www.courtlistener.com/",
    what: "Unsealed federal court filings — the source of the Giuffre v. Maxwell records.",
    cadence: "Continuous",
    method: "manual",
    status: "planned",
    note: "CourtListener has a full API; automating specific dockets is a natural next ingester.",
  },
];

export const AUTOMATED_SOURCES = SOURCE_REGISTRY.filter((s) => s.status === "automated");
export const KEYED_SOURCES = SOURCE_REGISTRY.filter((s) => s.status === "key-required");
export const PLANNED_SOURCES = SOURCE_REGISTRY.filter((s) => s.status === "planned");

// ── The run report written by scripts/ingest.mjs ─────────────────────────────
export interface IngestSourceResult {
  /** Matches a MonitoredSource id. */
  id: string;
  ok: boolean;
  /** True when the source was intentionally not queried (e.g. no API key). */
  skipped?: boolean;
  /** Records contributed to the corpus this run. */
  added: number;
  detail?: string;
}

export interface IngestReport {
  /** ISO timestamp of the last completed ingest run, or null before the first. */
  generatedAt: string | null;
  sources: IngestSourceResult[];
}
