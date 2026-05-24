'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface BaseFieldProps {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  computed?: boolean;
  required?: boolean;
  children: React.ReactNode;
}

export function BaseField({
  label,
  icon,
  error,
  computed,
  required,
  children,
}: BaseFieldProps) {
  return (
    <div className="wizard-field">
      <div className="wizard-field__header">
        {icon ? <span className="wizard-field__icon-wrap">{icon}</span> : null}
        <span className="wizard-field__label">{label}</span>
        {required ? <span className="wizard-field__required" aria-label="Required">*</span> : null}
        {computed ? (
          <span
            className="wizard-field__computed-badge"
            title="Auto-calculated from other fields"
          >
            computed
          </span>
        ) : null}
      </div>
      {children}
      {error ? (
        <div className="wizard-field__error">
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
