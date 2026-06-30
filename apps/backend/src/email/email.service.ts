import { Injectable, Logger } from '@nestjs/common';
import { Resend, type WebhookEventPayload } from 'resend';

export type SigningInvitationPayload = {
  to: string;
  signerName: string;
  senderName: string;
  senderCompany: string;
  documentName: string;
  documentNumber: string;
  signingUrl: string;
};

export type SignedConfirmationPayload = {
  to: string;
  signerName: string;
  senderCompany: string;
  documentName: string;
  documentNumber: string;
  pdfBuffer: Buffer;
};

export type SignatureProcessingPayload = {
  to: string;
  signerName: string;
  senderCompany: string;
  documentName: string;
  documentNumber: string;
};

export type ContactFormPayload = {
  name: string;
  email: string;
  message: string;
  lang?: 'en' | 'es';
};

export type LeadNotificationPayload = {
  email: string;
  source: string;
  name?: string;
  phone?: string;
  // 'captured' = step 1 (email only); 'enriched' = step 2 (name/phone added).
  stage: 'captured' | 'enriched';
};

export type PasswordResetPayload = {
  to: string;
  resetLink: string;
  firstName?: string;
};

export type AccountLockedPayload = {
  to: string;
  unlocksAtText: string;
  resetLink: string;
};

export type AccountUnlockedPayload = {
  to: string;
};

export type ReceiptPayload = {
  to: string;
  receiptNumber: string;
  clientName: string;
  companyName: string;
  pdfBuffer: Buffer;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.EMAIL_FROM ?? 'NTSsign <noreply@ntssign.com>';
    this.resend = apiKey ? new Resend(apiKey) : null;

    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY not set — email sending is disabled. Set the env var to enable.',
      );
    }
  }

  async sendSigningInvitation(
    payload: SigningInvitationPayload,
  ): Promise<{ id: string }> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping signing invitation to ${payload.to} — Resend not configured`,
      );
      // No delivery → no Resend id to correlate a later bounce against.
      return { id: '' };
    }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: payload.to,
      subject: `${payload.senderCompany} sent you a document to sign: ${payload.documentName}`,
      html: this.buildSigningInvitationHtml(payload),
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send signing invitation to ${payload.to}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Signing invitation sent to ${payload.to} (id: ${data?.id})`,
    );
    // FASE 2: return the Resend message id so the contract send can persist it
    // as providerEmailId and later correlate an async bounce webhook to it.
    return { id: data?.id ?? '' };
  }

  /**
   * Verify a Resend webhook signature (Svix) and return the parsed event.
   *
   * Resend signs webhooks with Svix headers (svix-id / svix-timestamp /
   * svix-signature). resend.webhooks.verify() wraps the Svix verification — it
   * is SYNCHRONOUS and THROWS on a bad/expired signature (it does not return a
   * boolean). We translate any failure — including missing config — into null
   * so the controller can answer 4xx without leaking why.
   */
  verifyResendWebhook(
    rawBody: Buffer | string | undefined,
    svixHeaders: {
      'svix-id'?: string;
      'svix-timestamp'?: string;
      'svix-signature'?: string;
    },
  ): WebhookEventPayload | null {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (!this.resend || !webhookSecret || !rawBody) {
      if (!webhookSecret) {
        this.logger.warn(
          '[EmailService] RESEND_WEBHOOK_SECRET not set — rejecting Resend webhook',
        );
      }
      return null;
    }

    try {
      // resend.webhooks.verify expects the raw Svix values (id/timestamp/
      // signature) as a plain object — it rebuilds the svix-* headers and
      // feeds Svix internally. NOT the Web Headers class.
      return this.resend.webhooks.verify({
        payload:
          typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8'),
        headers: {
          id: svixHeaders['svix-id'] ?? '',
          timestamp: svixHeaders['svix-timestamp'] ?? '',
          signature: svixHeaders['svix-signature'] ?? '',
        },
        webhookSecret,
      });
    } catch (err) {
      this.logger.warn(
        `[EmailService] Resend webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  async sendSignedConfirmation(
    payload: SignedConfirmationPayload,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping signed confirmation to ${payload.to} — Resend not configured`,
      );
      return;
    }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: payload.to,
      subject: `Signed: ${payload.documentName} — your copy is ready`,
      html: this.buildSignedConfirmationHtml(payload),
      attachments: [
        { filename: `${payload.documentName}.pdf`, content: payload.pdfBuffer },
      ],
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send signed confirmation to ${payload.to}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Signed confirmation sent to ${payload.to} (id: ${data?.id})`,
    );
  }

  async sendReceipt(payload: ReceiptPayload): Promise<{ id: string }> {
    if (!this.resend) {
      this.logger.error(
        `[EmailService] Cannot send receipt ${payload.receiptNumber} to ${payload.to} — Resend not configured`,
      );
      // FASE 1: surface this as a failure so the caller marks the receipt
      // SEND_FAILED instead of leaving a false "sent" state on a silent skip.
      throw new Error(
        'Email sending is not configured (RESEND_API_KEY missing)',
      );
    }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: payload.to,
      subject: `Payment receipt ${payload.receiptNumber} from ${payload.companyName}`,
      html: this.buildReceiptHtml(payload),
      attachments: [
        {
          filename: `${payload.receiptNumber}.pdf`,
          content: payload.pdfBuffer,
        },
      ],
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send receipt ${payload.receiptNumber} to ${payload.to}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Receipt ${payload.receiptNumber} sent to ${payload.to} (id: ${data?.id})`,
    );
    return { id: data?.id ?? '' };
  }

  async sendSignatureProcessing(
    payload: SignatureProcessingPayload,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping signature processing notice to ${payload.to} — Resend not configured`,
      );
      return;
    }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: payload.to,
      subject: `Your signed copy of ${payload.documentName} is on its way`,
      html: this.buildSignatureProcessingHtml(payload),
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send signature processing notice to ${payload.to}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Signature processing notice sent to ${payload.to} (id: ${data?.id})`,
    );
  }

  async sendContactForm(payload: ContactFormPayload): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping contact form from ${payload.email} — Resend not configured`,
      );
      return;
    }

    const to = process.env.CONTACT_FORM_TO ?? 'contact@noatechsolutions.com';

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to,
      replyTo: payload.email,
      subject: `New contact from NTSsign — ${payload.name}`,
      html: this.buildContactFormHtml(payload),
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send contact form from ${payload.email}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Contact form sent from ${payload.email} to ${to} (id: ${data?.id})`,
    );
  }

  /**
   * Internal heads-up when a marketing lead is captured (step 1) or enriched
   * with name/phone (step 2). Goes to LEADS_NOTIFY_TO (defaults to the owner
   * inbox). Throws on delivery error — the caller (LeadsService) treats this as
   * best-effort and swallows it so lead capture never fails on email problems.
   */
  async sendLeadNotification(payload: LeadNotificationPayload): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping lead notification for ${payload.email} — Resend not configured`,
      );
      return;
    }

    const to = process.env.LEADS_NOTIFY_TO ?? 'noatechsolutions@gmail.com';
    const subject =
      payload.stage === 'enriched'
        ? `Lead updated — ${payload.email}`
        : `New NTSsign lead — ${payload.email}`;

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to,
      replyTo: payload.email,
      subject,
      html: this.buildLeadNotificationHtml(payload),
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send lead notification for ${payload.email}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Lead notification (${payload.stage}) sent for ${payload.email} to ${to} (id: ${data?.id})`,
    );
  }

  private buildLeadNotificationHtml(p: LeadNotificationPayload): string {
    const timestamp = new Date().toISOString();
    const email = escapeHtml(p.email);
    const source = escapeHtml(p.source);
    const name = p.name ? escapeHtml(p.name) : '—';
    const phone = p.phone ? escapeHtml(p.phone) : '—';
    const heading =
      p.stage === 'enriched'
        ? 'Lead updated (step 2 — details added)'
        : 'New lead captured (step 1 — email)';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(2,41,119,0.06);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
              <div style="color:#6b7280;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">NTSsign leads</div>
              <div style="color:#111827;font-size:18px;font-weight:700;margin-top:4px;">${heading}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;width:120px;vertical-align:top;">Email</td>
                  <td style="padding:8px 0;color:#111827;"><a href="mailto:${email}" style="color:#0400f0;text-decoration:none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Name</td>
                  <td style="padding:8px 0;color:#111827;font-weight:500;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Phone</td>
                  <td style="padding:8px 0;color:#111827;">${phone}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Source</td>
                  <td style="padding:8px 0;color:#111827;">${source}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Received</td>
                  <td style="padding:8px 0;color:#111827;font-family:monospace;font-size:12px;">${escapeHtml(timestamp)}</td>
                </tr>
              </table>
              <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">
                Reply directly to this email to reach the lead.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendPasswordResetEmail(payload: PasswordResetPayload): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping password reset email to ${payload.to} — Resend not configured`,
      );
      return;
    }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: payload.to,
      subject: 'Reset your NTSsign password',
      html: this.buildPasswordResetHtml(payload),
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send password reset email to ${payload.to}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Password reset email sent to ${payload.to} (id: ${data?.id})`,
    );
  }

  private getAppUrl(): string {
    return (process.env.APP_URL ?? 'https://app.ntssign.com').replace(
      /\/$/,
      '',
    );
  }

  private buildContactFormHtml(p: ContactFormPayload): string {
    const timestamp = new Date().toISOString();
    const lang = p.lang ?? 'en';
    const name = escapeHtml(p.name);
    const email = escapeHtml(p.email);
    const messageHtml = escapeHtml(p.message).replace(/\n/g, '<br/>');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New contact form submission</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(2,41,119,0.06);">
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
              <div style="color:#6b7280;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">NTSsign landing</div>
              <div style="color:#111827;font-size:18px;font-weight:700;margin-top:4px;">New contact form submission</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.6;">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;width:120px;vertical-align:top;">Name</td>
                  <td style="padding:8px 0;color:#111827;font-weight:500;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Email</td>
                  <td style="padding:8px 0;color:#111827;"><a href="mailto:${email}" style="color:#0400f0;text-decoration:none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Language</td>
                  <td style="padding:8px 0;color:#111827;">${escapeHtml(lang)}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#6b7280;vertical-align:top;">Received</td>
                  <td style="padding:8px 0;color:#111827;font-family:monospace;font-size:12px;">${escapeHtml(timestamp)}</td>
                </tr>
              </table>
              <div style="margin-top:20px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <div style="color:#6b7280;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px;">Message</div>
                <div style="color:#111827;font-size:14px;line-height:1.6;white-space:pre-wrap;">${messageHtml}</div>
              </div>
              <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">
                Reply directly to this email to answer ${name}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildPasswordResetHtml(p: PasswordResetPayload): string {
    const appUrl = this.getAppUrl();
    const logoUrl = `${appUrl}/ntssign-logo-light.svg`;
    const name = p.firstName ? escapeHtml(p.firstName) : 'there';
    const resetLink = p.resetLink;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(2,41,119,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#05a5ff 0%,#022977 60%,#0400f0 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="width:56px;height:56px;background:#ffffff;border-radius:14px;overflow:hidden;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                            <img src="${logoUrl}" alt="NTSsign" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;" />
                          </div>
                          <div style="color:rgba(255,255,255,0.55);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-top:5px;">by NoaTechSolutions</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 12px;color:rgba(255,255,255,0.8);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Password Reset</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Hi ${name},</p>
              <h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.5px;">
                Reset your NTSsign password
              </h1>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                We received a request to reset your NTSsign password.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#022977;border-radius:12px;">
                    <a href="${resetLink}" target="_blank" style="display:inline-block;padding:16px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;color:#6b7280;font-size:13px;line-height:1.6;">
                This link expires in 30 minutes.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                NTSsign \u2014 Electronic Signature
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSigningInvitationHtml(p: SigningInvitationPayload): string {
    const appUrl = this.getAppUrl();
    const logoUrl = `${appUrl}/ntssign-logo-light.svg`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document ready to sign</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(2,41,119,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#05a5ff 0%,#022977 60%,#0400f0 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="width:56px;height:56px;background:#ffffff;border-radius:14px;overflow:hidden;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                            <img src="${logoUrl}" alt="NTSsign" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;" />
                          </div>
                          <div style="color:rgba(255,255,255,0.55);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-top:5px;">by NoaTechSolutions</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:6px 12px;color:rgba(255,255,255,0.8);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Signature Request</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Hello${p.signerName ? `, ${p.signerName}` : ''},</p>
              <h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.5px;">
                You have a document ready to sign
              </h1>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                <strong style="color:#111827;">${p.senderName}</strong> from
                <strong style="color:#111827;">${p.senderCompany}</strong> has sent you
                a document that requires your electronic signature.
              </p>

              <!-- Document card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="color:#6b7280;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Document</div>
                    <div style="color:#111827;font-size:16px;font-weight:600;">${p.documentName}</div>
                    <div style="color:#6b7280;font-size:12px;margin-top:4px;">Ref: ${p.documentNumber}</div>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#ff9900,#e67e00);border-radius:12px;">
                    <a href="${p.signingUrl}" target="_blank" style="display:inline-block;padding:16px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                      Review and Sign Document →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
                This link is unique to you. Please do not share it with others.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you have questions about this document, please contact
                <strong>${p.senderName}</strong> at <strong>${p.senderCompany}</strong> directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                      This email was sent by <strong>NTSsign</strong> on behalf of ${p.senderCompany}.
                      NTSsign provides electronic signature and document management services.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSignatureProcessingHtml(p: SignatureProcessingPayload): string {
    const appUrl = this.getAppUrl();
    const logoUrl = `${appUrl}/ntssign-logo-light.svg`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your signed document is on its way</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(2,41,119,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#05a5ff 0%,#022977 60%,#0400f0 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="width:56px;height:56px;background:#ffffff;border-radius:14px;overflow:hidden;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                            <img src="${logoUrl}" alt="NTSsign" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;" />
                          </div>
                          <div style="color:rgba(255,255,255,0.55);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-top:5px;">by NoaTechSolutions</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <div style="background:rgba(234,179,8,0.18);border:1px solid rgba(234,179,8,0.35);border-radius:8px;padding:6px 12px;color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">✓ Signed</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Hello${p.signerName ? `, ${p.signerName}` : ''},</p>
              <h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.5px;">
                Your signature was received
              </h1>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                We're finalizing your signed copy of <strong style="color:#111827;">${p.documentName}</strong>.
                You'll receive a follow-up email with the document attached shortly.
              </p>

              <!-- Document card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="color:#6b7280;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Document</div>
                    <div style="color:#111827;font-size:16px;font-weight:600;">${p.documentName}</div>
                    <div style="color:#6b7280;font-size:12px;margin-top:4px;">Ref: ${p.documentNumber}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you have questions about this document, please contact
                <strong>${p.senderCompany}</strong> directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                This email was sent by <strong>NTSsign</strong> on behalf of ${p.senderCompany}.
                NTSsign provides electronic signature and document management services.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildSignedConfirmationHtml(p: SignedConfirmationPayload): string {
    const appUrl = this.getAppUrl();
    const logoUrl = `${appUrl}/ntssign-logo-light.svg`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Document signed</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(2,41,119,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#05a5ff 0%,#022977 60%,#0400f0 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="width:56px;height:56px;background:#ffffff;border-radius:14px;overflow:hidden;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                            <img src="${logoUrl}" alt="NTSsign" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;" />
                          </div>
                          <div style="color:rgba(255,255,255,0.55);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-top:5px;">by NoaTechSolutions</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <div style="background:rgba(34,197,94,0.18);border:1px solid rgba(34,197,94,0.35);border-radius:8px;padding:6px 12px;color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">✓ Signed</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Hello${p.signerName ? `, ${p.signerName}` : ''},</p>
              <h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.5px;">
                Your document has been signed
              </h1>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                The signing process for the document below has been completed successfully.
                A copy of the signed document is attached to this email.
              </p>

              <!-- Document card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="color:#6b7280;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Document</div>
                    <div style="color:#111827;font-size:16px;font-weight:600;">${p.documentName}</div>
                    <div style="color:#6b7280;font-size:12px;margin-top:4px;">Ref: ${p.documentNumber}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you have questions about this document, please contact
                <strong>${p.senderCompany}</strong> directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                This email was sent by <strong>NTSsign</strong> on behalf of ${p.senderCompany}.
                NTSsign provides electronic signature and document management services.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // Mirrors the contract emails' branding (gradient header + logo + card +
  // footer), adapted for a payment receipt.
  private buildReceiptHtml(p: ReceiptPayload): string {
    const appUrl = this.getAppUrl();
    const logoUrl = `${appUrl}/ntssign-logo-light.svg`;
    const company = escapeHtml(p.companyName);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment receipt</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(2,41,119,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#05a5ff 0%,#022977 60%,#0400f0 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="width:56px;height:56px;background:#ffffff;border-radius:14px;overflow:hidden;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                            <img src="${logoUrl}" alt="NTSsign" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;" />
                          </div>
                          <div style="color:rgba(255,255,255,0.55);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-top:5px;">by NoaTechSolutions</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.35);border-radius:8px;padding:6px 12px;color:rgba(255,255,255,0.9);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Receipt</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Hello${p.clientName ? `, ${escapeHtml(p.clientName)}` : ''},</p>
              <h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.5px;">
                Your payment receipt
              </h1>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                Thank you for your payment. Your receipt from ${company} is attached
                to this email as a PDF.
              </p>

              <!-- Receipt card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="color:#6b7280;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">Receipt</div>
                    <div style="color:#111827;font-size:16px;font-weight:600;">${escapeHtml(p.receiptNumber)}</div>
                    <div style="color:#6b7280;font-size:12px;margin-top:4px;">${company}</div>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you have questions about this payment, please contact
                <strong>${company}</strong> directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                This email was sent by <strong>NTSsign</strong> on behalf of ${company}.
                NTSsign provides electronic signature and document management services.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendAccountLockedEmail(payload: AccountLockedPayload): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping account-locked email to ${payload.to} — Resend not configured`,
      );
      return;
    }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: payload.to,
      subject: 'Your NTSsign account was locked',
      html: this.buildAccountLockedHtml(payload),
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send account-locked email to ${payload.to}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Account-locked email sent to ${payload.to} (id: ${data?.id})`,
    );
  }

  async sendAccountUnlockedEmail(
    payload: AccountUnlockedPayload,
  ): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping account-unlocked email to ${payload.to} — Resend not configured`,
      );
      return;
    }

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: payload.to,
      subject: 'Your NTSsign account was unlocked',
      html: this.buildAccountUnlockedHtml(),
    });

    if (error) {
      this.logger.error(
        `[EmailService] Failed to send account-unlocked email to ${payload.to}: ${JSON.stringify(error)}`,
      );
      throw new Error(`Email delivery failed: ${error.message}`);
    }

    this.logger.log(
      `[EmailService] Account-unlocked email sent to ${payload.to} (id: ${data?.id})`,
    );
  }

  private buildAccountLockedHtml(p: AccountLockedPayload): string {
    const appUrl = this.getAppUrl();
    const logoUrl = `${appUrl}/ntssign-logo-light.svg`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account locked</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(2,41,119,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#05a5ff 0%,#022977 60%,#0400f0 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="width:56px;height:56px;background:#ffffff;border-radius:14px;overflow:hidden;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                            <img src="${logoUrl}" alt="NTSsign" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;" />
                          </div>
                          <div style="color:rgba(255,255,255,0.55);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-top:5px;">by NoaTechSolutions</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <div style="background:rgba(220,38,38,0.18);border:1px solid rgba(220,38,38,0.4);border-radius:8px;padding:6px 12px;color:#ffffff;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Account Locked</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.5px;">
                Your account was temporarily locked
              </h1>
              <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
                We locked your NTSsign account because of too many failed login
                attempts. It will unlock automatically <strong>${p.unlocksAtText}</strong>.
              </p>
              <p style="margin:0 0 28px;color:#4b5563;font-size:15px;line-height:1.6;">
                If this was you (you forgot the password), you can wait it out —
                or reset your password now and skip the wait.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#dc2626;border-radius:12px;">
                    <a href="${p.resetLink}" target="_blank" style="display:inline-block;padding:16px 36px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.2px;">
                      Wasn't me — reset password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you didn't try to sign in, someone else is. Reset your
                password immediately and consider rotating it elsewhere if you
                reuse it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                NTSsign — Electronic Signature
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private buildAccountUnlockedHtml(): string {
    const appUrl = this.getAppUrl();
    const logoUrl = `${appUrl}/ntssign-logo-light.svg`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Account unlocked</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(2,41,119,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#05a5ff 0%,#022977 60%,#0400f0 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;">
                          <div style="width:56px;height:56px;background:#ffffff;border-radius:14px;overflow:hidden;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                            <img src="${logoUrl}" alt="NTSsign" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;" />
                          </div>
                          <div style="color:rgba(255,255,255,0.55);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-top:5px;">by NoaTechSolutions</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right">
                    <div style="background:rgba(34,197,94,0.18);border:1px solid rgba(34,197,94,0.4);border-radius:8px;padding:6px 12px;color:#ffffff;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">✓ Unlocked</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.5px;">
                Your account was unlocked
              </h1>
              <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
                An administrator manually unlocked your NTSsign account. You can
                sign in again.
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                If you didn't expect this — or you didn't contact support — let
                us know right away.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6;">
                NTSsign — Electronic Signature
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
