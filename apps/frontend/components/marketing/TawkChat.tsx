"use client";

import { useEffect } from "react";

export function TawkChat() {
  useEffect(() => {
    (window as any).Tawk_API = (window as any).Tawk_API || {};
    (window as any).Tawk_API.onLoad = function () {
      (window as any).Tawk_API.minimize();
    };

    const s1 = document.createElement("script");
    s1.async = true;
    s1.src =
      "https://embed.tawk.to/69e06f0c9883961c32ac4691/1jmab3id5";
    s1.setAttribute("crossorigin", "*");

    const s0 = document.getElementsByTagName("script")[0];
    s0.parentNode?.insertBefore(s1, s0);

    return () => {
      s1.remove();
    };
  }, []);

  return null;
}
