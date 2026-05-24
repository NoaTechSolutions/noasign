'use client';

import React from 'react';

export interface DocumentTypeOption {
  id: string;
  name: string;
  code: string;
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
}

export interface CustomerOption {
  id: string;
  fullName: string;
  email: string | null;
  customerType: 'PERSONAL' | 'BUSINESS';
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
}

export function DocumentSetupCard({
  documentTypes,
  customers,
  value,
  onChange,
  disabled = false,
}: DocumentSetupCardProps) {
  const selectedDocType = documentTypes.find((d) => d.id === value.documentTypeId);
  const formDefinitions = selectedDocType?.formDefinitions ?? [];
  const signatureTemplates = selectedDocType?.signatureTemplates ?? [];

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
          <span className="docs-v2-setup-card__label">Document Type</span>
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

        {formDefinitions.length > 1 ? (
          <label className="docs-v2-setup-card__field">
            <span className="docs-v2-setup-card__label">Form Version</span>
            <select
              value={value.formDefinitionId}
              disabled={disabled}
              onChange={(e) =>
                onChange({ ...value, formDefinitionId: e.target.value })
              }
              className="docs-v2-setup-card__input"
            >
              {formDefinitions.map((fd) => (
                <option key={fd.id} value={fd.id}>
                  {fd.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="docs-v2-setup-card__row">
        <label className="docs-v2-setup-card__field">
          <span className="docs-v2-setup-card__label">Signature Template</span>
          <select
            value={value.signatureTemplateId}
            disabled={disabled || signatureTemplates.length === 0}
            onChange={(e) =>
              onChange({ ...value, signatureTemplateId: e.target.value })
            }
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

        <label className="docs-v2-setup-card__field">
          <span className="docs-v2-setup-card__label">Contract Date</span>
          <input
            type="date"
            value={value.contractDate}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, contractDate: e.target.value })}
            className="docs-v2-setup-card__input"
          />
        </label>
      </div>

      <label className="docs-v2-setup-card__field docs-v2-setup-card__field--full">
        <span className="docs-v2-setup-card__label">
          Customer <span className="docs-v2-setup-card__optional">(optional)</span>
        </span>
        <select
          value={value.customerId}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, customerId: e.target.value })}
          className="docs-v2-setup-card__input"
        >
          <option value="">No customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
              {c.email ? ` (${c.email})` : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
