import type { Metadata } from "next";
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
  return <LangProvider>{children}</LangProvider>;
}
