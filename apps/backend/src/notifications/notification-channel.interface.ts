/**
 * Channel-agnostic notification layer. Today the only channel is email
 * (EmailNotificationChannel); when the in-app inbox exists, add an
 * InAppNotificationChannel implementing the SAME interface and register it — the
 * NotificationService fans out to every registered channel. Zero changes to callers.
 */

/** A notifiable event addressed to one of the app's OWN users (the creator). */
export interface NotificationEvent {
  type: 'deferred_ready';
  documentId: string;
  documentNumber: string;
  docKind: 'invoice' | 'receipt';
}

/** One delivery mechanism (email, in-app, push, …). */
export interface NotificationChannel {
  notify(userId: string, event: NotificationEvent): Promise<void>;
}

/** DI token for the array of registered channels. */
export const NOTIFICATION_CHANNELS = Symbol('NOTIFICATION_CHANNELS');
