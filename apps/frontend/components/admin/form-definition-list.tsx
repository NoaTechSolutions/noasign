"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, FileJson } from "lucide-react";
import { adminApi, type FormDefinition } from "../../lib/admin-api";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

export function FormDefinitionList() {
  const router = useRouter();
  const [items, setItems] = useState<FormDefinition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FormDefinition | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi.listFormDefinitions();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form definitions");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await adminApi.deleteFormDefinition(pendingDelete.id);
      setPendingDelete(null);
      await refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Form Definitions</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Schemas that drive the dynamic document form renderer.
          </p>
        </div>
        <Link
          href="/dashboard/admin/form-definitions/new"
          className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950 hover:bg-amber-400 transition"
        >
          <Plus size={16} />
          New Form Definition
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {items === null && !error && (
        <div className="text-sm text-neutral-500 py-8 text-center">Loading…</div>
      )}

      {items && items.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-700 px-6 py-12 text-center">
          <FileJson size={28} className="mx-auto text-neutral-600" />
          <p className="mt-3 text-sm text-neutral-400">
            No form definitions yet. Create the first one to drive document forms.
          </p>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900/60 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Document Type</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Users</th>
                <th className="text-left px-4 py-3 font-medium">Schema</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {items.map((fd) => {
                const hasSchema = fd.schemaJson !== null && fd.schemaJson !== undefined;
                return (
                  <tr key={fd.id} className="hover:bg-neutral-900/40 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-100">{fd.name}</div>
                      {fd.description && (
                        <div className="text-xs text-neutral-500 mt-0.5">{fd.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-300">
                      {fd.documentType ? (
                        <>
                          <span className="font-mono text-xs">{fd.documentType.code}</span>
                          <span className="text-neutral-600 mx-1">·</span>
                          <span className="text-neutral-400">{fd.documentType.name}</span>
                        </>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          fd.isActive
                            ? "inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300"
                            : "inline-flex items-center rounded-full bg-neutral-700/40 px-2 py-0.5 text-xs text-neutral-400"
                        }
                      >
                        {fd.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-300">
                      {fd._count?.userConfigs ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {hasSchema ? (
                        <span className="text-emerald-400 text-xs">Set</span>
                      ) : (
                        <span className="text-amber-400 text-xs">Empty</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {new Date(fd.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/admin/form-definitions/${fd.id}`)}
                          className="rounded-md p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition"
                          aria-label={`Edit ${fd.name}`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingDelete(fd);
                            setDeleteError(null);
                          }}
                          className="rounded-md p-2 text-neutral-400 hover:bg-red-500/15 hover:text-red-400 transition"
                          aria-label={`Delete ${fd.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DeleteConfirmDialog
        open={pendingDelete !== null}
        title={`Delete "${pendingDelete?.name ?? ""}"?`}
        description="This action permanently removes the form definition. Existing documents that reference it may block the deletion."
        confirmPhrase={pendingDelete?.name ?? ""}
        affectedCount={pendingDelete?._count?.userConfigs}
        isLoading={deleteLoading}
        errorMessage={deleteError}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (deleteLoading) return;
          setPendingDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
