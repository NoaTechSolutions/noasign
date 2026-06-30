"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, DollarSign, Mail, Phone, Text, Hash, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Schema types ─────────────────────────────────────────────────────────────

export type FieldType = "text" | "email" | "phone" | "date" | "number" | "currency" | "textarea" | "dynamic_array";

export interface FieldValidation {
  min?: number;
  maxLength?: number;
  minDate?: "today";
  minDateFrom?: string;
  isEmail?: boolean;
}

export type AutoCalculateConfig =
  | { type: "sum"; fields: string[] }
  | { type: "copy"; source: string }
  | { type: "multiply"; fields: string[] };

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  transform?: "titleCase" | "phone" | "currency" | "digitsOnly";
  validation?: FieldValidation;
  /** Fields with the same row key are rendered side-by-side */
  row?: string;
  /** Copy value from this field key when copyAddressToggle is on */
  copyFrom?: string;
  /** Show field only when this toggle key is enabled */
  showWhen?: string;
  /** Hide field when this toggle key is enabled (inverse of showWhen) */
  hideWhen?: string;
  /** Initial value applied when no initialValue is provided */
  defaultValue?: string;
  /** When set, the field becomes readonly and is auto-calculated from other fields */
  autoCalculate?: AutoCalculateConfig;
  // ── NOA-272 dynamic_array support ────────────────────────────────────────
  /** dynamic_array only — schema for each item's fields. Each item creates a
   *  row with these fields. Per-item autoCalculate (multiply) references
   *  sibling itemField keys WITHIN the same item (not top-level). */
  itemFields?: SchemaField[];
  /** dynamic_array only — minimum items required (default 0) */
  minItems?: number;
  /** dynamic_array only — maximum items allowed (default 10) */
  maxItems?: number;
  /** dynamic_array only — label for the add button (default "Add") */
  addButtonLabel?: string;
  /** dynamic_array only — label for the remove button (default "Remove") */
  removeButtonLabel?: string;
}

export interface SectionToggle {
  key: string;
  label: string;
  defaultValue?: boolean;
}

export interface SchemaSection {
  key: string;
  label: string;
  fields: SchemaField[];
  /** Shows "Same as X" checkbox that copies fields with copyFrom */
  copyAddressToggle?: { label: string; defaultValue?: boolean };
  /** Additional show/hide toggles for conditional field groups */
  toggles?: SectionToggle[];
}

export interface DocumentSchema {
  sections: SchemaSection[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function applyTransform(value: string, transform?: SchemaField["transform"]): string {
  if (!transform) return value;
  if (transform === "titleCase") {
    return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (transform === "phone") {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (transform === "currency") {
    const normalized = value.replace(/[^\d.]/g, "");
    if (!normalized) return "";
    const [whole = "", ...rest] = normalized.split(".");
    const cleanWhole = whole.replace(/^0+(?=\d)/, "") || whole || "0";
    const decimal = rest.join("").slice(0, 2);
    return normalized.includes(".") ? `${cleanWhole}.${decimal}` : cleanWhole;
  }
  if (transform === "digitsOnly") {
    return value.replace(/\D/g, "").slice(0, transform === "digitsOnly" ? 100 : 100);
  }
  return value;
}

function applyDigitsOnly(value: string, maxLength?: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength ?? 100);
}

function applyLettersOnly(value: string): string {
  // Strip digits; preserve letters, spaces, and punctuation
  return value.replace(/[0-9]/g, "");
}

// Keys whose text inputs must never contain digits and always title-case
const LETTERS_ONLY_KEYS = new Set([
  "customer_name",
  "salesman_full_name",
  "fund_holder_name",
  "insurance_name",
]);

// Keys whose text inputs must not contain digits (city/state — no numbers allowed)
const NO_DIGITS_KEYS = new Set([
  "city",
  "state",
  "project_city",
  "project_state",
]);

// Keys whose text inputs accept only digits
const DIGITS_ONLY_KEYS = new Set(["zip", "project_zip", "zipCode"]);

// Keys whose number inputs have a max length of 2 digits
const MAX_2_DIGITS_KEYS = new Set(["customer_age"]);

function iconForType(type: FieldType) {
  if (type === "email") return <Mail className="h-4 w-4" />;
  if (type === "phone") return <Phone className="h-4 w-4" />;
  if (type === "date") return <Calendar className="h-4 w-4" />;
  if (type === "currency") return <DollarSign className="h-4 w-4" />;
  if (type === "number") return <Hash className="h-4 w-4" />;
  if (type === "textarea") return <Text className="h-4 w-4" />;
  return null;
}

// ── Primitive field components ────────────────────────────────────────────────

export function BaseField({
  label,
  icon,
  error,
  computed,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  computed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
        {icon ? <span className="text-[color:var(--text-muted)]">{icon}</span> : null}
        <span>{label}</span>
        {computed ? (
          <span
            className="ml-auto rounded-full border border-[color:var(--brand-accent)]/40 bg-[color:var(--brand-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-accent)]"
            title="Auto-calculated from other fields"
          >
            computed
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[color:var(--danger-text)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}

export function RendererField({
  field,
  value,
  error,
  disabled,
  computed,
  minDate,
  onChange,
}: {
  field: SchemaField;
  value: string;
  error?: string;
  disabled?: boolean;
  computed?: boolean;
  minDate?: string;
  onChange: (value: string) => void;
}) {
  const icon = iconForType(field.type);
  // Computed fields are always readonly — disable interaction without losing the computed badge
  const effectiveDisabled = disabled || computed;
  const inputClass = cn(
    "mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
    error && "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]",
    effectiveDisabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
  );

  if (field.type === "textarea") {
    return (
      <BaseField label={field.label} icon={icon} error={error} computed={computed}>
        <textarea
          value={value}
          placeholder={field.placeholder}
          disabled={effectiveDisabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "mt-3 min-h-28 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
            error && "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]",
            effectiveDisabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
          )}
        />
      </BaseField>
    );
  }

  if (field.type === "currency") {
    return (
      <BaseField label={field.label} icon={icon} error={error} computed={computed}>
        <div
          className={cn(
            "mt-3 flex h-11 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 transition focus-within:border-[color:var(--brand-accent)]",
            error && "border-[color:var(--danger-border)] focus-within:border-[color:var(--button-danger)]",
            effectiveDisabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] opacity-80",
          )}
        >
          <span className="mr-3 text-sm font-semibold text-[color:var(--text-secondary)]">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            placeholder={field.placeholder}
            disabled={effectiveDisabled}
            onChange={(e) => onChange(applyTransform(e.target.value, "currency"))}
            className="h-full w-full bg-transparent text-sm text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]"
          />
        </div>
      </BaseField>
    );
  }

  if (field.type === "number") {
    const numMaxLength = MAX_2_DIGITS_KEYS.has(field.key) ? 2 : field.validation?.maxLength;
    return (
      <BaseField label={field.label} icon={icon} error={error} computed={computed}>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={field.placeholder}
          disabled={effectiveDisabled}
          onChange={(e) => onChange(applyDigitsOnly(e.target.value, numMaxLength))}
          className={inputClass}
        />
      </BaseField>
    );
  }

  if (field.type === "phone") {
    return (
      <BaseField label={field.label} icon={icon} error={error} computed={computed}>
        <input
          type="text"
          inputMode="tel"
          value={value}
          placeholder={field.placeholder}
          disabled={effectiveDisabled}
          onChange={(e) => onChange(applyTransform(e.target.value, "phone"))}
          className={inputClass}
        />
      </BaseField>
    );
  }

  if (field.type === "date") {
    return (
      <BaseField label={field.label} icon={icon} error={error} computed={computed}>
        <input
          type="date"
          value={value}
          disabled={effectiveDisabled}
          min={minDate}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </BaseField>
    );
  }

  // text | email — same rendering
  return (
    <BaseField label={field.label} icon={icon} error={error} computed={computed}>
      <input
        type="text"
        inputMode={field.type === "email" ? "email" : "text"}
        value={value}
        placeholder={field.placeholder}
        disabled={effectiveDisabled}
        onChange={(e) => {
          let next = e.target.value;
          if (LETTERS_ONLY_KEYS.has(field.key) || NO_DIGITS_KEYS.has(field.key)) {
            next = applyLettersOnly(next);
          } else if (DIGITS_ONLY_KEYS.has(field.key)) {
            next = applyDigitsOnly(next);
          }
          if (field.transform === "titleCase" || NO_DIGITS_KEYS.has(field.key) || LETTERS_ONLY_KEYS.has(field.key)) {
            next = applyTransform(next, "titleCase");
          }
          onChange(next);
        }}
        className={inputClass}
      />
    </BaseField>
  );
}

// ── Main renderer ─────────────────────────────────────────────────────────────

// NOA-272 Chunk 3 — sessionStorage helpers for dynamic_array state.
// Flat fields and toggles are NOT persisted (consistent with current drawer
// behavior — only setup-card state lives in sessionStorage today). Arrays
// are persisted because the typical UX of "add 3 services, refresh, lose
// them" is the most disruptive case for Laura.
function loadPersistedArrays(
  persistKey: string | undefined,
): Record<string, Array<Record<string, string>>> | null {
  if (!persistKey || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(persistKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, Array<Record<string, string>>>;
  } catch {
    return null;
  }
}

function savePersistedArrays(
  persistKey: string | undefined,
  arrays: Record<string, Array<Record<string, string>>>,
) {
  if (!persistKey || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(persistKey, JSON.stringify(arrays));
  } catch {
    // Storage quota exceeded or unavailable — silently degrade.
  }
}

function clearPersistedArrays(persistKey: string | undefined) {
  if (!persistKey || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(persistKey);
  } catch {
    // ignore
  }
}

// Compute the seeded initial arrays state from a schema. Used both for the
// useState initializer AND for the isDirty comparison baseline (so editing
// items always reads as dirty against a clean form).
function buildSeededArrays(
  schema: DocumentSchema,
): Record<string, Array<Record<string, string>>> {
  const seeded: Record<string, Array<Record<string, string>>> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === "dynamic_array") {
        const min = field.minItems ?? 0;
        const itemFields = field.itemFields ?? [];
        const items: Array<Record<string, string>> = [];
        for (let i = 0; i < min; i++) {
          const item: Record<string, string> = {};
          for (const itemField of itemFields) {
            item[itemField.key] = itemField.defaultValue ?? "";
          }
          items.push(item);
        }
        seeded[field.key] = items;
      }
    }
  }
  return seeded;
}

// Defensive merge — only restore keys/items that match the current schema's
// itemFields shape. Prevents leaking stale items from a different schema if
// the persistKey ever collides.
function mergePersistedArraysWithSeeded(
  seeded: Record<string, Array<Record<string, string>>>,
  persisted: Record<string, Array<Record<string, string>>> | null,
): Record<string, Array<Record<string, string>>> {
  if (!persisted) return seeded;
  const result: Record<string, Array<Record<string, string>>> = { ...seeded };
  for (const key of Object.keys(seeded)) {
    const candidate = persisted[key];
    if (Array.isArray(candidate)) {
      result[key] = candidate.filter(
        (item): item is Record<string, string> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      );
    }
  }
  return result;
}

interface DocumentFormRendererProps {
  schema: DocumentSchema;
  initialValues?: Record<string, string>;
  /** Override toggle starting values. Keys are `${sectionKey}:${toggleKey}`.
   *  Falls back to schema's `toggle.defaultValue` when a key is missing.
   *  Used by the customer-prefill flow to flip "isBusiness"-style toggles. */
  initialToggles?: Record<string, boolean>;
  /** Injected into the final dataJson but not shown as editable fields */
  staticFields?: Record<string, string>;
  /** sessionStorage key for persisting dynamic_array state across refreshes.
   *  When null/undefined, persistence is disabled. The key should incorporate
   *  enough context (e.g. documentTypeCode) so distinct drafts don't collide. */
  persistKey?: string;
  /** NOA-280 — explicit initial state for dynamic_array fields. When set,
   *  overrides the seeded (minItems) defaults. Persisted state from
   *  `persistKey` still wins if present (live edits beat the snapshot).
   *  Used by DocumentViewer to hydrate readOnly views from a saved draft's
   *  flat-keyed dataJson, deserialized back to nested arrays. */
  initialArrays?: Record<string, Array<Record<string, string>>>;
  /** NOA-280 — render the form as a static, non-editable view. All inputs
   *  become disabled, dynamic_array Add/Remove controls hide, the bottom
   *  action bar hides, and the internal tab bar hides (assumes the parent
   *  component provides its own section navigation, e.g. DocumentViewer
   *  showing one schema section per outer viewer tab). Persistence is also
   *  effectively disabled — without edits there's nothing to persist. */
  readOnly?: boolean;
  onSubmit: (dataJson: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  /** External guard — submit button disabled until this is true */
  canSubmit?: boolean;
}

export function DocumentFormRenderer({
  schema,
  initialValues,
  initialToggles,
  staticFields,
  persistKey,
  initialArrays,
  readOnly = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
  canSubmit = true,
}: DocumentFormRendererProps) {
  const today = todayIso();

  // ── Field state ────────────────────────────────────────────────────────────

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const section of schema.sections) {
      for (const field of section.fields) {
        // dynamic_array fields live in the separate `arrays` state below
        if (field.type === "dynamic_array") continue;
        // Computed fields are derived — never seed them from initialValues/defaultValue
        if (field.autoCalculate) {
          initial[field.key] = "";
          continue;
        }
        const provided = initialValues?.[field.key];
        if (provided !== undefined && provided !== "") {
          initial[field.key] = provided;
        } else if (field.defaultValue !== undefined) {
          initial[field.key] = field.defaultValue;
        } else {
          initial[field.key] = "";
        }
      }
    }
    return initial;
  });

  // NOA-272 — separate state for dynamic_array fields. Each entry maps a
  // top-level array key (e.g. "line_items") to its current array of items.
  // Each item is a Record<string, string> matching the itemFields schema.
  // Kept separate from `fields` so the existing string-only pipeline (validation,
  // computed values, copyFrom, etc.) doesn't have to cope with mixed value types.
  // Submission flattens this into bracket-notation flat keys for BoldSign.
  //
  // Initial count from `minItems` (default 0) — seeds N empty items at mount
  // so Laura's invoice opens with Item 1 already visible (no empty state).
  // `minItems` is NOT enforced as a Remove constraint; Remove can still take
  // the array down to 0 items if the user wants.
  //
  // NOA-272 Chunk 3 — persisted to sessionStorage when `persistKey` is set.
  // On mount we merge the persisted state (if any) over the seeded defaults.
  // The merge is defensive — only itemKeys that exist in the current schema
  // are restored, so a stale persistKey collision can't leak old items.
  const [arrays, setArrays] = useState<Record<string, Array<Record<string, string>>>>(
    () => {
      // Priority: persisted (live edits) > initialArrays (explicit prop) > seeded (defaults).
      const overlay = loadPersistedArrays(persistKey) ?? initialArrays ?? null;
      return mergePersistedArraysWithSeeded(buildSeededArrays(schema), overlay);
    },
  );

  // Snapshot of the seeded state — never changes after mount, never includes
  // persisted values. Used as the baseline for isDirty: editing items reads
  // as dirty whether the form started fresh or was restored from session.
  // (Renamed from `initialArrays` in NOA-280 to avoid collision with the new
  // `initialArrays` prop that's used to hydrate readOnly views.)
  const [seededArraysBaseline] = useState<Record<string, Array<Record<string, string>>>>(
    () => buildSeededArrays(schema),
  );

  // Persist arrays to sessionStorage on every change. Cleared on submit
  // success or confirmed cancel (see handleSubmit + cancel dialog handlers).
  useEffect(() => {
    savePersistedArrays(persistKey, arrays);
  }, [persistKey, arrays]);

  // ── Dynamic array validation helpers (NOA-272 Chunk 2) ───────────────────

  // An item counts as "empty" when the user has not entered ANY value across
  // its raw fields. Computed fields (autoCalculate) live in computedArrays —
  // they're never user-typed, so they're absent from the raw `item` we check
  // here. No special-case needed.
  function isItemEmpty(item: Record<string, string>): boolean {
    return Object.values(item).every((v) => !v || v.trim() === "");
  }

  // Validate one dynamic_array's items for submit-time semantics:
  //   1. Drop completely empty items silently (auto-cleanup).
  //   2. Enforce minItems (after filter) → global error keyed at the array key.
  //   3. For each surviving item, every itemField marked required must be filled.
  // Per-field errors are keyed `${arrayKey}[${origIndex}].${itemField.key}` so
  // the rendered item cards can look them up by their visible index.
  function validateDynamicArray(
    items: Array<Record<string, string>>,
    arrayKey: string,
    itemFields: SchemaField[],
    minItems: number,
    arrayLabel: string,
  ): {
    errors: Record<string, string>;
    filteredItems: Array<Record<string, string>>;
  } {
    const errors: Record<string, string> = {};
    const filteredItems: Array<Record<string, string>> = [];
    const filteredOriginalIndices: number[] = [];

    items.forEach((item, origIdx) => {
      if (!isItemEmpty(item)) {
        filteredItems.push(item);
        filteredOriginalIndices.push(origIdx);
      }
    });

    if (filteredItems.length < minItems) {
      const word = minItems === 1 ? "item is" : "items are";
      errors[arrayKey] = `At least ${minItems} complete ${arrayLabel.toLowerCase()} ${word} required`;
      return { errors, filteredItems };
    }

    filteredItems.forEach((item, filteredIdx) => {
      const origIdx = filteredOriginalIndices[filteredIdx]!;
      for (const itemField of itemFields) {
        if (!itemField.required) continue;
        const value = item[itemField.key];
        if (!value || value.trim() === "") {
          errors[`${arrayKey}[${origIdx}].${itemField.key}`] =
            `${itemField.label} is required`;
        }
      }
    });

    return { errors, filteredItems };
  }

  // ── Dynamic array handlers (NOA-272) ──────────────────────────────────────

  // Add a new empty item to a dynamic_array. Seeds each itemField with its
  // defaultValue (or "") to keep the rendered inputs controlled.
  function handleAddArrayItem(arrayKey: string, itemFields: SchemaField[], maxItems: number) {
    setArrays((current) => {
      const items = current[arrayKey] ?? [];
      if (items.length >= maxItems) return current;
      const newItem: Record<string, string> = {};
      for (const itemField of itemFields) {
        newItem[itemField.key] = itemField.defaultValue ?? "";
      }
      return { ...current, [arrayKey]: [...items, newItem] };
    });
  }

  // Remove item at index. Native array filtering does the renumbering for free
  // (subsequent items shift down their index), so wildcard sums recompute
  // automatically without explicit key renaming.
  function handleRemoveArrayItem(arrayKey: string, index: number) {
    setArrays((current) => {
      const items = current[arrayKey] ?? [];
      return { ...current, [arrayKey]: items.filter((_, i) => i !== index) };
    });
  }

  function handleArrayItemChange(
    arrayKey: string,
    index: number,
    fieldKey: string,
    value: string,
  ) {
    setArrays((current) => {
      const items = current[arrayKey] ?? [];
      const next = items.slice();
      next[index] = { ...next[index], [fieldKey]: value };
      return { ...current, [arrayKey]: next };
    });
    // NOA-272 — clear the per-field error for this exact item field, plus the
    // global array error. Same UX pattern used for top-level fields: typing
    // into an errored field clears that error so the user sees feedback that
    // their fix is registered.
    setErrors((current) => {
      const next = { ...current };
      delete next[`${arrayKey}[${index}].${fieldKey}`];
      delete next[arrayKey];
      return next;
    });
  }

  // Per-item computed values. Each itemField with autoCalculate (multiply for
  // line_total = qty × unit_price) is resolved against the SAME ITEM's fields
  // (not top-level). Wildcard sums in the top-level pipeline read from this
  // memo so they aggregate computed line totals, not raw input.
  const computedArrays = useMemo(() => {
    function toNum(raw: string | undefined): number {
      if (!raw) return 0;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    }
    const result: Record<string, Array<Record<string, string>>> = {};
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type !== "dynamic_array") continue;
        const items = arrays[field.key] ?? [];
        const itemFields = field.itemFields ?? [];
        result[field.key] = items.map((item) => {
          const computedItem = { ...item };
          for (const itemField of itemFields) {
            if (itemField.autoCalculate?.type === "multiply") {
              const product = itemField.autoCalculate.fields.reduce(
                (acc, k) => acc * toNum(computedItem[k]),
                1,
              );
              computedItem[itemField.key] =
                itemField.type === "currency" || itemField.type === "number"
                  ? product.toFixed(2)
                  : String(product);
            }
          }
          return computedItem;
        });
      }
    }
    return result;
  }, [arrays, schema]);

  // ── Computed values (3-pass: multiply → sum → copy) ───────────────────────
  // Currency-typed computed values are normalized to two decimals; other types pass through.
  const computedValues = useMemo(() => {
    const all: Record<string, string> = { ...fields };

    function toNumber(raw: string | undefined): number {
      if (!raw) return 0;
      const n = parseFloat(raw);
      return Number.isFinite(n) ? n : 0;
    }

    function format(field: SchemaField, n: number): string {
      return field.type === "currency" || field.type === "number"
        ? n.toFixed(2)
        : String(n);
    }

    // Pass 1 — multiply (top-level only; per-item multiplies run in computedArrays).
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.autoCalculate?.type === "multiply") {
          if (field.autoCalculate.fields.length === 0) {
            all[field.key] = format(field, 0);
            continue;
          }
          const product = field.autoCalculate.fields.reduce(
            (acc, key) => acc * toNumber(all[key]),
            1,
          );
          all[field.key] = format(field, product);
        }
      }
    }

    // Pass 2 — sum (supports wildcard "arrayKey[*].itemFieldKey" to aggregate
    // across all items of a dynamic_array — e.g. grand_total summing
    // line_items[*].line_total).
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.autoCalculate?.type === "sum") {
          let total = 0;
          for (const ref of field.autoCalculate.fields) {
            const wildcard = ref.match(/^([^[\s]+)\[\*\]\.(.+)$/);
            if (wildcard) {
              const arrayKey = wildcard[1];
              const itemFieldKey = wildcard[2];
              const items = computedArrays[arrayKey] ?? [];
              for (const item of items) {
                total += toNumber(item[itemFieldKey]);
              }
            } else {
              total += toNumber(all[ref]);
            }
          }
          all[field.key] = format(field, total);
        }
      }
    }

    // Pass 3 — copy (may reference a sum or multiply result)
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.autoCalculate?.type === "copy") {
          const sourceValue = toNumber(all[field.autoCalculate.source]);
          all[field.key] = format(field, sourceValue);
        }
      }
    }

    return all;
  }, [fields, schema, computedArrays]);

  // ── Dirty tracking + cancel confirmation ──────────────────────────────────

  const isDirty = useMemo(() => {
    // Top-level fields — skip computed and dynamic_array (the latter lives
    // in `arrays`, not `fields`, and is checked separately below).
    const fieldsDirty = schema.sections.some((section) =>
      section.fields.some((field) => {
        if (field.autoCalculate) return false;
        if (field.type === "dynamic_array") return false;
        const current = fields[field.key] ?? "";
        const baseline =
          initialValues?.[field.key] !== undefined && initialValues[field.key] !== ""
            ? initialValues[field.key]
            : (field.defaultValue ?? "");
        return current !== baseline;
      }),
    );
    if (fieldsDirty) return true;

    // NOA-272 Chunk 3 — arrays vs the seeded baseline. JSON.stringify is
    // acceptable here: max 10 items × ~4 fields = ~40 keys, perf negligible.
    // Object key order is stable within a single JS engine session.
    return JSON.stringify(arrays) !== JSON.stringify(seededArraysBaseline);
  }, [fields, schema, initialValues, arrays, seededArraysBaseline]);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
    } else {
      onCancel();
    }
  }

  // ── Tab state ──────────────────────────────────────────────────────────────

  const [activeSection, setActiveSection] = useState(schema.sections[0]?.key ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tabError, setTabError] = useState("");

  // ── Toggle state ───────────────────────────────────────────────────────────

  // copyAddressToggle per section: sectionKey → boolean
  const [copyToggles, setCopyToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of schema.sections) {
      if (section.copyAddressToggle) {
        initial[section.key] = section.copyAddressToggle.defaultValue ?? true;
      }
    }
    return initial;
  });

  // Custom toggles: sectionKey+toggleKey → boolean
  const [customToggles, setCustomToggles] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of schema.sections) {
      for (const toggle of section.toggles ?? []) {
        const key = `${section.key}:${toggle.key}`;
        // initialToggles override > schema defaultValue > false
        initial[key] = initialToggles?.[key] ?? toggle.defaultValue ?? false;
      }
    }
    return initial;
  });

  // Resolve the display/submit value for a field, honoring autoCalculate + copyFrom
  function resolveValue(
    field: SchemaField,
    sectionKey: string,
  ): { value: string; isComputed: boolean; isDisabledByCopy: boolean } {
    if (field.autoCalculate) {
      return { value: computedValues[field.key] ?? "", isComputed: true, isDisabledByCopy: false };
    }
    const copyOn = copyToggles[sectionKey] ?? false;
    if (field.copyFrom && copyOn && fields[field.copyFrom]?.trim()) {
      return {
        value: fields[field.copyFrom] ?? "",
        isComputed: false,
        isDisabledByCopy: true,
      };
    }
    return {
      value: fields[field.key] ?? "",
      isComputed: false,
      isDisabledByCopy: false,
    };
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function getSectionFieldErrors(sectionKey: string): Record<string, string> {
    const section = schema.sections.find((s) => s.key === sectionKey);
    if (!section) return {};

    const errs: Record<string, string> = {};
    const copyOn = copyToggles[sectionKey] ?? false;

    for (const field of section.fields) {
      // Computed fields are derived — never validated as user input
      if (field.autoCalculate) continue;

      // Skip hidden fields
      if (field.hideWhen) {
        const hideToggleOn = customToggles[`${sectionKey}:${field.hideWhen}`] ?? false;
        if (hideToggleOn) continue;
      }
      if (field.showWhen) {
        const toggleOn = customToggles[`${sectionKey}:${field.showWhen}`] ?? false;
        if (!toggleOn) continue;
      }

      // Skip address fields when "same as" toggle is on and source exists
      if (field.copyFrom && copyOn && fields[field.copyFrom]?.trim()) {
        continue;
      }

      const value = fields[field.key]?.trim() ?? "";

      if (field.required && !value) {
        errs[field.key] = `${field.label} is required`;
        continue;
      }

      if (!value) continue;

      if (field.validation?.isEmail && !isValidEmail(value)) {
        errs[field.key] = "Enter a valid email address";
        continue;
      }

      if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
        errs[field.key] = `Must be ${field.validation.min} or older`;
        continue;
      }

      if (field.validation?.minDate === "today" && value < today) {
        errs[field.key] = "Only today or future dates";
        continue;
      }

      if (field.validation?.minDateFrom) {
        const otherValue = fields[field.validation.minDateFrom]?.trim();
        if (otherValue && value < otherValue) {
          errs[field.key] = "Must be after start date";
        }
      }
    }

    return errs;
  }

  function canAccessSection(sectionKey: string): boolean {
    const index = schema.sections.findIndex((s) => s.key === sectionKey);
    for (let i = 0; i < index; i++) {
      const key = schema.sections[i]?.key;
      if (key && Object.keys(getSectionFieldErrors(key)).length > 0) return false;
    }
    return true;
  }

  // Keep active tab valid as fields change
  useEffect(() => {
    if (!canAccessSection(activeSection)) {
      const validSection = schema.sections.find((s) => canAccessSection(s.key));
      if (validSection) setActiveSection(validSection.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  function handleNextSection() {
    const sectionErrors = getSectionFieldErrors(activeSection);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors((current) => ({ ...current, ...sectionErrors }));
      setTabError("Complete the required fields to continue.");
      return;
    }
    setErrors({});
    setTabError("");
    const index = schema.sections.findIndex((s) => s.key === activeSection);
    const next = schema.sections[index + 1];
    if (next) setActiveSection(next.key);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    // Validate all sections (top-level fields)
    const allErrors: Record<string, string> = {};
    for (const section of schema.sections) {
      Object.assign(allErrors, getSectionFieldErrors(section.key));
    }

    // NOA-272 Chunk 2 — validate dynamic_array fields:
    //   1. Drop empty items silently (auto-cleanup at submit time).
    //   2. Enforce minItems on the filtered count → global error.
    //   3. Per-item required-field validation on surviving items.
    // Filtered items captured here are also what gets flattened into the
    // submission below, so empty items don't leak into the saved dataJson.
    const filteredArrays: Record<string, Array<Record<string, string>>> = {};
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type !== "dynamic_array") continue;
        const items = arrays[field.key] ?? [];
        const min = field.minItems ?? 0;
        const itemFields = field.itemFields ?? [];
        const result = validateDynamicArray(
          items,
          field.key,
          itemFields,
          min,
          field.label ?? field.key,
        );
        Object.assign(allErrors, result.errors);
        filteredArrays[field.key] = result.filteredItems;
      }
    }

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setTabError("Complete the required fields to continue.");
      return;
    }

    // Build final dataJson
    const dataJson: Record<string, string> = {};

    for (const section of schema.sections) {
      const copyOn = copyToggles[section.key] ?? false;

      for (const field of section.fields) {
        // dynamic_array fields are flattened separately below — skip here so
        // we don't accidentally serialize "[object Object]" as a string value.
        if (field.type === "dynamic_array") continue;

        // Computed fields always use the latest derived value
        if (field.autoCalculate) {
          dataJson[field.key] = computedValues[field.key] ?? "";
          continue;
        }

        // Skip fields hidden by toggle
        if (field.hideWhen) {
          const hideToggleOn = customToggles[`${section.key}:${field.hideWhen}`] ?? false;
          if (hideToggleOn) {
            dataJson[field.key] = "";
            continue;
          }
        }
        if (field.showWhen) {
          const toggleOn = customToggles[`${section.key}:${field.showWhen}`] ?? false;
          if (!toggleOn) {
            dataJson[field.key] = "";
            continue;
          }
        }

        // Copy address fields
        if (field.copyFrom && copyOn && fields[field.copyFrom]?.trim()) {
          dataJson[field.key] = fields[field.copyFrom] ?? "";
        } else {
          dataJson[field.key] = fields[field.key] ?? "";
        }
      }
    }

    // NOA-272 — flatten dynamic arrays into bracket-notation flat keys for
    // BoldSign compatibility. Each surviving item becomes:
    //   line_items[0].description, line_items[0].qty, line_items[0].unit_price,
    //   line_items[0].line_total (from computed values, not raw input)
    // Indices are re-numbered against the filtered array so empty items leave
    // no holes in the flat key sequence.
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type !== "dynamic_array") continue;
        const items = filteredArrays[field.key] ?? [];
        const itemFields = field.itemFields ?? [];
        items.forEach((rawItem, idx) => {
          // Find the original index of this item to read its computed values.
          // computedArrays is parallel to the unfiltered `arrays`, so we look up
          // by reference equality.
          const originalArr = arrays[field.key] ?? [];
          const origIdx = originalArr.indexOf(rawItem);
          const computedItem =
            origIdx >= 0
              ? computedArrays[field.key]?.[origIdx] ?? rawItem
              : rawItem;
          for (const itemField of itemFields) {
            const value = itemField.autoCalculate
              ? (computedItem[itemField.key] ?? "")
              : (rawItem[itemField.key] ?? "");
            dataJson[`${field.key}[${idx}].${itemField.key}`] = value;
          }
        });
      }
    }

    // Inject static fields
    if (staticFields) {
      Object.assign(dataJson, staticFields);
    }

    // Filter empty
    const filtered = Object.fromEntries(
      Object.entries(dataJson).filter(([, v]) => v.trim() !== ""),
    );

    await onSubmit(filtered);
    // Submit succeeded (errors throw above) — drop the persisted arrays so the
    // next New Document opens fresh.
    clearPersistedArrays(persistKey);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const activeSectionDef = schema.sections.find((s) => s.key === activeSection);
  const isLastSection = schema.sections[schema.sections.length - 1]?.key === activeSection;

  // Group fields by row
  function groupFields(fields: SchemaField[]): Array<SchemaField[]> {
    const rows: Array<SchemaField[]> = [];
    const rowMap = new Map<string, SchemaField[]>();

    for (const field of fields) {
      if (field.row) {
        if (!rowMap.has(field.row)) {
          const group: SchemaField[] = [];
          rowMap.set(field.row, group);
          rows.push(group);
        }
        rowMap.get(field.row)!.push(field);
      } else {
        rows.push([field]);
      }
    }

    return rows;
  }

  function getMinDate(field: SchemaField): string | undefined {
    if (field.validation?.minDate === "today") return today;
    if (field.validation?.minDateFrom) {
      const other = fields[field.validation.minDateFrom]?.trim();
      return other || today;
    }
    return undefined;
  }

  function isFieldVisible(field: SchemaField, sectionKey: string): boolean {
    if (field.hideWhen) {
      const hideToggleOn = customToggles[`${sectionKey}:${field.hideWhen}`] ?? false;
      if (hideToggleOn) return false;
    }
    if (!field.showWhen) return true;
    return customToggles[`${sectionKey}:${field.showWhen}`] ?? false;
  }

  const copyOn = activeSectionDef ? (copyToggles[activeSectionDef.key] ?? false) : false;

  const visibleFields = activeSectionDef
    ? activeSectionDef.fields.filter((f) => isFieldVisible(f, activeSectionDef.key))
    : [];

  const fieldGroups = groupFields(visibleFields);

  return (
    <>
      {/* Cancel confirmation dialog */}
      {cancelConfirmOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-slate-950">
            <div className="text-lg font-semibold text-slate-950 dark:text-white">Cancel draft?</div>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              If you close this now, the information entered here will be discarded.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelConfirmOpen(false);
                  // NOA-272 Chunk 3 — confirmed discard: drop persisted arrays
                  // so the next mount starts from the seeded baseline.
                  clearPersistedArrays(persistKey);
                  onCancel();
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab bar — hidden in readOnly mode (NOA-280: parent component, e.g.
          DocumentViewer, provides outer section navigation and passes a
          single-section sub-schema per tab). */}
      {!readOnly ? (
        <div className="border-b border-slate-200 px-5 py-3 dark:border-white/10">
          <div className="flex flex-wrap gap-2">
            {schema.sections.map((section) => {
              const accessible = canAccessSection(section.key);
              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => {
                    if (!accessible) return;
                    setActiveSection(section.key);
                  }}
                  disabled={!accessible}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
                    activeSection === section.key
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/10",
                    !accessible && "cursor-not-allowed opacity-45 hover:bg-slate-50 dark:hover:bg-white/[0.04]",
                  )}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Fields */}
      <div className="px-5 py-5">
        {activeSectionDef ? (
          <div className="grid gap-3">
            {/* Copy address toggle */}
            {activeSectionDef.copyAddressToggle ? (
              <label className="inline-flex items-center gap-3 rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)]">
                <input
                  type="checkbox"
                  checked={copyOn}
                  onChange={(e) =>
                    setCopyToggles((current) => ({
                      ...current,
                      [activeSectionDef.key]: e.target.checked,
                    }))
                  }
                  disabled={
                    readOnly ||
                    !activeSectionDef.fields
                      .filter((f) => f.copyFrom)
                      .some((f) => fields[f.copyFrom!]?.trim())
                  }
                  className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--brand-accent)] focus:ring-[color:var(--focus-ring)]"
                />
                <span>{activeSectionDef.copyAddressToggle.label}</span>
              </label>
            ) : null}

            {/* Custom toggles */}
            {(activeSectionDef.toggles ?? []).map((toggle) => (
              <label
                key={toggle.key}
                className="inline-flex items-center gap-3 rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] px-4 py-3 text-sm font-medium text-[color:var(--text-primary)]"
              >
                <input
                  type="checkbox"
                  checked={customToggles[`${activeSectionDef.key}:${toggle.key}`] ?? false}
                  disabled={readOnly}
                  onChange={(e) =>
                    setCustomToggles((current) => ({
                      ...current,
                      [`${activeSectionDef.key}:${toggle.key}`]: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-[color:var(--border)] text-[color:var(--brand-accent)] focus:ring-[color:var(--focus-ring)]"
                />
                <span>{toggle.label}</span>
              </label>
            ))}

            {/* Field rows */}
            {fieldGroups.map((group, groupIndex) => {
              if (group.length === 1) {
                const field = group[0]!;
                // NOA-272 — dynamic_array fields render their own UI (not a
                // single input). They never share a row, so this branch
                // captures them entirely.
                if (field.type === "dynamic_array") {
                  const items = arrays[field.key] ?? [];
                  const computedItems = computedArrays[field.key] ?? items;
                  const itemFields = field.itemFields ?? [];
                  const max = field.maxItems ?? 10;
                  const addLabel = field.addButtonLabel ?? "Add item";
                  const removeLabel = field.removeButtonLabel ?? "Remove";
                  const atMax = items.length >= max;
                  return (
                    <div
                      key={field.key}
                      className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
                          {field.label} ({items.length}/{max})
                        </div>
                        {atMax ? (
                          <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                            Maximum {max} reached
                          </span>
                        ) : null}
                      </div>

                      {/* NOA-272 — global array error (e.g. "At least 1 item required") */}
                      {errors[field.key] ? (
                        <div className="mb-3 flex items-start gap-2 rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-3 py-2 text-xs font-medium text-[color:var(--danger-text)]">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span>{errors[field.key]}</span>
                        </div>
                      ) : null}

                      {items.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[color:var(--border)] px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
                          No items yet. Click &quot;{addLabel}&quot; to add one.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {items.map((_, itemIndex) => {
                            const computedItem = computedItems[itemIndex] ?? items[itemIndex] ?? {};
                            return (
                              <div
                                key={itemIndex}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                    Item {itemIndex + 1}
                                  </div>
                                  {/* NOA-280 — Remove hidden in readOnly view */}
                                  {!readOnly ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveArrayItem(field.key, itemIndex)}
                                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-rose-300 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10"
                                      aria-label={`${removeLabel} item ${itemIndex + 1}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {removeLabel}
                                    </button>
                                  ) : null}
                                </div>
                                {/* NOA-272 — respect itemField `row` so e.g.
                                    description renders full-width and qty +
                                    unit_price + line_total share a row of 3.
                                    Mirrors the top-level groupFields pattern. */}
                                <div className="space-y-3">
                                  {groupFields(itemFields).map((rowGroup, rowIdx) => {
                                    const renderItemField = (itemField: SchemaField) => {
                                      const isComputed = !!itemField.autoCalculate;
                                      const itemValue = isComputed
                                        ? (computedItem[itemField.key] ?? "")
                                        : (items[itemIndex]?.[itemField.key] ?? "");
                                      const itemErrorKey = `${field.key}[${itemIndex}].${itemField.key}`;
                                      return (
                                        <RendererField
                                          key={itemField.key}
                                          field={itemField}
                                          value={itemValue}
                                          computed={isComputed}
                                          disabled={readOnly}
                                          error={errors[itemErrorKey]}
                                          onChange={(value) => {
                                            handleArrayItemChange(
                                              field.key,
                                              itemIndex,
                                              itemField.key,
                                              value,
                                            );
                                          }}
                                        />
                                      );
                                    };
                                    if (rowGroup.length === 1) {
                                      return renderItemField(rowGroup[0]!);
                                    }
                                    const colsClass =
                                      rowGroup.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
                                    return (
                                      <div
                                        key={`item-${itemIndex}-row-${rowIdx}`}
                                        className={`grid gap-3 ${colsClass}`}
                                      >
                                        {rowGroup.map(renderItemField)}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* NOA-280 — Add hidden in readOnly view */}
                      {!readOnly ? (
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() =>
                              handleAddArrayItem(field.key, itemFields, max)
                            }
                            disabled={atMax}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-blue-600 transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:text-blue-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/10 dark:disabled:hover:bg-white/[0.04]"
                          >
                            <Plus className="h-4 w-4" />
                            {addLabel}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                }
                const resolved = resolveValue(field, activeSectionDef.key);
                return (
                  <RendererField
                    key={field.key}
                    field={field}
                    value={resolved.value}
                    error={errors[field.key]}
                    disabled={readOnly || resolved.isDisabledByCopy}
                    computed={resolved.isComputed}
                    minDate={getMinDate(field)}
                    onChange={(value) => {
                      setErrors((current) => {
                        const next = { ...current };
                        delete next[field.key];
                        return next;
                      });
                      setFields((current) => ({ ...current, [field.key]: value }));
                    }}
                  />
                );
              }

              const colsClass =
                group.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";

              return (
                <div key={`group-${groupIndex}`} className={`grid gap-3 ${colsClass}`}>
                  {group.map((field) => {
                    const resolved = resolveValue(field, activeSectionDef.key);
                    return (
                      <RendererField
                        key={field.key}
                        field={field}
                        value={resolved.value}
                        error={errors[field.key]}
                        disabled={readOnly || resolved.isDisabledByCopy}
                        computed={resolved.isComputed}
                        minDate={getMinDate(field)}
                        onChange={(value) => {
                          setErrors((current) => {
                            const next = { ...current };
                            delete next[field.key];
                            return next;
                          });
                          setFields((current) => ({ ...current, [field.key]: value }));
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Bottom bar — hidden in readOnly mode (NOA-280: viewer provides
          its own close button outside the renderer; no submit/cancel/
          continue actions are meaningful for a static view). */}
      {!readOnly ? (
        <div className="border-t border-slate-200 px-5 py-4 dark:border-white/10">
          {tabError ? (
            <div className="mb-3 rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger-text)]">
              {tabError}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            {isLastSection ? (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !canSubmit}
                className={cn(
                  "rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700",
                  (isSubmitting || !canSubmit) && "cursor-not-allowed opacity-60",
                )}
              >
                {isSubmitting ? "Creating..." : "Create draft"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextSection}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
