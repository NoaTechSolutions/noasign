'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { useBeforeUnload } from '@/lib/use-before-unload';
import { DiscardChangesModal } from '@/components/dashboard/shared/DiscardChangesModal';
import { DocumentSetupCard } from './DocumentSetupCard';
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

interface DocumentCreationModalProps {
  documentTypes: DocumentTypeOption[];
  customers: CustomerOption[];
  sessionId?: string;
  isMaster?: boolean;
  onClose: () => void;
  onCreate: (payload: CreateDraftPayload) => Promise<void>;
  // DIRECT_PDF types (receipts) hand off to the receipt form instead of the
  // BoldSign wizard once selected in the type dropdown.
  onCreateReceipt?: (
    payload: CreateReceiptPayload,
  ) => Promise<ReceiptCreateResult>;
  defaultReceivedBy?: string;
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
  isMaster = false,
  onClose,
  onCreate,
  onCreateReceipt,
  defaultReceivedBy,
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
  // Wizard's unsaved-changes state, lifted up so backdrop/Escape/X can gate close.
  const [wizardDirty, setWizardDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  useBlockScroll();
  useBeforeUnload(wizardDirty);

  // Any close intent (backdrop / Escape / X): warn first if there are changes.
  const handleRequestClose = useCallback(() => {
    if (wizardDirty) {
      setShowDiscard(true);
      return;
    }
    onClose();
  }, [wizardDirty, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // While the discard prompt is up, let it own Escape.
      if (e.key === 'Escape' && !showDiscard) handleRequestClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRequestClose, showDiscard]);

  const selectedDocType = documentTypes.find((d) => d.id === setup.documentTypeId);
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

        <div className="docs-v2-creation-modal__body">
          <DocumentSetupCard
            documentTypes={documentTypes}
            customers={customers}
            value={setup}
            onChange={setSetup}
            disabled={isSubmitting}
            isMaster={isMaster}
          />

          {isReceipt ? (
            <ReceiptForm
              defaultReceivedBy={defaultReceivedBy ?? ''}
              prefillClient={selectedCustomer?.fullName}
              prefillEmail={selectedCustomer?.email ?? undefined}
              onCreate={onCreateReceipt!}
              onClose={onClose}
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
    </div>
  );
}
