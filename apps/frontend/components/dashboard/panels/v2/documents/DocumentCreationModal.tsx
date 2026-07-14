'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { useBeforeUnload } from '@/lib/use-before-unload';
import { DiscardChangesModal } from '@/components/dashboard/shared/DiscardChangesModal';
import { IssueDateDisclaimerModal } from '@/components/dashboard/shared/IssueDateDisclaimerModal';
import { DocumentSetupCard } from './DocumentSetupCard';
import { isTransportError, draftMaybeSavedMessage } from './submit-error';
import {
  ReceiptForm,
  type CreateReceiptPayload,
  type ReceiptCreateResult,
} from './ReceiptForm';
import { DocumentWizard } from './wizard';
import type { DocumentSchema } from './wizard';
import type {
  CustomerOption,
  DocumentSetupValue,
  DocumentTypeOption,
} from './DocumentSetupCard';

interface CreateDraftPayload {
  documentTypeId: string;
  formDefinitionId: string;
  signatureTemplateId: string;
  contractDate: string;
  dataJson: Record<string, unknown>;
  customerId?: string;
}

export interface SelectableUser {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
}

interface DocumentCreationModalProps {
  documentTypes: DocumentTypeOption[];
  customers: CustomerOption[];
  sessionId?: string;
  isSuperadmin?: boolean;
  // Superadmin flow: a SUPERADMIN may pick any user (all tenants) to borrow their
  // forms/templates; onFetchTypesAsUser refetches the catalog as that user. The
  // created document still belongs to the master (the borrow is template-only).
  selectableUsers?: SelectableUser[];
  onFetchTypesAsUser?: (userId: string) => Promise<DocumentTypeOption[]>;
  onClose: () => void;
  onCreate: (payload: CreateDraftPayload) => Promise<void>;
  // DIRECT_PDF types (receipts) hand off to the receipt form instead of the
  // BoldSign wizard once selected in the type dropdown.
  onCreateReceipt?: (
    payload: CreateReceiptPayload,
  ) => Promise<ReceiptCreateResult>;
  // INVOICE types (also DIRECT_PDF) render the schema-driven wizard and submit
  // here instead of the receipt form. Payload matches POST /documents/invoice.
  onCreateInvoice?: (payload: {
    data: Record<string, string>;
    customerId?: string;
    send?: boolean;
    recipientEmail?: string;
    notifyOnIssueDate?: boolean;
  }) => Promise<void>;
  // When opened from the Templates → Invoice tab, preselect this document type by
  // code (+ its first form definition) so the user lands straight on the form.
  initialDocumentTypeCode?: string;
  defaultReceivedBy?: string;
  // Model C — receipt quota for the receipt form's quota/overage hint.
  receiptQuota?: {
    remaining: number | null;
    unlimited: boolean;
    overagePrice: number;
  };
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Maps a selected client to the Client-tab field values. Business uses the
// primary contact, falling back per-field to the business record for address.
// customer_age / customer_fax are intentionally not filled.
function mapClientToClientTab(c: CustomerOption): Record<string, string> {
  if (c.customerType === 'BUSINESS' && c.business) {
    const b = c.business;
    return {
      customer_name: b.primaryContactName ?? '',
      customer_email: b.primaryContactEmail ?? '',
      customer_phone: b.primaryContactPhone ?? '',
      customer_address: b.primaryContactAddressLine1 || b.businessAddressLine1 || '',
      city: b.primaryContactCity || b.businessCity || '',
      state: b.primaryContactState || b.businessState || '',
      zip: b.primaryContactZipCode || b.businessZipCode || '',
    };
  }
  return {
    customer_name: c.fullName ?? '',
    customer_email: c.email ?? '',
    customer_phone: c.phone ?? '',
    customer_address: c.addressLine1 ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    zip: c.zipCode ?? '',
  };
}

export function DocumentCreationModal({
  documentTypes,
  customers,
  sessionId,
  isSuperadmin = false,
  selectableUsers,
  onFetchTypesAsUser,
  onClose,
  onCreate,
  onCreateReceipt,
  onCreateInvoice,
  initialDocumentTypeCode,
  defaultReceivedBy,
  receiptQuota,
}: DocumentCreationModalProps) {
  const [setup, setSetup] = useState<DocumentSetupValue>({
    documentTypeId: '',
    formDefinitionId: '',
    signatureTemplateId: '',
    contractDate: todayIso(),
    customerId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // C3: the receipt form drives its own draft submit; it reports "busy" so the
  // modal can show the same blocking "Saving…" card as the invoice path.
  const [receiptBusy, setReceiptBusy] = useState(false);
  // Pending invoice action while the issue-date disclaimer is open (null = closed).
  const [pendingInvoice, setPendingInvoice] = useState<{
    send: boolean;
    dataJson: Record<string, string>;
  } | null>(null);
  // Wizard's unsaved-changes state, lifted up so backdrop/Escape/X can gate close.
  const [wizardDirty, setWizardDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  // Superadmin flow: when a SUPERADMIN picks a user, refetch the catalog as that
  // user (asUserId) and use it instead of the master's own types. The created
  // document still belongs to the master (no userId is sent on create).
  const [asUserId, setAsUserId] = useState('');
  const [overrideTypes, setOverrideTypes] = useState<
    DocumentTypeOption[] | null
  >(null);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const effectiveTypes = overrideTypes ?? documentTypes;

  // Preselect a document type by code (Templates → Invoice "Create invoice") once
  // the catalog is available, so the user lands straight on the form.
  useEffect(() => {
    if (!initialDocumentTypeCode || setup.documentTypeId) return;
    const t = effectiveTypes.find((d) => d.code === initialDocumentTypeCode);
    if (!t) return;
    setSetup((prev) => ({
      ...prev,
      documentTypeId: t.id,
      formDefinitionId: t.formDefinitions[0]?.id ?? '',
    }));
  }, [initialDocumentTypeCode, effectiveTypes, setup.documentTypeId]);

  async function handleAsUserChange(userId: string) {
    setAsUserId(userId);
    setSetup({
      documentTypeId: '',
      formDefinitionId: '',
      signatureTemplateId: '',
      contractDate: todayIso(),
      customerId: '',
    });
    if (!userId || !onFetchTypesAsUser) {
      setOverrideTypes(null);
      return;
    }
    setLoadingTypes(true);
    try {
      setOverrideTypes(await onFetchTypesAsUser(userId));
    } catch {
      setOverrideTypes([]);
    } finally {
      setLoadingTypes(false);
    }
  }

  useBlockScroll();
  useBeforeUnload(wizardDirty);

  // Any close intent (backdrop / Escape / X): warn first if there are changes.
  const handleRequestClose = useCallback(() => {
    // C3: can't dismiss while a submit is in flight (the saving card owns the UI).
    if (isSubmitting || receiptBusy) return;
    if (wizardDirty) {
      setShowDiscard(true);
      return;
    }
    onClose();
  }, [isSubmitting, receiptBusy, wizardDirty, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // While the discard prompt is up, let it own Escape.
      if (e.key === 'Escape' && !showDiscard) handleRequestClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRequestClose, showDiscard]);

  const selectedDocType = effectiveTypes.find((d) => d.id === setup.documentTypeId);
  const selectedFormDef = selectedDocType?.formDefinitions.find(
    (f) => f.id === setup.formDefinitionId,
  );
  const schema = selectedFormDef?.schemaJson as DocumentSchema | undefined;
  const hasValidSchema = !!schema?.sections?.length;

  const selectedCustomer = customers.find((c) => c.id === setup.customerId) ?? null;

  // The prefill trigger is derived directly from the selected client (key = its
  // id), synchronously in render — NO post-render nonce bump. That way the wizard
  // sees exactly ONE prefill per selection (the earlier nonce approach emitted two
  // — nonce 0 then 1 — which made the second pass detect the first's fill as
  // "existing data" and pop a spurious overwrite warning on an empty form).
  const clientPrefill = useMemo(
    () =>
      selectedCustomer
        ? { values: mapClientToClientTab(selectedCustomer), key: selectedCustomer.id }
        : undefined,
    [selectedCustomer],
  );

  // NOA-270 — when a BUSINESS customer is selected, flip any schema toggle
  // whose key === "isBusiness" so business-specific fields surface.
  const initialToggles = useMemo<Record<string, boolean> | undefined>(() => {
    if (!selectedCustomer || !schema) return undefined;
    const isBusiness = selectedCustomer.customerType === 'BUSINESS';
    const overrides: Record<string, boolean> = {};
    for (const section of schema.sections) {
      for (const toggle of section.toggles ?? []) {
        if (toggle.key === 'isBusiness') {
          overrides[`${section.key}:${toggle.key}`] = isBusiness;
        }
      }
    }
    return Object.keys(overrides).length > 0 ? overrides : undefined;
  }, [selectedCustomer, schema]);

  // Persistence scope mirrors legacy convention: type code + formDef + session.
  const persistKey =
    sessionId && selectedDocType?.code && setup.formDefinitionId
      ? `noasign:form-arrays:${selectedDocType.code}:${setup.formDefinitionId}:${sessionId}`
      : undefined;

  const canSubmit =
    !!setup.documentTypeId &&
    !!setup.formDefinitionId &&
    !!setup.signatureTemplateId &&
    !!setup.contractDate;

  async function handleSubmit(dataJson: Record<string, string>) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onCreate({
        documentTypeId: setup.documentTypeId,
        formDefinitionId: setup.formDefinitionId,
        signatureTemplateId: setup.signatureTemplateId,
        contractDate: setup.contractDate,
        dataJson,
        customerId: setup.customerId || undefined,
      });
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to create document',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // INVOICE is also DIRECT_PDF but renders the schema-driven wizard and submits to
  // POST /documents/invoice. It MUST be checked before isReceipt so a DIRECT_PDF
  // invoice isn't captured by the receipt branch. Invoices need neither a signature
  // template nor a contract date, so they use their own submit gate.
  const isInvoice =
    selectedDocType?.code === 'INVOICE' && !!onCreateInvoice;
  const canSubmitInvoice = !!setup.documentTypeId && !!setup.formDefinitionId;

  // Issue date ≠ today → require the disclaimer acknowledgement before saving.
  function handleInvoiceSubmit(dataJson: Record<string, string>) {
    if (dataJson.issueDate && dataJson.issueDate !== todayIso()) {
      setPendingInvoice({ send: false, dataJson });
      return Promise.resolve();
    }
    return doInvoiceSubmit(dataJson);
  }

  async function doInvoiceSubmit(
    dataJson: Record<string, string>,
    notifyOnIssueDate = false,
  ) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onCreateInvoice!({
        data: dataJson,
        customerId: setup.customerId || undefined,
        notifyOnIssueDate,
      });
      onClose();
    } catch (err) {
      setSubmitError(
        isTransportError(err)
          ? draftMaybeSavedMessage('invoice')
          : err instanceof Error
            ? err.message
            : 'Unable to save invoice',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // "Create and send": the wizard has already validated the recipient email
  // (sendRequiredFields) before calling this. Reuses the receipt send feedback.
  function handleInvoiceSend(dataJson: Record<string, string>) {
    if (dataJson.issueDate && dataJson.issueDate !== todayIso()) {
      setPendingInvoice({ send: true, dataJson });
      return Promise.resolve();
    }
    return doInvoiceSend(dataJson);
  }

  async function doInvoiceSend(
    dataJson: Record<string, string>,
    notifyOnIssueDate = false,
  ) {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onCreateInvoice!({
        data: dataJson,
        customerId: setup.customerId || undefined,
        send: true,
        recipientEmail: (dataJson.recipient_email ?? '').trim() || undefined,
        notifyOnIssueDate,
      });
      onClose();
    } catch (err) {
      setSubmitError(
        isTransportError(err)
          ? draftMaybeSavedMessage('invoice')
          : err instanceof Error
            ? err.message
            : 'Unable to send invoice',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // DIRECT_PDF (receipt) types render the receipt form below the setup card
  // instead of the BoldSign wizard — the setup card stays for type + client.
  const isReceipt =
    selectedDocType?.generationMode === 'DIRECT_PDF' && !!onCreateReceipt;

  return (
    <div className="docs-v2-creation-modal">
      <div
        className="docs-v2-creation-modal__overlay"
        onClick={handleRequestClose}
        aria-hidden="true"
      />
      <div
        className="docs-v2-creation-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="docs-v2-creation-modal-title"
      >
        <header className="docs-v2-creation-modal__header">
          <h2
            id="docs-v2-creation-modal-title"
            className="docs-v2-creation-modal__title"
          >
            New Document
          </h2>
          <button
            type="button"
            onClick={handleRequestClose}
            className="docs-v2-creation-modal__close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        <div
          className="docs-v2-creation-modal__body"
          style={{ position: 'relative' }}
        >
          {/* C3 (saas-ux-patterns §5, extended to create/send): while a submit is
              in flight the whole form is covered by a blocking "Saving…" card so
              nothing can be clicked/typed. On success the parent closes the modal;
              on failure the overlay lifts and the form reappears (values intact)
              with the error. */}
          {isSubmitting || receiptBusy ? (
            <div
              role="status"
              aria-live="polite"
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                background: 'var(--bg-card)',
              }}
            >
              <Loader2
                size={30}
                className="animate-spin"
                style={{ color: 'var(--brand-accent)' }}
                aria-hidden="true"
              />
              <p style={{ margin: 0, fontWeight: 500 }}>Saving…</p>
            </div>
          ) : null}

          {isSuperadmin && selectableUsers && selectableUsers.length > 0 ? (
            <div className="docs-v2-setup-card">
              <div className="docs-v2-setup-card__row">
                <label className="docs-v2-setup-card__field">
                  <span className="docs-v2-setup-card__label">
                    Create for user (template source)
                  </span>
                  <select
                    className="docs-v2-setup-card__input"
                    value={asUserId}
                    onChange={(e) => void handleAsUserChange(e.target.value)}
                    disabled={isSubmitting || loadingTypes}
                  >
                    <option value="">— Use my own templates —</option>
                    {selectableUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} · {u.email}
                        {u.companyName ? ` (${u.companyName})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : null}

          <DocumentSetupCard
            documentTypes={effectiveTypes}
            customers={customers}
            value={setup}
            onChange={setSetup}
            disabled={isSubmitting}
            isSuperadmin={isSuperadmin}
          />

          {isInvoice ? (
            <>
              {submitError ? (
                <div className="docs-v2-creation-modal__error" role="alert">
                  {submitError}
                </div>
              ) : null}

              {hasValidSchema ? (
                <DocumentWizard
                  key={`${setup.documentTypeId}-${setup.formDefinitionId}`}
                  schema={schema!}
                  clientPrefill={clientPrefill}
                  onDirtyChange={setWizardDirty}
                  initialToggles={initialToggles}
                  persistKey={persistKey}
                  canSubmit={canSubmitInvoice}
                  isSubmitting={isSubmitting}
                  onSubmit={handleInvoiceSubmit}
                  onCancel={onClose}
                  submitLabel="Create invoice"
                  onSend={handleInvoiceSend}
                  sendLabel="Create and send"
                  scheduleLabel="Create and schedule"
                  scheduleDateField="issueDate"
                  sendRequiredFields={['recipient_email']}
                />
              ) : (
                <div className="docs-v2-creation-modal__placeholder">
                  No form schema configured for this invoice type.
                </div>
              )}
            </>
          ) : isReceipt ? (
            <ReceiptForm
              defaultReceivedBy={defaultReceivedBy ?? ''}
              prefillClient={selectedCustomer?.fullName}
              prefillEmail={selectedCustomer?.email ?? undefined}
              prefillBusiness={selectedCustomer?.customerType === 'BUSINESS'}
              receiptTemplateId={selectedDocType?.receiptTemplateId}
              supportsMultiPayment={
                selectedDocType?.receiptTemplateSupportsMultiPayment ?? false
              }
              receiptQuota={receiptQuota}
              onCreate={onCreateReceipt!}
              onClose={onClose}
              onBusyChange={setReceiptBusy}
            />
          ) : (
            <>
              {submitError ? (
                <div className="docs-v2-creation-modal__error" role="alert">
                  {submitError}
                </div>
              ) : null}

              {hasValidSchema ? (
                <DocumentWizard
                  key={`${setup.documentTypeId}-${setup.formDefinitionId}`}
                  schema={schema!}
                  clientPrefill={clientPrefill}
                  onDirtyChange={setWizardDirty}
                  initialToggles={initialToggles}
                  persistKey={persistKey}
                  canSubmit={canSubmit}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit}
                  onCancel={onClose}
                />
              ) : (
                <div className="docs-v2-creation-modal__placeholder">
                  {setup.documentTypeId
                    ? 'No form schema configured for this document type.'
                    : 'Select a document type to start filling in the form.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <DiscardChangesModal
        isOpen={showDiscard}
        onConfirm={() => {
          setShowDiscard(false);
          onClose();
        }}
        onCancel={() => setShowDiscard(false)}
      />

      {/* Issue date ≠ today → mandatory acknowledgement before saving the invoice.
          Future date → also offers the "notify when ready to finalize" opt-in. */}
      {pendingInvoice !== null ? (
        <IssueDateDisclaimerModal
          showNotifyOptIn={pendingInvoice.dataJson.issueDate > todayIso()}
          onCancel={() => setPendingInvoice(null)}
          onConfirm={(notify) => {
            const pending = pendingInvoice;
            setPendingInvoice(null);
            void (pending.send
              ? doInvoiceSend(pending.dataJson, notify)
              : doInvoiceSubmit(pending.dataJson, notify));
          }}
        />
      ) : null}
    </div>
  );
}
