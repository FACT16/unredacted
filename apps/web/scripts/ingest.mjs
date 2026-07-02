// Ingestion — pull REAL records from OFFICIAL U.S. GOVERNMENT sources only, and write
// them to lib/generated-documents.json in the GovDocument shape the frontend uses.
// No backend required.
//
//   npm run ingest
//   DATA_GOV_API_KEY=xxxx npm run ingest      # higher GovInfo limits
//   NARA_API_KEY=yyyy     npm run ingest      # also pull the National Archives Catalog
//
// Sources — every one is a U.S. government publisher of the documents themselves
// (no third-party aggregators / user-upload hosts):
//   • Federal Register — the official daily journal of the U.S. government
//     (executive orders, proclamations, presidential memoranda). Keyless.
//   • GovInfo (U.S. GPO) — the Government Publishing Office's official corpus
//     (congressional hearings & reports, published records). api.data.gov key.
//   • NARA Catalog — the National Archives, only if NARA_API_KEY is set.

import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../lib/generated-documents.json", import.meta.url);
const DATA_GOV_KEY = process.env.DATA_GOV_API_KEY || "DEMO_KEY";
const NARA_KEY = process.env.NARA_API_KEY || "";

// `q` = keyword query for GovInfo / NARA. `slug` must match a collection slug in
// lib/data.ts. Executive orders come from the Federal Register (topic
// "executive-orders").
const TOPICS = [
  { slug: "uap", q: "unidentified aerial phenomena UAP" },
  { slug: "jfk", q: "Kennedy assassination records Warren Commission" },
  { slug: "mkultra", q: "MKULTRA CIA behavioral modification" },
  { slug: "epstein", q: "Epstein" },
  { slug: "sept-11", q: "September 11 Commission terrorist attacks" },
  { slug: "fbi-files", q: "Federal Bureau of Investigation oversight surveillance" },
  { slug: "watergate", q: "Watergate impeachment Nixon" },
  { slug: "cold-war", q: "Cold War intelligence covert action" },
  { slug: "history", q: "declassified intelligence COINTELPRO Church Committee Pentagon Papers" },
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
      headers: { "User-Agent": "Unredacted-ingest/0.4 (research demo)", ...(opts.headers || {}) },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ── GovInfo (U.S. GPO) ───────────────────────────────────────────────────────
async function ingestGovInfo(topic) {
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetchWithTimeout(`https://api.govinfo.gov/search?api_key=${encodeURIComponent(DATA_GOV_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: topic.q, pageSize: 30, offsetMark: "*", sorts: [{ field: "relevancy", sortOrder: "DESC" }] }),
    });
    if (res.status !== 429 && res.status !== 503) break;
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1))); // back off on throttling
  }
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
      sourceNote: "This is the official record from GovInfo (U.S. Government Publishing Office); read the full document at the source.",
    };
  }).filter(Boolean);
}

// ── GovInfo Collections Service — the "just published" feed ──────────────────
// Lists packages as GPO adds them to the official record. This is the closest
// thing to a live wire of government document drops: full titles, and links that
// are always specific (/app/details/<packageId>). Window rolls forward, so the
// nightly job keeps the "latest" topic fresh automatically.
const LATEST_COLLECTIONS = [
  ["CRPT", "committee report"],
  ["CHRG", "congressional hearing"],
  ["PLAW", "public law"],
];

async function ingestLatest(daysBack = 45, perCollection = 14) {
  const since = new Date(Date.now() - daysBack * 86400000).toISOString().replace(/\.\d+Z$/, "Z");
  const out = [];
  for (const [code, kind] of LATEST_COLLECTIONS) {
    let res;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await fetchWithTimeout(
        `https://api.govinfo.gov/collections/${code}/${encodeURIComponent(since)}?offsetMark=%2A&pageSize=${perCollection}&api_key=${encodeURIComponent(DATA_GOV_KEY)}`,
      );
      if (res.status !== 429 && res.status !== 503) break;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} (${code})`);
    const json = await res.json();
    for (const p of json?.packages ?? []) {
      if (!p?.packageId) continue;
      const title = clamp(stripHtml(asText(p.title)) || p.packageId, 180);
      const released = isoDate(p.lastModified) ?? isoDate(p.dateIssued) ?? "1970-01-01";
      out.push({
        id: `gov-${p.packageId}`,
        title,
        agency: inferAgency(`${title} ${code}`),
        collection: "latest",
        topics: ["latest"],
        docDate: isoDate(p.dateIssued) ?? released,
        releaseDate: released,
        originalUrl: `https://www.govinfo.gov/app/details/${p.packageId}`,
        sourceName: "GovInfo (U.S. GPO)",
        language: "English",
        summary: clamp(`${title}. A ${kind} newly published to the official record by the U.S. Government Publishing Office.`, 360),
        pages: [{ pageNumber: 1, text: clamp(`${title}. A ${kind} recently added to the official record (GovInfo collection ${code}). Read the full document at the source.`, 1600) }],
        entities: [],
        tags: [kind],
        sourceNote: "Newly published to the official record by the U.S. Government Publishing Office; read the full document at the source.",
      });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return out;
}

// ── Federal Register (presidential documents → executive-orders) ──────────────
async function ingestFederalRegister(limit = 80) {
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

// ── NARA Catalog (only if NARA_API_KEY is set) ────────────────────────────────
async function ingestNara(topic) {
  const url = `https://catalog.archives.gov/api/v2/records/search?q=${encodeURIComponent(topic.q)}&limit=10`;
  const res = await fetchWithTimeout(url, { headers: { "x-api-key": NARA_KEY, Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const hits = json?.body?.hits?.hits ?? json?.hits?.hits ?? [];
  return hits.map((h) => {
    const naId = h._id || h.naId;
    const rec = h.fields || h._source?.record || h.record || h._source || {};
    if (!naId) return null;
    const title = clamp(stripHtml(asText(rec.title)) || `NARA record ${naId}`, 180);
    return {
      id: `nara-${naId}`,
      title,
      agency: inferAgency(`${title} ${asText(rec.referenceUnits || rec.creators)}`),
      collection: topic.slug,
      topics: [topic.slug],
      docDate: isoDate(asText(rec.productionDates || rec.coverageStartDate)),
      releaseDate: isoDate(asText(rec.productionDates)) ?? "1970-01-01",
      originalUrl: `https://catalog.archives.gov/id/${naId}`,
      sourceName: "National Archives Catalog",
      language: "English",
      summary: clamp(stripHtml(asText(rec.scopeAndContentNote)) || `${title}. A record held by the U.S. National Archives.`, 360),
      pages: [{ pageNumber: 1, text: clamp(stripHtml(asText(rec.scopeAndContentNote)) || `${title}. Held by the U.S. National Archives.`, 1600) }],
      entities: [],
      tags: [],
      sourceNote: "This is the official record from the U.S. National Archives Catalog; read the full document at the source.",
    };
  }).filter(Boolean);
}

// ── orchestrate ──────────────────────────────────────────────────────────────
async function main() {
  console.log("Ingesting records from official U.S. government sources only…");
  console.log(`  GovInfo key: ${DATA_GOV_KEY === "DEMO_KEY" ? "DEMO_KEY (low limits — set DATA_GOV_API_KEY)" : "custom"}`);
  console.log(`  NARA: ${NARA_KEY ? "enabled" : "skipped (set NARA_API_KEY to enable)"}\n`);

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
    const sources = [["GovInfo", ingestGovInfo]];
    if (NARA_KEY) sources.push(["NARA", ingestNara]);
    for (const [name, fn] of sources) {
      try {
        parts.push(`${name} +${addAll(await fn(topic), topic.slug)}`);
      } catch (err) {
        parts.push(`${name} FAIL(${err.message})`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    console.log(`  ${topic.slug.padEnd(16)} ${parts.join("  ")}`);
  }

  try {
    console.log(`  ${"latest".padEnd(16)} GovInfo-new +${addAll(await ingestLatest(), "latest")}`);
  } catch (err) {
    console.log(`  latest           GovInfo-new FAIL(${err.message})`);
  }

  try {
    console.log(`  ${"executive-orders".padEnd(16)} FedReg +${addAll(await ingestFederalRegister(), "executive-orders")}`);
  } catch (err) {
    console.log(`  executive-orders FedReg FAIL(${err.message})`);
  }

  const out = [...byId.values()];

  // Safety floor: on a bad day (rate limits, source outages) a run can come back
  // nearly empty. Never let that gut the published corpus — keep the previous
  // snapshot and fail loudly instead.
  let previousCount = 0;
  try {
    previousCount = JSON.parse(await readFile(OUT, "utf8")).length;
  } catch {
    /* no previous snapshot */
  }
  if (previousCount > 0 && out.length < previousCount * 0.6) {
    console.error(
      `\nABORT: new snapshot has ${out.length} records vs ${previousCount} previously (<60%). ` +
        "Keeping the existing corpus; likely rate-limiting. Re-run later or set DATA_GOV_API_KEY.",
    );
    process.exit(1);
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.length} records to lib/generated-documents.json (was ${previousCount})`);
  if (out.length === 0) console.warn("No records ingested — sources may be unreachable from this environment.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
