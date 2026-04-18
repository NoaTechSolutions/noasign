export function openChat() {
  if (typeof window !== "undefined") {
    const api = (window as any).Tawk_API;
    if (api && typeof api.maximize === "function") {
      api.maximize();
    }
  }
}
