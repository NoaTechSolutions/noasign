import type { Metadata } from "next";
import { Navbar } from "../../../components/marketing/Navbar";
import { Footer } from "../../../components/marketing/Footer";
import { FloatingControls } from "../../../components/marketing/FloatingControls";

export const metadata: Metadata = {
  title: "Cookie Policy — NTSsign",
  description:
    "NTSsign Cookie Policy. Learn about the cookies we use and how to manage them.",
};

export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main className="legal-page">
        <div className="wrap">
          <div className="legal-content">
            <h1>Cookie Policy</h1>
            <p className="legal-meta">Last updated: April 2026</p>

            <div className="legal-notice">
              NTSsign is currently operated by NoaTechSolutions, a business in the process of formal
              registration. This cookie policy is interim and will be updated upon completion of business
              registration.
            </div>

            <h2>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when you visit a website. They
              are widely used to make websites work efficiently, provide a better user experience, and
              give website operators useful information. Cookies can be &quot;persistent&quot; (remaining on your
              device until deleted or expired) or &quot;session&quot; (deleted when you close your browser).
            </p>

            <h2>2. Cookies We Use</h2>

            <h3>2.1 Essential Cookies</h3>
            <p>
              These cookies are necessary for the Service to function and cannot be disabled. They are
              usually set in response to your actions, such as logging in or setting preferences.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Provider</th>
                  <th>Purpose</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>nts-theme</td>
                  <td>NTSsign</td>
                  <td>Stores your dark/light mode preference</td>
                  <td>Persistent (localStorage)</td>
                </tr>
                <tr>
                  <td>ntssign-lang</td>
                  <td>NTSsign</td>
                  <td>Stores your language preference (EN/ES)</td>
                  <td>Persistent (localStorage)</td>
                </tr>
                <tr>
                  <td>access_token</td>
                  <td>NTSsign</td>
                  <td>Authenticates your session after login</td>
                  <td>Session / 24 hours</td>
                </tr>
                <tr>
                  <td>__cf_bm</td>
                  <td>Cloudflare</td>
                  <td>Bot management and DDoS protection</td>
                  <td>30 minutes</td>
                </tr>
              </tbody>
            </table>

            <h3>2.2 Analytics Cookies</h3>
            <p>
              These cookies help us understand how visitors interact with the Service by collecting
              anonymous usage data. We use this information to improve our platform.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Provider</th>
                  <th>Purpose</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>_ga, _ga_*</td>
                  <td>Google Analytics</td>
                  <td>Distinguishes unique users and tracks page views</td>
                  <td>2 years</td>
                </tr>
                <tr>
                  <td>_gid</td>
                  <td>Google Analytics</td>
                  <td>Distinguishes users for 24-hour period</td>
                  <td>24 hours</td>
                </tr>
              </tbody>
            </table>

            <h3>2.3 Support Chat Cookies</h3>
            <p>
              If we integrate a live chat or support widget in the future, it may set cookies to maintain
              your chat session. We will update this policy when such integration is made.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Cookie</th>
                  <th>Provider</th>
                  <th>Purpose</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", fontStyle: "italic" }}>
                    No support chat cookies are currently in use
                  </td>
                </tr>
              </tbody>
            </table>

            <h2>3. Cookies We Do NOT Use</h2>
            <p>NTSsign does <strong>not</strong> use:</p>
            <ul>
              <li><strong>Advertising cookies</strong> — we do not serve ads or use ad tracking</li>
              <li><strong>Third-party marketing cookies</strong> — we do not share data with ad networks</li>
              <li><strong>Social media tracking pixels</strong> — we do not embed Facebook Pixel, LinkedIn Insight Tag, or similar trackers</li>
              <li><strong>Cross-site tracking cookies</strong> — we do not track your activity across other websites</li>
            </ul>

            <h2>4. Managing Cookies</h2>

            <h3>4.1 Browser Settings</h3>
            <p>
              You can control and delete cookies through your browser settings. Note that disabling
              essential cookies may affect the functionality of the Service. Here&apos;s how to manage cookies
              in common browsers:
            </p>
            <ul>
              <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies</li>
            </ul>

            <h3>4.2 Analytics Opt-Out</h3>
            <p>
              To opt out of Google Analytics tracking specifically, you can install the{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Analytics Opt-out Browser Add-on
              </a>
              .
            </p>

            <h2>5. Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy to reflect changes in our practices or for operational,
              legal, or regulatory reasons. Material changes will be communicated through the Service. The
              &quot;Last updated&quot; date at the top indicates when this policy was last revised.
            </p>

            <h2>6. Contact</h2>
            <p>
              If you have questions about our use of cookies, please contact us at{" "}
              <a href="mailto:privacy@noatechsolutions.com">privacy@noatechsolutions.com</a>.
            </p>

            <div className="legal-footer-note">
              This cookie policy is interim pending formal business registration and legal review.
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <FloatingControls />
    </>
  );
}
