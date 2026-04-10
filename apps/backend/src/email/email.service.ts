import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export type SigningInvitationPayload = {
  to: string;
  signerName: string;
  senderName: string;
  senderCompany: string;
  documentName: string;
  documentNumber: string;
  signingUrl: string;
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

  async sendSigningInvitation(payload: SigningInvitationPayload): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[EmailService] Skipping signing invitation to ${payload.to} — Resend not configured`,
      );
      return;
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
  }

  private getAppUrl(): string {
    return (process.env.APP_URL ?? 'https://app.ntssign.com').replace(/\/$/, '');
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
                        <td style="vertical-align:middle;text-align:center;">
                          <div style="width:56px;height:56px;background:#ffffff;border-radius:14px;overflow:hidden;display:inline-block;box-shadow:0 2px 8px rgba(0,0,0,0.18);">
                            <img src="${logoUrl}" alt="NTSsign" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;" />
                          </div>
                          <div style="color:rgba(255,255,255,0.55);font-size:8px;letter-spacing:1.5px;text-transform:uppercase;margin-top:5px;white-space:nowrap;">by NoaTechSolutions</div>
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
}
