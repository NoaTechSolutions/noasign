'use client';

import React from 'react';
import { BaseField } from './BaseField';
import { iconForType } from '../types';
import type { FieldRenderProps } from '../types';
import { CurrencyInput } from '../../CurrencyInput';

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
        <CurrencyInput
          value={value}
          onChange={onChange}
          disabled={effectiveDisabled}
          placeholder={field.placeholder ?? '0.00'}
          className="wizard-field__currency-input"
        />
      </div>
    </BaseField>
  );
}
