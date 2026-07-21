import type { Metadata } from "next";
import { Navbar } from "../../../components/marketing/Navbar";
import { Footer } from "../../../components/marketing/Footer";
import { FloatingControls } from "../../../components/marketing/FloatingControls";
import { LegalVersionedContent } from "../../../components/legal/LegalVersionedContent";

export const metadata: Metadata = {
  title: "Terms and Conditions — NTSsign",
  description:
    "NTSsign Terms and Conditions of Use. Review the rules governing your use of our electronic signature platform.",
  robots: { index: false, follow: false },
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="wrap">
          <LegalVersionedContent
            docType="TERMS"
            fallback={
              <>
                <h1>Terms and Conditions</h1>
            <p className="legal-meta">Last updated: April 2026 · Version 1.0</p>

            <div className="legal-notice">
              NTSsign is currently operated by NoaTechSolutions, a business in the process of formal
              registration. These terms are interim and will be updated upon completion of business
              registration.
            </div>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using NTSsign (&quot;the Service&quot;), you agree to be bound by these Terms and
              Conditions. If you do not agree, you may not use the Service. Your continued use after any
              modification constitutes acceptance of the updated terms.
            </p>

            <h2>2. Description of the Service</h2>
            <p>
              NTSsign is a cloud-based electronic signature platform that allows businesses to create,
              send, track, and manage digital contracts and documents with full legal validity, in
              compliance with the ESIGN Act of the United States.
            </p>
            <p>Services include:</p>
            <ul>
              <li>Creation and delivery of documents for signature</li>
              <li>Electronic signing from any device, without account creation or app download</li>
              <li>Document tracking and status management</li>
              <li>Secure storage of signed documents</li>
              <li>Verifiable and tamper-proof audit trails</li>
            </ul>

            <h2>3. Eligibility and Registration</h2>
            <p>
              You must be at least 18 years old and have the legal capacity to enter into contracts to use
              the Service. When registering, you agree to provide accurate, current, and complete
              information. You are responsible for maintaining the confidentiality of your account
              credentials and for all activities that occur under your account.
            </p>

            <h2>4. Plans and Payments</h2>

            <h3>4.1 Subscription Plans</h3>
            <p>
              NTSsign offers subscription-based plans with varying features, document limits, and pricing
              tiers. The specific terms of each plan, including pricing and features, are described on our
              pricing page and may be updated from time to time.
            </p>

            <h3>4.2 Billing</h3>
            <p>
              Subscriptions are billed on a recurring basis (monthly or annually, depending on your
              selected plan). Payment is due at the beginning of each billing cycle. All fees are
              non-refundable except as expressly stated in these Terms.
            </p>

            <h3>4.3 Cancellation and Refunds</h3>
            <p>
              You may cancel your subscription at any time. Upon cancellation, your access to paid
              features will continue until the end of the current billing period. No partial refunds are
              provided for unused portions of a billing period. Data is retained for 30 days after
              cancellation before permanent deletion.
            </p>

            <h3>4.4 Price Changes</h3>
            <p>
              We reserve the right to modify our pricing at any time. If your subscription price changes,
              we will notify you at least 30 days before the change takes effect. Continued use of the
              Service after the price change constitutes acceptance of the new pricing.
            </p>

            <h2>5. Acceptable Use</h2>

            <h3>5.1 Permitted Uses</h3>
            <p>You may use the Service to:</p>
            <ul>
              <li>Create, send, and manage business documents and contracts</li>
              <li>Collect electronic signatures from your clients and partners</li>
              <li>Store and organize signed documents</li>
              <li>Manage your team&apos;s document workflows</li>
            </ul>

            <h3>5.2 Prohibited Uses</h3>
            <p>You may not use the Service to:</p>
            <ul>
              <li>Violate any applicable laws or regulations</li>
              <li>Send fraudulent, deceptive, or misleading documents</li>
              <li>Forge signatures or misrepresent the identity of signers</li>
              <li>Transmit malicious software or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or other accounts</li>
              <li>Use the Service for any illegal purpose, including but not limited to money laundering, fraud, or identity theft</li>
              <li>Circumvent any usage limits, access restrictions, or security measures</li>
              <li>Resell, sublicense, or redistribute the Service without prior written consent</li>
            </ul>

            <h2>6. Legal Validity of Electronic Signatures</h2>
            <p>
              Signatures made through NTSsign have full legal validity in the United States under the
              ESIGN Act (15 U.S.C. § 7001 et seq.) and the Uniform Electronic Transactions Act (UETA).
              Each signature is supported by:
            </p>
            <ul>
              <li>Date, time, and IP address of the signer</li>
              <li>Device identification</li>
              <li>Document completion certificate</li>
              <li>Verifiable and immutable chain of custody</li>
            </ul>
            <p>
              NTSsign does not provide legal advice, and you should consult with a qualified attorney
              regarding the enforceability of electronic signatures in your jurisdiction and for your
              specific use case.
            </p>

            <h2>7. Intellectual Property</h2>

            <h3>7.1 Company Property</h3>
            <p>
              The Service, including all software, designs, trademarks, logos, and content created by
              NTSsign, is the exclusive property of NoaTechSolutions and is protected by intellectual
              property laws.
            </p>

            <h3>7.2 License to Use</h3>
            <p>
              We grant you a limited, non-exclusive, non-transferable, revocable license to access and
              use the Service solely for your internal business purposes, subject to these Terms.
            </p>

            <h3>7.3 User Content</h3>
            <p>
              You retain all rights to the documents, data, and content you upload to the Service
              (&quot;User Content&quot;). By using the Service, you grant NTSsign a limited license to process,
              store, and transmit your User Content solely for the purpose of providing the Service.
            </p>

            <h2>8. Privacy and Data Protection</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <a href="/privacy">Privacy Policy</a>, which describes how we collect, use, and protect
              your personal information. By using the Service, you consent to the data practices
              described in the Privacy Policy.
            </p>

            <h2>9. Service Availability</h2>
            <p>
              We strive to maintain the Service available 24/7, but we do not guarantee uninterrupted or
              error-free operation. We may temporarily suspend the Service for maintenance, updates, or
              reasons beyond our control. We will make reasonable efforts to notify you of planned
              downtime in advance.
            </p>

            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, NTSsign and NoaTechSolutions shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages, including but not
              limited to loss of profits, data, business opportunities, or goodwill, arising out of or
              related to your use of the Service. Our total liability for any claim related to the Service
              shall not exceed the amount you paid for the Service in the twelve (12) months preceding the
              claim.
            </p>

            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless NTSsign, NoaTechSolutions, its officers,
              directors, employees, and agents from and against any claims, liabilities, damages, losses,
              and expenses (including reasonable legal fees) arising out of or in connection with your use
              of the Service, your violation of these Terms, or your violation of any rights of a third
              party.
            </p>

            <h2>12. Modifications</h2>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be
              communicated via email or through the Service at least 30 days before they take effect. Your
              continued use of the Service after modifications become effective constitutes acceptance of
              the updated Terms.
            </p>

            <h2>13. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time for violation of these
              Terms or for any other reason at our discretion. Upon termination, your right to use the
              Service ceases immediately. You may request an export of your data within 30 days of
              termination, after which we may delete your data in accordance with our Privacy Policy.
            </p>

            <h2>14. Governing Law and Jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the State of
              California, United States, without regard to its conflict of law principles. Any disputes
              arising from these Terms or the Service shall be resolved exclusively in the state or
              federal courts located in Alameda County, California.
            </p>

            <h2>15. Contact</h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@noatechsolutions.com">legal@noatechsolutions.com</a>.
            </p>

                <div className="legal-footer-note">
                  These terms are interim pending formal business registration and legal review.
                </div>
              </>
            }
          />
        </div>
      </main>
      <Footer />
      <FloatingControls />
    </>
  );
}
