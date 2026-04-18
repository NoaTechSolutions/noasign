import type { Metadata } from "next";
import { Navbar } from "../../../components/marketing/Navbar";
import { Footer } from "../../../components/marketing/Footer";
import { FloatingControls } from "../../../components/marketing/FloatingControls";
import { PricingPageContent } from "../../../components/marketing/PricingPageContent";

export const metadata: Metadata = {
  title: "Pricing — NTSsign",
  description:
    "Simple electronic signature pricing. Starter from $19/mo. No hidden fees. Cancel anytime.",
  robots: { index: true, follow: true },
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main>
        <PricingPageContent />
      </main>
      <Footer />
      <FloatingControls />
    </>
  );
}
