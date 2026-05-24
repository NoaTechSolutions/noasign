import { useCallback } from 'react';
import { isValidEmail, todayIso } from '../types';
import type { DocumentSchema, SchemaField } from '../types';

export interface ValidateDynamicArrayResult {
  errors: Record<string, string>;
  filteredItems: Array<Record<string, string>>;
}

function isItemEmpty(item: Record<string, string>): boolean {
  return Object.values(item).every((v) => !v || v.trim() === '');
}

export function validateDynamicArray(
  items: Array<Record<string, string>>,
  arrayKey: string,
  itemFields: SchemaField[],
  minItems: number,
  arrayLabel: string,
): ValidateDynamicArrayResult {
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
    const word = minItems === 1 ? 'item is' : 'items are';
    errors[arrayKey] = `At least ${minItems} complete ${arrayLabel.toLowerCase()} ${word} required`;
    return { errors, filteredItems };
  }

  filteredItems.forEach((item, filteredIdx) => {
    const origIdx = filteredOriginalIndices[filteredIdx]!;
    for (const itemField of itemFields) {
      if (!itemField.required) continue;
      const value = item[itemField.key];
      if (!value || value.trim() === '') {
        errors[`${arrayKey}[${origIdx}].${itemField.key}`] =
          `${itemField.label} is required`;
      }
    }
  });

  return { errors, filteredItems };
}

export function useFormValidation(
  schema: DocumentSchema,
  fields: Record<string, string>,
  copyToggles: Record<string, boolean>,
  customToggles: Record<string, boolean>,
) {
  const getSectionFieldErrors = useCallback(
    (sectionKey: string): Record<string, string> => {
      const section = schema.sections.find((s) => s.key === sectionKey);
      if (!section) return {};

      const errs: Record<string, string> = {};
      const today = todayIso();
      const copyOn = copyToggles[sectionKey] ?? false;

      for (const field of section.fields) {
        if (field.autoCalculate) continue;
        if (field.type === 'dynamic_array') continue;

        if (field.hideWhen) {
          const hideToggleOn = customToggles[`${sectionKey}:${field.hideWhen}`] ?? false;
          if (hideToggleOn) continue;
        }
        if (field.showWhen) {
          const toggleOn = customToggles[`${sectionKey}:${field.showWhen}`] ?? false;
          if (!toggleOn) continue;
        }

        if (field.copyFrom && copyOn && fields[field.copyFrom]?.trim()) {
          continue;
        }

        const value = fields[field.key]?.trim() ?? '';

        if (field.required && !value) {
          errs[field.key] = `${field.label} is required`;
          continue;
        }

        if (!value) continue;

        if (field.validation?.isEmail && !isValidEmail(value)) {
          errs[field.key] = 'Enter a valid email address';
          continue;
        }

        if (field.validation?.min !== undefined && Number(value) < field.validation.min) {
          errs[field.key] = `Must be ${field.validation.min} or older`;
          continue;
        }

        if (field.validation?.minDate === 'today' && value < today) {
          errs[field.key] = 'Only today or future dates';
          continue;
        }

        if (field.validation?.minDateFrom) {
          const otherValue = fields[field.validation.minDateFrom]?.trim();
          if (otherValue && value < otherValue) {
            errs[field.key] = 'Must be after start date';
          }
        }
      }

      return errs;
    },
    [schema, fields, copyToggles, customToggles],
  );

  const canAccessSection = useCallback(
    (sectionKey: string): boolean => {
      const index = schema.sections.findIndex((s) => s.key === sectionKey);
      for (let i = 0; i < index; i++) {
        const key = schema.sections[i]?.key;
        if (key && Object.keys(getSectionFieldErrors(key)).length > 0) return false;
      }
      return true;
    },
    [schema, getSectionFieldErrors],
  );

  return { getSectionFieldErrors, canAccessSection };
}
