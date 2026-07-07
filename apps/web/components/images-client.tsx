"use client";

// Image gallery over official digitized imagery (Library of Congress for now).
// Images are hotlinked from the source archive; every caption links to the
// original catalog record. Topic filter comes from ?topic= in the query string.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { imageTopicsSync, listImagesSync } from "@/lib/api";

export function ImagesClient() {
  const sp = useSearchParams();
  const topic = sp.get("topic") ?? undefined;

  const topics = useMemo(() => imageTopicsSync(), []);
  const images = useMemo(() => listImagesSync(topic), [topic]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="border-b border-line-soft pb-3">
        <h1 className="text-lg font-semibold text-ink">Images</h1>
        <p className="text-sm text-muted">
          Digitized imagery from official U.S. archives. Every image links to its original
          catalog record — captions are the archive&rsquo;s own descriptions.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <Link
          href="/images"
          className={`rounded-sm border px-2 py-0.5 hover:border-accent hover:no-underline ${
            !topic ? "border-ink bg-ink text-paper" : "border-line bg-paper text-muted hover:text-ink"
          }`}
        >
          All ({listImagesSync().length})
        </Link>
        {topics.map((t) => (
          <Link
            key={t.slug}
            href={`/images?topic=${t.slug}`}
            className={`rounded-sm border px-2 py-0.5 hover:border-accent hover:no-underline ${
              topic === t.slug
                ? "border-ink bg-ink text-paper"
                : "border-line bg-paper text-muted hover:text-ink"
            }`}
          >
            {t.title} ({t.count})
          </Link>
        ))}
      </div>

      {images.length === 0 ? (
        <div className="mt-6 rounded border border-line bg-paper p-8 text-center">
          <p className="text-ink">No imagery in the archive for this topic yet.</p>
          <p className="mt-1 text-sm text-muted">
            Galleries cover what official archives have digitized; they grow as sources are added.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="flex flex-col rounded border border-line bg-paper">
              <a
                href={img.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block border-b border-line-soft bg-canvas"
                title="Open full-size image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- hotlinked archive media */}
                <img
                  src={img.thumbUrl}
                  alt={img.title}
                  loading="lazy"
                  className="h-40 w-full object-cover"
                />
              </a>
              <div className="flex flex-1 flex-col p-2.5">
                <div className="text-sm leading-snug text-ink">{img.title}</div>
                {img.description && (
                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">
                    {img.description}
                  </p>
                )}
                <div className="mt-auto pt-2 text-xs text-faint">
                  {img.date ? `${img.date.slice(0, 4)} · ` : ""}
                  <a
                    href={img.recordUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    {img.source} ↗
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-faint">
        Images are served directly from the source archive and are not altered. Rights vary by
        item — check the linked catalog record before reuse.
      </p>
    </div>
  );
}
