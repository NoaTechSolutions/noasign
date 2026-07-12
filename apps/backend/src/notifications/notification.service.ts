import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NOTIFICATION_CHANNELS,
  NotificationChannel,
  NotificationEvent,
} from './notification-channel.interface';

/**
 * Dispatches a notification to EVERY registered channel. A failing channel is
 * logged and skipped so one bad channel never blocks the others. Add channels by
 * registering them under the NOTIFICATION_CHANNELS token (see NotificationsModule).
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_CHANNELS)
    private readonly channels: NotificationChannel[],
  ) {}

  async notify(userId: string, event: NotificationEvent): Promise<void> {
    for (const channel of this.channels) {
      try {
        await channel.notify(userId, event);
      } catch (err) {
        this.logger.error(
          `[NotificationService] ${channel.constructor.name} failed for user ${userId} (${event.type}): ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }
  }
}
