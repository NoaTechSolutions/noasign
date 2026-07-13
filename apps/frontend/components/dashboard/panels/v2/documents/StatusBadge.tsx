'use client';

import React from 'react';
import {
  CircleDashed,
  Clock,
  Send,
  Eye,
  Signature,
  CircleCheck,
  AlertTriangle,
  X,
  Ban,
  type LucideIcon,
} from 'lucide-react';

// SINGLE SOURCE for the status system (icon + label + colour-family class). The
// colour lives in the --status-* tokens (globals.css); this maps each state to
// its family badge class + Tabler-equivalent lucide icon. Used by the table /
// mobile / modal badges, the stat cards and the status filter so the three never
// drift. Tabler → lucide mapping (the repo ships lucide-react, not the Tabler
// font): circle-dashed→CircleDashed, clock→Clock, send→Send, eye→Eye,
// signature→Signature, circle-check→CircleCheck, alert-triangle→AlertTriangle,
// x→X, ban→Ban.
export interface StatusMeta {
  icon: LucideIcon;
  label: string;
  cls: string;
  family: 'gray' | 'blue' | 'green' | 'amber' | 'red';
}

export const STATUS_META: Record<string, StatusMeta> = {
  DRAFT: { icon: CircleDashed, label: 'Draft', cls: 'doc-status-badge--draft', family: 'gray' },
  SCHEDULED: { icon: Clock, label: 'Scheduled', cls: 'doc-status-badge--scheduled', family: 'blue' },
  SENT: { icon: Send, label: 'Sent', cls: 'doc-status-badge--sent', family: 'green' },
  VIEWED: { icon: Eye, label: 'Viewed', cls: 'doc-status-badge--viewed', family: 'blue' },
  SIGNED: { icon: Signature, label: 'Signed', cls: 'doc-status-badge--signed', family: 'blue' },
  COMPLETED: { icon: CircleCheck, label: 'Completed', cls: 'doc-status-badge--completed', family: 'green' },
  SEND_FAILED: { icon: AlertTriangle, label: 'Send failed', cls: 'doc-status-badge--failed', family: 'amber' },
  CANCELLED: { icon: X, label: 'Cancelled', cls: 'doc-status-badge--cancelled', family: 'red' },
  VOID: { icon: Ban, label: 'Void', cls: 'doc-status-badge--void', family: 'red' },
};

export function statusMeta(status: string): StatusMeta {
  return STATUS_META[status.toUpperCase()] ?? STATUS_META.DRAFT;
}

/**
 * Status badge — colour family (bg + text) + icon + text, from the single
 * source. `status` may be a DocumentStatus or a derived state ('VOID',
 * 'SCHEDULED'). `title` adds a hover tooltip (e.g. the send-failed reason or the
 * scheduled date).
 */
export function StatusBadge({
  status,
  title,
}: {
  status: string;
  title?: string;
}) {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return (
    <span className={`doc-status-badge ${meta.cls}`} title={title}>
      <Icon size={12} className="doc-status-badge__icon" aria-hidden="true" />
      {meta.label}
    </span>
  );
}
