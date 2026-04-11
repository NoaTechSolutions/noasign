import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · NTSsign",
};

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "80px auto", padding: "0 20px", fontFamily: "sans-serif" }}>
      <Link href="/" style={{ fontSize: 13, color: "#022977", textDecoration: "none" }}>← NTSsign</Link>
      <h1 style={{ fontSize: 24, fontWeight: 500, color: "#022977", marginTop: 24 }}>Terms of Service</h1>
      <p style={{ color: "rgba(2,41,119,0.7)", lineHeight: 1.7 }}>
        Terms of Service will be published before launch. For any questions, contact{" "}
        <a href="mailto:support@noatechsolutions.com" style={{ color: "#022977" }}>
          support@noatechsolutions.com
        </a>
        .
      </p>
    </main>
  );
}
