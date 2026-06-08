'use client';

import React from 'react';
import { CurrencyField } from './CurrencyField';
import { DateField } from './DateField';
import { EmailField } from './EmailField';
import { NumberField } from './NumberField';
import { PhoneField } from './PhoneField';
import { TextField } from './TextField';
import { TextareaField } from './TextareaField';
import type { FieldRenderProps } from '../types';

/**
 * Single-input field dispatcher. Excludes dynamic_array — those need
 * the array context (items, handlers, computed) and are rendered
 * separately by WizardSection using DynamicArrayField.
 */
export function FieldRenderer(props: FieldRenderProps) {
  switch (props.field.type) {
    case 'textarea':
      return <TextareaField {...props} />;
    case 'currency':
      return <CurrencyField {...props} />;
    case 'number':
      return <NumberField {...props} />;
    case 'phone':
      return <PhoneField {...props} />;
    case 'date':
      return <DateField {...props} />;
    case 'email':
      return <EmailField {...props} />;
    case 'text':
    default:
      return <TextField {...props} />;
  }
}
