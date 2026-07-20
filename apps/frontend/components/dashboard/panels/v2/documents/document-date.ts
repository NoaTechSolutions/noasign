// Shared date normalization for the document edit popups. A native
// <input type="date"> only accepts ISO (yyyy-mm-dd), but stored document dates
// come in two shapes: ISO (how the creation wizard's date field saves invoice
// dates) or US MM/DD/YYYY (how receipts are stored, and older invoice data).
// These helpers convert to ISO for the picker and back to the ORIGINAL stored
// format on save, so the rendered PDF is never reformatted underneath.

export const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const US_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** Any stored format → ISO yyyy-mm-dd for the date picker ('' if unparseable). */
export function toIsoDate(v: string): string {
  const s = v.trim();
  if (ISO_DATE_RE.test(s)) return s;
  const m = s.match(US_DATE_RE);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : '';
}

/** ISO from the picker → back to the stored format (US when it was US). */
export function fromIsoDate(iso: string, wasUs: boolean): string {
  const m = iso.match(ISO_DATE_RE);
  if (!m) return iso;
  return wasUs ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

/** True when a stored date (ISO or US) is strictly AFTER today — i.e. the document
 *  is being SCHEDULED, not sent. Drives the Send/Schedule conditional copy (I1). */
export function isFutureDate(value: string | null | undefined): boolean {
  if (!value) return false;
  const iso = toIsoDate(value);
  if (!iso) return false;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(now.getDate()).padStart(2, '0')}`;
  return iso > today;
}
