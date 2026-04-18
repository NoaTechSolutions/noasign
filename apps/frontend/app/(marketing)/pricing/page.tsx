import type { Metadata } from "next";
import { Navbar } from "../../../components/marketing/Navbar";
import { Footer } from "../../../components/marketing/Footer";
import { FloatingControls } from "../../../components/marketing/FloatingControls";
import { PricingPageContent } from "../../../components/marketing/PricingPageContent";
import { ScrollReveal } from "../../../components/marketing/ScrollReveal";

export const metadata: Metadata = {
  title: "Pricing — NTSsign",
  description:
    "Simple electronic signature pricing. Starter from $19/mo. No hidden fees. Cancel anytime.",
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return (
    <>
      <ScrollReveal />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "NTSsign Pricing Plans",
            itemListElement: [
              { "@type": "Offer", name: "Starter", price: "19", priceCurrency: "USD", description: "5 documents/month, 1 user, 1 template" },
              { "@type": "Offer", name: "Launch", price: "39", priceCurrency: "USD", description: "15 documents/month, 2 users, 3 templates, multi-signer" },
              { "@type": "Offer", name: "Pro", price: "89", priceCurrency: "USD", description: "50 documents/month, 5 users, 10 templates, priority support" },
            ],
          }),
        }}
      />
      <Navbar />
      <main>
        <PricingPageContent />
      </main>
      <Footer />
      <FloatingControls />
    </>
  );
}
