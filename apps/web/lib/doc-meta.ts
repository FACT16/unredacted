// Display-layer metadata derived from a document's identifiers — the plain-English
// "what this is" label and title cleanup. Pure functions over data we already hold.

import type { GovDocument } from "./types";

// GovInfo collection codes -> plain English.
const GOVINFO_KINDS: Record<string, string> = {
  CHRG: "Congressional hearing",
  CRPT: "Congressional committee report",
  CDOC: "Congressional document",
  CPRT: "Committee print",
  PLAW: "Public law",
  BILLS: "Bill",
  STATUTE: "Statute",
  GOVPUB: "Government publication",
  CPD: "Presidential document",
  FR: "Federal Register document",
  ERIC: "Education report",
  GAOREPORTS: "GAO report",
};

/** Plain-English label for what kind of record this is. */
export function docTypeLabel(doc: GovDocument): string {
  if (doc.id.startsWith("fr-")) {
    const t = (doc.tags?.[0] ?? "presidential document").trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  if (doc.id.startsWith("gov-")) {
    const code = (doc.tags?.[0] ?? "").toUpperCase();
    if (GOVINFO_KINDS[code]) return GOVINFO_KINDS[code];
    // "latest" feed docs carry the kind as a lowercase phrase instead of a code.
    const kind = (doc.tags?.[0] ?? "").trim();
    if (kind && !/^[A-Z0-9]+$/.test(doc.tags?.[0] ?? "")) {
      return kind.charAt(0).toUpperCase() + kind.slice(1);
    }
    return "Government publication";
  }
  if (doc.id.startsWith("nara-")) return "National Archives record";
  // Curated records: lean on the classification/source we hand-set.
  if (doc.agency === "COURT") return "Court record";
  if (doc.agency === "SENATE") return "Congressional record";
  if (doc.agency === "COMMISSION") return "Commission report";
  return "Government record";
}

const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or",
  "the", "to", "with", "from", "into", "over", "under",
]);

const KEEP_UPPER =
  /^(?:U\.?S\.?A?\.?|CIA|FBI|NSA|DOD|DOJ|ODNI|AARO|NARA|GAO|GPO|UAP|UFO|USAF|FY|FISA|NASA|COINTELPRO|MKULTRA|JFK|RFK|MLK|HR|S|II|III|IV|IX|X)$/i;

/**
 * Government titles often arrive ALL-CAPS ("INTELLIGENCE AUTHORIZATION ACT…").
 * If a title is shouting, convert to sentence-friendly title case while keeping
 * known acronyms. Titles with normal casing pass through untouched.
 */
export function displayTitle(raw: string): string {
  const letters = raw.replace(/[^A-Za-z]/g, "");
  if (!letters || letters.replace(/[^A-Z]/g, "").length / letters.length < 0.85) return raw;
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      const bare = word.replace(/[^a-z0-9.]/gi, "");
      if (KEEP_UPPER.test(bare)) return word.toUpperCase();
      if (i > 0 && SMALL_WORDS.has(bare)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
