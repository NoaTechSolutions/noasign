# Schema-Driven Document Forms

Last updated: 2026-04-06
Linear epic: **NOA-46**

---

## Problem

The original implementation hardcodes form fields (e.g., `customer_name`, `customer_email`, `project_address`) directly in the frontend (`dashboard-sidebar-demo.tsx`). This means every new client with a different set of fields requires a code change and a deployment.

---

## Solution

Store the form field definitions as a JSON schema inside `FormDefinition`. The frontend renders forms dynamically from the schema. No code change is needed to onboard a new client or add/remove fields.

---

## Architecture

### Data model

```
DocumentType
  └── FormDefinition        ← holds schemaJson (what fields to collect)
  └── SignatureTemplate     ← holds BoldSign templateId + fieldMappingJson (how to fill the PDF)
        └── UserDocumentConfig  ← assigns which form + template each user gets
```

A single client can have multiple document type configurations:

```
Client (INDIVIDUAL or BUSINESS user)
  ├── UserDocumentConfig → Contract     → FormDefinition A + SignatureTemplate X
  ├── UserDocumentConfig → Invoice      → FormDefinition B + SignatureTemplate Y
  └── UserDocumentConfig → Proforma     → FormDefinition C + SignatureTemplate Z
```

### FormDefinition.schemaJson

Array of field definitions:

```json
[
  { "key": "customer_name",   "label": "Customer Full Name", "type": "text",     "required": true },
  { "key": "customer_email",  "label": "Email",              "type": "email",    "required": true },
  { "key": "project_address", "label": "Project Address",    "type": "text",     "required": true },
  { "key": "start_date",      "label": "Start Date",         "type": "date",     "required": true },
  { "key": "total_price",     "label": "Total Price",        "type": "currency", "required": true },
  { "key": "materials",       "label": "Materials",          "type": "textarea", "required": false }
]
```

Supported field types:

| type | description |
|------|-------------|
| `text` | General string input |
| `email` | Email with format validation |
| `phone` | Phone number |
| `date` | Date picker |
| `currency` | Numeric with `$` formatting |
| `number` | Numeric input |
| `textarea` | Multi-line text |
| `select` | Dropdown — requires `options: string[]` |

### SignatureTemplate.fieldMappingJson

Maps form field `key` values to BoldSign template field IDs:

```json
{
  "customer_name":   "field_001",
  "customer_email":  "field_002",
  "project_address": "field_003",
  "total_price":     "field_004"
}
```

When the user submits the form, the backend pre-fills those fields in the BoldSign template before sending to the recipient for signing.

---

## Client onboarding scenarios

### Scenario A — Client has their own PDF

1. Upload the PDF to BoldSign and place signature + text fields
2. BoldSign provides a `templateId` and field IDs
3. In NoaSign: create `SignatureTemplate` with `providerTemplateId` + `fieldMappingJson`
4. Create `FormDefinition` with `schemaJson` matching the fields in the PDF
5. Assign via `UserDocumentConfig` to the client

### Scenario B — Client has no document

1. Choose or create a template in BoldSign (from their library or from scratch)
2. Follow the same steps from Scenario A step 3 onwards

In both cases the client sees only their personalized form popup when clicking "Create Document".

---

## Admin workflow (MASTER global user)

The MASTER user manages configuration without touching code:

1. **Create a FormDefinition** — define the `schemaJson` for a niche (construction, daycare, music, rental, etc.)
2. **Create a SignatureTemplate** — set the BoldSign `providerTemplateId` and `fieldMappingJson`
3. **Assign to a client** — create a `UserDocumentConfig` linking user → documentType → form → template

Schemas can be cloned and adjusted for clients that need minor variations (e.g., add a `permit_number` field for one specific construction client).

---

## Niche-based form library

Each `FormDefinition` is reusable across clients in the same niche:

| Niche | Example FormDefinitions |
|-------|------------------------|
| Construction | Construction Contract, Work Order, Change Order |
| Childcare | Enrollment Agreement, Authorization Form |
| Entertainment | Performance Contract, Release Form |
| Real estate | Rental Agreement, Lease Addendum |
| General | Invoice, Proforma, NDA |

A new client in an existing niche gets assigned a pre-built schema. A client in a new niche gets a new schema built once and reused for future clients in that niche.

---

## Future compatibility

This architecture is designed to support **multi-signer workflows** (NOA-44) without structural changes. The `SignatureTemplate` will be extended to define multiple signer roles. The `FormDefinition` schema is signer-agnostic.

---

## Implementation tasks

See Linear epic **NOA-46** and child issues NOA-47 through NOA-55.
