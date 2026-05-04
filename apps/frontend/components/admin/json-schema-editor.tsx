"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";

type JsonSchemaEditorProps = {
  value: string;
  onChange: (value: string) => void;
  errors: string[];
  disabled?: boolean;
};

export function JsonSchemaEditor({
  value,
  onChange,
  errors,
  disabled,
}: JsonSchemaEditorProps) {
  const lineCount = value.split("\n").length;
  const hasErrors = errors.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between border border-neutral-800 border-b-0 bg-neutral-900/60 rounded-t-md px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400">Schema JSON</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-500">{lineCount} line{lineCount === 1 ? "" : "s"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {hasErrors ? (
            <>
              <AlertCircle size={13} className="text-red-400" />
              <span className="text-red-400">
                {errors.length} {errors.length === 1 ? "error" : "errors"}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span className="text-emerald-400">Valid</span>
            </>
          )}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        className="flex-1 min-h-[400px] w-full resize-none rounded-b-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs leading-relaxed text-neutral-100 outline-none focus:border-amber-500/40 disabled:opacity-50"
        placeholder='{"sections": [{"key": "...", "label": "...", "fields": []}]}'
      />

      {hasErrors && (
        <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <div className="font-semibold mb-1">
            Schema {errors.length === 1 ? "has 1 error" : `has ${errors.length} errors`}:
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
