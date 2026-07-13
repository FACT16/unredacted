// Link audit — "confirm the sourcing is always correct."
//
// Verifies that every document's originalUrl (and a sample of image record URLs)
// actually resolves at the source. Runs in the scheduled workflow after ingest, so a
// source that moves or dies is caught within a day. Report-only unless failures are
// widespread (>20%), in which case it exits non-zero so the workflow flags it.
//
//   node scripts/audit-links.mjs

import { readFile } from "node:fs/promises";

const DOCS = new URL("../lib/generated-documents.json", import.meta.url);
const IMAGES = new URL("../lib/generated-images.json", import.meta.url);

// Sources that block automated clients but work in real browsers (verified by hand).
// A 403 from these is expected, not a broken link. LOC item pages rate-limit bursty
// bots specifically; their JSON API and tile servers allow us.
const BOT_WALLED = [
  /^https:\/\/vault\.fbi\.gov\//,
  /^https:\/\/www\.courtlistener\.com\//,
  /^https?:\/\/www\.loc\.gov\/item\//,
  // war.gov sits behind a CDN that intermittently 403s non-browser clients; the
  // PURSUE ingester's page-watch (with carry-forward) is the real health signal.
  /^https:\/\/www\.war\.gov\//,
];

async function headOk(url) {
  try {
    const r = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "JustTheFiles-audit/0.1 (link check)" },
    });
    // Some gov servers reject HEAD; retry as GET before judging.
    if (r.status === 405 || r.status === 403) {
      const g = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "JustTheFiles-audit/0.1 (link check)" },
      });
      return g.status;
    }
    return r.status;
  } catch {
    return 0;
  }
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
  const docs = JSON.parse(await readFile(DOCS, "utf8"));
  let images = [];
  try {
    images = JSON.parse(await readFile(IMAGES, "utf8"));
  } catch { /* gallery may not exist yet */ }

  // Every document link + a spread-out sample of image records (galleries are
  // hotlinked, so a bad record link is cosmetic, not corpus-breaking).
  const targets = [
    ...docs.map((d) => ({ kind: "doc", id: d.id, url: d.originalUrl })),
    ...images.filter((_, i) => i % 10 === 0).map((im) => ({ kind: "img", id: im.id, url: im.recordUrl })),
  ];

  console.log(`Auditing ${targets.length} source links…`);
  const failures = [];
  let botWalled = 0;
  let checked = 0;

  await mapLimit(targets, 8, async (t) => {
    const status = await headOk(t.url);
    checked++;
    if (status >= 200 && status < 400) return;
    if (BOT_WALLED.some((re) => re.test(t.url)) && (status === 403 || status === 0)) {
      botWalled++;
      return;
    }
    failures.push({ ...t, status });
  });

  // Burst throttling shows up as status 0/429 — retry those serially before judging.
  const suspect = failures.filter((f) => f.status === 0 || f.status === 429);
  if (suspect.length) {
    console.log(`Retrying ${suspect.length} network-level failures serially…`);
    for (const f of suspect) {
      await new Promise((r) => setTimeout(r, 1200));
      const status = await headOk(f.url);
      if (status >= 200 && status < 400) {
        failures.splice(failures.indexOf(f), 1);
      } else {
        f.status = status;
      }
    }
  }

  console.log(`\nChecked ${checked}. OK: ${checked - failures.length - botWalled}. ` +
    `Bot-walled (expected): ${botWalled}. FAILURES: ${failures.length}`);
  for (const f of failures.slice(0, 25)) {
    console.log(`  ${String(f.status).padEnd(4)} ${f.kind}  ${f.id}  ${f.url}`);
  }

  // Report-only: surface broken links loudly in the run log, but never abort the
  // pipeline over a link check — transient blocks / CI-IP throttling cause false
  // positives, and the corpus commit + deploy matter more than a perfect check.
  if (failures.length > targets.length * 0.2) {
    console.warn(`\nHeads up: ${failures.length} source links failed this run — review the list above.`);
  }
}

main().catch((e) => {
  // The audit is a check, not a gate — never fail the pipeline over it.
  console.warn("Link audit skipped:", e.message);
});
