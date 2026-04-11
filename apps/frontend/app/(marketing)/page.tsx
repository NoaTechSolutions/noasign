import { Navbar } from "../../components/marketing/Navbar";
import { HeroSection } from "../../components/marketing/HeroSection";
import { ProblemSection } from "../../components/marketing/ProblemSection";
import { HowItWorksSection } from "../../components/marketing/HowItWorksSection";
import { FeaturesSection } from "../../components/marketing/FeaturesSection";
import { PricingSection } from "../../components/marketing/PricingSection";
import { FaqSection } from "../../components/marketing/FaqSection";
import { CtaSection } from "../../components/marketing/CtaSection";
import { Footer } from "../../components/marketing/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
