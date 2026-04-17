import type { Metadata } from "next";
import { Navbar } from "../../../components/marketing/Navbar";
import { Footer } from "../../../components/marketing/Footer";
import { FloatingControls } from "../../../components/marketing/FloatingControls";

export const metadata: Metadata = {
  title: "Privacy Policy — NTSsign",
  description:
    "NTSsign Privacy Policy. Learn how we collect, use, and protect your personal data.",
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="wrap">
          <div className="legal-content">
            <h1>Privacy Policy</h1>
            <p className="legal-meta">Last updated: April 2026 · Version 1.0</p>

            <div className="legal-notice">
              NTSsign is currently operated by NoaTechSolutions, a business in the process of formal
              registration. These terms are interim and will be updated upon completion of business
              registration.
            </div>

            <h2>1. Introduction</h2>
            <p>
              NTSsign (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information when you use
              our electronic signature platform and related services (the &quot;Service&quot;).
            </p>
            <p>
              By using the Service, you consent to the data practices described in this policy. If you do
              not agree with our policies, please do not use the Service.
            </p>

            <h2>2. Data We Collect</h2>

            <h3>2.1 Data You Provide Directly</h3>
            <ul>
              <li><strong>Account information:</strong> name, email address, phone number, company name, and billing details when you register or subscribe</li>
              <li><strong>Document data:</strong> the content of documents you create, upload, or sign through the Service, including customer names, addresses, and contract details</li>
              <li><strong>Communications:</strong> messages you send to us via email, support chat, or contact forms</li>
              <li><strong>Payment information:</strong> credit card numbers, billing addresses, and payment details processed through our payment provider</li>
            </ul>

            <h3>2.2 Automatically Collected Data</h3>
            <ul>
              <li><strong>Device information:</strong> browser type, operating system, device type, and screen resolution</li>
              <li><strong>Usage data:</strong> pages visited, features used, time spent on the Service, and interaction patterns</li>
              <li><strong>Log data:</strong> IP address, access times, referring URLs, and error logs</li>
              <li><strong>Cookies and similar technologies:</strong> as described in our <a href="/cookies">Cookie Policy</a></li>
            </ul>

            <h3>2.3 Third-Party Data</h3>
            <ul>
              <li><strong>Signature verification data:</strong> information provided by our electronic signature provider (BoldSign) to verify signature events and maintain audit trails</li>
              <li><strong>Analytics data:</strong> aggregated usage statistics from analytics providers</li>
            </ul>

            <h2>3. How We Use Your Data</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and maintain the Service</li>
              <li>Process your documents and electronic signatures</li>
              <li>Send transactional emails (signature requests, completion notifications, receipts)</li>
              <li>Process payments and manage your subscription</li>
              <li>Provide customer support and respond to inquiries</li>
              <li>Improve the Service through usage analytics and feedback</li>
              <li>Detect, prevent, and address fraud, security issues, and technical problems</li>
              <li>Comply with legal obligations and enforce our Terms of Service</li>
              <li>Send you updates about the Service (you may opt out at any time)</li>
            </ul>

            <h2>4. Data Sharing</h2>

            <h3>4.1 Service Providers</h3>
            <p>We share data with the following categories of service providers who help us operate the Service:</p>
            <table>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Purpose</th>
                  <th>Data Shared</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>BoldSign</td>
                  <td>Electronic signature engine</td>
                  <td>Documents and signer data</td>
                </tr>
                <tr>
                  <td>Cloudflare</td>
                  <td>CDN and security</td>
                  <td>IP address, technical data</td>
                </tr>
                <tr>
                  <td>Payment processor</td>
                  <td>Payment processing</td>
                  <td>Email, billing data</td>
                </tr>
              </tbody>
            </table>

            <h3>4.2 Legal Requirements</h3>
            <p>
              We may disclose your data if required to do so by law, court order, or governmental
              request, or when we believe disclosure is necessary to protect our rights, your safety, or
              the safety of others.
            </p>

            <h3>4.3 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, or sale of assets, your data may be transferred as
              part of the transaction. We will notify you of any such change and any choices you may have.
            </p>

            <h3>4.4 With Your Consent</h3>
            <p>
              We may share your data for purposes not described in this policy only with your explicit
              consent.
            </p>

            <h2>5. Storage and Security</h2>

            <h3>5.1 Where We Store</h3>
            <p>
              Your data is stored on servers located in the United States. If you are located outside
              the United States, your data will be transferred to and processed in the United States.
            </p>

            <h3>5.2 Security Measures</h3>
            <p>We implement industry-standard security measures including:</p>
            <ul>
              <li>TLS/SSL encryption for all data in transit</li>
              <li>Encryption at rest for stored data</li>
              <li>Bcrypt password hashing with salting</li>
              <li>JWT-based authentication with token expiration</li>
              <li>Role-based access control (RBAC)</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Cloudflare DDoS protection and Web Application Firewall</li>
            </ul>

            <h3>5.3 Data Retention</h3>
            <p>
              We retain your data for as long as your account is active or as needed to provide the
              Service. After account deletion, we retain certain data for up to 90 days for backup and
              recovery purposes, and as required by law. Document audit trails may be retained longer to
              support the legal validity of signed documents.
            </p>

            <h2>6. Your Rights</h2>

            <h3>All Users</h3>
            <p>Regardless of your location, you have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Export your documents and data</li>
              <li>Opt out of marketing communications</li>
              <li>Close your account at any time</li>
            </ul>

            <h3>California Users (CCPA/CPRA)</h3>
            <p>If you are a California resident, you additionally have the right to:</p>
            <ul>
              <li>Know what categories of personal information we collect and why</li>
              <li>Request deletion of your personal information</li>
              <li>Opt out of the &quot;sale&quot; of your personal information (we do not sell personal information)</li>
              <li>Non-discrimination for exercising your privacy rights</li>
              <li>Limit the use of sensitive personal information</li>
            </ul>

            <h3>European Users (GDPR)</h3>
            <p>If you are located in the European Economic Area, you additionally have the right to:</p>
            <ul>
              <li>Data portability — receive your data in a structured, machine-readable format</li>
              <li>Object to processing of your data for legitimate interests</li>
              <li>Restrict processing of your data in certain circumstances</li>
              <li>Withdraw consent at any time (where processing is based on consent)</li>
              <li>Lodge a complaint with your local data protection authority</li>
            </ul>

            <h2>7. Cookies</h2>
            <p>
              We use cookies and similar technologies to operate the Service and improve your experience.
              For detailed information about the cookies we use and how to manage them, please see our{" "}
              <a href="/cookies">Cookie Policy</a>.
            </p>

            <h2>8. Minors</h2>
            <p>
              The Service is not intended for use by individuals under the age of 18. We do not knowingly
              collect personal information from minors. If we become aware that we have collected data
              from a minor, we will take steps to delete it promptly. If you believe a minor has provided
              us with personal information, please contact us.
            </p>

            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be communicated
              via email or through the Service at least 30 days before they take effect. The &quot;Last
              updated&quot; date at the top of this policy indicates when it was last revised.
            </p>

            <h2>10. Contact</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your rights, please
              contact us at{" "}
              <a href="mailto:privacy@noatechsolutions.com">privacy@noatechsolutions.com</a>.
            </p>

            <div className="legal-footer-note">
              This privacy policy is interim pending formal business registration and legal review.
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <FloatingControls />
    </>
  );
}
