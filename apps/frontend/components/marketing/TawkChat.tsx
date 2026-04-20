"use client";

import Script from "next/script";

export function TawkChat() {
  return (
    <>
      <Script id="tawk-config" strategy="afterInteractive">
        {`
          window.Tawk_API = window.Tawk_API || {};
          window.Tawk_API.onLoad = function() {
            setTimeout(function() {
              window.Tawk_API.minimize();
            }, 500);
          };
        `}
      </Script>
      <Script
        id="tawk-widget"
        src="https://embed.tawk.to/69e06f0c9883961c32ac4691/1jmab3id5"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
    </>
  );
}
