"use client";

import { playSnippet } from "./snippet";
import { CoverTile } from "@/src/ui";

/**
 * A podcast cover with a centered play-triangle overlay — matching the
 * "For You" show-tile design (Trending/Saved rails). Tapping it starts the
 * 60s / 1.2x community snippet. Shared by Ranks, Charts, and the Library.
 */
export function CoverPlay({
  src,
  size = 56,
  audioUrl,
  label,
  className = "",
}: {
  src?: string;
  size?: number;
  audioUrl?: string;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        playSnippet(audioUrl);
      }}
      aria-label={label}
      className={`group relative block shrink-0 overflow-hidden rounded-tile ${className}`}
      style={{ width: size, height: size }}
    >
      <CoverTile src={src} size={size} />
      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm text-white opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
        ▶
      </span>
    </button>
  );
}
