import { useEffect, useState } from 'react';
import type { DocumentSchema, SchemaField } from '../types';

function loadPersistedArrays(
  persistKey: string | undefined,
): Record<string, Array<Record<string, string>>> | null {
  if (!persistKey || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(persistKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
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
  if (!persistKey || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(persistKey, JSON.stringify(arrays));
  } catch {
    // ignore quota / unavailable
  }
}

export function clearPersistedArrays(persistKey: string | undefined) {
  if (!persistKey || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(persistKey);
  } catch {
    // ignore
  }
}

export function buildSeededArrays(
  schema: DocumentSchema,
): Record<string, Array<Record<string, string>>> {
  const seeded: Record<string, Array<Record<string, string>>> = {};
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === 'dynamic_array') {
        const min = field.minItems ?? 0;
        const itemFields = field.itemFields ?? [];
        const items: Array<Record<string, string>> = [];
        for (let i = 0; i < min; i++) {
          const item: Record<string, string> = {};
          for (const itemField of itemFields) {
            item[itemField.key] = itemField.defaultValue ?? '';
          }
          items.push(item);
        }
        seeded[field.key] = items;
      }
    }
  }
  return seeded;
}

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
          typeof item === 'object' && item !== null && !Array.isArray(item),
      );
    }
  }
  return result;
}

export function useDynamicArrays(
  schema: DocumentSchema,
  persistKey?: string,
  initialArrays?: Record<string, Array<Record<string, string>>>,
) {
  const [arrays, setArrays] = useState<Record<string, Array<Record<string, string>>>>(
    () => {
      const overlay = loadPersistedArrays(persistKey) ?? initialArrays ?? null;
      return mergePersistedArraysWithSeeded(buildSeededArrays(schema), overlay);
    },
  );

  const [seededBaseline] = useState<Record<string, Array<Record<string, string>>>>(
    () => buildSeededArrays(schema),
  );

  useEffect(() => {
    savePersistedArrays(persistKey, arrays);
  }, [persistKey, arrays]);

  function addItem(arrayKey: string, itemFields: SchemaField[], maxItems: number) {
    setArrays((current) => {
      const items = current[arrayKey] ?? [];
      if (items.length >= maxItems) return current;
      const newItem: Record<string, string> = {};
      for (const itemField of itemFields) {
        newItem[itemField.key] = itemField.defaultValue ?? '';
      }
      return { ...current, [arrayKey]: [...items, newItem] };
    });
  }

  function removeItem(arrayKey: string, index: number) {
    setArrays((current) => {
      const items = current[arrayKey] ?? [];
      return { ...current, [arrayKey]: items.filter((_, i) => i !== index) };
    });
  }

  function updateItem(
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
  }

  return { arrays, setArrays, addItem, removeItem, updateItem, seededBaseline };
}
