'use client';

import React from 'react';
import { BaseField } from './BaseField';
import { applyTransform, iconForType } from '../types';
import type { FieldRenderProps } from '../types';

export function PhoneField({
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
      <input
        type="text"
        inputMode="tel"
        value={value}
        placeholder={field.placeholder}
        disabled={effectiveDisabled}
        onChange={(e) => onChange(applyTransform(e.target.value, 'phone'))}
        className={`wizard-field__input${error ? ' wizard-field__input--error' : ''}${effectiveDisabled ? ' wizard-field__input--disabled' : ''}`}
      />
    </BaseField>
  );
}
