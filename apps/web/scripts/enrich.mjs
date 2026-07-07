// Entity enrichment — the "no separate backend" path.
//
// Runs server-side (locally or in the nightly GitHub Action), where browser CORS
// rules don't apply. For each record it pulls the document's FULL TEXT from the
// government source (Federal Register raw text; GovInfo HTML rendition), scans it
// for a dictionary of notable people/orgs/programs, and writes the matches into
// each record's `entities`. The static site then does connection search over that
// baked data — no always-on server, no database.
//
//   node scripts/enrich.mjs
//
// It reads and rewrites lib/generated-documents.json in place.

import { readFile, writeFile } from "node:fs/promises";

const FILE = new URL("../lib/generated-documents.json", import.meta.url);

// Canonical name -> alias patterns (matched case-insensitively, on word boundaries).
// Prefer full names where a bare surname would be ambiguous or noisy.
const ENTITIES = {
  "Jeffrey Epstein": ["jeffrey epstein", "epstein"],
  "Ghislaine Maxwell": ["ghislaine maxwell", "maxwell"],
  "Virginia Giuffre": ["virginia giuffre", "giuffre"],
  "Prince Andrew": ["prince andrew"],
  "Donald Trump": ["donald trump", "donald j. trump", "president trump"],
  "Bill Clinton": ["bill clinton", "william j. clinton", "william jefferson clinton"],
  "Hillary Clinton": ["hillary clinton", "hillary rodham clinton"],
  "Lee Harvey Oswald": ["lee harvey oswald", "oswald"],
  "John F. Kennedy": ["john f. kennedy", "john fitzgerald kennedy", "president kennedy"],
  "Robert F. Kennedy": ["robert f. kennedy", "robert kennedy"],
  "Martin Luther King Jr.": ["martin luther king", "dr. king"],
  "J. Edgar Hoover": ["j. edgar hoover", "edgar hoover"],
  "Richard Nixon": ["richard nixon", "president nixon"],
  "Sidney Gottlieb": ["sidney gottlieb", "gottlieb"],
  "Fidel Castro": ["fidel castro"],
  "Osama bin Laden": ["osama bin laden", "usama bin laden", "bin laden"],
  "Saddam Hussein": ["saddam hussein"],
  "Mohammad Mosaddegh": ["mosaddegh", "mossadegh"],
  "Central Intelligence Agency": ["central intelligence agency", "cia"],
  "Federal Bureau of Investigation": ["federal bureau of investigation", "fbi"],
  "National Security Agency": ["national security agency"],
  "Department of Defense": ["department of defense", "pentagon"],
  "Department of Justice": ["department of justice"],
  "MKUltra": ["mkultra", "mk-ultra", "mk ultra"],
  "COINTELPRO": ["cointelpro"],
  "Operation Mockingbird": ["operation mockingbird"],
  "Bay of Pigs": ["bay of pigs"],
  "Watergate": ["watergate"],
  "September 11 attacks": ["september 11", "9/11", "9-11 attacks"],
  "Warren Commission": ["warren commission"],
  "Church Committee": ["church committee"],
  "Roswell": ["roswell"],
  "Mexico City": ["mexico city"],
  "Guantanamo": ["guantanamo", "guantánamo"],
};

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MATCHERS = Object.entries(ENTITIES).map(([canonical, aliases]) => ({
  canonical,
  re: new RegExp(`\\b(?:${aliases.map(esc).join("|")})\\b`, "i"),
}));

function extractEntities(text) {
  const found = [];
  for (const m of MATCHERS) if (m.re.test(text)) found.push(m.canonical);
  return found;
}

const stripHtml = (s) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");

async function fetchText(url, timeoutMs = 15000) {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "JustTheFiles-enrich/0.1 (research tool)" },
    });
    if (!r.ok) return "";
    return await r.text();
  } catch {
    return "";
  }
}

// Pull full text from the government source (server-side; no CORS limit here).
async function fullText(doc) {
  if (doc.id.startsWith("fr-")) {
    const num = doc.id.slice(3);
    const meta = await fetchText(
      `https://www.federalregister.gov/api/v1/documents/${num}.json?fields[]=raw_text_url`,
    );
    try {
      const url = JSON.parse(meta)?.raw_text_url;
      if (url) return await fetchText(url);
    } catch {
      /* ignore */
    }
    return "";
  }
  if (doc.id.startsWith("gov-")) {
    const pkg = doc.id.slice(4);
    const html = await fetchText(
      `https://www.govinfo.gov/content/pkg/${pkg}/html/${pkg}.htm`,
    );
    // GovInfo serves its 404 page with HTTP 200 — detect and treat as no text.
    if (!html || /<title>\s*Page Not Found/i.test(html) || /Page Not Found \| GovInfo/i.test(html)) {
      return "";
    }
    return stripHtml(html);
  }
  return "";
}

// ── Extractive descriptions (the document's own words — never generated) ─────
const clampWord = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…");

// GPO boilerplate that opens many renditions — skip past it to the substance.
const BOILERPLATE =
  /^(?:\[?\s*)?(?:U\.?S\.? GOVERNMENT (?:PUBLISHING|PRINTING) OFFICE|GPO|FR Doc\.|Federal Register\s*\/|Vol\. \d+|No\. \d+|\[\d+|Pages? \d+|DEPOSITED BY|For sale by|VerDate|Jkt \d+|PO 0+|Frm 0+|Fmt \d+|Sfmt \d+)/i;

/**
 * Pull the first substantive sentences out of the raw text: skip headers/boilerplate,
 * keep sentences of sane length, join the first few. Returns "" if nothing decent.
 */
function extractDescription(fullTextStr) {
  const cleaned = fullTextStr.replace(/\s+/g, " ").trim();
  if (cleaned.length < 200) return "";
  const sentences = cleaned
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length >= 50 &&
        s.length <= 500 &&
        !BOILERPLATE.test(s) &&
        // Prose only: no JSON/markup junk, no site chrome, no dot leaders,
        // not mostly-uppercase headings.
        !/[{}\\<>]|Page Not Found|Skip to main content/i.test(s) &&
        s.replace(/[^A-Z]/g, "").length / Math.max(1, s.replace(/[^A-Za-z]/g, "").length) < 0.6 &&
        !/\.{4,}/.test(s),
    );
  return clampWord(sentences.slice(0, 3).join(" "), 460);
}

/** First ~1,500 chars of substantive text — becomes the on-site excerpt. */
function extractExcerpt(fullTextStr) {
  const cleaned = fullTextStr.replace(/\s+/g, " ").trim();
  if (cleaned.length < 300) return "";
  // Start at the first substantive sentence rather than the masthead.
  const desc = extractDescription(fullTextStr);
  const at = desc ? cleaned.indexOf(desc.slice(0, 40)) : -1;
  const body = at > 0 ? cleaned.slice(at) : cleaned;
  return clampWord(body, 1500);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

async function main() {
  const docs = JSON.parse(await readFile(FILE, "utf8"));
  console.log(`Enriching ${docs.length} records with full-text entity extraction…`);

  let withText = 0;
  let withDesc = 0;
  let done = 0;
  await mapLimit(docs, 6, async (doc) => {
    const ft = await fullText(doc);
    if (ft) withText++;
    const blob = `${doc.title} ${doc.summary} ${(doc.tags || []).join(" ")} ${ft}`;
    doc.entities = extractEntities(blob);

    // Real information on each record, not just a link: replace templated
    // summaries with the document's own opening text, and put a genuine excerpt
    // on the document page. Extractive only — nothing is generated. Idempotent:
    // when no usable text exists, REBUILD the clean template rather than trusting
    // whatever a previous run may have written.
    const desc = ft ? extractDescription(ft) : "";
    const excerpt = ft ? extractExcerpt(ft) : "";
    const isIngested = doc.id.startsWith("gov-") || doc.id.startsWith("fr-") || doc.id.startsWith("nara-");

    if (desc.length > 120) {
      doc.summary = desc;
      withDesc++;
    } else if (isIngested) {
      const coll = (doc.tags || [])[0];
      doc.summary = clampWord(
        `${doc.title}. A record published by ${doc.sourceName}${coll ? ` (${coll})` : ""}.`,
        360,
      );
    }

    if (excerpt.length > 300) {
      doc.pages = [{ pageNumber: 1, text: excerpt }];
      doc.sourceNote =
        "Beginning of the official document text, as published by the source; read the full document at the source.";
    } else if (isIngested) {
      doc.pages = [{ pageNumber: 1, text: doc.summary }];
      doc.sourceNote =
        "This is the official catalog record; read the full document at the source.";
    }
    if (++done % 40 === 0) console.log(`  …${done}/${docs.length}`);
  });

  await writeFile(FILE, JSON.stringify(docs, null, 2) + "\n");

  // Report real signal.
  const counts = {};
  for (const d of docs) for (const e of d.entities) counts[e] = (counts[e] || 0) + 1;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const cooccur = (a, b) => docs.filter((d) => d.entities.includes(a) && d.entities.includes(b)).length;
  console.log(`\nFull text pulled for ${withText}/${docs.length} records.`);
  console.log(`Real extracted descriptions for ${withDesc}/${docs.length} records.`);
  console.log("Top entities:", top.map(([e, n]) => `${e} (${n})`).join(", "));
  console.log("\nSample connections (docs mentioning BOTH):");
  for (const [a, b] of [
    ["Jeffrey Epstein", "Ghislaine Maxwell"],
    ["Jeffrey Epstein", "Donald Trump"],
    ["Central Intelligence Agency", "Federal Bureau of Investigation"],
    ["Lee Harvey Oswald", "Central Intelligence Agency"],
  ]) {
    console.log(`  ${a} + ${b}: ${cooccur(a, b)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
