import React from 'react';
import { AlertTriangle, Calendar, DollarSign, Hash, Mail, Phone, Text } from 'lucide-react';

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'number'
  | 'currency'
  | 'textarea'
  | 'dynamic_array';

export interface FieldValidation {
  min?: number;
  maxLength?: number;
  minDate?: 'today';
  minDateFrom?: string;
  isEmail?: boolean;
}

export type AutoCalculateConfig =
  | { type: 'sum'; fields: string[] }
  | { type: 'copy'; source: string }
  | { type: 'multiply'; fields: string[] };

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  transform?: 'titleCase' | 'phone' | 'currency' | 'digitsOnly';
  validation?: FieldValidation;
  row?: string;
  copyFrom?: string;
  showWhen?: string;
  hideWhen?: string;
  defaultValue?: string;
  autoCalculate?: AutoCalculateConfig;
  itemFields?: SchemaField[];
  minItems?: number;
  maxItems?: number;
  addButtonLabel?: string;
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
  copyAddressToggle?: { label: string; defaultValue?: boolean };
  toggles?: SectionToggle[];
}

export interface DocumentSchema {
  sections: SchemaSection[];
}

export interface DocumentWizardProps {
  schema: DocumentSchema;
  initialValues?: Record<string, string>;
  /** Client-tab prefill pushed from outside (selecting a client in setup).
   *  `key` is the selected client id; the wizard re-applies whenever it changes
   *  and owns the "overwrite existing data?" decision. Deriving the trigger from
   *  the id (not a post-render nonce) guarantees a single apply per selection. */
  clientPrefill?: { values: Record<string, string>; key: string };
  /** Reports the wizard's unsaved-changes state up so the host modal can gate its
   *  own close triggers (backdrop / Escape / X) and the native reload prompt. */
  onDirtyChange?: (dirty: boolean) => void;
  initialToggles?: Record<string, boolean>;
  initialArrays?: Record<string, Array<Record<string, string>>>;
  staticFields?: Record<string, string>;
  persistKey?: string;
  readOnly?: boolean;
  onSubmit: (dataJson: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  /** Label of the wizard's final submit button (defaults to "Create draft"). */
  submitLabel?: string;
}

export interface FieldRenderProps {
  field: SchemaField;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  computed?: boolean;
  minDate?: string;
}

export const LETTERS_ONLY_KEYS: ReadonlySet<string> = new Set([
  'customer_name',
  'salesman_full_name',
  'fund_holder_name',
  'insurance_name',
]);

export const NO_DIGITS_KEYS: ReadonlySet<string> = new Set([
  'city',
  'state',
  'project_city',
  'project_state',
]);

export const DIGITS_ONLY_KEYS: ReadonlySet<string> = new Set([
  'zip',
  'project_zip',
  'zipCode',
]);

export const MAX_2_DIGITS_KEYS: ReadonlySet<string> = new Set(['customer_age']);

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function applyTransform(
  value: string,
  transform?: SchemaField['transform'],
): string {
  if (!transform) return value;
  if (transform === 'titleCase') {
    return value.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (transform === 'phone') {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (transform === 'currency') {
    const normalized = value.replace(/[^\d.]/g, '');
    if (!normalized) return '';
    const [whole = '', ...rest] = normalized.split('.');
    const cleanWhole = whole.replace(/^0+(?=\d)/, '') || whole || '0';
    const decimal = rest.join('').slice(0, 2);
    const formatted = normalized.includes('.')
      ? `${cleanWhole}.${decimal}`
      : cleanWhole;
    // Cap at $1,000,000,000 to match the edit-modal currency limit.
    const MAX_CURRENCY = 1_000_000_000;
    const numeric = Number(formatted);
    if (Number.isFinite(numeric) && numeric > MAX_CURRENCY) {
      return String(MAX_CURRENCY);
    }
    return formatted;
  }
  if (transform === 'digitsOnly') {
    return value.replace(/\D/g, '').slice(0, 100);
  }
  return value;
}

export function applyDigitsOnly(value: string, maxLength?: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength ?? 100);
}

export function applyLettersOnly(value: string): string {
  return value.replace(/[0-9]/g, '');
}

export function groupFields(fields: SchemaField[]): Array<SchemaField[]> {
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

export function iconForType(type: FieldType): React.ReactNode {
  const props = { className: 'wizard-field__icon', size: 14 };
  if (type === 'email') return React.createElement(Mail, props);
  if (type === 'phone') return React.createElement(Phone, props);
  if (type === 'date') return React.createElement(Calendar, props);
  if (type === 'currency') return React.createElement(DollarSign, props);
  if (type === 'number') return React.createElement(Hash, props);
  if (type === 'textarea') return React.createElement(Text, props);
  return null;
}

export { AlertTriangle };
