import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  NotificationChannel,
  NotificationEvent,
} from './notification-channel.interface';

/** Email delivery of user notifications — resolves the user's own address and
 *  sends via the existing Resend-backed EmailService. */
@Injectable()
export class EmailNotificationChannel implements NotificationChannel {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async notify(userId: string, event: NotificationEvent): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) return;

    if (event.type === 'deferred_ready') {
      await this.email.sendDeferredReadyNotification({
        to: user.email,
        documentNumber: event.documentNumber,
        docKind: event.docKind,
      });
    }
  }
}
