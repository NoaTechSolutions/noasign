// Canonical document/receipt status formatter — the ONE place that turns a raw
// status enum into a human label. Use this everywhere a status is shown to the
// user so "SEND_FAILED" never leaks as "Send_failed" (or worse) again.
//
// VOID is a derived receipt state (supersededAt set; the internal status stays
// SENT) — pass 'VOID' explicitly when the caller has determined it.

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
  SEND_FAILED: 'Send failed',
  VIEWED: 'Viewed',
  SIGNED: 'Signed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  VOID: 'Void',
};

/** Pretty label for any document/receipt status. Falls back to the raw value
 *  (unchanged) for anything unknown, so nothing ever renders blank. */
export function formatDocumentStatus(status: string | null | undefined): string {
  if (!status) return '';
  return STATUS_LABELS[status.toUpperCase()] ?? status;
}
