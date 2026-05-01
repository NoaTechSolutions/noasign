"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type DeleteConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmPhrase: string;
  affectedCount?: number;
  isLoading?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DeleteConfirmDialog({
  open,
  title,
  description,
  confirmPhrase,
  affectedCount,
  isLoading,
  errorMessage,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) {
      dlg.showModal();
    } else if (!open && dlg.open) {
      dlg.close();
      setTyped("");
    }
  }, [open]);

  const matches = typed.trim() === confirmPhrase;
  const canConfirm = matches && !isLoading;

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-md"
    >
      <div className="w-[min(92vw,460px)] rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              <AlertTriangle size={18} />
            </div>
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-neutral-500 hover:text-neutral-200 transition disabled:opacity-40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {description && (
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{description}</p>
        )}

        {typeof affectedCount === "number" && affectedCount > 0 && (
          <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <strong className="font-semibold">{affectedCount}</strong>{" "}
            user document config{affectedCount === 1 ? "" : "s"} reference this form.
            Deletion may be blocked by the backend.
          </div>
        )}

        <div className="mt-5">
          <label className="block text-xs uppercase tracking-wide text-neutral-500 mb-1.5">
            Type <code className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-neutral-200">{confirmPhrase}</code> to confirm
          </label>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={isLoading}
            autoFocus
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm font-mono outline-none focus:border-red-500/50 disabled:opacity-50"
          />
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700 transition disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
