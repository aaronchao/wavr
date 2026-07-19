"use client";

import { platformLinks } from "@/src/core/links";

/**
 * "Open in" deep-link chips — the whole point of a portable library: listen
 * to a saved show/episode wherever you actually listen. Stored URL when
 * known (Apple), else a platform search for the title. A platform with no
 * link renders dimmed, never an error. Links stop propagation so they work
 * inside a full-card play button.
 */
export function OpenInLinks({
  title,
  appleUrl,
  className = "",
}: {
  title: string;
  appleUrl?: string;
  className?: string;
}) {
  const links = platformLinks(title, { apple: appleUrl });
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="font-brand text-[10px] uppercase tracking-wider text-zinc-400">
        Open in
      </span>
      {links.map((l) =>
        l.url ? (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded-pill bg-surface px-2.5 py-1 text-xs font-medium hover:opacity-80"
          >
            {l.label}
            {l.isSearch ? " ↗" : ""}
          </a>
        ) : (
          <span
            key={l.id}
            aria-disabled
            className="cursor-not-allowed rounded-pill bg-surface px-2.5 py-1 text-xs font-medium opacity-40"
          >
            {l.label}
          </span>
        ),
      )}
    </div>
  );
}
