import type { Metadata } from "next";
import Script from "next/script";
import { LangProvider } from "../../components/marketing/LandingContext";
import { APP_URL } from "../../lib/app-url";
import "./landing.css";

export const metadata: Metadata = {
  title: "NTSsign — Electronic Signature for Growing Businesses",
  description:
    "Send, sign and manage documents from any device. No account needed to sign. ESIGN Act compliant. Ready in 48 hours. From $19/mo.",
  keywords: [
    "electronic signature",
    "e-signature",
    "digital signature",
    "ESIGN Act",
    "document signing",
    "NTSsign",
  ],
  authors: [{ name: "NoaTechSolutions" }],
  creator: "NoaTechSolutions",
  metadataBase: new URL("https://ntssign.com"),
  alternates: {
    canonical: "https://ntssign.com",
    languages: { en: "https://ntssign.com", es: "https://ntssign.com" },
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "NTSsign — Sign any document. From any device.",
    description:
      "Send, sign and manage documents from any device. No account needed to sign. ESIGN Act compliant. Legally binding in all 50 states.",
    url: "https://ntssign.com",
    siteName: "NTSsign",
    images: [
      {
        url: "/img/og-image-v4.png",
        width: 1200,
        height: 630,
        alt: "NTSsign — Electronic Signature Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NTSsign — Sign any document. From any device.",
    description:
      "Send, sign and manage documents from any device. No account needed to sign. ESIGN Act compliant.",
    images: ["/img/og-image-v4.png"],
    site: "@noatechsolution",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    other: [{ rel: "manifest", url: "/site.webmanifest" }],
  },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LangProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "NTSsign",
            description:
              "Electronic signature platform for growing businesses. Send, sign and manage documents from any device.",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: "https://ntssign.com",
            offers: {
              "@type": "Offer",
              price: "19",
              priceCurrency: "USD",
              priceValidUntil: "2027-12-31",
            },
            publisher: {
              "@type": "Organization",
              name: "NoaTechSolutions",
              url: "https://noatechsolutions.com",
            },
          }),
        }}
      />
      <link rel="preconnect" href={APP_URL} />
      <link rel="dns-prefetch" href={APP_URL} />
      {children}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `}
          </Script>
        </>
      )}
      <Script
        id="tawkto"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            try {
              var Tawk_API = Tawk_API || {};
              Tawk_API.autoStart = false;
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
            } catch(e) {
              console.warn('Tawk.to failed to load:', e);
            }
          `,
        }}
      />
    </LangProvider>
  );
}
