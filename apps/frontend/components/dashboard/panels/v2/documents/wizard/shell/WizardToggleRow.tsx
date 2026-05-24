'use client';

import React from 'react';

interface WizardToggleRowProps {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

export function WizardToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: WizardToggleRowProps) {
  return (
    <label className={`wizard-toggle-row${disabled ? ' wizard-toggle-row--disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="wizard-toggle-row__checkbox"
      />
      <span className="wizard-toggle-row__label">{label}</span>
    </label>
  );
}
