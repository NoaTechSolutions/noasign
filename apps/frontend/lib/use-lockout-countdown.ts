import { useEffect, useState } from "react";

// Drives the "Sign in (MM:SS)" button countdown when the server returns
// ACCOUNT_LOCKED or RATE_LIMITED. Single setInterval, restarts only when
// transitioning between active/inactive — avoids creating a new timer on
// every tick.
export function useLockoutCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const isActive = secondsLeft > 0;

  useEffect(() => {
    if (!isActive) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [isActive]);

  return {
    secondsLeft,
    isActive,
    start: (seconds: number | undefined) => {
      if (!seconds || seconds <= 0) return;
      setSecondsLeft(Math.floor(seconds));
    },
    clear: () => setSecondsLeft(0),
  };
}

// MM:SS formatter. "(900s)" reads like an error code; "15:00" reads like a
// wait time.
export function formatMMSS(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
