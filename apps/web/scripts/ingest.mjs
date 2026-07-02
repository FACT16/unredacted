// Ingestion — pull REAL U.S. government / declassified records from public sources and
// write them to lib/generated-documents.json in the GovDocument shape the frontend
// already understands. No backend required.
//
//   npm run ingest
//   DATA_GOV_API_KEY=xxxx npm run ingest      # higher GovInfo limits
//   NARA_API_KEY=yyyy     npm run ingest      # also pull the National Archives Catalog
//
// Sources (all public):
//   • Internet Archive  — keyless, filtered to U.S.-government material
//   • GovInfo (U.S. GPO) — via api.data.gov (DEMO_KEY by default)
//   • DocumentCloud      — keyless, public journalist/agency-published documents
//   • Federal Register   — keyless, presidential documents (executive orders etc.)
//   • NARA Catalog       — only if NARA_API_KEY is set

import { writeFile } from "node:fs/promises";

const OUT = new URL("../lib/generated-documents.json", import.meta.url);
const DATA_GOV_KEY = process.env.DATA_GOV_API_KEY || "DEMO_KEY";
const NARA_KEY = process.env.NARA_API_KEY || "";

// `ia` = Internet Archive title query; `q` = keyword query for GovInfo / DocumentCloud.
// `slug` must match a collection slug in lib/data.ts. Executive orders come from the
// Federal Register separately (topic "executive-orders").
const TOPICS = [
  { slug: "uap", ia: 'title:(UAP OR UFO OR "unidentified aerial phenomena") AND mediatype:texts', q: "unidentified aerial phenomena UAP UFO" },
  { slug: "jfk", ia: 'title:("Kennedy assassination" OR "Warren Commission" OR Oswald OR "JFK files") AND mediatype:texts', q: "Kennedy assassination Warren Commission Oswald" },
  { slug: "mkultra", ia: 'title:(MKULTRA OR "MK-ULTRA" OR "mind control") AND mediatype:texts', q: "MKULTRA mind control CIA" },
  { slug: "epstein", ia: 'title:(Epstein) AND mediatype:texts', q: "Epstein" },
  { slug: "sept-11", ia: 'title:("9/11 Commission" OR "September 11" OR "Joint Inquiry") AND mediatype:texts', q: "9/11 Commission September 11 attacks" },
  { slug: "fbi-files", ia: 'title:("FBI" OR "Federal Bureau of Investigation") AND mediatype:texts', q: "FBI declassified file" },
  { slug: "watergate", ia: 'title:(Watergate OR "Nixon tapes" OR "Nixon White House") AND mediatype:texts', q: "Watergate Nixon" },
  { slug: "cold-war", ia: 'title:("Cold War" OR "Bay of Pigs" OR "Cuban Missile" OR "covert action") AND mediatype:texts', q: "Cold War covert action CIA Bay of Pigs" },
  { slug: "history", ia: 'title:("declassified" OR "Pentagon Papers" OR COINTELPRO OR "Church Committee" OR "Family Jewels") AND mediatype:texts', q: "declassified Pentagon Papers COINTELPRO Church Committee" },
];

// ── helpers ──────────────────────────────────────────────────────────────────
const asText = (v) => (Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : "");
const stripHtml = (s) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const clamp = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…");

function isoDate(s) {
  if (!s) return null;
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/.exec(String(s));
  return m ? `${m[1]}-${m[2] ?? "01"}-${m[3] ?? "01"}` : null;
}

function inferAgency(text) {
  const t = text.toLowerCase();
  if (/central intelligence|\bcia\b|crest|rdp/.test(t)) return "CIA";
  if (/federal bureau|\bfbi\b|cointelpro/.test(t)) return "FBI";
  if (/national security agency|\bnsa\b/.test(t)) return "NSA";
  if (/air force|\busaf\b/.test(t)) return "USAF";
  if (/state department|foreign relations|\bfrus\b|diplomatic/.test(t)) return "STATE";
  if (/defense|pentagon|\bdod\b|joint chiefs/.test(t)) return "DOD";
  if (/director of national intelligence|\bodni\b/.test(t)) return "ODNI";
  if (/white house|executive order|presidential|proclamation/.test(t)) return "WH";
  if (/\bsenate\b|congress|committee|hearing|joint inquiry|\bchrg\b|\bcrpt\b/.test(t)) return "SENATE";
  if (/national archives|\bnara\b/.test(t)) return "NARA";
  if (/commission/.test(t)) return "COMMISSION";
  return "OTHER";
}

async function fetchWithTimeout(url, opts = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { "User-Agent": "Unredacted-ingest/0.3 (research demo)", ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── filters ──────────────────────────────────────────────────────────────────
const FOREIGN = /\b(australian?|brazil(ian)?|canad(a|ian)|british|britain|u\.?k\.?|mexican?|french|belgian?|russian?|chinese|japanese|german|italian|spanish|new zealand|argentin\w*|peruvian?|chilean?|indian|nigerian?|swedish|dutch)\b/i;
const SECONDARY = /\b(MUFON|magazine|newsletter|gazette|channell?ing|comic|novel|fiction)\b/i;
const USGOV = /\b(CIA|FBI|NSA|DIA|Pentagon|Senate|Congress|congressional|federal|United States|U\.?S\.?|declassified|FOIA|Army|Navy|Air Force|White House|State Department|National Archives|NARA|ODNI|AARO|DoD|Defense|Warren Commission|MKULTRA|COINTELPRO|Watergate|Nixon|Cold War)\b/i;

// ── Internet Archive ─────────────────────────────────────────────────────────
function archiveUrl(query, rows) {
  const p = new URLSearchParams();
  p.set("q", query);
  for (const f of ["identifier", "title", "description", "year", "date", "publicdate", "subject", "collection", "imagecount"]) p.append("fl[]", f);
  p.append("sort[]", "downloads desc");
  p.set("rows", String(rows));
  p.set("page", "1");
  p.set("output", "json");
  return `https://archive.org/advancedsearch.php?${p.toString()}`;
}

async function ingestArchive(topic) {
  const res = await fetchWithTimeout(archiveUrl(topic.ia, 24));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const docs = (json?.response?.docs ?? []).filter((raw) => {
    if (!raw?.identifier) return false;
    const title = asText(raw.title);
    if (FOREIGN.test(title) || SECONDARY.test(title)) return false;
    return USGOV.test(`${title} ${asText(raw.description)} ${asText(raw.subject)}`);
  });
  return docs.map((raw) => {
    const title = clamp(stripHtml(asText(raw.title)) || raw.identifier, 180);
    const descFull = stripHtml(asText(raw.description));
    const docDate = isoDate(raw.date) ?? isoDate(raw.year);
    const tags = (Array.isArray(raw.subject) ? raw.subject : asText(raw.subject).split(";"))
      .map((s) => stripHtml(String(s)).trim()).filter(Boolean).slice(0, 6);
    return {
      id: `ia-${raw.identifier}`,
      title,
      agency: inferAgency(`${title} ${descFull} ${asText(raw.subject)}`),
      collection: topic.slug,
      topics: [topic.slug],
      docDate,
      releaseDate: isoDate(raw.publicdate) ?? docDate ?? "1970-01-01",
      originalUrl: `https://archive.org/details/${raw.identifier}`,
      sourceName: "Internet Archive",
      pageCount: Number(raw.imagecount) > 0 ? Number(raw.imagecount) : undefined,
      language: "English",
      summary: clamp(descFull || `Archived record: ${title}.`, 360),
      pages: [{ pageNumber: 1, text: clamp(descFull.length > 40 ? descFull : `Archived record: ${title}.`, 1600) }],
      entities: [],
      tags,
      sourceNote: "This is the archived catalog record; the text below is the source archive's description.",
    };
  });
}

// ── GovInfo (U.S. GPO) ───────────────────────────────────────────────────────
async function ingestGovInfo(topic) {
  const res = await fetchWithTimeout(`https://api.govinfo.gov/search?api_key=${encodeURIComponent(DATA_GOV_KEY)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: topic.q, pageSize: 8, offsetMark: "*", sorts: [{ field: "relevancy", sortOrder: "DESC" }] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json?.results ?? []).map((r) => {
    const packageId = r.packageId || r.granuleId;
    if (!packageId) return null;
    const title = clamp(stripHtml(asText(r.title)) || packageId, 180);
    const coll = r.collectionCode || r.collection || "";
    return {
      id: `gov-${packageId}`,
      title,
      agency: inferAgency(`${title} ${coll}`),
      collection: topic.slug,
      topics: [topic.slug],
      docDate: isoDate(r.dateIssued),
      releaseDate: isoDate(r.dateIssued) ?? isoDate(r.lastModified) ?? "1970-01-01",
      originalUrl: `https://www.govinfo.gov/app/details/${packageId}`,
      sourceName: "GovInfo (U.S. GPO)",
      language: "English",
      summary: clamp(`${title}. A record published by the U.S. Government Publishing Office${coll ? ` (collection ${coll})` : ""}.`, 360),
      pages: [{ pageNumber: 1, text: clamp(`${title}. Published by the U.S. Government Publishing Office${coll ? `, collection ${coll}` : ""}. Read the full document at the source.`, 1600) }],
      entities: [],
      tags: [coll].filter(Boolean),
      sourceNote: "This is the catalog record from GovInfo (U.S. GPO); read the full document at the source.",
    };
  }).filter(Boolean);
}

// ── DocumentCloud (public journalist/agency-published documents) ──────────────
async function ingestDocumentCloud(topic) {
  const res = await fetchWithTimeout(`https://api.www.documentcloud.org/api/documents/search/?q=${encodeURIComponent(topic.q)}&per_page=12`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const results = (json?.results ?? []).filter((r) => r?.access === "public" && r?.canonical_url && !FOREIGN.test(asText(r.title)));
  return results.map((r) => {
    const title = clamp(stripHtml(asText(r.title)) || `Document ${r.id}`, 180);
    const desc = stripHtml(asText(r.description));
    return {
      id: `dc-${r.id}`,
      title,
      agency: inferAgency(`${title} ${desc} ${asText(r.source)}`),
      collection: topic.slug,
      topics: [topic.slug],
      docDate: isoDate(r.created_at),
      releaseDate: isoDate(r.created_at) ?? "1970-01-01",
      originalUrl: r.canonical_url,
      sourceName: "DocumentCloud",
      pageCount: Number(r.page_count) > 0 ? Number(r.page_count) : undefined,
      language: "English",
      summary: clamp(desc || title, 360),
      pages: [{ pageNumber: 1, text: clamp(desc || title, 1600) }],
      entities: [],
      tags: [asText(r.source)].map((s) => s.trim()).filter(Boolean).slice(0, 3),
      sourceNote: "Published to DocumentCloud by a journalist or research organization; read the full document at the source.",
    };
  });
}

// ── Federal Register (presidential documents → executive-orders) ──────────────
async function ingestFederalRegister(limit = 60) {
  const url = `https://www.federalregister.gov/api/v1/documents.json?per_page=${limit}&order=newest&conditions%5Btype%5D%5B%5D=PRESDOCU`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json?.results ?? []).filter((r) => r?.document_number && r?.html_url).map((r) => {
    const title = clamp(stripHtml(asText(r.title)) || r.document_number, 180);
    const abstract = stripHtml(asText(r.abstract));
    const ptype = (r.presidential_document_type || "presidential document").replace(/_/g, " ");
    return {
      id: `fr-${r.document_number}`,
      title,
      agency: "WH",
      collection: "executive-orders",
      topics: ["executive-orders"],
      docDate: isoDate(r.publication_date),
      releaseDate: isoDate(r.publication_date) ?? "1970-01-01",
      classificationEra: "Presidential document",
      originalUrl: r.html_url,
      sourceName: "Federal Register",
      language: "English",
      summary: clamp(abstract || `${title}. A ${ptype} published in the Federal Register.`, 360),
      pages: [{ pageNumber: 1, text: clamp(abstract || `${title}. A ${ptype} published in the Federal Register — the official daily journal of the U.S. government. Read the full text at the source.`, 1600) }],
      entities: [],
      tags: [ptype],
      sourceNote: "Published in the Federal Register, the official daily journal of the U.S. government; read the full text at the source.",
    };
  });
}

// ── orchestrate ──────────────────────────────────────────────────────────────
async function main() {
  console.log("Ingesting real U.S. government records…");
  console.log(`  GovInfo key: ${DATA_GOV_KEY === "DEMO_KEY" ? "DEMO_KEY (low limits — set DATA_GOV_API_KEY)" : "custom"}`);
  console.log(`  NARA: ${NARA_KEY ? "enabled" : "skipped"}\n`);

  const byId = new Map();
  const addAll = (docs, slug) => {
    let added = 0;
    for (const doc of docs) {
      if (!doc?.id) continue;
      if (byId.has(doc.id)) {
        const existing = byId.get(doc.id);
        if (!existing.topics.includes(slug)) existing.topics.push(slug);
        continue;
      }
      byId.set(doc.id, doc);
      added++;
    }
    return added;
  };

  for (const topic of TOPICS) {
    const parts = [];
    for (const [name, fn] of [["IA", ingestArchive], ["GovInfo", ingestGovInfo], ["DocCloud", ingestDocumentCloud]]) {
      try {
        parts.push(`${name} +${addAll(await fn(topic), topic.slug)}`);
      } catch (err) {
        parts.push(`${name} FAIL(${err.message})`);
      }
      await new Promise((r) => setTimeout(r, 350));
    }
    console.log(`  ${topic.slug.padEnd(16)} ${parts.join("  ")}`);
  }

  try {
    console.log(`  ${"executive-orders".padEnd(16)} FedReg +${addAll(await ingestFederalRegister(), "executive-orders")}`);
  } catch (err) {
    console.log(`  executive-orders FedReg FAIL(${err.message})`);
  }

  const out = [...byId.values()];
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.length} records to lib/generated-documents.json`);
  if (out.length === 0) console.warn("No records ingested — sources may be unreachable from this environment.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
