'use client';

import React from 'react';
import { DynamicArrayField } from '../fields/DynamicArrayField';
import { FieldRenderer } from '../fields/FieldRenderer';
import { WizardToggleRow } from './WizardToggleRow';
import { groupFields, todayIso } from '../types';
import type { SchemaField, SchemaSection } from '../types';

interface WizardSectionProps {
  section: SchemaSection;
  fields: Record<string, string>;
  arrays: Record<string, Array<Record<string, string>>>;
  computedValues: Record<string, string>;
  computedArrays: Record<string, Array<Record<string, string>>>;
  copyToggle: boolean;
  customToggles: Record<string, boolean>;
  errors: Record<string, string>;
  readOnly: boolean;
  onSetCopyToggle: (value: boolean) => void;
  onSetCustomToggle: (toggleKey: string, value: boolean) => void;
  onUpdateField: (key: string, value: string) => void;
  onAddItem: (arrayKey: string, itemFields: SchemaField[], maxItems: number) => void;
  onRemoveItem: (arrayKey: string, index: number) => void;
  onUpdateItem: (arrayKey: string, index: number, fieldKey: string, value: string) => void;
}

export function WizardSection({
  section,
  fields,
  arrays,
  computedValues,
  computedArrays,
  copyToggle,
  customToggles,
  errors,
  readOnly,
  onSetCopyToggle,
  onSetCustomToggle,
  onUpdateField,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: WizardSectionProps) {
  const today = todayIso();

  function isFieldVisible(field: SchemaField): boolean {
    if (field.hideWhen) {
      const hideToggleOn = customToggles[`${section.key}:${field.hideWhen}`] ?? false;
      if (hideToggleOn) return false;
    }
    if (!field.showWhen) return true;
    return customToggles[`${section.key}:${field.showWhen}`] ?? false;
  }

  function getMinDate(field: SchemaField): string | undefined {
    if (field.validation?.minDate === 'today') return today;
    if (field.validation?.minDateFrom) {
      const other = fields[field.validation.minDateFrom]?.trim();
      return other || today;
    }
    return undefined;
  }

  function resolveValue(field: SchemaField): {
    value: string;
    isComputed: boolean;
    isDisabledByCopy: boolean;
  } {
    if (field.autoCalculate) {
      return {
        value: computedValues[field.key] ?? '',
        isComputed: true,
        isDisabledByCopy: false,
      };
    }
    if (field.copyFrom && copyToggle && fields[field.copyFrom]?.trim()) {
      return {
        value: fields[field.copyFrom] ?? '',
        isComputed: false,
        isDisabledByCopy: true,
      };
    }
    return {
      value: fields[field.key] ?? '',
      isComputed: false,
      isDisabledByCopy: false,
    };
  }

  const visibleFields = section.fields.filter(isFieldVisible);
  const fieldGroups = groupFields(visibleFields);

  const copyAddressEnabled =
    !!section.copyAddressToggle &&
    section.fields
      .filter((f) => f.copyFrom)
      .some((f) => fields[f.copyFrom!]?.trim());

  return (
    <div className="wizard-section">
      {section.copyAddressToggle ? (
        <WizardToggleRow
          label={section.copyAddressToggle.label}
          checked={copyToggle}
          disabled={readOnly || !copyAddressEnabled}
          onChange={onSetCopyToggle}
        />
      ) : null}

      {(section.toggles ?? []).map((toggle) => (
        <WizardToggleRow
          key={toggle.key}
          label={toggle.label}
          checked={customToggles[`${section.key}:${toggle.key}`] ?? false}
          disabled={readOnly}
          onChange={(value) => onSetCustomToggle(toggle.key, value)}
        />
      ))}

      <div className="wizard-section__fields">
        {fieldGroups.map((group, groupIndex) => {
          if (group.length === 1) {
            const field = group[0]!;
            if (field.type === 'dynamic_array') {
              return (
                <DynamicArrayField
                  key={field.key}
                  field={field}
                  items={arrays[field.key] ?? []}
                  computedItems={computedArrays[field.key] ?? []}
                  errors={errors}
                  readOnly={readOnly}
                  onAddItem={() =>
                    onAddItem(field.key, field.itemFields ?? [], field.maxItems ?? 10)
                  }
                  onRemoveItem={(idx) => onRemoveItem(field.key, idx)}
                  onUpdateItem={(idx, k, v) => onUpdateItem(field.key, idx, k, v)}
                />
              );
            }
            const resolved = resolveValue(field);
            return (
              <FieldRenderer
                key={field.key}
                field={field}
                value={resolved.value}
                error={errors[field.key]}
                disabled={readOnly || resolved.isDisabledByCopy}
                computed={resolved.isComputed}
                minDate={getMinDate(field)}
                onChange={(value) => onUpdateField(field.key, value)}
              />
            );
          }

          const colsClass =
            group.length === 2 ? 'wizard-section__row--2col' : 'wizard-section__row--3col';

          return (
            <div key={`group-${groupIndex}`} className={`wizard-section__row ${colsClass}`}>
              {group.map((field) => {
                const resolved = resolveValue(field);
                return (
                  <FieldRenderer
                    key={field.key}
                    field={field}
                    value={resolved.value}
                    error={errors[field.key]}
                    disabled={readOnly || resolved.isDisabledByCopy}
                    computed={resolved.isComputed}
                    minDate={getMinDate(field)}
                    onChange={(value) => onUpdateField(field.key, value)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
