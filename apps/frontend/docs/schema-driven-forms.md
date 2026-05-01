# Schema-Driven Forms — Reference

The frontend renders document creation forms from a JSON schema stored on the
backend (`FormDefinition.schemaJson`). The renderer lives in
`components/document-form-renderer.tsx` and exposes `DocumentFormRenderer`.

This document describes the schema contract, the rendering pipeline, and the
features added to support auto-calculated fields and seeded defaults.

---

## Schema shape

```ts
interface DocumentSchema {
  sections: SchemaSection[];
}

interface SchemaSection {
  key: string;          // unique within the schema
  label: string;        // tab label
  fields: SchemaField[];
  copyAddressToggle?: { label: string; defaultValue?: boolean };
  toggles?: SectionToggle[];
}

interface SchemaField {
  key: string;          // unique within the schema (becomes the dataJson key)
  label: string;
  type: "text" | "email" | "phone" | "date" | "number" | "currency" | "textarea";
  required?: boolean;
  placeholder?: string;
  transform?: "titleCase" | "phone" | "currency" | "digitsOnly";
  validation?: FieldValidation;
  row?: string;         // fields with the same row value render side-by-side
  copyFrom?: string;    // pull value from another field when copyAddressToggle is on
  showWhen?: string;    // section toggle key — field hides when toggle is off
  defaultValue?: string;
  autoCalculate?: AutoCalculateConfig;
}
```

> **Note on sections**: every section MUST carry both `key` (stable id) and
> `label` (human-readable tab). The renderer drives tab navigation off `key`
> and shows `label` to the user.

---

## `defaultValue`

Use this to seed an initial value for a field that the user can still edit.

Resolution order on first render:

1. `initialValues[field.key]` if it is provided **and** non-empty.
2. `field.defaultValue` if defined.
3. `""` (empty string).

`defaultValue` does **not** mark the form dirty — the cancel-confirmation
dialog only triggers when the user changes a field away from its baseline
(initial-value-or-default).

Typical use case: pre-filling `invoice_number` with `"INV-0001"` while still
allowing the user to override it before submitting.

---

## `autoCalculate` — derived fields

Fields with `autoCalculate` are **always read-only**. The renderer:

- forces `disabled` so the user cannot type into them;
- shows a `computed` pill in the field header so the read-only state is
  obvious;
- skips the field during validation (`required` is ignored — the value is
  derived, not user input);
- always writes the latest computed value into the submitted `dataJson`.

Two forms are supported:

### `sum`

```jsonc
{
  "key": "subtotal",
  "label": "Subtotal",
  "type": "currency",
  "autoCalculate": {
    "type": "sum",
    "fields": ["service_1_price", "service_2_price", "service_3_price"]
  }
}
```

The renderer parses each referenced field with `parseFloat`, treats empty or
non-numeric values as `0`, sums them, and stores the result with two decimals
when the target field is `currency` or `number`.

### `copy`

```jsonc
{
  "key": "total",
  "label": "Total",
  "type": "currency",
  "autoCalculate": { "type": "copy", "source": "subtotal" }
}
```

Mirrors a single source field. The source is allowed to be another computed
field — see the evaluation order below.

### Evaluation order

Computed values are recalculated on every keystroke via `useMemo`, in two
passes over `schema.sections`:

1. **Pass 1** — every `sum` field (depends only on user-typed values).
2. **Pass 2** — every `copy` field (may reference a value produced by Pass 1,
   e.g. `total` copying `subtotal`).

This keeps the implementation simple while supporting the common
`prices → subtotal → total` chain. More complex graphs (a `copy` feeding a
`sum`) are intentionally not supported — model that case with a third
section-level field instead.

---

## Submission

`handleSubmit` builds the `dataJson` payload section-by-section. For each
field:

- `autoCalculate` → emit `computedValues[field.key]` (always wins, regardless
  of any stale state in `fields`).
- `showWhen` → emit `""` when the section toggle is off.
- `copyFrom` + the section's copy toggle is on + the source field is non-empty
  → emit the source field's value.
- otherwise → emit the user-typed value.

Empty values are stripped at the end before calling `onSubmit`. Computed
values that resolve to `"0.00"` are still kept — that is a valid number, not
empty.

---

## Validation

`getSectionFieldErrors` skips:

- computed fields (derived, never validated as user input);
- fields hidden by `showWhen` when the toggle is off;
- address-style fields when their `copyFrom` toggle is on and the source is
  non-empty.

Tab navigation is gated on the active section being valid: a section with
errors blocks access to later tabs.

---

## Visual indicator for computed fields

`BaseField` renders a small uppercase `computed` pill in the field header
when the `computed` prop is true. It uses the brand accent color so the
read-only state is visible without competing with error messaging.

The disabled visual treatment (cursor-not-allowed + muted background) is
shared between computed fields and "same as billing"-style copied fields.

---

## Test cases for the invoice schema

Cases covered by the current implementation (verified via the invoice
auto-calc work):

1. Typing a price into `service_1_price` updates `subtotal` immediately.
2. Typing into `service_2_price` adds to the running subtotal.
3. Clearing `service_1_price` reduces the subtotal accordingly.
4. An empty service price is treated as `0`.
5. `total` always equals `subtotal` to two decimals.
6. Schemas without any `autoCalculate` field continue to work unchanged.

---

## Files

- `components/document-form-renderer.tsx` — schema types, computed-value
  pipeline, validation, and renderer.
- `components/dashboard-sidebar-demo.tsx` — consumer; reads the schema from
  the selected `FormDefinition` and feeds it to `DocumentFormRenderer`.
