"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, DollarSign, Mail, Phone, Text, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Schema types ─────────────────────────────────────────────────────────────

export type FieldType = "text" | "email" | "phone" | "date" | "number" | "currency" | "textarea";

export interface FieldValidation {
  min?: number;
  maxLength?: number;
  minDate?: "today";
  minDateFrom?: string;
  isEmail?: boolean;
}

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

// Keys whose text inputs must never contain digits
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

function BaseField({
  label,
  icon,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[color:var(--border)] bg-[color:var(--bg-surface)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]">
        {icon ? <span className="text-[color:var(--text-muted)]">{icon}</span> : null}
        {label}
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

function RendererField({
  field,
  value,
  error,
  disabled,
  minDate,
  onChange,
}: {
  field: SchemaField;
  value: string;
  error?: string;
  disabled?: boolean;
  minDate?: string;
  onChange: (value: string) => void;
}) {
  const icon = iconForType(field.type);
  const inputClass = cn(
    "mt-3 h-11 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
    error && "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]",
    disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
  );

  if (field.type === "textarea") {
    return (
      <BaseField label={field.label} icon={icon} error={error}>
        <textarea
          value={value}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "mt-3 min-h-28 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--brand-accent)]",
            error && "border-[color:var(--danger-border)] focus:border-[color:var(--button-danger)]",
            disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)] opacity-80",
          )}
        />
      </BaseField>
    );
  }

  if (field.type === "currency") {
    return (
      <BaseField label={field.label} icon={icon} error={error}>
        <div
          className={cn(
            "mt-3 flex h-11 items-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 transition focus-within:border-[color:var(--brand-accent)]",
            error && "border-[color:var(--danger-border)] focus-within:border-[color:var(--button-danger)]",
            disabled && "cursor-not-allowed bg-[color:var(--bg-page-subtle)] opacity-80",
          )}
        >
          <span className="mr-3 text-sm font-semibold text-[color:var(--text-secondary)]">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={value}
            placeholder={field.placeholder}
            disabled={disabled}
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
      <BaseField label={field.label} icon={icon} error={error}>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(applyDigitsOnly(e.target.value, numMaxLength))}
          className={inputClass}
        />
      </BaseField>
    );
  }

  if (field.type === "phone") {
    return (
      <BaseField label={field.label} icon={icon} error={error}>
        <input
          type="text"
          inputMode="tel"
          value={value}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(applyTransform(e.target.value, "phone"))}
          className={inputClass}
        />
      </BaseField>
    );
  }

  if (field.type === "date") {
    return (
      <BaseField label={field.label} icon={icon} error={error}>
        <input
          type="date"
          value={value}
          disabled={disabled}
          min={minDate}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </BaseField>
    );
  }

  // text | email — same rendering
  return (
    <BaseField label={field.label} icon={icon} error={error}>
      <input
        type="text"
        inputMode={field.type === "email" ? "email" : "text"}
        value={value}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(e) => {
          let next = e.target.value;
          if (LETTERS_ONLY_KEYS.has(field.key) || NO_DIGITS_KEYS.has(field.key)) {
            next = applyLettersOnly(next);
          } else if (DIGITS_ONLY_KEYS.has(field.key)) {
            next = applyDigitsOnly(next);
          }
          if (field.transform === "titleCase" || NO_DIGITS_KEYS.has(field.key)) {
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

interface DocumentFormRendererProps {
  schema: DocumentSchema;
  initialValues?: Record<string, string>;
  /** Injected into the final dataJson but not shown as editable fields */
  staticFields?: Record<string, string>;
  onSubmit: (dataJson: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  /** External guard — submit button disabled until this is true */
  canSubmit?: boolean;
}

export function DocumentFormRenderer({
  schema,
  initialValues,
  staticFields,
  onSubmit,
  onCancel,
  isSubmitting = false,
  canSubmit = true,
}: DocumentFormRendererProps) {
  const today = todayIso();

  // ── Field state ────────────────────────────────────────────────────────────

  const allFieldKeys = useMemo(
    () => schema.sections.flatMap((s) => s.fields.map((f) => f.key)),
    [schema],
  );

  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const key of allFieldKeys) {
      initial[key] = initialValues?.[key] ?? "";
    }
    return initial;
  });

  // ── Dirty tracking ─────────────────────────────────────────────────────────

  const isDirty = useMemo(
    () => allFieldKeys.some((key) => (fields[key] ?? "") !== (initialValues?.[key] ?? "")),
    [fields, allFieldKeys, initialValues],
  );

  function handleCancel() {
    if (isDirty && !window.confirm("You have unsaved changes. Are you sure you want to cancel?")) return;
    onCancel();
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
        initial[`${section.key}:${toggle.key}`] = toggle.defaultValue ?? false;
      }
    }
    return initial;
  });

  // ── Validation ─────────────────────────────────────────────────────────────

  function getSectionFieldErrors(sectionKey: string): Record<string, string> {
    const section = schema.sections.find((s) => s.key === sectionKey);
    if (!section) return {};

    const errs: Record<string, string> = {};
    const copyOn = copyToggles[sectionKey] ?? false;

    for (const field of section.fields) {
      // Skip hidden fields
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
    // Validate all sections
    const allErrors: Record<string, string> = {};
    for (const section of schema.sections) {
      Object.assign(allErrors, getSectionFieldErrors(section.key));
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
        // Skip fields hidden by toggle
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

    // Inject static fields
    if (staticFields) {
      Object.assign(dataJson, staticFields);
    }

    // Filter empty
    const filtered = Object.fromEntries(
      Object.entries(dataJson).filter(([, v]) => v.trim() !== ""),
    );

    await onSubmit(filtered);
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
      {/* Tab bar */}
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
                const isDisabledByCopy =
                  field.copyFrom && copyOn && !!fields[field.copyFrom]?.trim();
                return (
                  <RendererField
                    key={field.key}
                    field={field}
                    value={
                      isDisabledByCopy
                        ? (fields[field.copyFrom!] ?? "")
                        : (fields[field.key] ?? "")
                    }
                    error={errors[field.key]}
                    disabled={!!isDisabledByCopy}
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
                    const isDisabledByCopy =
                      field.copyFrom && copyOn && !!fields[field.copyFrom]?.trim();
                    return (
                      <RendererField
                        key={field.key}
                        field={field}
                        value={
                          isDisabledByCopy
                            ? (fields[field.copyFrom!] ?? "")
                            : (fields[field.key] ?? "")
                        }
                        error={errors[field.key]}
                        disabled={!!isDisabledByCopy}
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

      {/* Bottom bar */}
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
    </>
  );
}
