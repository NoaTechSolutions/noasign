"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, X, Loader2 } from "lucide-react";
import { adminApi, type DocumentTypeRef } from "../../lib/admin-api";
import {
  FormDefinitionMetaFields,
  type FormDefinitionMeta,
} from "./form-definition-meta-fields";
import { JsonSchemaEditor } from "./json-schema-editor";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

const EMPTY_META: FormDefinitionMeta = {
  name: "",
  documentTypeId: "",
  description: "",
  isActive: true,
};

const EMPTY_SCHEMA_TEXT = `{
  "sections": []
}`;

type FormDefinitionEditorProps =
  | { mode: "create"; id?: undefined }
  | { mode: "edit"; id: string };

export function FormDefinitionEditor(props: FormDefinitionEditorProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [meta, setMeta] = useState<FormDefinitionMeta>(EMPTY_META);
  const [schemaText, setSchemaText] = useState<string>(EMPTY_SCHEMA_TEXT);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeRef[]>([]);
  const [docTypesLoading, setDocTypesLoading] = useState(true);

  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .listDocumentTypes()
      .then((dts) => {
        if (!cancelled) setDocumentTypes(dts);
      })
      .catch(() => {
        // non-fatal: editor still works, dropdown will be empty
      })
      .finally(() => {
        if (!cancelled) setDocTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const id = props.id;
    let cancelled = false;
    setInitialLoading(true);
    adminApi
      .getFormDefinition(id)
      .then((fd) => {
        if (cancelled) return;
        setMeta({
          name: fd.name,
          documentTypeId: fd.documentTypeId,
          description: fd.description ?? "",
          isActive: fd.isActive,
        });
        setSchemaText(
          fd.schemaJson === null || fd.schemaJson === undefined
            ? EMPTY_SCHEMA_TEXT
            : JSON.stringify(fd.schemaJson, null, 2),
        );
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load");
        }
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, props.id]);

  const parseResult = useMemo(() => {
    try {
      return { value: JSON.parse(schemaText) as unknown, error: null as string | null };
    } catch (err) {
      return { value: null, error: err instanceof Error ? err.message : "Invalid JSON" };
    }
  }, [schemaText]);

  const canSave =
    !saving &&
    !initialLoading &&
    meta.name.trim().length > 0 &&
    meta.documentTypeId.length > 0 &&
    parseResult.error === null;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        name: meta.name.trim(),
        documentTypeId: meta.documentTypeId,
        description: meta.description.trim() || undefined,
        isActive: meta.isActive,
        schemaJson: parseResult.value,
      };
      if (isEdit) {
        await adminApi.updateFormDefinition(props.id, payload);
      } else {
        await adminApi.createFormDefinition(payload);
      }
      router.push("/dashboard/admin/form-definitions");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [canSave, meta, parseResult.value, isEdit, props, router]);

  const handleConfirmDelete = useCallback(async () => {
    if (!isEdit) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await adminApi.deleteFormDefinition(props.id);
      router.push("/dashboard/admin/form-definitions");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
      setDeleteLoading(false);
    }
  }, [isEdit, props, router]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-neutral-400">
        <Loader2 size={16} className="animate-spin mr-2" />
        Loading form definition…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {loadError}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">
            {isEdit ? "Edit Form Definition" : "New Form Definition"}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Define the JSON schema that drives the document form renderer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/admin/form-definitions")}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800 transition disabled:opacity-50"
          >
            <X size={14} />
            Cancel
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              disabled={saving || deleteLoading}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 transition disabled:opacity-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
        <FormDefinitionMetaFields
          meta={meta}
          onChange={setMeta}
          documentTypes={documentTypes}
          documentTypesLoading={docTypesLoading}
          disabled={saving}
        />
        <JsonSchemaEditor
          value={schemaText}
          onChange={setSchemaText}
          parseError={parseResult.error}
          disabled={saving}
        />
      </div>

      <DeleteConfirmDialog
        open={showDelete}
        title={`Delete "${meta.name}"?`}
        description="This action permanently removes the form definition. Existing documents that reference it may block the deletion."
        confirmPhrase={meta.name}
        isLoading={deleteLoading}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (deleteLoading) return;
          setShowDelete(false);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
