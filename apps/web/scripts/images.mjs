// Image ingestion — pull digitized imagery from the Library of Congress (official,
// keyless, documented JSON API) per topic, and write lib/generated-images.json.
// Images are hotlinked from LOC's tile servers (public endpoints; <img> tags don't
// require CORS) — we store metadata only. Each entry links back to the LOC item
// record so provenance is one click away.
//
//   node scripts/images.mjs
//
// NARA's catalog would add JFK/Blue Book scans but requires a NARA-issued API key
// (set NARA_API_KEY when available — future upgrade).

import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../lib/generated-images.json", import.meta.url);

// topic slug -> LOC photo queries. Multiple queries per topic; results dedupe by item id.
const TOPIC_QUERIES = {
  uap: ["unidentified flying object", "flying saucer"],
  jfk: ["kennedy assassination", "john f. kennedy president"],
  mkultra: ["central intelligence agency headquarters"],
  "sept-11": ["september 11 terrorist attacks 2001", "world trade center attack 2001"],
  "fbi-files": ["j. edgar hoover", "federal bureau of investigation"],
  watergate: ["watergate hearings", "richard nixon president"],
  "cold-war": ["cuban missile crisis", "berlin wall", "cold war"],
  history: ["church committee", "pentagon papers"],
};

const asText = (v) => (Array.isArray(v) ? v.join(" ") : typeof v === "string" ? v : "");
const clamp = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…");

async function fetchJson(url, timeoutMs = 20000) {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "JustTheFiles-images/0.1 (research tool)" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function pickImageUrls(item) {
  const urls = Array.isArray(item.image_url) ? item.image_url : [item.image_url].filter(Boolean);
  if (urls.length === 0) return null;
  // LOC size suffixes: `t.gif` tiny thumb, `_150px.jpg` micro, `r.jpg` ~640px
  // reference, `v.jpg` large. The array is NOT reliably ordered — pick by suffix.
  const by = (re) => urls.find((u) => re.test(u));
  const r = by(/r\.jpg/i);
  const v = by(/v\.jpg/i);
  const thumb = r ?? v ?? urls[urls.length - 1];
  const full = v ?? r ?? urls[urls.length - 1];
  return { thumb, full };
}

async function pullTopic(slug, queries, cap = 24) {
  const seen = new Map();
  for (const q of queries) {
    const url = `https://www.loc.gov/photos/?q=${encodeURIComponent(q)}&fo=json&c=40`;
    let json;
    try {
      json = await fetchJson(url);
    } catch (err) {
      console.warn(`  ${slug}: query "${q}" failed (${err.message})`);
      continue;
    }
    for (const item of json?.results ?? []) {
      const id = asText(item.id);
      if (!id || seen.has(id)) continue;
      // Only LOC item records with real digitized images.
      if (!/loc\.gov\/item\//.test(id)) continue;
      const imgs = pickImageUrls(item);
      if (!imgs) continue;
      const title = clamp(asText(item.title).trim() || "Untitled photograph", 160);
      const description = clamp(asText(item.description).trim(), 300);
      seen.set(id, {
        id: id.replace(/^https?:\/\/www\.loc\.gov\/item\//, "loc-").replace(/\/+$/, ""),
        title,
        description: description || undefined,
        date: asText(item.date).trim() || undefined,
        thumbUrl: imgs.thumb,
        imageUrl: imgs.full,
        recordUrl: id,
        source: "Library of Congress",
        topics: [slug],
      });
      if (seen.size >= cap) break;
    }
    await new Promise((r) => setTimeout(r, 700));
    if (seen.size >= cap) break;
  }
  return [...seen.values()];
}

async function main() {
  console.log("Pulling official imagery (Library of Congress)…");
  const byId = new Map();
  for (const [slug, queries] of Object.entries(TOPIC_QUERIES)) {
    const items = await pullTopic(slug, queries);
    let added = 0;
    for (const img of items) {
      if (byId.has(img.id)) {
        const existing = byId.get(img.id);
        if (!existing.topics.includes(slug)) existing.topics.push(slug);
      } else {
        byId.set(img.id, img);
        added++;
      }
    }
    console.log(`  ${slug.padEnd(12)} +${added}`);
  }

  const out = [...byId.values()];

  // Same safety floor idea as the corpus: don't gut the gallery on a bad day.
  let prev = 0;
  try {
    prev = JSON.parse(await readFile(OUT, "utf8")).length;
  } catch { /* first run */ }
  if (prev > 0 && out.length < prev * 0.5) {
    console.error(`ABORT: ${out.length} images vs ${prev} previously (<50%). Keeping existing set.`);
    process.exit(1);
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${out.length} images to lib/generated-images.json (was ${prev})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
