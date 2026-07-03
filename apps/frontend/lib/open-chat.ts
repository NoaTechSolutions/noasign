export function openChat() {
  if (typeof window !== "undefined") {
    const api = (window as unknown as { Tawk_API?: { maximize?: () => void } }).Tawk_API;
    if (api && typeof api.maximize === "function") {
      api.maximize();
    }
  }
}
