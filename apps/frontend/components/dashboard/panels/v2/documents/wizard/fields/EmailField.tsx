'use client';

import React from 'react';
import { TextField } from './TextField';
import type { FieldRenderProps } from '../types';

export function EmailField(props: FieldRenderProps) {
  return <TextField {...props} />;
}
