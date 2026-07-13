import type { Metadata } from "next";
import {
  AUTOMATED_SOURCES,
  KEYED_SOURCES,
  PLANNED_SOURCES,
  type IngestReport,
  type IngestSourceResult,
  type MonitoredSource,
} from "@/lib/sources";
import { formatDate } from "@/lib/format";
import report from "@/lib/generated-ingest-report.json";

export const metadata: Metadata = {
  title: "Sources & monitoring",
  description:
    "Every government release channel Just the Files watches — how each one is monitored, whether the last automated check succeeded, and what's next on the coverage roadmap.",
};

const INGEST_REPORT = report as IngestReport;

function resultFor(source: MonitoredSource): IngestSourceResult | undefined {
  return INGEST_REPORT.sources.find((s) => s.id === source.id);
}

function HealthBadge({ result }: { result: IngestSourceResult | undefined }) {
  if (!result) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
        awaiting first run
      </span>
    );
  }
  if (result.skipped) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
        off — {result.detail}
      </span>
    );
  }
  if (result.ok) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
        ok · {result.added.toLocaleString()} records last run
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-wider text-danger">
      check failed{result.detail ? ` — ${result.detail}` : ""}
    </span>
  );
}

function SourceCard({ source, showHealth }: { source: MonitoredSource; showHealth: boolean }) {
  const methodLabel =
    source.method === "api" ? "API" : source.method === "page-watch" ? "Page watch" : "Manual";
  return (
    <div className="rounded border border-line bg-paper p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-medium text-ink">
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.name}
          </a>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
          {methodLabel}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-faint">{source.publisher}</div>
      <p className="mt-2 text-sm text-muted">{source.what}</p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs text-faint">{source.cadence}</span>
        {showHealth && <HealthBadge result={resultFor(source)} />}
      </div>
      {source.note && <p className="mt-2 border-t border-line-soft pt-2 text-xs text-faint">{source.note}</p>}
    </div>
  );
}

export default function SourcesPage() {
  const lastRun = INGEST_REPORT.generatedAt;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-xl font-semibold text-ink">Sources &amp; monitoring</h1>
      <p className="mt-1 max-w-2xl text-muted">
        The archive grows by watching the places where the U.S. government actually
        releases files. This page is the live audit of that coverage: every channel we
        monitor, how it is monitored, and whether the most recent automated check
        succeeded — so a broken source is never mistaken for a quiet news day.
      </p>

      <h2 className="mt-8 text-base font-semibold text-ink">Watched automatically</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Checked on every scheduled ingest run (several times a day). New files are
        cataloged, enriched with the entities they name, link-audited, and published to
        the archive without manual steps.
        {lastRun && (
          <>
            {" "}
            Last completed check: <strong>{formatDate(lastRun)}</strong>.
          </>
        )}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {AUTOMATED_SOURCES.map((s) => (
          <SourceCard key={s.id} source={s} showHealth />
        ))}
      </div>

      <h2 className="mt-10 text-base font-semibold text-ink">Ready — waiting on an API key</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        The ingesters for these channels ship with the pipeline and switch on as soon as
        the (free) API key is configured as a repository secret.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {KEYED_SOURCES.map((s) => (
          <SourceCard key={s.id} source={s} showHealth />
        ))}
      </div>

      <h2 className="mt-10 text-base font-semibold text-ink">On the roadmap</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Known release channels not yet ingested automatically. Major drops from these
        sources are added as curated records in the meantime, and each is a candidate
        for the next ingester.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PLANNED_SOURCES.map((s) => (
          <SourceCard key={s.id} source={s} showHealth={false} />
        ))}
      </div>

      <p className="mt-10 border-t border-line-soft pt-4 text-xs leading-relaxed text-faint">
        Every record in the archive links back to the government source it came from.
        Missing a channel where files drop? The registry lives in{" "}
        <a
          href="https://github.com/FACT16/justthefiles/blob/main/apps/web/lib/sources.ts"
          target="_blank"
          rel="noopener noreferrer"
        >
          lib/sources.ts
        </a>{" "}
        — additions are welcome.
      </p>
    </div>
  );
}
