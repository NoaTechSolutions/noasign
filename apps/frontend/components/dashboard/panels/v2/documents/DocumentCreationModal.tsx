'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { DocumentSetupCard } from './DocumentSetupCard';
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
  onClose: () => void;
  onCreate: (payload: CreateDraftPayload) => Promise<void>;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DocumentCreationModal({
  documentTypes,
  customers,
  sessionId,
  onClose,
  onCreate,
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

  useBlockScroll();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const selectedDocType = documentTypes.find((d) => d.id === setup.documentTypeId);
  const selectedFormDef = selectedDocType?.formDefinitions.find(
    (f) => f.id === setup.formDefinitionId,
  );
  const schema = selectedFormDef?.schemaJson as DocumentSchema | undefined;
  const hasValidSchema = !!schema?.sections?.length;

  const selectedCustomer = customers.find((c) => c.id === setup.customerId) ?? null;

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

  return (
    <div className="docs-v2-creation-modal">
      <div
        className="docs-v2-creation-modal__overlay"
        onClick={onClose}
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
            onClick={onClose}
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
          />

          {submitError ? (
            <div className="docs-v2-creation-modal__error" role="alert">
              {submitError}
            </div>
          ) : null}

          {hasValidSchema ? (
            <DocumentWizard
              key={`${setup.documentTypeId}-${setup.formDefinitionId}`}
              schema={schema!}
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
        </div>
      </div>
    </div>
  );
}
