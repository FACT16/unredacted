import type { Metadata } from "next";
import { Suspense } from "react";
import { ImagesClient } from "@/components/images-client";

export const metadata: Metadata = {
  title: "Images",
  description:
    "Digitized imagery from official U.S. archives — UFO photographs, JFK, Watergate, Cold War, and more. Every image links to its original catalog record.",
};

// Static shell; the topic filter lives in the query string, handled client-side
// (same pattern as /search — the site is a static export).
export default function ImagesPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">Loading images…</div>
      }
    >
      <ImagesClient />
    </Suspense>
  );
}
