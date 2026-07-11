'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmActionModal } from '@/components/dashboard/shared/ConfirmActionModal';
import {
  clearPersistedArrays,
  useDynamicArrays,
  useFormComputed,
  useFormDirty,
  useFormFields,
  useFormToggles,
  useFormValidation,
  validateDynamicArray,
} from './form-engine';
import {
  WizardBottomBar,
  WizardCancelDialog,
  WizardSection,
  WizardTabBar,
} from './shell';
import type { DocumentWizardProps } from './types';
import './document-wizard.css';

const CLIENT_FIELDS = [
  'customer_name',
  'customer_email',
  'customer_phone',
  'customer_address',
  'city',
  'state',
  'zip',
];

export function DocumentWizard({
  schema,
  initialValues,
  clientPrefill,
  onDirtyChange,
  initialToggles,
  initialArrays,
  staticFields,
  persistKey,
  readOnly = false,
  onSubmit,
  onCancel,
  isSubmitting = false,
  canSubmit = true,
  submitLabel,
}: DocumentWizardProps) {
  const { fields, setFields, updateField } = useFormFields(schema, initialValues);
  const {
    arrays,
    addItem,
    removeItem,
    updateItem,
    seededBaseline,
  } = useDynamicArrays(schema, persistKey, initialArrays);
  const { copyToggles, customToggles, setCopyToggle, setCustomToggle } =
    useFormToggles(schema, initialToggles);
  const { computedValues, computedArrays } = useFormComputed(schema, fields, arrays);
  const { getSectionFieldErrors, canAccessSection } = useFormValidation(
    schema,
    fields,
    copyToggles,
    customToggles,
  );
  const isDirty = useFormDirty(schema, fields, arrays, initialValues, seededBaseline);

  // Report dirty state up so the host modal can gate backdrop/Escape/X + reload.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  // On unmount (e.g. document type change), clear the host's dirty flag so it
  // doesn't stay stuck on a stale `true`.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const [activeSection, setActiveSection] = useState(schema.sections[0]?.key ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tabError, setTabError] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  // ── Client-tab auto-fill (from selecting a client in the setup card) ────────
  const [overwriteOpen, setOverwriteOpen] = useState(false);
  const [pendingPrefill, setPendingPrefill] = useState<Record<string, string> | null>(null);
  const prefillKeyRef = useRef<string | undefined>(undefined);

  // Apply only keys that exist in the current schema (so e.g. a form without
  // city/state/zip isn't polluted). Overwrites all matched Client fields (Opción A).
  const applyClientPrefill = useCallback(
    (values: Record<string, string>) => {
      setFields((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(values)) {
          if (key in prev) next[key] = value;
        }
        return next;
      });
    },
    [setFields],
  );

  useEffect(() => {
    if (!clientPrefill) return;
    if (clientPrefill.key === prefillKeyRef.current) return;
    prefillKeyRef.current = clientPrefill.key;

    const hasExisting = CLIENT_FIELDS.some(
      (key) => key in fields && (fields[key] ?? '').trim() !== '',
    );
    if (hasExisting) {
      setPendingPrefill(clientPrefill.values);
      setOverwriteOpen(true);
    } else {
      applyClientPrefill(clientPrefill.values);
    }
    // Intentionally only react to a new prefill (key), not to `fields` edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientPrefill]);

  useEffect(() => {
    if (!canAccessSection(activeSection)) {
      const valid = schema.sections.find((s) => canAccessSection(s.key));
      if (valid) setActiveSection(valid.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const handleUpdateField = useCallback(
    (key: string, value: string) => {
      setErrors((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      updateField(key, value);
    },
    [updateField],
  );

  const handleUpdateItem = useCallback(
    (arrayKey: string, index: number, fieldKey: string, value: string) => {
      setErrors((current) => {
        const next = { ...current };
        delete next[`${arrayKey}[${index}].${fieldKey}`];
        delete next[arrayKey];
        return next;
      });
      updateItem(arrayKey, index, fieldKey, value);
    },
    [updateItem],
  );

  const handleSetCopyToggle = useCallback(
    (sectionKey: string, value: boolean) => {
      setCopyToggle(sectionKey, value);
    },
    [setCopyToggle],
  );

  const handleSetCustomToggle = useCallback(
    (sectionKey: string, toggleKey: string, value: boolean) => {
      setCustomToggle(sectionKey, toggleKey, value);
    },
    [setCustomToggle],
  );

  function handleNextSection() {
    const sectionErrors = getSectionFieldErrors(activeSection);
    if (Object.keys(sectionErrors).length > 0) {
      setErrors((current) => ({ ...current, ...sectionErrors }));
      setTabError('Complete the required fields to continue.');
      return;
    }
    setErrors({});
    setTabError('');
    const index = schema.sections.findIndex((s) => s.key === activeSection);
    const next = schema.sections[index + 1];
    if (next) setActiveSection(next.key);
  }

  async function handleSubmit() {
    const allErrors: Record<string, string> = {};
    for (const section of schema.sections) {
      Object.assign(allErrors, getSectionFieldErrors(section.key));
    }

    const filteredArrays: Record<string, Array<Record<string, string>>> = {};
    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type !== 'dynamic_array') continue;
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
      setTabError('Complete the required fields to continue.');
      return;
    }

    const dataJson: Record<string, string> = {};

    for (const section of schema.sections) {
      const copyOn = copyToggles[section.key] ?? false;
      for (const field of section.fields) {
        if (field.type === 'dynamic_array') continue;

        if (field.autoCalculate) {
          dataJson[field.key] = computedValues[field.key] ?? '';
          continue;
        }

        if (field.hideWhen) {
          const hideToggleOn = customToggles[`${section.key}:${field.hideWhen}`] ?? false;
          if (hideToggleOn) {
            dataJson[field.key] = '';
            continue;
          }
        }
        if (field.showWhen) {
          const toggleOn = customToggles[`${section.key}:${field.showWhen}`] ?? false;
          if (!toggleOn) {
            dataJson[field.key] = '';
            continue;
          }
        }

        if (field.copyFrom && copyOn && fields[field.copyFrom]?.trim()) {
          dataJson[field.key] = fields[field.copyFrom] ?? '';
        } else {
          dataJson[field.key] = fields[field.key] ?? '';
        }
      }
    }

    for (const section of schema.sections) {
      for (const field of section.fields) {
        if (field.type !== 'dynamic_array') continue;
        const items = filteredArrays[field.key] ?? [];
        const itemFields = field.itemFields ?? [];
        items.forEach((rawItem, idx) => {
          const originalArr = arrays[field.key] ?? [];
          const origIdx = originalArr.indexOf(rawItem);
          const computedItem =
            origIdx >= 0
              ? computedArrays[field.key]?.[origIdx] ?? rawItem
              : rawItem;
          for (const itemField of itemFields) {
            const value = itemField.autoCalculate
              ? (computedItem[itemField.key] ?? '')
              : (rawItem[itemField.key] ?? '');
            dataJson[`${field.key}[${idx}].${itemField.key}`] = value;
          }
        });
      }
    }

    if (staticFields) {
      Object.assign(dataJson, staticFields);
    }

    const filtered = Object.fromEntries(
      Object.entries(dataJson).filter(([, v]) => v.trim() !== ''),
    );

    await onSubmit(filtered);
    clearPersistedArrays(persistKey);
  }

  function handleCancel() {
    if (isDirty) {
      setCancelConfirmOpen(true);
    } else {
      onCancel();
    }
  }

  function confirmCancel() {
    setCancelConfirmOpen(false);
    clearPersistedArrays(persistKey);
    onCancel();
  }

  const activeSectionDef = schema.sections.find((s) => s.key === activeSection);
  const isLastSection =
    schema.sections[schema.sections.length - 1]?.key === activeSection;

  if (!activeSectionDef) return null;

  return (
    <div className="document-wizard-v2">
      {cancelConfirmOpen ? (
        <WizardCancelDialog
          onConfirm={confirmCancel}
          onClose={() => setCancelConfirmOpen(false)}
        />
      ) : null}

      <ConfirmActionModal
        isOpen={overwriteOpen}
        title="Overwrite client data?"
        message="The Client section already has data. Selecting this client will replace it."
        confirmLabel="Overwrite"
        cancelLabel="Keep current"
        variant="amber"
        onConfirm={() => {
          if (pendingPrefill) applyClientPrefill(pendingPrefill);
          setPendingPrefill(null);
          setOverwriteOpen(false);
        }}
        onCancel={() => {
          setPendingPrefill(null);
          setOverwriteOpen(false);
        }}
      />

      {!readOnly ? (
        <WizardTabBar
          schema={schema}
          activeSection={activeSection}
          onChangeSection={setActiveSection}
          canAccessSection={canAccessSection}
        />
      ) : null}

      <div className="document-wizard-v2__body">
        <WizardSection
          section={activeSectionDef}
          fields={fields}
          arrays={arrays}
          computedValues={computedValues}
          computedArrays={computedArrays}
          copyToggle={copyToggles[activeSectionDef.key] ?? false}
          customToggles={customToggles}
          errors={errors}
          readOnly={readOnly}
          onSetCopyToggle={(value) => handleSetCopyToggle(activeSectionDef.key, value)}
          onSetCustomToggle={(toggleKey, value) =>
            handleSetCustomToggle(activeSectionDef.key, toggleKey, value)
          }
          onUpdateField={handleUpdateField}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={handleUpdateItem}
        />
      </div>

      {!readOnly ? (
        <WizardBottomBar
          isLastSection={isLastSection}
          isSubmitting={isSubmitting}
          canSubmit={canSubmit}
          tabError={tabError}
          onCancel={handleCancel}
          onContinue={handleNextSection}
          onSubmit={() => void handleSubmit()}
          submitLabel={submitLabel}
        />
      ) : null}
    </div>
  );
}
