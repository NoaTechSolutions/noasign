'use client';

import React from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { FieldRenderer } from './FieldRenderer';
import { groupFields } from '../types';
import type { SchemaField } from '../types';

interface DynamicArrayFieldProps {
  field: SchemaField;
  items: Array<Record<string, string>>;
  computedItems: Array<Record<string, string>>;
  errors: Record<string, string>;
  readOnly: boolean;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateItem: (index: number, fieldKey: string, value: string) => void;
}

export function DynamicArrayField({
  field,
  items,
  computedItems,
  errors,
  readOnly,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
}: DynamicArrayFieldProps) {
  const itemFields = field.itemFields ?? [];
  const max = field.maxItems ?? 10;
  const addLabel = field.addButtonLabel ?? 'Add item';
  const removeLabel = field.removeButtonLabel ?? 'Remove';
  const atMax = items.length >= max;
  const arrayError = errors[field.key];

  return (
    <div className="wizard-array-field">
      <div className="wizard-array-field__header">
        <div className="wizard-array-field__label">
          {field.label}{' '}
          <span className="wizard-array-field__count">
            ({items.length}/{max})
          </span>
        </div>
        {atMax ? (
          <span className="wizard-array-field__max-hint">Maximum {max} reached</span>
        ) : null}
      </div>

      {arrayError ? (
        <div className="wizard-array-field__error">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{arrayError}</span>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="wizard-array-field__empty">
          No items yet. Click &quot;{addLabel}&quot; to add one.
        </div>
      ) : (
        <div className="wizard-array-field__items">
          {items.map((rawItem, itemIndex) => {
            const computedItem = computedItems[itemIndex] ?? rawItem;
            return (
              <div key={itemIndex} className="wizard-array-field__item">
                <div className="wizard-array-field__item-header">
                  <span className="wizard-array-field__item-number">
                    Item {itemIndex + 1}
                  </span>
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => onRemoveItem(itemIndex)}
                      className="wizard-array-field__remove-btn"
                      aria-label={`${removeLabel} item ${itemIndex + 1}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span>{removeLabel}</span>
                    </button>
                  ) : null}
                </div>

                <div className="wizard-array-field__item-fields">
                  {groupFields(itemFields).map((rowGroup, rowIdx) => {
                    const renderItemField = (itemField: SchemaField) => {
                      const isComputed = !!itemField.autoCalculate;
                      const itemValue = isComputed
                        ? (computedItem[itemField.key] ?? '')
                        : (rawItem[itemField.key] ?? '');
                      const itemErrorKey = `${field.key}[${itemIndex}].${itemField.key}`;
                      return (
                        <FieldRenderer
                          key={itemField.key}
                          field={itemField}
                          value={itemValue}
                          computed={isComputed}
                          disabled={readOnly}
                          error={errors[itemErrorKey]}
                          onChange={(value) => onUpdateItem(itemIndex, itemField.key, value)}
                        />
                      );
                    };

                    if (rowGroup.length === 1) {
                      return (
                        <div
                          key={`item-${itemIndex}-row-${rowIdx}`}
                          className="wizard-array-field__item-row"
                        >
                          {renderItemField(rowGroup[0]!)}
                        </div>
                      );
                    }

                    const colsClass =
                      rowGroup.length === 2
                        ? 'wizard-array-field__item-row--2col'
                        : 'wizard-array-field__item-row--3col';

                    return (
                      <div
                        key={`item-${itemIndex}-row-${rowIdx}`}
                        className={`wizard-array-field__item-row ${colsClass}`}
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

      {!readOnly ? (
        <button
          type="button"
          onClick={onAddItem}
          disabled={atMax}
          className="wizard-array-field__add-btn"
        >
          <Plus size={14} aria-hidden="true" />
          <span>{addLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
