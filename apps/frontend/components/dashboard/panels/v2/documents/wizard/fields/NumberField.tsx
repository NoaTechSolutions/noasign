'use client';

import React from 'react';
import { BaseField } from './BaseField';
import { applyDigitsOnly, iconForType, MAX_2_DIGITS_KEYS } from '../types';
import type { FieldRenderProps } from '../types';

export function NumberField({
  field,
  value,
  onChange,
  error,
  disabled,
  computed,
}: FieldRenderProps) {
  const effectiveDisabled = disabled || computed;
  const numMaxLength = MAX_2_DIGITS_KEYS.has(field.key)
    ? 2
    : field.validation?.maxLength;
  return (
    <BaseField
      label={field.label}
      icon={iconForType(field.type)}
      error={error}
      computed={computed}
      required={field.required}
    >
      <input
        type="text"
        inputMode="numeric"
        value={value}
        placeholder={field.placeholder}
        disabled={effectiveDisabled}
        onChange={(e) => onChange(applyDigitsOnly(e.target.value, numMaxLength))}
        className={`wizard-field__input${error ? ' wizard-field__input--error' : ''}${effectiveDisabled ? ' wizard-field__input--disabled' : ''}`}
      />
    </BaseField>
  );
}
