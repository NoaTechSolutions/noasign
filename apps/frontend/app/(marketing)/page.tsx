import { Navbar } from "../../components/marketing/Navbar";
import { HeroSection } from "../../components/marketing/HeroSection";
import { LogosCarousel } from "../../components/marketing/LogosCarousel";
import { BenefitSections } from "../../components/marketing/BenefitSections";
import { FeaturesCarousel } from "../../components/marketing/FeaturesCarousel";
import { DevicesSection } from "../../components/marketing/DevicesSection";
import { HowItWorks } from "../../components/marketing/HowItWorks";
import { MidCta } from "../../components/marketing/MidCta";
import { SecuritySection } from "../../components/marketing/SecuritySection";
import { PricingSection } from "../../components/marketing/PricingSection";
import { ContactSection } from "../../components/marketing/ContactSection";
import { BottomCta } from "../../components/marketing/BottomCta";
import { FaqSection } from "../../components/marketing/FaqSection";
import { Footer } from "../../components/marketing/Footer";
import { FloatingControls } from "../../components/marketing/FloatingControls";
import { ScrollReveal } from "../../components/marketing/ScrollReveal";

export default function LandingPage() {
  return (
    <>
      <ScrollReveal />
      <Navbar />
      <main>
        <HeroSection />
        <LogosCarousel />
        <BenefitSections />
        <FeaturesCarousel />
        <DevicesSection />
        <HowItWorks />
        <MidCta />
        <SecuritySection />
        {/* <Testimonials /> — hidden until real reviews are available */}
        <PricingSection />
        <FaqSection />
        <ContactSection />
        <BottomCta />
      </main>
      <Footer />
      <FloatingControls />
    </>
  );
}
