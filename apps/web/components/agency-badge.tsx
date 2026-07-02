import type { AgencyCode } from "@/lib/types";

// Display metadata for agencies. This is presentation-only and lives in the
// frontend permanently (agency names don't come from the corpus). Keeping it here
// means the badge has no dependency on the data/fixtures layer.
const AGENCY_LABELS: Record<AgencyCode, { short: string; name: string }> = {
  CIA: { short: "CIA", name: "Central Intelligence Agency" },
  FBI: { short: "FBI", name: "Federal Bureau of Investigation" },
  NSA: { short: "NSA", name: "National Security Agency" },
  DOD: { short: "DoD", name: "U.S. Department of Defense" },
  DOJ: { short: "DOJ", name: "U.S. Department of Justice" },
  ODNI: { short: "ODNI", name: "Office of the Director of National Intelligence" },
  AARO: { short: "AARO", name: "All-domain Anomaly Resolution Office" },
  NARA: { short: "NARA", name: "National Archives and Records Administration" },
  STATE: { short: "State", name: "U.S. Department of State" },
  USAF: { short: "USAF", name: "United States Air Force" },
  SENATE: { short: "Senate", name: "United States Senate" },
  COMMISSION: { short: "Comm.", name: "Independent Federal Commission" },
  COURT: { short: "Courts", name: "U.S. Federal Courts" },
  WH: { short: "WH", name: "The White House" },
  OTHER: { short: "GOV", name: "U.S. Government" },
};

export function agencyName(code: AgencyCode): string {
  return AGENCY_LABELS[code].name;
}

export function AgencyBadge({ code }: { code: AgencyCode }) {
  const a = AGENCY_LABELS[code];
  return (
    <span
      title={a.name}
      className="inline-block rounded-sm border border-line px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide text-muted"
    >
      {a.short}
    </span>
  );
}
