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
//   • war.gov/UFO (PURSUE) — the Department of War's UAP disclosure portal;
//     tranches of declassified documents/videos/audio/images. Keyless page-watch.
//   • NARA Catalog + the NARA UAP Records Collection (Record Group 615) — the
//     National Archives, only if NARA_API_KEY is set.
//
// Every source attempt is recorded in lib/generated-ingest-report.json (same ids
// as lib/sources.ts) so the /sources page can show, per channel, whether the last
// run worked — a silently broken source should never look like a quiet news day.

import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../lib/generated-documents.json", import.meta.url);
const REPORT = new URL("../lib/generated-ingest-report.json", import.meta.url);
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
      headers: { "User-Agent": "JustTheFiles-ingest/0.5 (research tool)", ...(opts.headers || {}) },
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
// scheduled job keeps the "latest" topic fresh automatically.
const LATEST_COLLECTIONS = [
  ["CRPT", "committee report"],
  ["CHRG", "congressional hearing"],
  ["PLAW", "public law"],
  ["CDOC", "congressional document"],
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

// ── NARA UAP Records Collection, Record Group 615 (only if NARA_API_KEY) ──────
// The 2024 NDAA requires every federal agency to transfer its UAP records to the
// National Archives; NARA releases them on a rolling basis as RG 615 in the
// Catalog. Queried directly by record group so new transfers are picked up even
// when their titles don't match the topic keywords.
async function ingestNaraUap(limit = 60) {
  const url =
    `https://catalog.archives.gov/api/v2/records/search?q=${encodeURIComponent("unidentified anomalous phenomena")}` +
    `&recordGroupNumber=615&limit=${limit}`;
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
      collection: "uap",
      topics: ["uap"],
      docDate: isoDate(asText(rec.productionDates || rec.coverageStartDate)),
      releaseDate: isoDate(asText(rec.productionDates)) ?? "1970-01-01",
      originalUrl: `https://catalog.archives.gov/id/${naId}`,
      sourceName: "National Archives (UAP Records Collection, RG 615)",
      language: "English",
      summary: clamp(stripHtml(asText(rec.scopeAndContentNote)) || `${title}. A record in the National Archives' Unidentified Anomalous Phenomena Records Collection (Record Group 615), transferred by a federal agency under the 2024 NDAA.`, 360),
      pages: [{ pageNumber: 1, text: clamp(stripHtml(asText(rec.scopeAndContentNote)) || `${title}. Part of the UAP Records Collection (Record Group 615) at the U.S. National Archives.`, 1600) }],
      entities: [],
      tags: ["UAP", "RG 615"],
      sourceNote: "This is the official record from the National Archives' UAP Records Collection; read the full document at the source.",
    };
  }).filter(Boolean);
}

// ── war.gov/UFO — PURSUE (Presidential Unsealing and Reporting System for UAP
// Encounters). The Department of War's UAP disclosure portal, launched
// 2026-05-08; declassified files are posted in tranches ("release_1", …) every
// few weeks, hosted under war.gov/medialink/ufo/. There is no API, so we watch
// the page itself: fetch the listing and extract every hosted file link (both
// plain hrefs and JSON-escaped paths inside script payloads, so a client-side
// re-render of the listing doesn't blind us).
const PURSUE_URLS = ["https://www.war.gov/ufo/", "https://www.war.gov/UFO/"];
// Release dates of known tranches (from the DoW press releases). Files in a
// tranche we don't know yet get the date they were first seen, preserved across
// runs so re-ingesting never rewrites history.
const PURSUE_TRANCHE_DATES = {
  1: "2026-05-08",
  2: "2026-05-22",
  3: "2026-06-12",
  4: "2026-07-10",
};
const PURSUE_KINDS = [
  [/\.pdf$/i, "document"],
  [/\.(mp4|mov|avi|wmv|webm|m4v|mpe?g)$/i, "video"],
  [/\.(mp3|wav|m4a|aac|ogg|flac)$/i, "audio recording"],
  [/\.(jpe?g|png|gif|tiff?|bmp|webp)$/i, "image"],
];
const PURSUE_ACRONYMS = /^(?:ufos?|uaps?|us|usa|usaf|usn|cia|fbi|nsa|dod|dow|doe|nasa|odni|aaro|jal|faa)$/i;
const TITLE_SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with", "from", "into", "over"]);

function parsePursueHtml(html) {
  // Normalize JSON-escaped slashes, then collect every /medialink/ufo/ file path.
  // Apostrophes are allowed mid-path (real filenames contain them, e.g.
  // "ufo's_and_defense_…"); quote delimiters are stripped off the tail instead.
  const scan = html.replace(/\\\//g, "/");
  const found = new Set();
  for (const m of scan.matchAll(/\/medialink\/ufo\/[^"\s<>`]+/gi)) {
    const path = decodeURIComponent(m[0]).replace(/[?#].*$/, "").replace(/['.,;:)\]]+$/, "");
    if (/\.[a-z0-9]{2,5}$/i.test(path)) found.add(path);
  }
  return [...found].sort();
}

function pursueTitle(path) {
  const file = path.split("/").pop() || "";
  const base = file
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^[\d_\-. ]+/, "") // leading catalog numbers, e.g. "255_413270_"
    .replace(/[_\-]+/g, " ")
    .trim();
  if (!base) return file;
  return base
    .split(/\s+/)
    .map((word, i) => {
      const bare = word.replace(/[^a-z0-9]/gi, "");
      // Uppercase the acronym but not a possessive tail: "ufo's" → "UFO's".
      if (PURSUE_ACRONYMS.test(bare)) return word.replace(/^[a-z0-9]+/i, (m) => m.toUpperCase());
      if (i > 0 && TITLE_SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function pursueRecord(path, previousById, today) {
  const id = `pursue-${path
    .replace(/^\/medialink\/ufo\//i, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
  const title = clamp(pursueTitle(path), 180);
  const tranche = Number(/release[_\-]?(\d+)/i.exec(path)?.[1]) || null;
  const kind = PURSUE_KINDS.find(([re]) => re.test(path))?.[1] ?? "file";
  const releaseDate =
    (tranche && PURSUE_TRANCHE_DATES[tranche]) || previousById.get(id)?.releaseDate || today;
  const trancheLabel = tranche ? ` (release ${tranche})` : "";
  return {
    id,
    title,
    agency: inferAgency(title) === "OTHER" ? "DOD" : inferAgency(title),
    collection: "uap",
    topics: ["uap", "latest"],
    docDate: previousById.get(id)?.docDate ?? null,
    releaseDate,
    classificationEra: "Declassified (PURSUE release)",
    originalUrl: `https://www.war.gov${path}`,
    sourceName: "U.S. Department of War (war.gov/UFO)",
    language: "English",
    summary: clamp(`${title}. A declassified ${kind} released through PURSUE — the Presidential Unsealing and Reporting System for UAP Encounters — the Department of War's UAP records portal${trancheLabel}.`, 360),
    pages: [{ pageNumber: 1, text: clamp(`${title}. A declassified ${kind} published on war.gov/UFO through PURSUE, the multiagency effort to find, review, declassify, and publicly release UAP-related federal records${trancheLabel}. Open the original file at the source.`, 1600) }],
    entities: [],
    tags: ["UAP", "PURSUE", kind, tranche ? `release ${tranche}` : null].filter(Boolean),
    sourceNote: "Released through the Department of War's PURSUE portal (war.gov/UFO); open the original file at the source.",
  };
}

async function ingestPursue(previousDocs) {
  const prevPursue = previousDocs.filter((d) => d?.id?.startsWith("pursue-"));
  const previousById = new Map(prevPursue.map((d) => [d.id, d]));
  let html = "";
  let lastErr = "unreachable";
  for (const url of PURSUE_URLS) {
    try {
      const res = await fetchWithTimeout(url, { headers: { Accept: "text/html" } }, 30000);
      if (res.ok) {
        html = await res.text();
        if (html) break;
      }
      lastErr = `HTTP ${res.status}`;
    } catch (err) {
      lastErr = err.message;
    }
  }
  const paths = html ? parsePursueHtml(html) : [];
  if (paths.length === 0) {
    // Portal unreachable, moved, or changed shape. Never drop what we already
    // captured — carry the previous records forward and flag the failure so it
    // shows up on /sources instead of silently looking like a quiet week.
    if (prevPursue.length > 0) {
      return { docs: prevPursue, carried: true, error: html ? "no file links found" : lastErr };
    }
    throw new Error(html ? "no file links found in page" : lastErr);
  }
  const today = new Date().toISOString().slice(0, 10);
  return { docs: paths.map((p) => pursueRecord(p, previousById, today)), carried: false };
}

// ── orchestrate ──────────────────────────────────────────────────────────────
async function main() {
  console.log("Ingesting records from official U.S. government sources only…");
  console.log(`  GovInfo key: ${DATA_GOV_KEY === "DEMO_KEY" ? "DEMO_KEY (low limits — set DATA_GOV_API_KEY)" : "custom"}`);
  console.log(`  NARA: ${NARA_KEY ? "enabled" : "skipped (set NARA_API_KEY to enable)"}\n`);

  // Previous snapshot: the safety floor below, plus carry-forward for page-watch
  // sources whose listing may be temporarily unreachable.
  let previousDocs = [];
  try {
    previousDocs = JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    /* no previous snapshot */
  }

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

  // Per-source outcomes, written to lib/generated-ingest-report.json with the
  // same ids as lib/sources.ts so the /sources page can render run health.
  const report = [];

  const govinfoTally = { added: 0, failed: [] };
  const naraTally = { added: 0, failed: [] };
  for (const topic of TOPICS) {
    const parts = [];
    const sources = [["GovInfo", ingestGovInfo, govinfoTally]];
    if (NARA_KEY) sources.push(["NARA", ingestNara, naraTally]);
    for (const [name, fn, tally] of sources) {
      try {
        const added = addAll(await fn(topic), topic.slug);
        tally.added += added;
        parts.push(`${name} +${added}`);
      } catch (err) {
        tally.failed.push(`${topic.slug} (${err.message})`);
        parts.push(`${name} FAIL(${err.message})`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    console.log(`  ${topic.slug.padEnd(16)} ${parts.join("  ")}`);
  }
  report.push({
    id: "govinfo-search",
    ok: govinfoTally.failed.length === 0,
    added: govinfoTally.added,
    detail: govinfoTally.failed.length
      ? `failed topics: ${govinfoTally.failed.join(", ")}`
      : `${TOPICS.length} topic queries`,
  });
  report.push(
    NARA_KEY
      ? {
          id: "nara-catalog",
          ok: naraTally.failed.length === 0,
          added: naraTally.added,
          detail: naraTally.failed.length
            ? `failed topics: ${naraTally.failed.join(", ")}`
            : `${TOPICS.length} topic queries`,
        }
      : { id: "nara-catalog", ok: true, skipped: true, added: 0, detail: "set NARA_API_KEY to enable" },
  );

  try {
    const added = addAll(await ingestLatest(), "latest");
    console.log(`  ${"latest".padEnd(16)} GovInfo-new +${added}`);
    report.push({ id: "govinfo-latest", ok: true, added, detail: `${LATEST_COLLECTIONS.length} collection feeds` });
  } catch (err) {
    console.log(`  latest           GovInfo-new FAIL(${err.message})`);
    report.push({ id: "govinfo-latest", ok: false, added: 0, detail: err.message });
  }

  try {
    const added = addAll(await ingestFederalRegister(), "executive-orders");
    console.log(`  ${"executive-orders".padEnd(16)} FedReg +${added}`);
    report.push({ id: "federal-register", ok: true, added });
  } catch (err) {
    console.log(`  executive-orders FedReg FAIL(${err.message})`);
    report.push({ id: "federal-register", ok: false, added: 0, detail: err.message });
  }

  // war.gov/UFO (PURSUE) — the live wire for UAP drops.
  try {
    const { docs, carried, error } = await ingestPursue(previousDocs);
    const added = addAll(docs, "uap");
    if (carried) {
      console.log(`  ${"uap (PURSUE)".padEnd(16)} war.gov/UFO unreachable (${error}) — carried ${added} prior records forward`);
      report.push({ id: "pursue", ok: false, added, detail: `${error}; carried ${added} previously captured records forward` });
    } else {
      console.log(`  ${"uap (PURSUE)".padEnd(16)} war.gov/UFO +${added}`);
      report.push({ id: "pursue", ok: true, added });
    }
  } catch (err) {
    console.log(`  uap (PURSUE)     war.gov/UFO FAIL(${err.message})`);
    report.push({ id: "pursue", ok: false, added: 0, detail: err.message });
  }

  // NARA UAP Records Collection (RG 615) — rolling agency transfers under the 2024 NDAA.
  if (NARA_KEY) {
    try {
      const added = addAll(await ingestNaraUap(), "uap");
      console.log(`  ${"uap (RG 615)".padEnd(16)} NARA UAP Collection +${added}`);
      report.push({ id: "nara-uap-rg615", ok: true, added });
    } catch (err) {
      console.log(`  uap (RG 615)     NARA UAP Collection FAIL(${err.message})`);
      report.push({ id: "nara-uap-rg615", ok: false, added: 0, detail: err.message });
    }
  } else {
    report.push({ id: "nara-uap-rg615", ok: true, skipped: true, added: 0, detail: "set NARA_API_KEY to enable" });
  }

  const out = [...byId.values()];

  // Safety floor: on a bad day (rate limits, source outages) a run can come back
  // nearly empty. Never let that gut the published corpus — keep the previous
  // snapshot and fail loudly instead.
  const previousCount = previousDocs.length;
  if (previousCount > 0 && out.length < previousCount * 0.6) {
    console.error(
      `\nABORT: new snapshot has ${out.length} records vs ${previousCount} previously (<60%). ` +
        "Keeping the existing corpus; likely rate-limiting. Re-run later or set DATA_GOV_API_KEY.",
    );
    process.exit(1);
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  await writeFile(
    REPORT,
    JSON.stringify({ generatedAt: new Date().toISOString(), sources: report }, null, 2) + "\n",
  );
  const failed = report.filter((s) => !s.ok);
  console.log(`\nWrote ${out.length} records to lib/generated-documents.json (was ${previousCount})`);
  console.log(
    failed.length
      ? `Source health: ${failed.length} source(s) unhealthy — ${failed.map((s) => s.id).join(", ")} (see lib/generated-ingest-report.json)`
      : "Source health: all sources OK.",
  );
  if (out.length === 0) console.warn("No records ingested — sources may be unreachable from this environment.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
