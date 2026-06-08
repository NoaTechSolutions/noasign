'use client';

import React from 'react';
import { BaseField } from './BaseField';
import { iconForType } from '../types';
import type { FieldRenderProps } from '../types';

export function DateField({
  field,
  value,
  onChange,
  error,
  disabled,
  computed,
  minDate,
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
      <input
        type="date"
        value={value}
        disabled={effectiveDisabled}
        min={minDate}
        onChange={(e) => onChange(e.target.value)}
        className={`wizard-field__input${error ? ' wizard-field__input--error' : ''}${effectiveDisabled ? ' wizard-field__input--disabled' : ''}`}
      />
    </BaseField>
  );
}
