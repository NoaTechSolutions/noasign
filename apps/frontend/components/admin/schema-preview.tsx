"use client";

import { AlertCircle, Eye, FileQuestion } from "lucide-react";
import { FieldRenderer } from "../dashboard/panels/v2/documents/wizard/fields";
import type {
  DocumentSchema,
  SchemaField,
} from "../dashboard/panels/v2/documents/wizard";

type SchemaPreviewProps = {
  schema: DocumentSchema | null;
  errors?: string[];
};

// Mirrors the renderer's row grouping so the preview matches the real layout
function groupFields(fields: SchemaField[]): SchemaField[][] {
  const rows: SchemaField[][] = [];
  const rowMap = new Map<string, SchemaField[]>();
  for (const field of fields) {
    if (field.row) {
      let group = rowMap.get(field.row);
      if (!group) {
        group = [];
        rowMap.set(field.row, group);
        rows.push(group);
      }
      group.push(field);
    } else {
      rows.push([field]);
    }
  }
  return rows;
}

function PreviewHeader({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center justify-between border border-neutral-800 border-b-0 bg-neutral-900/60 rounded-t-md px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <Eye size={13} className="text-neutral-400" />
        <span className="text-neutral-400">Live preview</span>
        {subtitle ? (
          <>
            <span className="text-neutral-600">·</span>
            <span className="text-neutral-500">{subtitle}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function PreviewPlaceholder({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex-1 min-h-[400px] rounded-b-md border border-neutral-800 bg-neutral-950/40 flex flex-col items-center justify-center gap-2 p-6 text-center">
      {icon}
      <span className="text-sm text-neutral-400">{title}</span>
      <span className="text-xs text-neutral-500 max-w-[28ch]">{hint}</span>
    </div>
  );
}

export function SchemaPreview({ schema, errors }: SchemaPreviewProps) {
  // Invalid schema (parse failed, structure broken, or validator errors)
  if (!schema || (errors && errors.length > 0)) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <PreviewHeader />
        <PreviewPlaceholder
          icon={<AlertCircle size={20} className="text-red-400/70" />}
          title="Invalid schema"
          hint="Fix the errors below the editor to see the preview."
        />
      </div>
    );
  }

  // Valid but empty
  if (schema.sections.length === 0) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <PreviewHeader />
        <PreviewPlaceholder
          icon={<FileQuestion size={20} className="text-neutral-500" />}
          title="Empty schema"
          hint="Add at least one section with fields to see the preview."
        />
      </div>
    );
  }

  const sectionCount = schema.sections.length;
  const fieldCount = schema.sections.reduce((acc, s) => acc + s.fields.length, 0);

  return (
    <div className="flex flex-col h-full min-h-0">
      <PreviewHeader
        subtitle={`${sectionCount} section${sectionCount === 1 ? "" : "s"}, ${fieldCount} field${fieldCount === 1 ? "" : "s"}`}
      />
      <div className="flex-1 min-h-[400px] rounded-b-md border border-neutral-800 bg-neutral-950/40 overflow-y-auto p-4">
        <div className="space-y-6">
          {schema.sections.map((section) => (
            <section key={section.key}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-300">
                {section.label}
              </h3>
              <div className="grid gap-3">
                {groupFields(section.fields).map((group, groupIndex) => {
                  const previewValue = (field: SchemaField) =>
                    field.autoCalculate ? "" : (field.defaultValue ?? "");

                  if (group.length === 1) {
                    const field = group[0]!;
                    return (
                      <FieldRenderer
                        key={field.key}
                        field={field}
                        value={previewValue(field)}
                        disabled
                        computed={!!field.autoCalculate}
                        onChange={() => {}}
                      />
                    );
                  }
                  const colsClass =
                    group.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
                  return (
                    <div
                      key={`g-${section.key}-${groupIndex}`}
                      className={`grid gap-3 ${colsClass}`}
                    >
                      {group.map((field) => (
                        <FieldRenderer
                          key={field.key}
                          field={field}
                          value={previewValue(field)}
                          disabled
                          computed={!!field.autoCalculate}
                          onChange={() => {}}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
