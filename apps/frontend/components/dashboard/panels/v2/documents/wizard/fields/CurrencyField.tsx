'use client';

import React from 'react';
import { BaseField } from './BaseField';
import { applyTransform, iconForType } from '../types';
import type { FieldRenderProps } from '../types';

export function CurrencyField({
  field,
  value,
  onChange,
  error,
  disabled,
  computed,
}: FieldRenderProps) {
  const effectiveDisabled = disabled || computed;
  return (
    <BaseField
      label={field.label}
      icon={iconForType(field.type)}
      error={error}
      computed={computed}
      required={field.required}
    >
      <div
        className={`wizard-field__currency-wrapper${error ? ' wizard-field__currency-wrapper--error' : ''}${effectiveDisabled ? ' wizard-field__currency-wrapper--disabled' : ''}`}
      >
        <span className="wizard-field__currency-prefix">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={field.placeholder ?? '0.00'}
          disabled={effectiveDisabled}
          onChange={(e) => onChange(applyTransform(e.target.value, 'currency'))}
          className="wizard-field__currency-input"
        />
      </div>
    </BaseField>
  );
}
