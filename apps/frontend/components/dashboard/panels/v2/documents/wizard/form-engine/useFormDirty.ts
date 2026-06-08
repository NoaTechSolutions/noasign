import { useMemo } from 'react';
import type { DocumentSchema } from '../types';

export function useFormDirty(
  schema: DocumentSchema,
  fields: Record<string, string>,
  arrays: Record<string, Array<Record<string, string>>>,
  initialValues: Record<string, string> | undefined,
  seededArraysBaseline: Record<string, Array<Record<string, string>>>,
) {
  return useMemo(() => {
    const fieldsDirty = schema.sections.some((section) =>
      section.fields.some((field) => {
        if (field.autoCalculate) return false;
        if (field.type === 'dynamic_array') return false;
        const current = fields[field.key] ?? '';
        const baseline =
          initialValues?.[field.key] !== undefined && initialValues[field.key] !== ''
            ? initialValues[field.key]
            : (field.defaultValue ?? '');
        return current !== baseline;
      }),
    );
    if (fieldsDirty) return true;

    return JSON.stringify(arrays) !== JSON.stringify(seededArraysBaseline);
  }, [fields, schema, initialValues, arrays, seededArraysBaseline]);
}
