import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { EmailNotificationChannel } from './email-notification.channel';
import { NotificationService } from './notification.service';
import { DeferredNotifyService } from './deferred-notify.service';
import {
  NOTIFICATION_CHANNELS,
  NotificationChannel,
} from './notification-channel.interface';

/**
 * Notification layer. Register additional channels (e.g. a future
 * InAppNotificationChannel) in the NOTIFICATION_CHANNELS factory below — the
 * NotificationService fans out to all of them. PrismaService is global.
 */
@Module({
  imports: [EmailModule],
  providers: [
    EmailNotificationChannel,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (email: EmailNotificationChannel): NotificationChannel[] => [
        email,
        // Future: new InAppNotificationChannel(...) once the inbox exists.
      ],
      inject: [EmailNotificationChannel],
    },
    NotificationService,
    DeferredNotifyService,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
