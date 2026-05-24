import { useState } from 'react';
import type { DocumentSchema } from '../types';

export function useFormFields(
  schema: DocumentSchema,
  initialValues?: Record<string, string>,
) {
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type === 'dynamic_array') continue;
        if (field.autoCalculate) {
          initial[field.key] = '';
          continue;
        }
        const provided = initialValues?.[field.key];
        if (provided !== undefined && provided !== '') {
          initial[field.key] = provided;
        } else if (field.defaultValue !== undefined) {
          initial[field.key] = field.defaultValue;
        } else {
          initial[field.key] = '';
        }
      }
    }
    return initial;
  });

  function updateField(key: string, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  return { fields, setFields, updateField };
}
