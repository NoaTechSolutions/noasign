import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { isDueInTenantTz } from '../common/tenant-date';

/**
 * Hourly scan for deferred (future-dated) documents whose issue date has arrived,
 * notifying the creator once that it's ready to finalize. Runs HOURLY (not a single
 * daily UTC midnight) so every tenant is caught close to their own local midnight —
 * "due" is evaluated per-tenant in that tenant's timezone. Idempotent: each doc is
 * notified exactly once (deferredNotifiedAt is stamped and filtered out next run).
 */
@Injectable()
export class DeferredNotifyService {
  private readonly logger = new Logger(DeferredNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron(): Promise<void> {
    await this.scanDueDeferredDocuments();
  }

  /**
   * Notify the creator of every deferred, opted-in, not-yet-notified document whose
   * issue date has been reached in the tenant's timezone — exactly once. Returns the
   * number notified. Extracted from the @Cron hook so it's unit-testable.
   */
  async scanDueDeferredDocuments(now: Date = new Date()): Promise<number> {
    const candidates = await this.prisma.document.findMany({
      where: {
        isDeferred: true,
        notifyOnIssueDate: true,
        deferredNotifiedAt: null,
        issueDate: { not: null },
      },
      select: {
        id: true,
        userId: true,
        documentNumber: true,
        issueDate: true,
        companyProfile: { select: { timezone: true } },
        documentType: { select: { code: true } },
      },
    });

    let notified = 0;
    for (const doc of candidates) {
      // Per-tenant timezone: only fire once the issue date has arrived locally.
      if (!isDueInTenantTz(doc.issueDate, doc.companyProfile?.timezone, now)) {
        continue;
      }
      const docKind =
        doc.documentType?.code === 'INVOICE' ? 'invoice' : 'receipt';
      await this.notifications.notify(doc.userId, {
        type: 'deferred_ready',
        documentId: doc.id,
        documentNumber: doc.documentNumber,
        docKind,
      });
      // Stamp BEFORE the next candidate so a re-run never double-notifies.
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { deferredNotifiedAt: now },
      });
      notified++;
    }

    if (notified > 0) {
      this.logger.log(
        `[DeferredNotify] notified ${notified} due deferred document(s)`,
      );
    }
    return notified;
  }
}
