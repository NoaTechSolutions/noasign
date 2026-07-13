'use client';

import React, { useState } from 'react';
import { Search, User, Building2, X } from 'lucide-react';
import { ClientSelectPopup } from './ClientSelectPopup';

export interface DocumentTypeOption {
  id: string;
  name: string;
  code: string;
  generationMode?: "BOLDSIGN" | "DIRECT_PDF";
  formDefinitions: Array<{
    id: string;
    name: string;
    key: string;
    schemaJson?: unknown;
  }>;
  signatureTemplates: Array<{
    id: string;
    name: string;
    templateKey: string;
  }>;
  // Receipts (DIRECT_PDF): the tenant template to use. For the superadmin flow
  // it's the SELECTED user's template (borrowed), surfaced by getDocumentTypes.
  receiptTemplateId?: string;
  // True when the active receipt template draws the "N of M" multi-payment field
  // (WorldPavers' custom template) — gates the "part of multiple payments" toggle.
  receiptTemplateSupportsMultiPayment?: boolean;
}

export interface CustomerOption {
  id: string;
  fullName: string;
  email: string | null;
  customerType: 'PERSONAL' | 'BUSINESS';
  status?: 'ACTIVE' | 'INACTIVE';
  // Extra fields for Client-tab auto-fill (prefill on selection).
  phone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  business?: {
    primaryContactName?: string | null;
    primaryContactEmail?: string | null;
    primaryContactPhone?: string | null;
    primaryContactAddressLine1?: string | null;
    primaryContactCity?: string | null;
    primaryContactState?: string | null;
    primaryContactZipCode?: string | null;
    businessAddressLine1?: string | null;
    businessCity?: string | null;
    businessState?: string | null;
    businessZipCode?: string | null;
  } | null;
}

export interface DocumentSetupValue {
  documentTypeId: string;
  formDefinitionId: string;
  signatureTemplateId: string;
  contractDate: string;
  customerId: string;
}

interface DocumentSetupCardProps {
  documentTypes: DocumentTypeOption[];
  customers: CustomerOption[];
  value: DocumentSetupValue;
  onChange: (next: DocumentSetupValue) => void;
  disabled?: boolean;
  /** SUPERADMIN sees the Form Version + Signature Template dropdowns. Others get the
   *  simplified setup (type + date + client); form/template auto-load by type. */
  isSuperadmin?: boolean;
}

export function DocumentSetupCard({
  documentTypes,
  customers,
  value,
  onChange,
  disabled = false,
  isSuperadmin = false,
}: DocumentSetupCardProps) {
  const [clientPopupOpen, setClientPopupOpen] = useState(false);

  const selectedDocType = documentTypes.find((d) => d.id === value.documentTypeId);
  const formDefinitions = selectedDocType?.formDefinitions ?? [];
  const signatureTemplates = selectedDocType?.signatureTemplates ?? [];
  const selectedCustomer = customers.find((c) => c.id === value.customerId) ?? null;
  // Receipts (DIRECT_PDF) have no contract date / signature template — hide the
  // contract-specific fields; the type selector + client picker stay.
  const isReceipt = selectedDocType?.generationMode === 'DIRECT_PDF';

  // TASK 4 — selecting a type auto-loads its form + template (hidden for non-master).
  function handleDocTypeChange(docTypeId: string) {
    const docType = documentTypes.find((d) => d.id === docTypeId);
    const firstFormDef = docType?.formDefinitions[0];
    const firstTemplate = docType?.signatureTemplates[0];
    onChange({
      ...value,
      documentTypeId: docTypeId,
      formDefinitionId: firstFormDef?.id ?? '',
      signatureTemplateId: firstTemplate?.id ?? '',
    });
  }

  return (
    <div className="docs-v2-setup-card">
      <div className="docs-v2-setup-card__row">
        <label className="docs-v2-setup-card__field">
          <span className="docs-v2-setup-card__label">Document Type *</span>
          <select
            value={value.documentTypeId}
            disabled={disabled}
            onChange={(e) => handleDocTypeChange(e.target.value)}
            className="docs-v2-setup-card__input"
          >
            <option value="">Select a type...</option>
            {documentTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name}
              </option>
            ))}
          </select>
        </label>

        {!isReceipt ? (
          <label className="docs-v2-setup-card__field">
            <span className="docs-v2-setup-card__label">Document Date *</span>
            <input
              type="date"
              value={value.contractDate}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, contractDate: e.target.value })}
              className="docs-v2-setup-card__input"
            />
          </label>
        ) : null}
      </div>

      {/* SUPERADMIN-only: explicit Form Version + Signature Template. For everyone
          else these are auto-loaded from the selected type (TASK 4). Hidden for
          receipts (DIRECT_PDF) — they don't use a signature template. */}
      {isSuperadmin && !isReceipt ? (
        <div className="docs-v2-setup-card__row">
          <label className="docs-v2-setup-card__field">
            <span className="docs-v2-setup-card__label">Form Version</span>
            <select
              value={value.formDefinitionId}
              disabled={disabled || formDefinitions.length === 0}
              onChange={(e) => onChange({ ...value, formDefinitionId: e.target.value })}
              className="docs-v2-setup-card__input"
            >
              <option value="">Select a form...</option>
              {formDefinitions.map((fd) => (
                <option key={fd.id} value={fd.id}>
                  {fd.name}
                </option>
              ))}
            </select>
          </label>

          <label className="docs-v2-setup-card__field">
            <span className="docs-v2-setup-card__label">Signature Template</span>
            <select
              value={value.signatureTemplateId}
              disabled={disabled || signatureTemplates.length === 0}
              onChange={(e) => onChange({ ...value, signatureTemplateId: e.target.value })}
              className="docs-v2-setup-card__input"
            >
              <option value="">Select a template...</option>
              {signatureTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {/* Client (optional) — button that opens the select popup, or a chip. */}
      <div className="docs-v2-setup-card__field docs-v2-setup-card__field--full">
        <span className="docs-v2-setup-card__label">
          Client <span className="docs-v2-setup-card__optional">(optional)</span>
        </span>
        {selectedCustomer ? (
          <div className="docs-v2-client-chip">
            <span className="docs-v2-client-chip__icon">
              {selectedCustomer.customerType === 'BUSINESS' ? (
                <Building2 size={15} />
              ) : (
                <User size={15} />
              )}
            </span>
            <span className="docs-v2-client-chip__text">
              {selectedCustomer.fullName}
              {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ''}
            </span>
            <button
              type="button"
              className="docs-v2-client-chip__clear"
              disabled={disabled}
              onClick={() => onChange({ ...value, customerId: '' })}
              aria-label="Remove client"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="docs-v2-client-search-btn"
            disabled={disabled}
            onClick={() => setClientPopupOpen(true)}
          >
            <Search size={15} />
            <span>Search client...</span>
          </button>
        )}
      </div>

      {clientPopupOpen ? (
        <ClientSelectPopup
          customers={customers}
          selectedId={value.customerId}
          onSelect={(id) => onChange({ ...value, customerId: id })}
          onClose={() => setClientPopupOpen(false)}
        />
      ) : null}
    </div>
  );
}
