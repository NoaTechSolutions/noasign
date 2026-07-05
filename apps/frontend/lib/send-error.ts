// Single source for turning a raw provider send error (Resend bounce/complaint,
// BoldSign delivery failure, SMTP text) into a short, friendly EN-US message a
// client can understand. If nothing matches we return the raw text — a technical
// message is better than none. Add new rules here; keep this the only place.

interface Rule {
  test: RegExp;
  message: string;
}

// Order matters: more specific patterns first.
const RULES: Rule[] = [
  { test: /mailbox (is )?full|over[- ]?quota|quota exceeded|insufficient storage|\b552\b/i, message: "Recipient's mailbox is full" },
  { test: /does ?n'?t exist|no such (user|mailbox|address)|invalid (recipient|email|address)|recipient rejected|address rejected|unknown user|user unknown|mailbox unavailable|\b550\b|5\.1\.1/i, message: "Email address doesn't exist" },
  { test: /spam|complain|blocked as|blacklist|reputation|content rejected|policy rejection/i, message: "Email was rejected as spam" },
  { test: /suppress|unsubscrib/i, message: "Recipient was previously unsubscribed or blocked" },
  { test: /too large|message size|size limit|exceeds.*size/i, message: "Attachment too large to deliver" },
  { test: /temporar|deferred|greylist|try again|timed? ?out|rate ?limit|throttl|\b4\.\d\.\d\b/i, message: "Temporary delivery issue — please try again later" },
  { test: /bounce/i, message: "Email bounced — couldn't be delivered" },
];

/**
 * Friendly, client-readable reason for a failed send.
 * @param raw the stored `sendError` (may include a "Bounced: " prefix).
 * @returns a short EN message, the raw text if unmatched, or null if empty.
 */
export function friendlySendError(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  for (const rule of RULES) {
    if (rule.test.test(raw)) return rule.message;
  }
  return raw.trim();
}
