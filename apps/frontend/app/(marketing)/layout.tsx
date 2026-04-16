import type { Metadata } from "next";
import Script from "next/script";
import { LangProvider } from "../../components/marketing/LandingContext";
import "./landing.css";

export const metadata: Metadata = {
  title: "NTSsign · Digital Contracts & E-Signatures for Service Businesses",
  description:
    "Create, send, and track business contracts in minutes. Your clients sign from any device — no account needed. Plans from $19/mo.",
  openGraph: {
    title: "NTSsign · Send contracts. Get them signed. Done.",
    description: "The document workspace for service businesses.",
    url: "https://ntssign.com",
    siteName: "NTSsign",
    type: "website",
  },
  alternates: {
    canonical: "https://ntssign.com",
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      {/* Preconnect to the app host so the Log in CTA handoff is instant. */}
      <link rel="preconnect" href="https://app.ntssign.com" />
      <link rel="dns-prefetch" href="https://app.ntssign.com" />
      {children}
      <Script
        id="tawkto"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            var Tawk_API = Tawk_API || {};
            Tawk_API.onLoad = function() {
              Tawk_API.minimize();
            };
            var Tawk_LoadStart = new Date();
            (function(){
              var s1=document.createElement("script"),
                  s0=document.getElementsByTagName("script")[0];
              s1.async=true;
              s1.src='https://embed.tawk.to/69e06f0c9883961c32ac4691/1jmab3id5';
              s1.charset='UTF-8';
              s1.setAttribute('crossorigin','*');
              s0.parentNode.insertBefore(s1,s0);
            })();
          `,
        }}
      />
    </LangProvider>
  );
}
