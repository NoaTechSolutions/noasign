"use client";

import { useEffect } from "react";

export function ChunkErrorHandler() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      const isChunkError =
        event.message?.includes("ChunkLoadError") ||
        event.message?.includes("Loading chunk") ||
        event.message?.includes("Failed to load chunk") ||
        (event.error as Error | undefined)?.name === "ChunkLoadError";

      if (!isChunkError) return;

      const key = "ntssign:chunk-reload";
      const lastReload = sessionStorage.getItem(key);
      const now = Date.now();

      // Only reload once every 10 seconds to avoid infinite loop
      if (lastReload && now - Number(lastReload) < 10_000) return;

      sessionStorage.setItem(key, String(now));
      window.location.reload();
    }

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  return null;
}
