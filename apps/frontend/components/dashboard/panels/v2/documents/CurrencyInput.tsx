'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  sanitizeCurrencyInput,
  withThousandsSeparator,
  forceTwoDecimals,
  significantCount,
  caretFromSignificantCount,
} from './currency';

/**
 * Shared currency <input> behavior for BOTH the edit modal and the wizard.
 * Renders only the input (each surface keeps its own wrapper + "$" prefix), so
 * the formatting logic lives in exactly one place.
 *
 *  - while focused: thousands separators live as you type ("12,000")
 *  - on blur:       the value is normalised to 2 decimals ("12,000.50")
 *  - while idle:    always shown with separators + 2 decimals
 *  - cap:           $1,000,000,000
 *  - caret:         preserved when editing in the middle (commas don't push it)
 *
 * `value`/`onChange` deal in CLEAN numeric strings (no separators) so the form
 * state stays parseFloat-safe.
 */
export function CurrencyInput({
  value,
  onChange,
  disabled,
  placeholder = '0.00',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  // Bumped on every keystroke so the layout effect runs even when the sanitized
  // value is unchanged (e.g. the user deleted a separator) and we still need to
  // re-sync the DOM + caret.
  const [, forceRender] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  const display = focused
    ? withThousandsSeparator(value)
    : value
      ? withThousandsSeparator(forceTwoDecimals(value))
      : '';

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    // React skips the DOM write when the controlled value string is unchanged,
    // so force it here (covers deleting a comma → value identical but the DOM
    // is missing the separator).
    if (input.value !== display) input.value = display;
    if (caretRef.current != null && document.activeElement === input) {
      const pos = caretFromSignificantCount(display, caretRef.current);
      input.setSelectionRange(pos, pos);
    }
    caretRef.current = null;
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const selection = input.selectionStart ?? input.value.length;
    // Anchor the caret to the digits/dot to its left (commas excluded).
    caretRef.current = significantCount(input.value.slice(0, selection));
    onChange(sanitizeCurrencyInput(input.value, value));
    forceRender((t) => t + 1);
  };

  return (
    <input
      ref={inputRef}
      className={className}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={display}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        onChange(forceTwoDecimals(value));
      }}
      onChange={handleChange}
    />
  );
}
