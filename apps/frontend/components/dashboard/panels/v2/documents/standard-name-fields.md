# Standard: name fields auto-capitalize (Title Case)

**Rule (global):** every person-name input in the system auto-capitalizes to
Title Case as the user types. "israel esparza" → "Israel Esparza".

This applies to any field that holds a person's name — e.g. `client`,
`received_by`, `customer_name`, `salesman_full_name`, primary-contact names, etc.

## How

Use the shared transform, exactly like the schema wizard does:

```ts
import { applyTransform } from './wizard/types';

onChange={(e) => setValue(applyTransform(e.target.value, 'titleCase'))}
```

`applyTransform(value, 'titleCase')` lowercases then capitalizes the first letter
of each word, so the result is stable regardless of how the user types.

## Where it's already wired

- **Schema-driven wizard** (`wizard/fields/TextField.tsx`): name keys listed in
  `NO_DIGITS_KEYS` / `LETTERS_ONLY_KEYS`, or fields with `transform: 'titleCase'`
  in the form schema, get this automatically.
- **Receipt creation modal** (`ReceiptCreationModal.tsx`): `client` and
  `received_by` apply it directly (custom form, not schema-driven).

## For new fields

- Schema-driven: add the field key to `NO_DIGITS_KEYS`/`LETTERS_ONLY_KEYS` in
  `wizard/types.ts`, or set `transform: 'titleCase'` in the schema.
- Custom inputs: wrap `onChange` with `applyTransform(value, 'titleCase')`.

Companion standard: money fields → see currency handling in
[`CurrencyInput.tsx`](./CurrencyInput.tsx) (`$` + thousands + `.00` + $1B cap).
