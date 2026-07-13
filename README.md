# Just the Files

**Search declassified and publicly released U.S. government documents — and read the originals.**

**Live: https://fact16.github.io/justthefiles/**

A research tool that puts primary-source government records in one fast, searchable place,
with every result linked back to its original source. *Google Scholar meets the National
Archives.* AI is used only behind the scenes (search ranking, organization, entity
extraction) — never to generate answers that could misstate a source.

> Status: **early public build.** The full product runs statically (every document and
> topic page pre-rendered; search in the browser) over a growing corpus of real records
> pulled from government sources. The data layer is a typed seam that the FastAPI +
> Postgres backend will slot into in Phase 2 without UI changes.

---

## Run it

The app lives in `apps/web` (Next.js 16, React 19, Tailwind v4).

```sh
cd apps/web
npm install      # first time only
npm run dev      # http://localhost:3000
```

> Note: this repo lives under a path containing a colon (`Personal Project:Code`), which
> trips up some tooling that initializes a shell in the working directory. Run commands
> from inside `apps/web` (as above) and it works fine. The preview launch config in
> `.claude/launch.json` invokes the `next` binary by absolute path for the same reason.

---

## Loading real documents (no backend)

`scripts/ingest.mjs` pulls real U.S. government records from public sources into
`lib/generated-documents.json`, which is merged with the curated records in `lib/data.ts`.

```sh
cd apps/web
npm run ingest                              # Federal Register + GovInfo (official U.S. gov sources)
DATA_GOV_API_KEY=your_key npm run ingest    # higher GovInfo limits (free key: api.data.gov/signup)
NARA_API_KEY=your_key  npm run ingest       # also pull the National Archives Catalog (separate free NARA key)
```

**Official U.S. government sources only** — every record comes from a government publisher
of the document itself, not a third-party aggregator or user-upload host:

- **war.gov/UFO — PURSUE** (Department of War) — the UAP disclosure portal launched
  May 8, 2026; declassified documents, videos, audio, and images posted in tranches.
  No API exists, so the ingester watches the public listing page itself and extracts
  every hosted file link. Keyless.
- **Federal Register** (federalregister.gov) — the official daily journal; executive
  orders, proclamations, and presidential memoranda. Keyless.
- **GovInfo** (U.S. Government Publishing Office) — congressional hearings and reports and
  other published records. Uses `api.data.gov` (`DEMO_KEY` by default; set
  `DATA_GOV_API_KEY` — a free key — for real volume, since `DEMO_KEY` is heavily throttled).
- **NARA Catalog** (National Archives) — only when `NARA_API_KEY` is set. With the key,
  the ingester also pulls the **UAP Records Collection (Record Group 615)** — the
  records every agency must transfer to NARA under the 2024 NDAA — directly by record
  group, so rolling transfers are captured even when titles don't match topic keywords.
- **Library of Congress** (loc.gov, keyless) — digitized imagery for the photo galleries
  (`scripts/images.mjs`); images are hotlinked from LOC and every caption links to the
  original catalog record.

**Coverage is auditable.** `lib/sources.ts` is the registry of every release channel we
watch (or plan to); each ingest run writes a per-source health report to
`lib/generated-ingest-report.json`, and the **/sources** page renders both — which
channels are monitored, how, and whether the last check succeeded — so a silently
broken source never looks like a quiet news day. Page-watch sources (PURSUE) carry
previously captured records forward when the portal is unreachable, and the run report
flags the failure.

Every record carries real metadata, a **description/excerpt extracted from the official
document text itself** (`scripts/enrich.mjs` — extractive only, nothing generated), the
people/organizations it names (powers connection search), and a working link to the
original. `scripts/audit-links.mjs` re-verifies every source link on each run.

The whole pipeline runs on a schedule (`.github/workflows/ingest.yml`, every 6 hours),
so a new government drop — a war.gov/UFO tranche, an executive order, a committee
report — is cataloged and live on the site within hours of publication.

---

## How it's built

```
justthefiles/
  apps/
    web/                     # Next.js App Router frontend
      app/
        page.tsx             # home: search, stats, topics, recent releases
        search/page.tsx      # faceted search results (agency / topic / year)
        documents/[id]/      # document viewer + provenance panel
        topics/[slug]/       # SSG topic pages (the SEO surface)
        about/page.tsx       # method & principles
      components/            # search bar, result card, provenance panel, timeline, …
      lib/
        types.ts             # domain model (backend-agnostic contract)
        data.ts              # Phase 1 fixtures (real metadata; illustrative excerpts)
        search.ts            # pure scoring + snippet highlighting
        api.ts               # THE SEAM — async data accessors; becomes fetch() in Phase 2
```

### The seam

Every component reads data through `lib/api.ts` (`searchDocuments`, `getDocument`,
`getCollection`, …). Today those functions run over the in-memory fixtures in `lib/data.ts`.
In Phase 2 each body is replaced with a `fetch()` to the FastAPI backend — the signatures
and return shapes stay identical, so the UI does not change.

### Integrity in the demo

Document **metadata** (titles, agencies, dates, classification, source URLs) reflects real,
publicly released records. Document **body text** is illustrative for Phase 1 — clearly
labelled as such in the UI — pending real OCR ingestion. Nothing is presented as a verbatim
quote that isn't.

---

## Deployment

Every push to `main` builds a static export (`next build` with `output: "export"` —
139 pre-rendered pages) and deploys it to **GitHub Pages** via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). No servers, no cost.
When the Phase 2 backend ships, the same UI deploys to a Node host and `lib/api.ts`
points at the API instead of the bundled corpus.

---

## What works now

- Cross-source search with field-weighted ranking, snippet highlighting, and facets
- Document viewer with page-level anchors, a provenance panel (source, dates, OCR
  confidence), and clickable entities (cross-document search)
- Server-rendered topic pages with cited overviews and a citable timeline
- Plain, fast, utilitarian UI — built to read like a government catalog, not a SaaS app

## Roadmap

2. **Backend + local Postgres** — FastAPI, pgvector, real ingestion (Epstein + UAP first),
   hybrid full-text + semantic search behind the same `lib/api.ts` seam.
3. **Topic pages + provenance at scale** · 4. **Entities, timelines, cross-agency** ·
   5. **Investigation workspaces** · 6. **Feed of new releases** · 7. **Scale (Oracle Always Free + Meilisearch).**

See the planning doc for the full technical plan.

---

Just the Files is an independent research tool and is not affiliated with, or endorsed by, any
government agency. All referenced documents are public records.
