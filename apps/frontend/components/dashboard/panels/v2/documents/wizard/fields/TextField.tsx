'use client';

import React from 'react';
import { BaseField } from './BaseField';
import {
  applyDigitsOnly,
  applyLettersOnly,
  applyTransform,
  DIGITS_ONLY_KEYS,
  iconForType,
  LETTERS_ONLY_KEYS,
  NO_DIGITS_KEYS,
} from '../types';
import type { FieldRenderProps } from '../types';

export function TextField({
  field,
  value,
  onChange,
  error,
  disabled,
  computed,
}: FieldRenderProps) {
  const effectiveDisabled = disabled || computed;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let next = e.target.value;
    if (LETTERS_ONLY_KEYS.has(field.key) || NO_DIGITS_KEYS.has(field.key)) {
      next = applyLettersOnly(next);
    } else if (DIGITS_ONLY_KEYS.has(field.key)) {
      next = applyDigitsOnly(next);
    }
    if (
      field.transform === 'titleCase' ||
      NO_DIGITS_KEYS.has(field.key) ||
      LETTERS_ONLY_KEYS.has(field.key)
    ) {
      next = applyTransform(next, 'titleCase');
    }
    onChange(next);
  }

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
        inputMode={field.type === 'email' ? 'email' : 'text'}
        value={value}
        placeholder={field.placeholder}
        disabled={effectiveDisabled}
        onChange={handleChange}
        className={`wizard-field__input${error ? ' wizard-field__input--error' : ''}${effectiveDisabled ? ' wizard-field__input--disabled' : ''}`}
      />
    </BaseField>
  );
}
