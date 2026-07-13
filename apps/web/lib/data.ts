// Phase 1 fixtures — the in-memory corpus the UI runs on before the backend exists.
//
// INTEGRITY NOTE: Document metadata (title, agency, dates, source URL, classification)
// reflects real, publicly released U.S. government records. Page *body text* is
// illustrative — concise, neutral, representative excerpts — NOT verbatim OCR. Every
// document carries `textIsIllustrative: true` and the UI labels it as sample text so
// the demo never puts words in a source's mouth. Phase 2 replaces these excerpts with
// real OCR'd text from the ingestion pipeline; the shapes do not change.

import type {
  Agency,
  AgencyCode,
  Collection,
  Entity,
  GovDocument,
  TimelineEvent,
} from "./types";
import generatedRaw from "./generated-documents.json";

export const AGENCIES: Record<AgencyCode, Agency> = {
  CIA: { code: "CIA", name: "Central Intelligence Agency", short: "CIA" },
  FBI: { code: "FBI", name: "Federal Bureau of Investigation", short: "FBI" },
  NSA: { code: "NSA", name: "National Security Agency", short: "NSA" },
  DOD: { code: "DOD", name: "U.S. Department of Defense", short: "DoD" },
  DOJ: { code: "DOJ", name: "U.S. Department of Justice", short: "DOJ" },
  ODNI: { code: "ODNI", name: "Office of the Director of National Intelligence", short: "ODNI" },
  AARO: { code: "AARO", name: "All-domain Anomaly Resolution Office", short: "AARO" },
  NARA: { code: "NARA", name: "National Archives and Records Administration", short: "NARA" },
  STATE: { code: "STATE", name: "U.S. Department of State", short: "State Dept." },
  USAF: { code: "USAF", name: "United States Air Force", short: "USAF" },
  SENATE: { code: "SENATE", name: "United States Senate", short: "U.S. Senate" },
  COMMISSION: { code: "COMMISSION", name: "Independent Federal Commission", short: "Commission" },
  COURT: { code: "COURT", name: "U.S. Federal Courts", short: "U.S. Courts" },
  WH: { code: "WH", name: "The White House", short: "WH" },
  OTHER: { code: "OTHER", name: "U.S. Government", short: "GOV" },
};

const CURATED_DOCUMENTS: GovDocument[] = [
  // ── Epstein ────────────────────────────────────────────────────────────────
  {
    id: "epstein-giuffre-maxwell-unsealed",
    title: "Giuffre v. Maxwell — Unsealed Court Records (Docket 1:15-cv-07433)",
    agency: "COURT",
    collection: "epstein",
    topics: ["epstein"],
    docDate: "2024-01-03",
    releaseDate: "2024-01-03",
    classificationEra: "Court-sealed (unsealed by order)",
    originalUrl: "https://www.courtlistener.com/docket/4355835/giuffre-v-maxwell/",
    sourceName: "CourtListener (Free Law Project)",
    pageCount: 943,
    ocrConfidence: 0.94,
    language: "English",
    summary:
      "Documents unsealed by the U.S. District Court for the Southern District of New York in the civil defamation case Giuffre v. Maxwell, beginning January 2024. The release comprises depositions, motions, and exhibits previously filed under seal.",
    pages: [
      { pageNumber: 1, text: "United States District Court, Southern District of New York. Order regarding the unsealing of materials previously filed under seal in the matter of Giuffre v. Maxwell, Case No. 15-cv-07433. The Court directed the Clerk to docket the enclosed materials in accordance with the prior unsealing opinion." },
      { pageNumber: 12, text: "Transcript of deposition testimony. Counsel and the witness discussed travel records, dates, and the identities of individuals named in earlier filings. Portions of the exhibit list reference flight manifests and property records entered into the record." },
      { pageNumber: 204, text: "Exhibit index. The attached exhibits were admitted subject to the Court's prior rulings on relevance and admissibility. Names of third parties appear where they were already part of the public record." },
    ],
    entities: ["Jeffrey Epstein", "Ghislaine Maxwell", "Virginia Giuffre"],
    tags: ["court records", "depositions", "SDNY", "civil litigation"],
    textIsIllustrative: true,
  },
  {
    id: "epstein-doj-phase-1",
    title: "FBI Records: Jeffrey Epstein (The Vault)",
    agency: "FBI",
    collection: "epstein",
    topics: ["epstein"],
    docDate: "2025-02-27",
    releaseDate: "2025-02-27",
    classificationEra: "Released (FOIA)",
    originalUrl: "https://vault.fbi.gov/jeffrey-epstein",
    sourceName: "FBI Records: The Vault",
    pageCount: 341,
    ocrConfidence: 0.88,
    language: "English",
    summary:
      "The FBI's released records on Jeffrey Epstein, published through the Bureau's FOIA reading room (The Vault). The files include investigative records, portions of which remain redacted to protect victims and uncharged third parties.",
    pages: [
      { pageNumber: 1, text: "Department of Justice. This release consists of records compiled during federal investigations. Certain personally identifiable information has been withheld pursuant to applicable exemptions and to protect the privacy of victims and uncharged third parties." },
      { pageNumber: 8, text: "Evidence log. Items are listed with intake dates and custody references. Several entries are marked as withheld in full. Where an entry was released in part, redaction bars indicate withheld material." },
    ],
    entities: ["Jeffrey Epstein", "Ghislaine Maxwell"],
    tags: ["flight logs", "evidence log", "redactions", "FOIA"],
    textIsIllustrative: true,
  },

  // ── UAP / UFO ────────────────────────────────────────────────────────────────
  {
    id: "uap-odni-prelim-2021",
    title: "Preliminary Assessment: Unidentified Aerial Phenomena",
    agency: "ODNI",
    collection: "uap",
    topics: ["uap"],
    docDate: "2021-06-25",
    releaseDate: "2021-06-25",
    classificationEra: "Unclassified",
    originalUrl:
      "https://www.dni.gov/files/ODNI/documents/assessments/Prelimary-Assessment-UAP-20210625.pdf",
    sourceName: "Office of the Director of National Intelligence",
    pageCount: 9,
    ocrConfidence: 0.99,
    language: "English",
    summary:
      "The Office of the Director of National Intelligence's preliminary assessment of Unidentified Aerial Phenomena, prepared for Congress in June 2021. It reviewed 144 reports from U.S. government sources between 2004 and 2021 and found most remained unexplained for lack of data.",
    pages: [
      { pageNumber: 1, text: "This preliminary report responds to the congressional reporting requirement on Unidentified Aerial Phenomena (UAP). The dataset is largely limited to U.S. Government reporting between 2004 and 2021. The limited amount of high-quality reporting hampers our ability to draw firm conclusions." },
      { pageNumber: 3, text: "Of the 144 reports under review, 18 incidents described unusual movement patterns or flight characteristics. These observations could be the result of sensor errors, spoofing, or observer misperception and require additional rigorous analysis." },
      { pageNumber: 5, text: "UAP clearly pose a safety of flight issue and may pose a challenge to U.S. national security. Safety concerns primarily center on aviators contending with an increasingly cluttered air domain." },
    ],
    entities: ["Office of the Director of National Intelligence"],
    tags: ["UAP", "UFO", "congressional report", "national security"],
    textIsIllustrative: true,
  },
  {
    id: "uap-odni-annual-2022",
    title: "2022 Annual Report on Unidentified Aerial Phenomena",
    agency: "ODNI",
    collection: "uap",
    topics: ["uap"],
    docDate: "2023-01-12",
    releaseDate: "2023-01-12",
    classificationEra: "Unclassified (declassified summary)",
    originalUrl:
      "https://www.dni.gov/files/ODNI/documents/assessments/Unclassified-2022-Annual-Report-UAP.pdf",
    sourceName: "Office of the Director of National Intelligence",
    pageCount: 12,
    ocrConfidence: 0.98,
    language: "English",
    summary:
      "The unclassified 2022 annual report on UAP, produced by ODNI with the All-domain Anomaly Resolution Office. It reported a total of 510 catalogued UAP reports, many of which were attributed to balloons or balloon-like entities, while others remained uncharacterized.",
    pages: [
      { pageNumber: 1, text: "This report provides the intelligence community and Department of Defense assessment of Unidentified Aerial Phenomena. Since the preliminary assessment, the catalogue of UAP reports has grown to 510." },
      { pageNumber: 4, text: "A number of reports remain uncharacterized and unattributed. Of the reports that have been resolved, many exhibit unremarkable characteristics consistent with balloons, unmanned aircraft systems, or clutter." },
    ],
    entities: ["Office of the Director of National Intelligence", "All-domain Anomaly Resolution Office"],
    tags: ["UAP", "annual report", "AARO"],
    textIsIllustrative: true,
  },
  {
    id: "aaro-historical-record-v1",
    title: "Report on the Historical Record of U.S. Government Involvement with UAP, Volume 1",
    agency: "AARO",
    collection: "uap",
    topics: ["uap"],
    docDate: "2024-02-29",
    releaseDate: "2024-03-08",
    classificationEra: "Unclassified",
    originalUrl: "https://www.govinfo.gov/app/details/GOVPUB-PREX28-PURL-gpo223327",
    sourceName: "GovInfo (U.S. GPO)",
    pageCount: 63,
    ocrConfidence: 0.97,
    language: "English",
    summary:
      "The first volume of the All-domain Anomaly Resolution Office's review of U.S. government involvement with UAP from 1945 to 2023. It found no empirical evidence that the U.S. government or private industry had access to extraterrestrial technology.",
    pages: [
      { pageNumber: 1, text: "AARO was directed by Congress to compile a historical record of U.S. Government involvement with Unidentified Anomalous Phenomena. This volume covers the period from 1945 to 31 October 2023." },
      { pageNumber: 17, text: "AARO assesses that claims of hidden UAP reverse-engineering programs are largely the result of circular reporting, misidentification of authentic classified programs, and a small number of individuals who genuinely believed what they had heard." },
    ],
    entities: ["All-domain Anomaly Resolution Office"],
    tags: ["UAP", "historical record", "reverse engineering claims"],
    textIsIllustrative: true,
  },
  {
    id: "uap-pursue-program",
    title: "PURSUE — Presidential Unsealing and Reporting System for UAP Encounters (war.gov/UFO)",
    agency: "DOD",
    collection: "uap",
    topics: ["uap"],
    docDate: "2026-05-08",
    docDateLabel: "rolling releases since May 2026",
    releaseDate: "2026-05-08",
    classificationEra: "Declassified (rolling releases)",
    originalUrl: "https://www.war.gov/ufo/",
    sourceName: "U.S. Department of War (war.gov/UFO)",
    language: "English",
    summary:
      "The Department of War's UAP disclosure portal, launched May 8, 2026 at the President's direction. A multiagency effort — Pentagon, CIA, FBI, NASA, State, and Energy Department — releases declassified UAP documents, videos, audio, and images in tranches every few weeks. Four tranches were published through July 10, 2026, beginning with 162 files.",
    pages: [
      { pageNumber: 1, text: "The Department of War oversees a multiagency effort to expeditiously find, review, identify, declassify and publicly release unresolved Unidentified Anomalous Phenomena-related records and historical documents in the federal government's possession. Records are posted to war.gov/UFO on a rolling basis as they are declassified." },
      { pageNumber: 2, text: "Released materials include field reports, internal memoranda, technical analyses, videos, audio recordings, and images tied to unresolved cases, drawn from the Pentagon, the CIA, the FBI, NASA, the State Department, and the Department of Energy." },
    ],
    entities: ["U.S. Department of Defense", "Central Intelligence Agency", "Federal Bureau of Investigation"],
    tags: ["UAP", "PURSUE", "declassification", "rolling release"],
    textIsIllustrative: true,
  },
  {
    id: "uap-nara-rg615",
    title: "Unidentified Anomalous Phenomena Records Collection (Record Group 615)",
    agency: "NARA",
    collection: "uap",
    topics: ["uap"],
    docDate: null,
    docDateLabel: "rolling transfers since 2025",
    releaseDate: "2025-04-24",
    classificationEra: "Released (2024 NDAA, Pub. L. 118-31)",
    originalUrl: "https://www.archives.gov/research/topics/uaps/rg-615",
    sourceName: "National Archives and Records Administration",
    language: "English",
    summary:
      "The National Archives' UAP Records Collection, created under the 2024 National Defense Authorization Act, which requires every federal agency to transfer its UAP records to NARA. The first tranche — records from ODNI, the Office of the Secretary of Defense, the FAA, and the Nuclear Regulatory Commission — was released in April 2025, with additions on a rolling basis through the National Archives Catalog.",
    pages: [
      { pageNumber: 1, text: "Record Group 615 consists of records related to unidentified anomalous phenomena that the National Archives has received from federal agencies under sections 1841–1843 of the 2024 National Defense Authorization Act. Records are added to the collection and made available online through the National Archives Catalog on an ongoing, rolling basis as they are transferred." },
    ],
    entities: ["Office of the Director of National Intelligence", "U.S. Department of Defense"],
    tags: ["UAP", "RG 615", "records collection", "NDAA"],
    textIsIllustrative: true,
  },
  {
    id: "roswell-case-closed",
    title: "GAO: Search for Records Concerning the 1947 Crash Near Roswell",
    agency: "OTHER",
    collection: "uap",
    topics: ["uap"],
    docDate: "1995-07-28",
    releaseDate: "1995-07-28",
    classificationEra: "Unclassified",
    originalUrl: "https://www.gao.gov/products/nsiad-95-187",
    sourceName: "U.S. Government Accountability Office (GAO)",
    pageCount: 20,
    language: "English",
    summary:
      "A U.S. Government Accountability Office report, requested by Congress, documenting a search for federal records concerning the 1947 crash near Roswell, New Mexico — which records were located and which were reported to have been destroyed.",
    pages: [
      { pageNumber: 1, text: "This report responds to a congressional request to determine the facts regarding the reported 1947 crash near Roswell, New Mexico, and to locate related U.S. government records." },
      { pageNumber: 12, text: "The search identified records held by the Department of Defense and other agencies. The report notes which records were located and references materials reported to have been destroyed." },
    ],
    entities: ["United States Air Force", "Roswell, New Mexico"],
    tags: ["Roswell", "Project Mogul", "UAP"],
    textIsIllustrative: true,
  },

  // ── JFK ────────────────────────────────────────────────────────────────────
  {
    id: "jfk-2025-release",
    title: "JFK Assassination Records — 2025 Release",
    agency: "NARA",
    collection: "jfk",
    topics: ["jfk"],
    docDate: "2025-03-18",
    releaseDate: "2025-03-18",
    classificationEra: "Formerly classified (released in full)",
    originalUrl: "https://www.archives.gov/research/jfk/release-2025",
    sourceName: "National Archives Catalog",
    pageCount: 80000,
    ocrConfidence: 0.71,
    language: "English",
    summary:
      "The 2025 release of records in the President John F. Kennedy Assassination Records Collection by the National Archives, comprising tens of thousands of pages of previously redacted CIA, FBI, and State Department documents made public in full.",
    pages: [
      { pageNumber: 1, text: "National Archives and Records Administration. The records in this release are part of the President John F. Kennedy Assassination Records Collection, made available pursuant to Executive Order and the JFK Records Act." },
      { pageNumber: 2, text: "Documents in this collection originate from multiple agencies, including the Central Intelligence Agency, the Federal Bureau of Investigation, and the Department of State. Earlier releases withheld portions now made public." },
    ],
    entities: ["Lee Harvey Oswald", "Central Intelligence Agency", "Federal Bureau of Investigation"],
    tags: ["JFK", "assassination records", "2025 release"],
    textIsIllustrative: true,
  },

  // ── MKUltra ───────────────────────────────────────────────────────────────
  {
    id: "mkultra-senate-1977",
    title:
      "Project MKULTRA, the CIA's Program of Research in Behavioral Modification (Joint Senate Hearing)",
    agency: "SENATE",
    collection: "mkultra",
    topics: ["mkultra"],
    docDate: "1977-08-03",
    releaseDate: "1977-08-03",
    classificationEra: "Hearing record (public)",
    originalUrl: "https://www.intelligence.senate.gov/sites/default/files/hearings/95mkultra.pdf",
    sourceName: "U.S. Senate Select Committee on Intelligence",
    pageCount: 171,
    ocrConfidence: 0.86,
    language: "English",
    summary:
      "The published record of the 1977 joint hearing before the Senate Select Committee on Intelligence and the Subcommittee on Health concerning Project MKUltra, the CIA's program of research into behavioral modification, including the use of chemical and biological materials.",
    pages: [
      { pageNumber: 1, text: "Joint hearing before the Select Committee on Intelligence and the Subcommittee on Health and Scientific Research. The subject of the hearing is the CIA's program of research in behavioral modification, known as MKULTRA." },
      { pageNumber: 40, text: "The discovery of seven boxes of financial records, previously believed destroyed, permitted a partial reconstruction of the program's subprojects, many of which were conducted at universities, hospitals, and research foundations." },
    ],
    entities: ["MKUltra", "Sidney Gottlieb", "Central Intelligence Agency"],
    tags: ["MKUltra", "behavioral modification", "Senate hearing"],
    textIsIllustrative: true,
  },
  {
    id: "mkultra-subprojects-foia",
    title: "MKULTRA Subproject Files (FOIA Reading Room Collection)",
    agency: "CIA",
    collection: "mkultra",
    topics: ["mkultra"],
    docDate: "1953-04-13",
    docDateLabel: "1953–1973",
    releaseDate: "2018-01-18",
    classificationEra: "Formerly Secret",
    originalUrl: "https://www.cia.gov/readingroom/collection/mkultra",
    sourceName: "CIA FOIA Electronic Reading Room",
    pageCount: 4358,
    ocrConfidence: 0.58,
    language: "English",
    summary:
      "The Central Intelligence Agency's FOIA reading-room collection of surviving MKUltra subproject financial and administrative records, released after litigation. Many records are heavily redacted and consist of accounting and grant documents rather than research findings.",
    pages: [
      { pageNumber: 1, text: "Memorandum for the record. Subproject funding is approved under the existing authorization. Investigator names and institutional affiliations are withheld in accordance with privacy considerations." },
      { pageNumber: 88, text: "Invoice and accounting summary. Disbursements are recorded against the subproject number. Substantial portions of the underlying research correspondence were not retained." },
    ],
    entities: ["MKUltra", "Sidney Gottlieb", "Central Intelligence Agency"],
    tags: ["MKUltra", "subprojects", "FOIA", "redactions"],
    textIsIllustrative: true,
  },

  // ── September 11 ─────────────────────────────────────────────────────────────
  {
    id: "sept11-commission-report",
    title:
      "Final Report of the National Commission on Terrorist Attacks Upon the United States",
    agency: "COMMISSION",
    collection: "sept-11",
    topics: ["sept-11"],
    docDate: "2004-07-22",
    releaseDate: "2004-07-22",
    classificationEra: "Unclassified",
    originalUrl: "https://www.govinfo.gov/app/details/GPO-911REPORT",
    sourceName: "U.S. Government Publishing Office (govinfo)",
    pageCount: 585,
    ocrConfidence: 0.99,
    language: "English",
    summary:
      "The final report of the bipartisan 9/11 Commission, presenting its findings on the September 11, 2001 terrorist attacks, the failures that preceded them, and recommendations to guard against future attacks.",
    pages: [
      { pageNumber: 1, text: "At 8:46 on the morning of September 11, 2001, the United States became a nation transformed. The Commission's mandate was to provide the fullest possible account of the events surrounding the attacks." },
      { pageNumber: 339, text: "The most important failure was one of imagination. We do not believe leaders understood the gravity of the threat. The terrorist danger had not yet become the overriding national security concern." },
    ],
    entities: ["Federal Bureau of Investigation", "Central Intelligence Agency"],
    tags: ["9/11", "commission report", "counterterrorism"],
    textIsIllustrative: true,
  },

  // ── Historical depth (cross-topic) ───────────────────────────────────────────
  {
    id: "frus-iran-1953",
    title: "Foreign Relations of the United States: Iran, 1951–1954 (Operation TPAJAX)",
    agency: "STATE",
    collection: "history",
    topics: ["history", "mkultra"],
    docDate: "2017-06-15",
    docDateLabel: "covering 1951–1954",
    releaseDate: "2017-06-15",
    classificationEra: "Formerly classified (declassified)",
    originalUrl: "https://history.state.gov/historicaldocuments/frus1951-54Iran",
    sourceName: "U.S. Department of State, Office of the Historian",
    pageCount: 1007,
    ocrConfidence: 0.99,
    language: "English",
    summary:
      "A retrospective volume in the State Department's Foreign Relations of the United States series documenting U.S. and U.K. involvement in the 1953 coup that removed Iranian Prime Minister Mohammad Mosaddegh, including the CIA's role in Operation TPAJAX.",
    pages: [
      { pageNumber: 1, text: "This volume documents the formulation of U.S. policy toward Iran from 1951 to 1954. It includes records relating to covert action, designated TPAJAX, undertaken in coordination with the British government." },
      { pageNumber: 300, text: "Memorandum of discussion. Participants reviewed the political situation in Tehran and the prospects for a change in government. The operation's planning is described in cabled exchanges between the station and headquarters." },
    ],
    entities: ["Central Intelligence Agency", "Mohammad Mosaddegh", "Kermit Roosevelt", "Tehran", "Operation Ajax (TPAJAX)"],
    tags: ["Iran", "1953 coup", "covert action", "FRUS"],
    textIsIllustrative: true,
  },
  {
    id: "cia-family-jewels",
    title: "Family Jewels — CIA Records of Questionable Activities",
    agency: "CIA",
    collection: "history",
    topics: ["history", "mkultra"],
    docDate: "1973-05-16",
    releaseDate: "2007-06-25",
    classificationEra: "Formerly Secret",
    originalUrl: "https://www.cia.gov/readingroom/collection/family-jewels",
    sourceName: "CIA FOIA Electronic Reading Room",
    pageCount: 702,
    ocrConfidence: 0.6,
    language: "English",
    summary:
      "A compilation of internal CIA reports, assembled in 1973 at the director's request, cataloguing agency activities that potentially violated its charter — including surveillance of journalists, mail opening, and assassination planning. Released in 2007.",
    pages: [
      { pageNumber: 1, text: "Memorandum for the Director. Enclosed is a compilation of activities undertaken by the Agency that may be construed as outside the legislative charter. Employees were asked to report such activities." },
      { pageNumber: 25, text: "Items include physical surveillance of certain individuals, the opening of mail, and the testing of materials. Several entries reference coordination with other components and outside parties." },
    ],
    entities: ["Central Intelligence Agency", "Richard Helms", "Operation Mockingbird"],
    tags: ["Family Jewels", "surveillance", "CIA charter"],
    textIsIllustrative: true,
  },
  {
    id: "pentagon-papers",
    title: "Report of the Office of the Secretary of Defense Vietnam Task Force (Pentagon Papers)",
    agency: "DOD",
    collection: "history",
    topics: ["history"],
    docDate: "1969-01-15",
    docDateLabel: "completed 1969",
    releaseDate: "2011-06-13",
    classificationEra: "Formerly Top Secret",
    originalUrl: "https://www.archives.gov/research/pentagon-papers",
    sourceName: "National Archives",
    pageCount: 7000,
    ocrConfidence: 0.74,
    language: "English",
    summary:
      "The Department of Defense's classified history of U.S. political and military involvement in Vietnam from 1945 to 1967, commissioned in 1967 and fully declassified by the National Archives in 2011 on the 40th anniversary of its first publication.",
    pages: [
      { pageNumber: 1, text: "This study was prepared in response to a request to assemble a history of United States involvement in Vietnam. It is based on documentary record and is organized chronologically and by subject." },
      { pageNumber: 1200, text: "The narrative traces decisions taken across successive administrations. Internal assessments at times diverged from public statements regarding the prospects of the conflict." },
    ],
    entities: ["U.S. Department of Defense"],
    tags: ["Vietnam", "Pentagon Papers", "declassified history"],
    textIsIllustrative: true,
  },
  {
    id: "church-committee-report",
    title: "Church Committee — Final Report on Intelligence Activities and the Rights of Americans",
    agency: "SENATE",
    collection: "history",
    topics: ["history", "mkultra"],
    docDate: "1976-04-26",
    releaseDate: "1976-04-26",
    classificationEra: "Public report",
    originalUrl:
      "https://www.senate.gov/about/powers-procedures/investigations/church-committee.htm",
    sourceName: "U.S. Senate",
    pageCount: 989,
    ocrConfidence: 0.9,
    language: "English",
    summary:
      "The final report of the U.S. Senate Select Committee to Study Governmental Operations with Respect to Intelligence Activities (the Church Committee), documenting abuses by intelligence agencies, including COINTELPRO and surveillance of American citizens.",
    pages: [
      { pageNumber: 1, text: "The Committee was established to investigate the intelligence activities of the United States Government. Its inquiry examined whether those activities conformed to law and to the constitutional rights of Americans." },
      { pageNumber: 211, text: "Domestic intelligence programs, including COINTELPRO, employed techniques directed at lawful political activity. The Committee found that these programs exceeded statutory authority and infringed on protected rights." },
    ],
    entities: ["Federal Bureau of Investigation", "Central Intelligence Agency", "COINTELPRO", "Martin Luther King Jr."],
    tags: ["Church Committee", "COINTELPRO", "oversight"],
    textIsIllustrative: true,
  },
  {
    id: "cointelpro-mlk-2025",
    title: "FBI Records: Martin Luther King, Jr. (The Vault)",
    agency: "FBI",
    collection: "history",
    topics: ["history"],
    docDate: "2025-07-21",
    releaseDate: "2025-07-21",
    classificationEra: "Released (FOIA)",
    originalUrl: "https://vault.fbi.gov/martin-luther-king-jr",
    sourceName: "FBI Records: The Vault",
    pageCount: 243000,
    ocrConfidence: 0.69,
    language: "English",
    summary:
      "The FBI's records on Dr. Martin Luther King, Jr., published through the Bureau's FOIA reading room (The Vault) — memoranda, field reports, and surveillance summaries produced under the Bureau's domestic intelligence programs.",
    pages: [
      { pageNumber: 1, text: "Federal Bureau of Investigation. These records concern the Bureau's investigative interest in the subject during the 1960s, conducted under domestic intelligence authorities later examined by congressional committees." },
      { pageNumber: 7, text: "Field office memorandum. The report summarizes information obtained through surveillance and informants. Names of confidential sources are withheld." },
    ],
    entities: ["Federal Bureau of Investigation", "Martin Luther King Jr.", "J. Edgar Hoover", "COINTELPRO"],
    tags: ["MLK", "FBI", "surveillance", "2025 release"],
    textIsIllustrative: true,
  },
];

// Curated demo records (above) + real records pulled by `npm run ingest` (written to
// generated-documents.json). Ingested records are merged in, skipping any id that a
// curated record already covers.
const GENERATED_DOCUMENTS = generatedRaw as unknown as GovDocument[];
const curatedIds = new Set(CURATED_DOCUMENTS.map((d) => d.id));

export const DOCUMENTS: GovDocument[] = [
  ...CURATED_DOCUMENTS,
  ...GENERATED_DOCUMENTS.filter((d) => d && d.id && !curatedIds.has(d.id)),
];

export const COLLECTIONS: Collection[] = [
  {
    slug: "latest",
    title: "Latest Releases",
    blurb:
      "Files the U.S. government just released — declassification drops like war.gov/UFO, committee reports, hearings, and public laws, straight from the official channels.",
    heroQuestion: "What did the government just release?",
    overview: [
      "This feed tracks new files as the government releases them: declassification drops on the Department of War's PURSUE portal (war.gov/UFO), and documents the U.S. Government Publishing Office adds to the official record — committee reports, hearing transcripts, and newly enacted public laws.",
      "It refreshes automatically several times a day as the monitored release channels publish. Every entry links to the official record at its source.",
    ],
    documentIds: [],
  },
  {
    slug: "epstein",
    title: "The Epstein Files",
    blurb:
      "Court records and federal releases connected to the Jeffrey Epstein investigations — read the actual documents, not the takes.",
    heroQuestion: "What do the released documents actually contain?",
    overview: [
      "The public record on Jeffrey Epstein comes from two main streams: civil litigation in federal court, and records released by the Department of Justice. The largest court tranche was unsealed in the Southern District of New York in the case Giuffre v. Maxwell beginning in January 2024.",
      "These materials are primary sources — depositions, exhibits, evidence logs, and court orders. Many entries are redacted to protect victims and uncharged third parties. Where a name appears, it does not by itself indicate wrongdoing.",
    ],
    documentIds: ["epstein-giuffre-maxwell-unsealed", "epstein-doj-phase-1"],
  },
  {
    slug: "uap",
    title: "UAP / UFO Files",
    blurb:
      "The official U.S. government record on Unidentified Anomalous Phenomena — the war.gov/UFO releases as they drop, the National Archives' UAP collection, ODNI assessments, and AARO's historical review.",
    heroQuestion: "What has the government officially said about UAP?",
    overview: [
      "Since 2021, the U.S. government has published an official record on Unidentified Aerial Phenomena. The Office of the Director of National Intelligence issued a preliminary assessment in June 2021 and annual reports thereafter. In 2024, the All-domain Anomaly Resolution Office published the first volume of a historical review covering 1945 to 2023, which found no empirical evidence of extraterrestrial technology.",
      "Disclosure accelerated in 2025–2026. The 2024 NDAA requires every federal agency to transfer its UAP records to the National Archives' UAP Records Collection (Record Group 615), released on a rolling basis since April 2025. And on May 8, 2026, the Department of War launched PURSUE (war.gov/UFO), publishing tranches of declassified documents, videos, audio, and images from across the government every few weeks. This collection tracks those channels automatically, so new files appear here as they are released.",
    ],
    documentIds: [
      "uap-pursue-program",
      "uap-nara-rg615",
      "uap-odni-prelim-2021",
      "uap-odni-annual-2022",
      "aaro-historical-record-v1",
      "roswell-case-closed",
    ],
  },
  {
    slug: "jfk",
    title: "JFK Assassination Records",
    blurb:
      "The President John F. Kennedy Assassination Records Collection, including the 2025 release of previously withheld CIA and FBI files.",
    heroQuestion: "What is in the JFK assassination records?",
    overview: [
      "The JFK Assassination Records Collection is maintained by the National Archives under the JFK Records Act. A major release in 2025 made public tens of thousands of pages previously withheld or redacted.",
      "The collection draws from the CIA, FBI, and State Department. Among the most-studied items are cables concerning Lee Harvey Oswald's reported activity in Mexico City weeks before the assassination.",
    ],
    documentIds: ["jfk-2025-release"],
  },
  {
    slug: "mkultra",
    title: "MKUltra",
    blurb:
      "The CIA's program of research into behavioral modification, documented in the 1977 Senate hearing and the surviving subproject files.",
    heroQuestion: "What records survive on MKUltra?",
    overview: [
      "MKUltra was a CIA program researching behavioral modification, including chemical and biological materials. Most records were destroyed in 1973, but financial files discovered later allowed a partial reconstruction, examined in a 1977 Senate hearing.",
      "The surviving subproject files, released through the CIA's FOIA reading room, are largely administrative and accounting records and are heavily redacted.",
    ],
    documentIds: ["mkultra-senate-1977", "mkultra-subprojects-foia", "church-committee-report"],
  },
  {
    slug: "sept-11",
    title: "September 11",
    blurb:
      "The 9/11 Commission's final report and the once-classified '28 pages' on possible foreign support for the hijackers.",
    heroQuestion: "What do the official 9/11 records say?",
    overview: [
      "The bipartisan 9/11 Commission published its final report in July 2004. A 28-page section of the earlier congressional Joint Inquiry, concerning possible foreign support for some hijackers, remained classified until 2016.",
      "Both are primary sources available in full. The Commission described its central finding as a 'failure of imagination' across the national security establishment.",
    ],
    documentIds: ["sept11-commission-report"],
  },
  {
    slug: "executive-orders",
    title: "Executive Orders & Presidential Actions",
    blurb:
      "Every executive order, proclamation, and presidential memorandum as it's published in the Federal Register — the government's decisions, in the government's words.",
    heroQuestion: "What has the President actually ordered?",
    overview: [
      "Executive orders, proclamations, and memoranda are the President's direct instructions to the federal government. Each is published in the Federal Register — the official daily journal of the U.S. government — as it takes effect.",
      "This collection tracks those presidential documents as they drop, linked to the authoritative Federal Register record so you can read the order itself, not a summary of it.",
    ],
    documentIds: [],
  },
  {
    slug: "fbi-files",
    title: "FBI Files",
    blurb:
      "Declassified Federal Bureau of Investigation records — investigations, surveillance files, and released case documents.",
    heroQuestion: "What is in the FBI's declassified files?",
    overview: [
      "The FBI has released large volumes of records through its FOIA program and the National Archives, covering historical investigations, domestic intelligence programs, and closed cases.",
      "These files range from field-office memoranda to surveillance summaries, and many are heavily redacted. Each links to the original release.",
    ],
    documentIds: [],
  },
  {
    slug: "watergate",
    title: "Watergate",
    blurb:
      "Records from the Watergate scandal — the investigations, tapes, and documents that ended the Nixon presidency.",
    heroQuestion: "What do the Watergate records show?",
    overview: [
      "Watergate produced one of the largest documentary records of executive-branch wrongdoing in American history — grand-jury materials, the White House tapes, and congressional investigation files.",
      "This collection gathers released Watergate-era records, each linked to its archival source.",
    ],
    documentIds: [],
  },
  {
    slug: "cold-war",
    title: "Cold War & Covert Operations",
    blurb:
      "Declassified records of Cold War intelligence and covert action — from the Bay of Pigs to the Cuban Missile Crisis and beyond.",
    heroQuestion: "What did the government do during the Cold War?",
    overview: [
      "Decades of declassification have opened much of the Cold War intelligence record: covert operations, coup planning, crisis decision-making, and the internal assessments behind them.",
      "This collection draws together those released records — CIA histories, State Department volumes, and archival releases — each linked to its source.",
    ],
    documentIds: [],
  },
  {
    slug: "history",
    title: "Historical Record",
    blurb:
      "Landmark declassified files — the Pentagon Papers, the Family Jewels, the Church Committee, FRUS Iran, and the 2025 MLK release.",
    heroQuestion: "What does the deeper historical record reveal?",
    overview: [
      "Beyond the headline topics, the declassified record runs deep. The Pentagon Papers, the CIA's 'Family Jewels,' and the Church Committee report reshaped public understanding of how intelligence agencies operated.",
      "The State Department's Foreign Relations series documents covert action such as the 1953 Iran coup, and the National Archives' 2025 release opened FBI surveillance files on Dr. Martin Luther King Jr.",
    ],
    documentIds: [
      "pentagon-papers",
      "cia-family-jewels",
      "church-committee-report",
      "frus-iran-1953",
      "cointelpro-mlk-2025",
    ],
  },
];

export const TIMELINES: Record<string, TimelineEvent[]> = {
  uap: [
    { date: "1995-07-28", title: "GAO reports on its search for records on the 1947 Roswell crash", documentId: "roswell-case-closed", page: 1 },
    { date: "2021-06-25", title: "ODNI delivers preliminary UAP assessment to Congress", documentId: "uap-odni-prelim-2021", page: 1 },
    { date: "2023-01-12", title: "2022 annual UAP report catalogues 510 reports", documentId: "uap-odni-annual-2022", page: 1 },
    { date: "2024-03-08", title: "AARO releases Historical Record Report, Volume 1", documentId: "aaro-historical-record-v1", page: 1 },
    { date: "2025-04-24", title: "National Archives releases first records in the UAP Records Collection (RG 615)", documentId: "uap-nara-rg615", page: 1 },
    { date: "2026-05-08", title: "Department of War launches PURSUE at war.gov/UFO with 162 declassified files", documentId: "uap-pursue-program", page: 1 },
    { date: "2026-05-22", title: "PURSUE second release published on war.gov/UFO", documentId: "uap-pursue-program", page: 1 },
    { date: "2026-06-12", title: "PURSUE third release: 72 files from the CIA, FBI, NASA, and the Pentagon", documentId: "uap-pursue-program", page: 1 },
    { date: "2026-07-10", title: "PURSUE fourth release: 40 files, including a DOE report on a 2015 incursion over the Pantex nuclear facility", documentId: "uap-pursue-program", page: 1 },
  ],
  jfk: [
    { date: "2025-03-18", title: "2025 release opens previously withheld JFK files in full", documentId: "jfk-2025-release", page: 1 },
  ],
  epstein: [
    { date: "2024-01-03", title: "SDNY begins unsealing Giuffre v. Maxwell records", documentId: "epstein-giuffre-maxwell-unsealed", page: 1 },
    { date: "2025-02-27", title: "DOJ releases 'Phase 1' Epstein records", documentId: "epstein-doj-phase-1", page: 1 },
  ],
  mkultra: [
    { date: "1953-04-13", title: "MKUltra established by CIA directive", documentId: "mkultra-subprojects-foia", page: 1 },
    { date: "1973-05-16", title: "'Family Jewels' compilation assembled internally", documentId: "cia-family-jewels", page: 1 },
    { date: "1976-04-26", title: "Church Committee reports on intelligence abuses", documentId: "church-committee-report", page: 1 },
    { date: "1977-08-03", title: "Senate holds joint hearing on MKUltra", documentId: "mkultra-senate-1977", page: 1 },
    { date: "2018-01-18", title: "Surviving subproject files posted to CIA reading room", documentId: "mkultra-subprojects-foia", page: 1 },
  ],
  "sept-11": [
    { date: "2004-07-22", title: "9/11 Commission publishes its final report", documentId: "sept11-commission-report", page: 1 },
  ],
};

export const ENTITIES: Entity[] = [
  { name: "Jeffrey Epstein", type: "person" },
  { name: "Ghislaine Maxwell", type: "person" },
  { name: "Virginia Giuffre", type: "person" },
  { name: "Lee Harvey Oswald", type: "person" },
  { name: "Sidney Gottlieb", type: "person" },
  { name: "Mohammad Mosaddegh", type: "person" },
  { name: "Kermit Roosevelt", type: "person" },
  { name: "Richard Helms", type: "person" },
  { name: "Martin Luther King Jr.", type: "person" },
  { name: "J. Edgar Hoover", type: "person" },
  { name: "Central Intelligence Agency", type: "org" },
  { name: "Federal Bureau of Investigation", type: "org" },
  { name: "Office of the Director of National Intelligence", type: "org" },
  { name: "All-domain Anomaly Resolution Office", type: "org" },
  { name: "United States Air Force", type: "org" },
  { name: "U.S. Department of Defense", type: "org" },
  { name: "Mexico City", type: "place" },
  { name: "Tehran", type: "place" },
  { name: "Roswell, New Mexico", type: "place" },
  { name: "MKUltra", type: "program" },
  { name: "Operation Ajax (TPAJAX)", type: "program" },
  { name: "COINTELPRO", type: "program" },
  { name: "Operation Mockingbird", type: "program" },
];
