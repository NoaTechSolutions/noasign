'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { X, User, FileText, Calendar, FileSignature, DollarSign, MapPin, Wrench, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { formatUsPhone } from '@/lib/format-phone';
import { formatState } from '@/lib/format-text';
import { FieldRow } from '@/components/dashboard/shared/ui';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { ConfirmActionModal } from '@/components/dashboard/shared/ConfirmActionModal';
import { ReceiptEditPopup } from './ReceiptEditPopup';
import { WizardToggleRow } from './wizard/shell/WizardToggleRow';
import type {
  V2DocumentItem,
  V2DocumentAction,
  DocumentDetail,
  SchemaField,
  SchemaSection,
} from './types';
import { getStatusBadgeClass, getStatusLabel } from './types';
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
  onFetchReceiptPdf?: (docId: string) => Promise<string>;
  // Manual "Sync status" (BoldSign provider pull) is a fallback to the webhook;
  // restricted to MASTER (support/admin) so regular users don't see it in prod.
  isMaster?: boolean;
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
      const d = new Date(s);
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
  onUpdateReceipt,
  onReissueReceipt,
  autoOpenReissue = false,
  onFetchReceiptPdf,
  isMaster = false,
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

  const loadDetail = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRef.current(documentId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load document');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => loadDetail(), [loadDetail]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Header info — prefer the loaded detail, fall back to the list item.
  const status = (detail?.status ?? listItem?.status ?? 'DRAFT') as string;
  const number = detail?.documentNumber ?? listItem?.documentNumber ?? '';
  const tenant = detail?.companyProfile?.companyName ?? '';
  const headerDate = fmtDate(detail?.contractDate ?? detail?.createdAt ?? listItem?.createdAt);
  const isSigned = status === 'SIGNED' || status === 'COMPLETED';

  const sections =
    detail?.formDefinition?.schemaJson?.sections?.length
      ? detail.formDefinition.schemaJson.sections
      : FALLBACK_SECTIONS;

  const tabs = [
    ...sections.map((s) => ({ key: s.key, label: s.label })),
    { key: 'timeline', label: 'Timeline' },
    // Contracts: PDF only once signed. Receipts: always (regenerated on the fly).
    ...(isSigned || isReceipt ? [{ key: 'pdf', label: 'PDF' }] : []),
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
    // Receipts regenerate from a dedicated endpoint; contracts use final-pdf.
    const fetcher =
      isReceipt && fetchReceiptPdfRef.current
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
  }, [activeTab, documentId, isReceipt]);

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
    } else if (
      action !== 'download' &&
      action !== 'preview' &&
      // send/cancel now open a confirmation popup (handled by the panel) — keep
      // this modal open behind it; the panel closes it once confirmed.
      action !== 'send' &&
      action !== 'cancel'
    ) {
      onClose();
    }
  };

  const dataJson = detail?.data?.dataJson ?? {};
  const canEdit = status === 'DRAFT' && Boolean(onUpdateDraft);
  // Receipts edit via their own popup, allowed in DRAFT or SEND_FAILED only.
  const canEditReceipt =
    isReceipt &&
    (status === 'DRAFT' || status === 'SEND_FAILED') &&
    Boolean(onUpdateReceipt);

  // Reissue (2c): a SENT receipt is corrected by reissuing (never edited). Once
  // voided (supersededAt) it can't be reissued again.
  const isVoidedReceipt = isReceipt && Boolean(detail?.supersededAt);
  const canReissue =
    isReceipt && status === 'SENT' && !isVoidedReceipt && Boolean(onReissueReceipt);
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
              {isVoidedReceipt ? (
                <span className="doc-status-badge doc-status-badge--void">VOID</span>
              ) : (
                <span className={`doc-status-badge ${getStatusBadgeClass(status)}`}>{getStatusLabel(status)}</span>
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

            {/* Content */}
            <div className="doc-detail-modal-content">
              {activeTab === 'timeline' ? (
                <TimelineTab detail={detail} isReceipt={isReceipt} />
              ) : activeTab === 'pdf' ? (
                <PdfTab
                  url={pdfUrl}
                  loading={pdfLoading}
                  onDownload={
                    isReceipt
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
                  const groups = getGroupsForTab(activeTab, dataJson);
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
                  return (
                    <SectionTab
                      section={sections.find((s) => s.key === activeTab) ?? null}
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
            {activeTab !== 'pdf' && !isVoidedReceipt && (
              <DetailFooter status={status} onAction={runAction} isMaster={isMaster} />
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
          {field('client')}
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
                  hint: detail.sendError ?? '',
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
}: {
  url: string | null;
  loading: boolean;
  onDownload: () => void;
}) {
  return (
    <div className="doc-detail-modal__section card-legend doc-detail-pdf-card">
      <span className="card-legend__label">
        <span className="card-legend__icon"><FileSignature size={14} /></span>
        <span className="card-legend__title">Signed Document</span>
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
  isMaster = false,
}: {
  status: string;
  onAction: (action: V2DocumentAction) => void;
  isMaster?: boolean;
}) {
  let left: React.ReactNode = null;
  let right: React.ReactNode = null;

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
          {isMaster ? (
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
      // Manual sync is a MASTER-only fallback to the BoldSign webhook.
      right = isMaster ? (
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

