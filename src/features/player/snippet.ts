"use client";

import { useEffect } from "react";

/**
 * A separate 60-second "community snippet" mode used by Surprise Me and the
 * cover-image play triangles: starts at a random point at least 60s into
 * the episode, plays at 1.2x for 60 seconds, then stops. Independent of the
 * app-wide PreviewPlayer bar/store — pure client-side HTML5 Audio, no
 * server-side processing. Only one snippet plays at a time.
 */

let current: HTMLAudioElement | null = null;
let stopTimer: ReturnType<typeof setTimeout> | undefined;

export function stopSnippet() {
  if (stopTimer) clearTimeout(stopTimer);
  if (current) {
    current.pause();
    current = null;
  }
}

export function playSnippet(audioUrl?: string) {
  stopSnippet();
  if (!audioUrl) return; // no audio for this row — silently do nothing
  const audio = new Audio(audioUrl);
  current = audio;
  audio.playbackRate = 1.2;
  const onLoaded = () => {
    const known = Number.isFinite(audio.duration) && audio.duration > 65;
    const start = known ? 60 + Math.random() * (audio.duration - 65) : 60;
    try {
      audio.currentTime = start;
    } catch {
      // some CDNs can't seek — plays from wherever it can start instead
    }
    void audio.play().catch(() => {
      // autoplay blocked — fail silently, never a blocking error
    });
    stopTimer = setTimeout(() => audio.pause(), 60_000);
  };
  audio.addEventListener("loadedmetadata", onLoaded, { once: true });
  audio.load();
}

/** Auto-starts a snippet on mount (and whenever `audioUrl` changes); stops on unmount. */
export function useAutoSnippet(audioUrl?: string) {
  useEffect(() => {
    playSnippet(audioUrl);
    return () => stopSnippet();
  }, [audioUrl]);
}
