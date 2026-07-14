'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { X, User, FileText, Calendar, FileSignature, DollarSign, MapPin, Wrench, Pencil, AlertTriangle } from 'lucide-react';
import { friendlySendError } from '@/lib/send-error';
import toast from 'react-hot-toast';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { formatUsPhone } from '@/lib/format-phone';
import { formatState } from '@/lib/format-text';
import { FieldRow } from '@/components/dashboard/shared/ui';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { ConfirmActionModal } from '@/components/dashboard/shared/ConfirmActionModal';
import { ReceiptEditPopup } from './ReceiptEditPopup';
import { InvoiceEditPopup } from './InvoiceEditPopup';
import { WizardToggleRow } from './wizard/shell/WizardToggleRow';
import type {
  V2DocumentItem,
  V2DocumentAction,
  DocumentDetail,
  SchemaField,
  SchemaSection,
} from './types';
import { isDeferredPending, invoiceRecipientName } from './types';
import { StatusBadge } from './StatusBadge';
import { FINANCE_COLORS, FinanceCard } from './finance-cards';
import { CurrencyInput } from './CurrencyInput';
import { forceTwoDecimals } from './currency';

// Canvas PDF viewer (pdf.js). Client-only — never SSR pdf.js.
const PdfCanvasViewer = dynamic(() => import('./PdfCanvasViewer'), {
  ssr: false,
  loading: () => <div className="doc-detail-modal__hint">Loading PDF…</div>,
});

interface DocumentDetailModalProps {
  documentId: string;
  // List item for an instant header while the full detail loads.
  listItem?: V2DocumentItem | null;
  // Tab to open on mount (e.g. 'pdf' when triggered from the kebab "Preview PDF").
  initialTab?: string;
  onClose: () => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
  onFetchDocument: (docId: string) => Promise<DocumentDetail>;
  onFetchPdfUrl?: (docId: string) => Promise<string>;
  onUpdateDraft?: (
    docId: string,
    payload: { contractDate: string; dataJson: Record<string, unknown> },
  ) => Promise<void>;
  // Receipt-specific (DIRECT_PDF): the PDF is always available (regenerated on
  // the fly), edit is allowed in DRAFT/SEND_FAILED, and uses a receipt-specific
  // edit popup + fetcher instead of the BoldSign contract flow.
  isReceipt?: boolean;
  // Invoice-specific (DIRECT_PDF, code INVOICE): schema sections billed_to /
  // service / pricing rendered with a bespoke layout (NOT the contract pricing
  // groups), edit reopens the wizard prefilled, and the PDF tab is shown only
  // once the invoice is SENT (regenerated from a dedicated endpoint).
  isInvoice?: boolean;
  onFetchInvoicePdf?: (docId: string) => Promise<string>;
  // Edit a DRAFT invoice in place (PATCH /documents/invoice/:id) — mirrors the
  // receipt edit popup instead of reopening the full creation wizard.
  onUpdateInvoice?: (
    docId: string,
    payload: {
      data: Record<string, string>;
      customerId?: string;
      notifyOnIssueDate?: boolean;
    },
  ) => Promise<void>;
  onUpdateReceipt?: (
    docId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  // Reissue (2c): create a corrected copy of a SENT receipt + void the original.
  onReissueReceipt?: (
    docId: string,
    payload: Record<string, unknown>,
  ) => Promise<void>;
  // Auto-open the reissue form on mount (when opened via the kebab "Reissue").
  autoOpenReissue?: boolean;
  // C6: auto-open the billed-to edit on mount (kebab "Change send date" on a
  // scheduled doc) — the date lives in that section.
  autoOpenDateEdit?: boolean;
  onFetchReceiptPdf?: (docId: string) => Promise<string>;
  // Manual "Sync status" (BoldSign provider pull) is a fallback to the webhook;
  // restricted to SUPERADMIN (support/admin) so regular users don't see it in prod.
  isSuperadmin?: boolean;
}

// Editable field groups (per card) — drives both readOnly display and the
// GroupEditPopup. Hardcoded for the construction-contract form; unknown tabs
// fall back to schema-driven single-card rendering.
interface CardField {
  key: string;
  label: string;
  type: string;
}
interface CardGroup {
  key?: string;
  label: string;
  icon: React.ReactNode;
  fields: CardField[];
  accent?: { color: string; bg: string; border?: string };
}


// Contract edit popup field sets (the toggle gates the finance ones).
const CONTRACT_BASE_FIELDS: CardField[] = [
  { key: 'contract_amount', label: 'Contract amount', type: 'currency' },
  { key: 'down_payment_amount', label: 'Down payment', type: 'currency' },
];
const FINANCE_CHARGE_FIELD: CardField = { key: 'finance_charge', label: 'Finance charge', type: 'currency' };
const financeFieldKeys = (n: number) => [
  `finance_${n}_amount`,
  `finance_${n}_description`,
  `finance_${n}_date`,
];
const ALL_FINANCE_KEYS = [
  'finance_charge',
  ...[1, 2, 3, 4].flatMap((n) => financeFieldKeys(n)),
];

const CLIENT_GROUPS: CardGroup[] = [
  {
    label: 'Customer',
    icon: <User size={14} />,
    fields: [
      { key: 'customer_name', label: 'Full name', type: 'text' },
      { key: 'customer_age', label: 'Age', type: 'number' },
      { key: 'customer_email', label: 'Email', type: 'email' },
      { key: 'customer_phone', label: 'Phone', type: 'phone' },
      { key: 'customer_fax', label: 'Fax', type: 'phone' },
    ],
  },
  {
    label: 'Address',
    icon: <MapPin size={14} />,
    fields: [
      { key: 'customer_address', label: 'Address', type: 'text' },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State', type: 'state' },
      { key: 'zip', label: 'ZIP code', type: 'text' },
    ],
  },
];

const PROJECT_GROUPS: CardGroup[] = [
  {
    label: 'Project Details',
    icon: <Wrench size={14} />,
    fields: [
      { key: 'start_date', label: 'Start date', type: 'date' },
      { key: 'estimated_completion_date', label: 'Est. completion', type: 'date' },
      { key: 'project_description', label: 'Description', type: 'textarea' },
      { key: 'contract_scope', label: 'Contract scope', type: 'textarea' },
    ],
  },
  {
    label: 'Project Address',
    icon: <MapPin size={14} />,
    fields: [
      { key: 'project_address', label: 'Address', type: 'text' },
      { key: 'project_city', label: 'City', type: 'text' },
      { key: 'project_state', label: 'State', type: 'state' },
      { key: 'project_zip', label: 'ZIP code', type: 'text' },
    ],
  },
];

const OTHERS_GROUPS: CardGroup[] = [
  {
    label: 'Other Details',
    icon: <FileText size={14} />,
    fields: [
      { key: 'salesman_full_name', label: 'Salesman', type: 'text' },
      { key: 'state_registration_number', label: 'State reg. number', type: 'text' },
      { key: 'warranty_years', label: 'Warranty (years)', type: 'number' },
    ],
  },
];

const CONTRACT_GROUP: CardGroup = {
  key: 'contract',
  label: 'Contract',
  icon: <DollarSign size={14} />,
  fields: [
    { key: 'contract_amount', label: 'Contract amount', type: 'currency' },
    { key: 'down_payment_amount', label: 'Down payment', type: 'currency' },
    { key: 'finance_charge', label: 'Finance charge', type: 'currency' },
  ],
};

function buildPricingGroups(dataJson: Record<string, unknown>): CardGroup[] {
  const hasFinance = (n: number) =>
    [`finance_${n}_amount`, `finance_${n}_description`, `finance_${n}_date`].some(
      (k) => dataJson[k] != null && dataJson[k] !== '',
    );
  const groups: CardGroup[] = [CONTRACT_GROUP];
  for (const n of [1, 2, 3, 4]) {
    if (!hasFinance(n)) continue;
    const c = FINANCE_COLORS[n];
    groups.push({
      key: `finance-${n}`,
      label: `Finance ${n}`,
      icon: (
        <span style={{ fontSize: 15, lineHeight: 1, color: c.color, fontWeight: 600 }}>
          {c.label}
        </span>
      ),
      accent: { color: c.color, bg: c.bg, border: c.border },
      fields: [
        { key: `finance_${n}_amount`, label: 'Amount', type: 'currency' },
        { key: `finance_${n}_description`, label: 'Description', type: 'text' },
        { key: `finance_${n}_date`, label: 'Date', type: 'date' },
      ],
    });
  }
  return groups;
}

function getGroupsForTab(
  tabKey: string,
  dataJson: Record<string, unknown>,
): CardGroup[] | null {
  switch (tabKey) {
    case 'client':
      return CLIENT_GROUPS;
    case 'project':
      return PROJECT_GROUPS;
    case 'pricing':
      return buildPricingGroups(dataJson);
    case 'others':
      return OTHERS_GROUPS;
    default:
      return null;
  }
}

const FALLBACK_SECTIONS: SchemaSection[] = [
  { key: 'client', label: 'Client', fields: [] },
  { key: 'details', label: 'Details', fields: [] },
];

function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatValue(field: SchemaField, raw: unknown): string {
  if (raw == null || raw === '') return '';
  const s = String(raw);
  switch (field.type) {
    case 'currency': {
      const n = Number(s.replace(/[^0-9.-]/g, ''));
      return Number.isFinite(n)
        ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
        : s;
    }
    case 'date': {
      // G2: an ISO yyyy-mm-dd string must be parsed as a LOCAL calendar date.
      // `new Date('2026-07-20')` is spec'd as UTC midnight, which toLocaleDateString
      // then renders a DAY EARLIER in any negative-offset timezone — so an invoice
      // event date (stored ISO by the wizard) showed the day before the saved value,
      // making edits look like they never took. US MM/DD/YYYY already parses local.
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const d = iso
        ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
        : new Date(s);
      return Number.isNaN(d.getTime())
        ? s
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    case 'select':
      return field.options?.find((o) => o.value === s)?.label ?? s;
    default:
      return s;
  }
}

const SECTION_ICONS: Record<string, React.ReactNode> = {
  client: <User size={14} />,
  project: <FileText size={14} />,
  pricing: <FileText size={14} />,
};

export function DocumentDetailModal({
  documentId,
  listItem,
  initialTab,
  onClose,
  onAction,
  onFetchDocument,
  onFetchPdfUrl,
  onUpdateDraft,
  isReceipt = false,
  isInvoice = false,
  onFetchInvoicePdf,
  onUpdateInvoice,
  onUpdateReceipt,
  onReissueReceipt,
  autoOpenReissue = false,
  autoOpenDateEdit = false,
  onFetchReceiptPdf,
  isSuperadmin = false,
}: DocumentDetailModalProps) {
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(initialTab ?? '');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  // Per-card edit (DRAFT only).
  const [editGroup, setEditGroup] = useState<CardGroup | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [editDirty, setEditDirty] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [financeOn, setFinanceOn] = useState(false);
  // Receipt edit popup (DRAFT/SEND_FAILED only — a SENT receipt is immutable).
  const [receiptEditOpen, setReceiptEditOpen] = useState(false);
  // Invoice edit popup (DRAFT only — mirrors the receipt edit flow: in-place
  // PATCH over the detail, never a re-created document). Holds the SECTION being
  // edited so the popup is scoped to it (like the contract GroupEditPopup), not
  // the whole invoice.
  const [invoiceEditSection, setInvoiceEditSection] = useState<SchemaSection | null>(null);
  // Reissue popup (SENT receipt only — corrects + voids the original).
  const [reissueOpen, setReissueOpen] = useState(false);
  // Irreversible-action warning shown before the reissue form opens.
  const [reissueConfirm, setReissueConfirm] = useState(false);

  useBlockScroll();

  // Keep the latest fetcher in a ref so loadDetail depends ONLY on documentId —
  // the modal never re-fetches just because the parent re-rendered and passed a
  // new onFetchDocument identity (e.g. the 10s live-document poll). Belt-and-
  // suspenders on top of the page.tsx memoization.
  const fetchRef = useRef(onFetchDocument);
  useEffect(() => {
    fetchRef.current = onFetchDocument;
  });

  // Same ref trick for the PDF fetcher, so the PDF-load effect depends only on
  // [activeTab, documentId] — never on the fetcher identity or pdf state.
  const fetchPdfRef = useRef(onFetchPdfUrl);
  useEffect(() => {
    fetchPdfRef.current = onFetchPdfUrl;
  });
  // Receipts fetch their PDF from a different endpoint (regenerated on the fly).
  const fetchReceiptPdfRef = useRef(onFetchReceiptPdf);
  useEffect(() => {
    fetchReceiptPdfRef.current = onFetchReceiptPdf;
  });
  // Invoices regenerate their PDF from their own endpoint (GET /documents/invoice/:id/pdf).
  const fetchInvoicePdfRef = useRef(onFetchInvoicePdf);
  useEffect(() => {
    fetchInvoicePdfRef.current = onFetchInvoicePdf;
  });

  const loadDetail = useCallback(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    setLoading(true);
    setError(null);

    // B1: a just-created doc can hit a backend still recompiling (dev) or a brief
    // network blip — fetch rejects with a bare TypeError (no HTTP status). Retry
    // those transiently with backoff (loading stays up) before surfacing a hard
    // error. A real error (an HTTP status, e.g. 404) is shown immediately.
    const MAX_RETRIES = 4;
    const attempt = (n: number) => {
      fetchRef.current(documentId)
        .then((d) => {
          if (!cancelled) {
            setDetail(d);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const hasStatus =
            typeof err === 'object' && err !== null && 'status' in err;
          if (!hasStatus && n < MAX_RETRIES) {
            timer = setTimeout(
              () => {
                if (!cancelled) attempt(n + 1);
              },
              400 * 2 ** n,
            );
            return;
          }
          setError(
            err instanceof Error ? err.message : 'Could not load document',
          );
          setLoading(false);
        });
    };
    attempt(0);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [documentId]);

  // Bumped by the "Try again" button to force a fresh load after a hard failure.
  const [reloadNonce, setReloadNonce] = useState(0);
  useEffect(() => loadDetail(), [loadDetail, reloadNonce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't close the detail on Escape while a child editor/confirm popup is
      // open — that popup owns Escape and gates it behind the unsaved-changes
      // check. Closing the detail here would unmount the editor and drop the
      // changes without a warning (the ESC bug).
      if (
        e.key === 'Escape' &&
        !editGroup &&
        !receiptEditOpen &&
        !invoiceEditSection &&
        !reissueOpen &&
        !reissueConfirm
      ) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editGroup, receiptEditOpen, invoiceEditSection, reissueOpen, reissueConfirm]);

  // Header info — prefer the loaded detail, fall back to the list item.
  const status = (detail?.status ?? listItem?.status ?? 'DRAFT') as string;
  const number = detail?.documentNumber ?? listItem?.documentNumber ?? '';
  const tenant = detail?.companyProfile?.companyName ?? '';
  const headerDate = fmtDate(detail?.contractDate ?? detail?.createdAt ?? listItem?.createdAt);
  const isSigned = status === 'SIGNED' || status === 'COMPLETED';
  // A deferred (future-dated) doc waiting for its issue date — the list item
  // carries isDeferred/issueDate; the detail payload doesn't, so read the list
  // item. Drives the "Scheduled" badge (teal) and gates the footer Send.
  const scheduled = listItem ? isDeferredPending(listItem) : false;

  const sections =
    detail?.formDefinition?.schemaJson?.sections?.length
      ? detail.formDefinition.schemaJson.sections
      : FALLBACK_SECTIONS;

  const tabs = [
    ...sections.map((s) => ({ key: s.key, label: s.label })),
    { key: 'timeline', label: 'Timeline' },
    // Contracts: PDF only once signed. Receipts: always (regenerated on the fly).
    // Invoices: only once SENT (a draft/scheduled invoice has no issued PDF yet).
    ...(isSigned || isReceipt || (isInvoice && status === 'SENT')
      ? [{ key: 'pdf', label: isInvoice ? 'Preview' : 'PDF' }]
      : []),
  ];

  // Default to the first tab; reset if the current tab no longer exists (e.g.
  // the real schema replaced the fallback sections after the fetch resolved).
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  // Load the PDF blob URL when the PDF tab opens.
  // IMPORTANT: deps are ONLY [activeTab, documentId]. The previous version also
  // depended on pdfUrl/pdfLoading while mutating them inside — so setPdfLoading(true)
  // re-ran the effect, whose cleanup cancelled the in-flight fetch, leaving
  // pdfLoading stuck true forever ("Loading preview…" never resolved).
  useEffect(() => {
    if (activeTab !== 'pdf') return;
    // Invoices and receipts each regenerate from their own endpoint; contracts
    // use the signed final-pdf.
    const fetcher =
      isInvoice && fetchInvoicePdfRef.current
        ? fetchInvoicePdfRef.current
        : isReceipt && fetchReceiptPdfRef.current
          ? fetchReceiptPdfRef.current
          : fetchPdfRef.current;
    if (!fetcher) return;
    let cancelled = false;
    setPdfLoading(true);
    fetcher(documentId)
      .then((url) => {
        if (!cancelled) setPdfUrl(url);
      })
      .catch(() => {
        if (!cancelled) setPdfUrl(null);
      })
      .finally(() => {
        if (!cancelled) setPdfLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, documentId, isReceipt, isInvoice]);

  // Revoke the blob URL when it's replaced or the modal unmounts (avoid leaks).
  useEffect(() => {
    return () => {
      if (pdfUrl?.startsWith('blob:')) window.URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const runAction = (action: V2DocumentAction) => {
    void onAction(action, documentId);
    if (action === 'sync') {
      loadDetail();
      return;
    }
    // These keep the detail open: the PDF actions act in-place, and
    // cancel/discard/(contract & receipt) send open a confirmation popup that the
    // panel owns — it closes this modal once confirmed. Invoice send is optimistic
    // (no confirm popup), so it falls through and closes the modal itself.
    // C5: a send with no email on file is blocked by the panel (it shows a
    // warning and never sends) — keep the detail open so the warning isn't left
    // hanging over a closed modal. Same email source as the panel's B6 guard.
    const dj = detail?.data?.dataJson as Record<string, unknown> | undefined;
    const rawEmail = isInvoice ? dj?.recipient_email : dj?.email;
    const hasEmail = Boolean(
      (
        listItem?.customer?.email ||
        (typeof rawEmail === 'string' ? rawEmail : '')
      ).trim(),
    );
    const keepsOpen =
      action === 'download' ||
      action === 'preview' ||
      action === 'cancel' ||
      action === 'discard' ||
      action === 'delete' ||
      action === 'sendNow' ||
      (action === 'send' && (!isInvoice || !hasEmail));
    if (!keepsOpen) onClose();
  };

  const dataJson = detail?.data?.dataJson ?? {};
  const canEdit = status === 'DRAFT' && Boolean(onUpdateDraft);
  // Receipts edit via their own popup, allowed in DRAFT or SEND_FAILED only.
  const canEditReceipt =
    isReceipt &&
    (status === 'DRAFT' || status === 'SEND_FAILED') &&
    Boolean(onUpdateReceipt);
  // Invoices edit in place via InvoiceEditPopup (mirrors the receipt edit flow:
  // a compact popup over the detail that PATCHes the SAME document). The backend
  // only allows editing a DRAFT invoice (incl. scheduled), so gate on DRAFT.
  const canEditInvoice = isInvoice && status === 'DRAFT' && Boolean(onUpdateInvoice);

  // Reissue (2c): a SENT receipt is corrected by reissuing (never edited). Once
  // voided (supersededAt) it can't be reissued again.
  const isVoided = (isReceipt || isInvoice) && Boolean(detail?.supersededAt);
  // B7: a soft-deleted doc reaches here only for a SUPERADMIN — read it off the
  // list item (which carries deletedAt). Reads as "Deleted"; no footer actions.
  const isDeleted = Boolean(listItem?.deletedAt);
  const canReissue =
    isReceipt && status === 'SENT' && !isVoided && Boolean(onReissueReceipt);
  const reissuedTo = detail?.supersededBy?.[0] ?? null; // this one → its replacement
  const reissues = detail?.supersedes ?? null; // this one corrects → the original

  // Auto-open the reissue form when launched from the kebab "Reissue".
  const autoReissueFiredRef = useRef(false);
  useEffect(() => {
    if (autoOpenReissue && canReissue && !autoReissueFiredRef.current) {
      autoReissueFiredRef.current = true;
      setReissueConfirm(true);
    }
  }, [autoOpenReissue, canReissue]);

  // C6: "Change send date" — auto-open the billed-to edit (invoice) or the
  // receipt edit (both hold the date). Fires once.
  const autoDateEditFiredRef = useRef(false);
  useEffect(() => {
    if (!autoOpenDateEdit || autoDateEditFiredRef.current) return;
    // G4: the edit popups snapshot dataJson into their state at mount, so we must
    // wait for the FULL detail (which carries dataJson) to load before opening.
    // canEdit* derives from status, which is available instantly off the list item
    // — firing on that alone opens the popup against an empty dataJson and it stays
    // blank forever. Gate on the loaded detail so the popup mounts prefilled.
    if (!detail?.data?.dataJson) return;
    if (canEditInvoice) {
      autoDateEditFiredRef.current = true;
      setInvoiceEditSection(
        sections.find((s) => s.key === 'billed_to') ?? {
          key: 'billed_to',
          label: 'Billed to',
          fields: [],
        },
      );
    } else if (canEditReceipt) {
      autoDateEditFiredRef.current = true;
      setReceiptEditOpen(true);
    }
  }, [autoOpenDateEdit, canEditInvoice, canEditReceipt, sections, detail]);

  const openEdit = (group: CardGroup) => {
    const keys =
      group.key === 'contract'
        ? [...CONTRACT_BASE_FIELDS.map((f) => f.key), ...ALL_FINANCE_KEYS]
        : group.fields.map((f) => f.key);
    // Currency fields: finance_charge, finance_N_amount, and any declared
    // type:'currency' (e.g. contract_amount). Normalised to 2 decimals on load
    // so existing values show $12,000.00 immediately AND save normalised.
    const isCurrencyKey = (key: string): boolean => {
      if (key === 'finance_charge' || /^finance_[1-4]_amount$/.test(key)) return true;
      const declared =
        CONTRACT_BASE_FIELDS.find((f) => f.key === key) ??
        group.fields.find((f) => f.key === key);
      return declared?.type === 'currency';
    };
    const vals: Record<string, string> = {};
    for (const key of keys) {
      const raw = dataJson[key];
      if (raw == null || raw === '') {
        vals[key] = '';
      } else {
        vals[key] = isCurrencyKey(key) ? forceTwoDecimals(String(raw)) : String(raw);
      }
    }
    setEditValues(vals);
    setEditDirty(false);
    if (group.key === 'contract') {
      // Finance ON if any Finance N entry already has data (mirrors showWhen).
      setFinanceOn(
        [1, 2, 3, 4].some((n) =>
          financeFieldKeys(n).some((k) => (vals[k] ?? '') !== ''),
        ),
      );
    }
    setEditGroup(group);
  };

  const onFieldChange = (key: string, value: string) => {
    setEditValues((v) => ({ ...v, [key]: value }));
    setEditDirty(true);
  };

  const handleFinanceToggle = (on: boolean) => {
    if (!on) {
      // Clear finance_charge + all Finance N fields so they save as '' and the
      // Finance cards disappear from the modal.
      setEditValues((prev) => {
        const next = { ...prev };
        for (const k of ALL_FINANCE_KEYS) next[k] = '';
        return next;
      });
    }
    setFinanceOn(on);
    setEditDirty(true);
  };

  const saveEdit = async () => {
    if (!editGroup || !detail || !onUpdateDraft) return;
    setEditSaving(true);
    try {
      const mergedData = { ...dataJson, ...editValues };
      await onUpdateDraft(documentId, {
        contractDate: detail.contractDate ?? detail.createdAt,
        dataJson: mergedData,
      });
      // Update local detail in place — no full re-fetch (no flash).
      setDetail((d) => (d ? { ...d, data: { ...d.data, dataJson: mergedData } } : d));
      toast.success('Document updated');
      setEditGroup(null);
    } catch (e) {
      console.error('Failed to update draft', e);
      toast.error('Could not update document. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <>
    <div className="doc-detail-modal-overlay" onClick={onClose}>
      <div
        className={`doc-detail-modal${activeTab === 'pdf' ? ' doc-detail-modal--pdf' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Document ${number}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="doc-detail-modal-header">
          <div className="doc-detail-modal-header__main">
            <div className="doc-detail-modal-header__title-row">
              <h2 className="doc-detail-modal-header__number">{number}</h2>
              {isDeleted ? (
                <StatusBadge status="DELETED" />
              ) : isVoided ? (
                <StatusBadge status="VOID" />
              ) : scheduled ? (
                <StatusBadge status="SCHEDULED" />
              ) : (
                <StatusBadge status={status} />
              )}
            </div>
            <div className="doc-detail-modal-header__subtitle">
              {[tenant, headerDate].filter(Boolean).join(' · ')}
            </div>
            {(reissues || reissuedTo) && (
              <div className="doc-reissue-trace">
                {reissues && (
                  <button type="button" className="doc-trace-link" onClick={() => onAction('view', reissues.id)}>
                    Reissues {reissues.documentNumber}
                  </button>
                )}
                {reissuedTo && (
                  <button type="button" className="doc-trace-link" onClick={() => onAction('view', reissuedTo.id)}>
                    Reissued to {reissuedTo.documentNumber}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="doc-detail-modal-header__actions">
            {canReissue && (
              <button
                type="button"
                className="doc-reissue-btn"
                onClick={() => setReissueConfirm(true)}
              >
                Reissue
              </button>
            )}
            <button type="button" className="doc-detail-modal__close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        </div>


        {loading ? (
          /* Skeleton while the detail loads — no fallback-tabs flash. */
          <div className="doc-detail-modal-content">
            <div className="doc-detail-modal__skeleton-tabs" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="skeleton-pulse doc-detail-tab-skeleton" />
              ))}
            </div>
            <span
              className="skeleton-pulse skeleton-line"
              style={{ display: 'block', width: '40%', height: '14px', marginBottom: '14px' }}
              aria-hidden="true"
            />
            <span
              className="skeleton-pulse skeleton-line"
              style={{ display: 'block', width: '100%', height: '200px' }}
              aria-hidden="true"
            />
          </div>
        ) : error ? (
          <div className="doc-detail-modal-content">
            <div className="doc-detail-modal__hint">{error}</div>
            {/* B1: recover from a transient failure without closing/reopening. */}
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: 12 }}
              onClick={() => setReloadNonce((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="doc-detail-modal-tabs" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`doc-detail-tab${activeTab === tab.key ? ' doc-detail-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Send-failed reason — prominent banner (F6), so the "why" isn't
                buried in the timeline. Shown for contracts AND receipts. */}
            {status === 'SEND_FAILED' && friendlySendError(detail?.sendError) ? (
              <div className="doc-detail-send-failed" role="alert">
                <AlertTriangle size={15} />
                <span>{friendlySendError(detail?.sendError)}</span>
              </div>
            ) : null}

            {/* Content */}
            <div className="doc-detail-modal-content">
              {activeTab === 'timeline' ? (
                // Invoices, like receipts, have no signing lifecycle — the
                // Created/Sent/Edited/Cancelled timeline fits both.
                <TimelineTab detail={detail} isReceipt={isReceipt || isInvoice} />
              ) : activeTab === 'pdf' ? (
                <PdfTab
                  title={isInvoice ? 'Invoice' : isReceipt ? 'Receipt' : 'Signed Document'}
                  url={pdfUrl}
                  loading={pdfLoading}
                  onDownload={
                    isReceipt || isInvoice
                      ? () => {
                          // Receipt PDF isn't persisted — download the blob we
                          // already regenerated for the iframe.
                          if (!pdfUrl) return;
                          const a = window.document.createElement('a');
                          a.href = pdfUrl;
                          a.download = `${number}.pdf`;
                          a.click();
                        }
                      : () => onAction('download', documentId)
                  }
                />
              ) : (
                (() => {
                  // The hardcoded contract groups (client/project/pricing/others)
                  // are ONLY for BoldSign contracts. Receipts and invoices are
                  // schema-driven — skip them so an invoice's `pricing` section key
                  // doesn't collide with the contract pricing handler (which would
                  // render empty contract_amount/finance fields).
                  const groups =
                    !isReceipt && !isInvoice
                      ? getGroupsForTab(activeTab, dataJson)
                      : null;
                  if (groups) {
                    const renderCard = (g: CardGroup) => (
                      <GroupCard
                        key={g.label}
                        group={g}
                        dataJson={dataJson}
                        onEdit={canEdit ? () => openEdit(g) : undefined}
                      />
                    );
                    // Pricing tab: Finance N cards go into a 2x2 grid on desktop.
                    // A single Finance card stays full width (no half-width cell).
                    const finance = groups.filter((g) => g.key?.startsWith('finance-'));
                    const regular = groups.filter((g) => !g.key?.startsWith('finance-'));
                    return (
                      <>
                        {regular.map(renderCard)}
                        {finance.length === 1 && renderCard(finance[0])}
                        {finance.length >= 2 && (
                          <div className="doc-detail-finance-grid">
                            {finance.map(renderCard)}
                          </div>
                        )}
                      </>
                    );
                  }
                  const section =
                    sections.find((s) => s.key === activeTab) ?? null;
                  // Invoices: bespoke layout (billed_to / service / pricing) keyed
                  // on the real invoice fields; Edit reopens the wizard prefilled.
                  if (isInvoice) {
                    return (
                      <InvoiceSectionTab
                        section={section}
                        dataJson={dataJson}
                        onEdit={
                          canEditInvoice && section
                            ? () => setInvoiceEditSection(section)
                            : undefined
                        }
                      />
                    );
                  }
                  return (
                    <SectionTab
                      section={section}
                      dataJson={dataJson}
                      twoColumns={isReceipt}
                      onEdit={
                        canEditReceipt
                          ? () => setReceiptEditOpen(true)
                          : undefined
                      }
                    />
                  );
                })()
              )}
            </div>

            {/* Footer actions — hidden on the PDF tab so its single Download
                button isn't duplicated by the footer's (COMPLETED) Download. */}
            {activeTab !== 'pdf' && !isVoided && !isDeleted && (
              <DetailFooter
                status={status}
                onAction={runAction}
                isSuperadmin={isSuperadmin}
                isInvoice={isInvoice}
                isReceipt={isReceipt}
                isDeferred={scheduled}
              />
            )}
          </>
        )}
      </div>
    </div>

      {/* Per-card edit popup (DRAFT only). Rendered outside the modal overlay so
          its backdrop click doesn't bubble to onClose and close the whole modal. */}
      {editGroup ? (
        <GroupEditPopup
          title={editGroup.label}
          isOpen
          onClose={() => setEditGroup(null)}
          onSave={saveEdit}
          isDirty={editDirty}
          isSaving={editSaving}
          wide={editGroup.key === 'contract' && financeOn}
        >
          {editGroup.key === 'contract' ? (
            <>
              {CONTRACT_BASE_FIELDS.map((f) => (
                <FieldInput key={f.key} field={f} value={editValues[f.key] ?? ''} onChange={onFieldChange} />
              ))}
              <hr className="gep-divider" />
              <WizardToggleRow label="Finance" checked={financeOn} onChange={handleFinanceToggle} />
              {financeOn ? (
                <div className="gep-finance-fields">
                  <FieldInput field={FINANCE_CHARGE_FIELD} value={editValues.finance_charge ?? ''} onChange={onFieldChange} />
                  <div className="gep-finance-grid">
                  {[1, 2, 3, 4].map((n) => (
                    <FinanceCard index={n} key={n}>
                      <FieldInput
                        field={{ key: `finance_${n}_amount`, label: 'Amount', type: 'currency' }}
                        value={editValues[`finance_${n}_amount`] ?? ''}
                        onChange={onFieldChange}
                      />
                      <FieldInput
                        field={{ key: `finance_${n}_description`, label: 'Description', type: 'text' }}
                        value={editValues[`finance_${n}_description`] ?? ''}
                        onChange={onFieldChange}
                      />
                      <FieldInput
                        field={{ key: `finance_${n}_date`, label: 'Date', type: 'date' }}
                        value={editValues[`finance_${n}_date`] ?? ''}
                        onChange={onFieldChange}
                      />
                    </FinanceCard>
                  ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            editGroup.fields.map((f) => (
              <FieldInput key={f.key} field={f} value={editValues[f.key] ?? ''} onChange={onFieldChange} />
            ))
          )}
        </GroupEditPopup>
      ) : null}

      {receiptEditOpen && onUpdateReceipt ? (
        <ReceiptEditPopup
          dataJson={dataJson as Record<string, unknown>}
          onClose={() => setReceiptEditOpen(false)}
          onSave={async (payload) => {
            await onUpdateReceipt(documentId, payload);
            setReceiptEditOpen(false);
            loadDetail();
          }}
        />
      ) : null}

      {invoiceEditSection && onUpdateInvoice ? (
        <InvoiceEditPopup
          section={invoiceEditSection}
          dataJson={dataJson as Record<string, unknown>}
          onClose={() => setInvoiceEditSection(null)}
          onSave={async (data, notifyOnIssueDate) => {
            // PATCH the SAME invoice with ONLY this section's fields (never
            // creates a new one). A Billed to edit may carry a new issue date +
            // the notify opt-in, which the backend uses to (re)schedule.
            await onUpdateInvoice(documentId, { data, notifyOnIssueDate });
            setInvoiceEditSection(null);
            loadDetail();
          }}
        />
      ) : null}

      <ConfirmActionModal
        isOpen={reissueConfirm}
        title="Reissue receipt"
        message="This receipt will be marked as VOID and cannot be undone once the corrected receipt is sent. A new receipt with the next number will be created and emailed to the client. Continue?"
        confirmLabel="Reissue"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          setReissueConfirm(false);
          setReissueOpen(true);
        }}
        onCancel={() => setReissueConfirm(false)}
      />

      {reissueOpen && onReissueReceipt ? (
        <ReceiptEditPopup
          title="Reissue receipt"
          dataJson={dataJson as Record<string, unknown>}
          onClose={() => setReissueOpen(false)}
          onSave={async (payload) => {
            // Creates a corrected copy + voids the original. The original is now
            // VOID, so close the modal; the list reloads with both receipts.
            await onReissueReceipt(documentId, payload);
            setReissueOpen(false);
            onClose();
          }}
        />
      ) : null}
    </>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: CardField;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  const set = (v: string) => onChange(field.key, v);
  const label = <label className="form-label">{field.label}</label>;

  switch (field.type) {
    case 'currency':
      return (
        <div className="form-field">
          {label}
          <div className="gep-input-currency">
            <span className="gep-input-prefix">$</span>
            <CurrencyInput value={value} onChange={set} className="form-input" />
          </div>
        </div>
      );

    case 'date':
      return (
        <div className="form-field">
          {label}
          <div className="gep-date-wrapper">
            <input
              className="form-input gep-input-date"
              type="date"
              value={value}
              onChange={(e) => set(e.target.value)}
            />
            {/* lucide icon overlay (the tabler `ti` font isn't bundled). The
                native indicator is kept transparent on top as the click target. */}
            <Calendar className="gep-date-icon" size={15} aria-hidden="true" />
          </div>
        </div>
      );

    case 'phone':
      return (
        <div className="form-field">
          {label}
          <input
            className="form-input"
            type="tel"
            inputMode="tel"
            placeholder="(555) 000-0000"
            value={value}
            onChange={(e) => set(formatUsPhone(e.target.value))}
          />
        </div>
      );

    case 'number':
      return (
        <div className="form-field">
          {label}
          <input
            className="form-input"
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => set(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>
      );

    case 'state':
      return (
        <div className="form-field">
          {label}
          <input
            className="form-input"
            type="text"
            maxLength={2}
            placeholder="TX"
            value={value}
            onChange={(e) => set(formatState(e.target.value))}
          />
        </div>
      );

    case 'textarea':
      return (
        <div className="form-field">
          {label}
          <textarea
            className="form-input"
            rows={3}
            value={value}
            onChange={(e) => set(e.target.value)}
          />
        </div>
      );

    default:
      return (
        <div className="form-field">
          {label}
          <input
            className="form-input"
            type={field.type === 'email' ? 'email' : 'text'}
            value={value}
            onChange={(e) => set(e.target.value)}
          />
        </div>
      );
  }
}

function DetailCard({
  icon,
  title,
  children,
  onEdit,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  accent?: { color: string; bg: string; border?: string };
}) {
  return (
    <div
      className="doc-detail-modal__section card-legend"
      style={
        accent
          ? {
              background: accent.bg,
              border: `1px solid ${accent.border ?? accent.bg}`,
              borderLeft: `3px solid ${accent.color}`,
            }
          : undefined
      }
    >
      <span
        className="card-legend__label"
        style={accent ? { borderColor: accent.border ?? accent.bg } : undefined}
      >
        <span className="card-legend__icon">{icon}</span>
        <span
          className="card-legend__title"
          style={accent ? { color: accent.color } : undefined}
        >
          {title}
        </span>
      </span>
      {onEdit ? (
        <button
          type="button"
          className="card-legend__edit"
          onClick={onEdit}
          aria-label={`Edit ${title}`}
        >
          <Pencil size={14} />
        </button>
      ) : null}
      <div className="field-rows">{children}</div>
    </div>
  );
}

// A configured edit-group card (Customer / Address / Contract / Finance N / …).
function GroupCard({
  group,
  dataJson,
  onEdit,
}: {
  group: CardGroup;
  dataJson: Record<string, unknown>;
  onEdit?: () => void;
}) {
  return (
    <DetailCard icon={group.icon} title={group.label} onEdit={onEdit} accent={group.accent}>
      {group.fields.map((f) => (
        <FieldRow key={f.key} label={f.label} value={formatValue(f, dataJson[f.key])} />
      ))}
    </DetailCard>
  );
}

// Fallback for unknown schema sections (non-construction forms): single card.
function SectionTab({
  section,
  dataJson,
  twoColumns = false,
  onEdit,
}: {
  section: SchemaSection | null;
  dataJson: Record<string, unknown>;
  // Receipts: lay the fields out in a 2-col grid on desktop (1-col on mobile).
  twoColumns?: boolean;
  // Receipts: pencil in the card's top-right corner (DRAFT/SEND_FAILED only).
  onEdit?: () => void;
}) {
  if (!section || section.fields.length === 0) {
    return (
      <div className="doc-detail-modal__hint">
        No fields available for this section.
      </div>
    );
  }
  // Receipt-specific layout: Client+Date / Email+Amount / Payment for /
  // Payment method(+other)+Payment #+Of total / Received by. Responsive: the
  // grids collapse to 1 column on mobile.
  if (twoColumns) {
    const byKey = new Map(section.fields.map((f) => [f.key, f]));
    const field = (key: string, valueOverride?: string): React.ReactNode => {
      const f = byKey.get(key);
      if (!f) return null;
      return (
        <FieldRow
          key={key}
          label={f.label}
          value={valueOverride ?? formatValue(f, dataJson[key])}
        />
      );
    };
    // Payment method absorbs the "Other (label)" text → e.g. "Other (Venmo)".
    const methodField = byKey.get('payment_method');
    let methodValue = methodField
      ? formatValue(methodField, dataJson['payment_method'])
      : '';
    const other = dataJson['other_label'];
    if (
      dataJson['payment_method'] === 'OTHER' &&
      typeof other === 'string' &&
      other.trim()
    ) {
      methodValue = `${methodValue} (${other.trim()})`;
    }
    // VIEW only: fuse "Payment #" + "Of (total)" into one "N of M" value (the
    // creation/edit form keeps them as two separate inputs).
    const pcur = dataJson['payment_current'];
    const ptot = dataJson['payment_total'];
    const paymentNofM = `${
      typeof pcur === 'number' || typeof pcur === 'string' ? pcur : 1
    } of ${typeof ptot === 'number' || typeof ptot === 'string' ? ptot : 1}`;
    return (
      <DetailCard
        icon={SECTION_ICONS[section.key] ?? <FileText size={14} />}
        title={section.label}
        onEdit={onEdit}
      >
        <div className="receipt-detail-grid receipt-detail-grid--2">
          {/* C4: prefer the split parts (invoiceRecipientName: company for a
              business, else first/middle/last); fall back to the stored `client`
              string for older receipts without parts. */}
          {field('client', invoiceRecipientName(dataJson) || undefined)}
          {field('date')}
        </div>
        <div className="receipt-detail-grid receipt-detail-grid--2">
          {field('email')}
          {field('amount')}
        </div>
        {field('payment_for')}
        <div className="receipt-detail-grid receipt-detail-grid--2 receipt-payment-row">
          {field('payment_method', methodValue)}
          {/* Payment # + Of (total) fused into one field — balances the row and
              reads naturally as "N of M". */}
          <FieldRow label="Payment" value={paymentNofM} />
        </div>
        {field('received_by')}
      </DetailCard>
    );
  }

  // Contract / non-receipt: schema-driven single column (unchanged).
  return (
    <DetailCard
      icon={SECTION_ICONS[section.key] ?? <FileText size={14} />}
      title={section.label}
      onEdit={onEdit}
    >
      {section.fields.map((f) => (
        <FieldRow
          key={f.key}
          label={f.label}
          value={formatValue(f, dataJson[f.key])}
        />
      ))}
    </DetailCard>
  );
}

// Invoice detail (DIRECT_PDF, code INVOICE). Bespoke layout per schema section
// (billed_to / service / pricing) keyed on the real invoice dataJson fields —
// composes the recipient name (individual vs business), fuses the address, and
// shows a single Total (the three computed money fields are identical for a
// single-line invoice). Field labels/types come from the schema when present.
function InvoiceSectionTab({
  section,
  dataJson,
  onEdit,
}: {
  section: SchemaSection | null;
  dataJson: Record<string, unknown>;
  onEdit?: () => void;
}) {
  if (!section) {
    return (
      <div className="doc-detail-modal__hint">No details available for this section.</div>
    );
  }
  const byKey = new Map(section.fields.map((f) => [f.key, f]));
  const str = (key: string): string => {
    const raw = dataJson[key];
    return typeof raw === 'string' ? raw : raw == null ? '' : String(raw);
  };
  // Formatted display value (currency/date via the schema field type), or '—'.
  const val = (key: string): string => {
    const raw = dataJson[key];
    if (raw == null || raw === '') return '—';
    const f = byKey.get(key);
    return (f ? formatValue(f, raw) : String(raw)) || '—';
  };

  let body: React.ReactNode;
  let icon: React.ReactNode;

  if (section.key === 'service') {
    icon = <Wrench size={14} />;
    body = (
      <>
        <div className="receipt-detail-grid receipt-detail-grid--2">
          <FieldRow label="Service" value={val('service_type')} />
          <FieldRow label="Event date" value={val('event_date')} />
        </div>
        <div className="receipt-detail-grid receipt-detail-grid--2">
          <FieldRow label="Event name" value={val('event_name')} />
          <FieldRow label="Event location" value={val('event_location')} />
        </div>
      </>
    );
  } else if (section.key === 'pricing') {
    icon = <DollarSign size={14} />;
    // gran_total is the canonical grand total; fall back to total if unset.
    const total = str('gran_total').trim() ? val('gran_total') : val('total');
    body = (
      <>
        <div className="receipt-detail-grid receipt-detail-grid--2">
          <FieldRow label="Quantity" value={val('quantity')} />
          <FieldRow label="Price" value={val('price')} />
        </div>
        <FieldRow label="Total" value={total} />
      </>
    );
  } else {
    // billed_to (default): recipient identity + contact + address.
    icon = <User size={14} />;
    // C4: compose the recipient with the SAME helper the list uses
    // (invoiceRecipientName: company_name for a business, else first/middle/last)
    // instead of a `business` flag invoices never store.
    const business = str('company_name').trim() !== '';
    const recipient = invoiceRecipientName(dataJson);
    // Server-added invoice_date (MM/DD/YYYY) is the issued date; fall back to the
    // raw issueDate field when a draft hasn't been finalized yet.
    const issue = str('invoice_date').trim() ? str('invoice_date') : val('issueDate');
    const cityStateZip = [
      str('city').trim(),
      [str('state').trim(), str('zip').trim()].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ');
    body = (
      <>
        <div className="receipt-detail-grid receipt-detail-grid--2">
          <FieldRow label={business ? 'Company' : 'Recipient'} value={recipient || '—'} />
          <FieldRow label="Issue date" value={issue || '—'} />
        </div>
        <FieldRow label="Email" value={val('recipient_email')} />
        <FieldRow label="Street address" value={val('street')} />
        <FieldRow label="City / State / ZIP" value={cityStateZip || '—'} />
      </>
    );
  }

  return (
    <DetailCard icon={icon} title={section.label} onEdit={onEdit}>
      {body}
    </DetailCard>
  );
}

function TimelineTab({
  detail,
  isReceipt = false,
}: {
  detail: DocumentDetail | null;
  isReceipt?: boolean;
}) {
  const creator =
    [detail?.user?.firstName, detail?.user?.lastName].filter(Boolean).join(' ') ||
    detail?.user?.email ||
    '';
  const toEmail = detail?.lastSentRecipientEmail
    ? `to ${detail.lastSentRecipientEmail}`
    : '';

  // Contracts keep the signature lifecycle (Viewed/Signed/Completed). Receipts
  // have NO signing — only the events that actually happened, sorted by time.
  const events = isReceipt
    ? (
        [
          { label: 'Created', ts: detail?.createdAt, hint: creator ? `by ${creator}` : '' },
          ...(detail?.sentAt ? [{ label: 'Sent', ts: detail.sentAt, hint: toEmail }] : []),
          ...(detail?.lastManualReminderAt
            ? [{ label: 'Resent', ts: detail.lastManualReminderAt, hint: toEmail }]
            : []),
          ...(detail?.lastEditedAt ? [{ label: 'Edited', ts: detail.lastEditedAt, hint: '' }] : []),
          ...(detail?.status === 'SEND_FAILED'
            ? [
                {
                  label: 'Send failed',
                  ts: detail.updatedAt ?? detail.sentAt ?? detail.createdAt,
                  hint: friendlySendError(detail.sendError) ?? '',
                },
              ]
            : []),
          ...(detail?.cancelledAt ? [{ label: 'Cancelled', ts: detail.cancelledAt, hint: '' }] : []),
          ...(detail?.supersededAt
            ? [
                {
                  // Reissue → "Reissued to REC-X"; direct void → "Voided".
                  label: detail.supersededBy?.[0] ? 'Reissued' : 'Voided',
                  ts: detail.supersededAt,
                  hint: detail.supersededBy?.[0]
                    ? `to ${detail.supersededBy[0].documentNumber}`
                    : '',
                },
              ]
            : []),
        ] as Array<{ label: string; ts?: string | null; hint: string }>
      )
        .filter((e) => Boolean(e.ts))
        .sort(
          (a, b) =>
            new Date(a.ts as string).getTime() - new Date(b.ts as string).getTime(),
        )
    : [
        { label: 'Created', ts: detail?.createdAt, hint: creator ? `by ${creator}` : '' },
        { label: 'Sent', ts: detail?.sentAt, hint: toEmail },
        { label: 'Viewed', ts: detail?.viewedAt, hint: '' },
        { label: 'Signed', ts: detail?.signedAt, hint: '' },
        { label: 'Completed', ts: detail?.completedAt, hint: '' },
        ...(detail?.cancelledAt ? [{ label: 'Cancelled', ts: detail.cancelledAt, hint: '' }] : []),
      ];
  return (
    <div className="doc-detail-modal__section card-legend">
      <span className="card-legend__label">
        <span className="card-legend__icon"><Calendar size={14} /></span>
        <span className="card-legend__title">Timeline</span>
      </span>
      <div className="doc-timeline">
        {events.map((e) => {
          const active = Boolean(e.ts);
          return (
            <div key={e.label} className={`doc-timeline__row${active ? '' : ' doc-timeline__row--inactive'}`}>
              <span className="doc-timeline__dot" aria-hidden="true" />
              <span className="doc-timeline__label">{e.label}</span>
              <span className="doc-timeline__value">
                {active ? fmtDate(e.ts) : '—'}
                {active && e.hint ? <span className="doc-timeline__hint"> · {e.hint}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PdfTab({
  url,
  loading,
  onDownload,
  title = 'Signed Document',
}: {
  url: string | null;
  loading: boolean;
  onDownload: () => void;
  title?: string;
}) {
  return (
    <div className="doc-detail-modal__section card-legend doc-detail-pdf-card">
      <span className="card-legend__label">
        <span className="card-legend__icon"><FileSignature size={14} /></span>
        <span className="card-legend__title">{title}</span>
      </span>
      {loading ? (
        <div className="doc-detail-modal__hint">Loading PDF…</div>
      ) : url ? (
        <PdfCanvasViewer url={url} />
      ) : (
        <div className="doc-detail-modal__hint">PDF not available yet.</div>
      )}
      <div className="doc-detail-pdf-actions">
        {url ? (
          <a
            className="btn-secondary"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in new tab
          </a>
        ) : null}
        <button type="button" className="btn-warning" onClick={onDownload}>
          Download PDF
        </button>
      </div>
    </div>
  );
}

function DetailFooter({
  status,
  onAction,
  isSuperadmin = false,
  isInvoice = false,
  isReceipt = false,
  isDeferred = false,
}: {
  status: string;
  onAction: (action: V2DocumentAction) => void;
  isSuperadmin?: boolean;
  isInvoice?: boolean;
  isReceipt?: boolean;
  // A scheduled (deferred) invoice can't be sent until its issue date arrives.
  isDeferred?: boolean;
}) {
  let left: React.ReactNode = null;
  let right: React.ReactNode = null;

  // Invoices AND receipts (DIRECT_PDF): their only footer state is a DRAFT —
  // Delete (B7: a draft is deleted, never voided) + (Send unless scheduled).
  // A SENT doc's Download lives inside its Preview/PDF tab.
  if (isInvoice || isReceipt) {
    if (status === 'DRAFT') {
      left = (
        <button type="button" className="btn-danger" onClick={() => onAction('delete')}>
          Delete
        </button>
      );
      right = isDeferred ? (
        // C6: a scheduled doc can't Send on its date yet, but Send now finalizes
        // it today. (Change the date via the Billed-to pencil above.)
        <button type="button" className="btn-warning" onClick={() => onAction('sendNow')}>
          Send now
        </button>
      ) : (
        <button type="button" className="btn-warning" onClick={() => onAction('send')}>
          Send
        </button>
      );
    }
    if (!left && !right) return null;
    return (
      <div className="doc-detail-modal-footer">
        <div className="doc-detail-modal-footer__left">{left}</div>
        <div className="doc-detail-modal-footer__actions">{right}</div>
      </div>
    );
  }

  switch (status) {
    case 'DRAFT':
      left = (
        <button type="button" className="btn-danger" onClick={() => onAction('cancel')}>
          Cancel draft
        </button>
      );
      right = (
        <button type="button" className="btn-warning" onClick={() => onAction('send')}>
          Send
        </button>
      );
      break;
    case 'SENT':
    case 'VIEWED':
      left = (
        <button type="button" className="btn-danger" onClick={() => onAction('cancel')}>
          Cancel
        </button>
      );
      right = (
        <>
          {isSuperadmin ? (
            <button type="button" className="btn-secondary" onClick={() => onAction('sync')}>
              Sync
            </button>
          ) : null}
          <button type="button" className="btn-warning" onClick={() => onAction('resend')}>
            Resend
          </button>
        </>
      );
      break;
    case 'SIGNED':
      // Manual sync is a SUPERADMIN-only fallback to the BoldSign webhook.
      right = isSuperadmin ? (
        <button type="button" className="btn-secondary" onClick={() => onAction('sync')}>
          Sync status
        </button>
      ) : null;
      break;
    case 'COMPLETED':
      right = (
        <button type="button" className="btn-warning" onClick={() => onAction('download')}>
          Download PDF
        </button>
      );
      break;
    case 'CANCELLED':
      right = (
        <button type="button" className="btn-warning" onClick={() => onAction('reactivate')}>
          Reactivate
        </button>
      );
      break;
  }

  if (!left && !right) return null;
  return (
    <div className="doc-detail-modal-footer">
      <div className="doc-detail-modal-footer__left">{left}</div>
      <div className="doc-detail-modal-footer__actions">{right}</div>
    </div>
  );
}

