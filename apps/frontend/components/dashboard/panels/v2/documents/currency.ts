// Shared currency formatting — the SINGLE source of truth for the price inputs
// in BOTH the document edit modal and the creation wizard. The STORED value is
// always a clean numeric string (no separators) so parseFloat-based computed
// fields keep working; thousands separators are a display-only concern.

export const MAX_CURRENCY = 1_000_000_000;

/**
 * Typing-time parser → clean numeric string (digits + at most one dot, ≤2
 * decimals), capped at MAX_CURRENCY. Strips any thousands separators the user
 * sees in the field. `prev` is returned unchanged when the candidate exceeds
 * the cap, so the keystroke is rejected without losing prior input.
 */
export function sanitizeCurrencyInput(raw: string, prev: string): string {
  let cleaned = raw.replace(/,/g, '').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    const intPart = cleaned.slice(0, firstDot);
    const decPart = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
    cleaned = `${intPart}.${decPart}`;
  }
  const num = parseFloat(cleaned);
  if (!Number.isNaN(num) && num > MAX_CURRENCY) return prev;
  return cleaned;
}

/**
 * Display helper: thousands separators on the integer part. The decimal part —
 * and a lone trailing dot while the user is mid-typing — is preserved as-is.
 * Input must be a clean numeric string (the value stored in form state).
 */
export function withThousandsSeparator(clean: string): string {
  if (!clean) return '';
  const [intPart, decPart] = clean.split('.');
  const grouped = (intPart || '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return clean.includes('.') ? `${grouped}.${decPart ?? ''}` : grouped;
}

/** Blur normaliser: force exactly 2 decimals. Empty stays empty. */
export function forceTwoDecimals(clean: string): string {
  if (!clean) return '';
  const num = Number(clean);
  if (Number.isNaN(num)) return '';
  return num.toFixed(2);
}

// ── Caret preservation ──────────────────────────────────────────────────────
// Thousands separators shift character positions on every keystroke. We anchor
// the caret to a count of "significant" characters (everything except the comma
// separators) to its left, then re-find that spot after reformatting. Commas
// are the only chars the formatter inserts/removes, so digits + the decimal dot
// are a stable reference.

/** Count of non-separator characters (digits + dot) in a string. */
export function significantCount(str: string): number {
  return str.replace(/,/g, '').length;
}

/** Index in `formatted` just after its `n`-th significant (non-comma) char. */
export function caretFromSignificantCount(formatted: string, n: number): number {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== ',') {
      count++;
      if (count === n) return i + 1;
    }
  }
  return formatted.length;
}
