"use client";

import type { DocumentTypeRef } from "../../lib/admin-api";

export type FormDefinitionMeta = {
  name: string;
  documentTypeId: string;
  description: string;
  isActive: boolean;
};

type FormDefinitionMetaFieldsProps = {
  meta: FormDefinitionMeta;
  onChange: (next: FormDefinitionMeta) => void;
  documentTypes: DocumentTypeRef[];
  documentTypesLoading: boolean;
  disabled?: boolean;
};

export function FormDefinitionMetaFields({
  meta,
  onChange,
  documentTypes,
  documentTypesLoading,
  disabled,
}: FormDefinitionMetaFieldsProps) {
  const update = <K extends keyof FormDefinitionMeta>(
    key: K,
    value: FormDefinitionMeta[K],
  ) => onChange({ ...meta, [key]: value });

  return (
    <div className="space-y-4 rounded-md border border-neutral-800 bg-neutral-900/40 p-4">
      <div>
        <label htmlFor="fd-name" className="block text-xs uppercase tracking-wide text-neutral-500 mb-1.5">
          Name *
        </label>
        <input
          id="fd-name"
          value={meta.name}
          onChange={(e) => update("name", e.target.value)}
          disabled={disabled}
          placeholder="Construction Contract — Standard"
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-amber-500/40 disabled:opacity-50"
        />
      </div>

      <div>
        <label htmlFor="fd-doctype" className="block text-xs uppercase tracking-wide text-neutral-500 mb-1.5">
          Document Type *
        </label>
        <select
          id="fd-doctype"
          value={meta.documentTypeId}
          onChange={(e) => update("documentTypeId", e.target.value)}
          disabled={disabled || documentTypesLoading}
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-amber-500/40 disabled:opacity-50"
        >
          <option value="">
            {documentTypesLoading ? "Loading…" : "Select a document type"}
          </option>
          {documentTypes.map((dt) => (
            <option key={dt.id} value={dt.id}>
              {dt.code} — {dt.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="fd-description" className="block text-xs uppercase tracking-wide text-neutral-500 mb-1.5">
          Description
        </label>
        <textarea
          id="fd-description"
          value={meta.description}
          onChange={(e) => update("description", e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="Optional notes about this form definition"
          className="w-full resize-none rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-amber-500/40 disabled:opacity-50"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
        <input
          type="checkbox"
          checked={meta.isActive}
          onChange={(e) => update("isActive", e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-neutral-700 bg-neutral-950 accent-amber-500"
        />
        Active (available for assignment)
      </label>
    </div>
  );
}
