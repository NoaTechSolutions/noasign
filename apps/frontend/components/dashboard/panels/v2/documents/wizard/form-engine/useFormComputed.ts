import { useMemo } from 'react';
import type { DocumentSchema, SchemaField } from '../types';

function toNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function formatComputed(field: SchemaField, n: number): string {
  return field.type === 'currency' || field.type === 'number'
    ? n.toFixed(2)
    : String(n);
}

export function useFormComputed(
  schema: DocumentSchema,
  fields: Record<string, string>,
  arrays: Record<string, Array<Record<string, string>>>,
) {
  const computedArrays = useMemo(() => {
    const result: Record<string, Array<Record<string, string>>> = {};
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type !== 'dynamic_array') continue;
        const items = arrays[field.key] ?? [];
        const itemFields = field.itemFields ?? [];
        result[field.key] = items.map((item) => {
          const computedItem = { ...item };
          for (const itemField of itemFields) {
            if (itemField.autoCalculate?.type === 'multiply') {
              const product = itemField.autoCalculate.fields.reduce(
                (acc, k) => acc * toNumber(computedItem[k]),
                1,
              );
              computedItem[itemField.key] =
                itemField.type === 'currency' || itemField.type === 'number'
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

  const computedValues = useMemo(() => {
    const all: Record<string, string> = { ...fields };

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.autoCalculate?.type === 'multiply') {
          if (field.autoCalculate.fields.length === 0) {
            all[field.key] = formatComputed(field, 0);
            continue;
          }
          const product = field.autoCalculate.fields.reduce(
            (acc, key) => acc * toNumber(all[key]),
            1,
          );
          all[field.key] = formatComputed(field, product);
        }
      }
    }

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.autoCalculate?.type === 'sum') {
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
          all[field.key] = formatComputed(field, total);
        }
      }
    }

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.autoCalculate?.type === 'copy') {
          const sourceValue = toNumber(all[field.autoCalculate.source]);
          all[field.key] = formatComputed(field, sourceValue);
        }
      }
    }

    return all;
  }, [fields, schema, computedArrays]);

  return { computedValues, computedArrays };
}
