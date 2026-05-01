"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";

type JsonSchemaEditorProps = {
  value: string;
  onChange: (value: string) => void;
  parseError: string | null;
  disabled?: boolean;
};

export function JsonSchemaEditor({
  value,
  onChange,
  parseError,
  disabled,
}: JsonSchemaEditorProps) {
  const lineCount = value.split("\n").length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between border border-neutral-800 border-b-0 bg-neutral-900/60 rounded-t-md px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-400">Schema JSON</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-500">{lineCount} line{lineCount === 1 ? "" : "s"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {parseError ? (
            <>
              <AlertCircle size={13} className="text-red-400" />
              <span className="text-red-400">Invalid JSON</span>
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
        placeholder='{"sections": [{"id": "...", "title": "...", "fields": []}]}'
      />

      {parseError && (
        <div className="mt-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <strong className="font-semibold">Parse error:</strong> {parseError}
        </div>
      )}
    </div>
  );
}
