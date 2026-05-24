'use client';

import React from 'react';
import { BaseField } from './BaseField';
import { iconForType } from '../types';
import type { FieldRenderProps } from '../types';

export function TextareaField({
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
      <textarea
        value={value}
        placeholder={field.placeholder}
        disabled={effectiveDisabled}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        className={`wizard-field__textarea${error ? ' wizard-field__textarea--error' : ''}${effectiveDisabled ? ' wizard-field__textarea--disabled' : ''}`}
      />
    </BaseField>
  );
}
