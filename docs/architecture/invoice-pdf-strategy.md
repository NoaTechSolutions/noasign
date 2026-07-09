# Invoice (Phase 2) — PDF rendering strategy: AcroForm vs HTML→PDF

**Status:** Decision made (autonomous, owner away 2026-07-08). Needs owner sign-off on ONE open question (§5).
**Scope:** How NoaSign renders invoice PDFs. Additive on top of the Phase-1 generic
DIRECT_PDF template catalog that already powers receipts. Does **not** touch the 3
approved receipt designs (overlay-coords) nor the `RECEIPT_TEMPLATE_RESOLVER_V2` flag.

## 1. Context

The owner provided `assets/templates/INVOCE_LauraBravo.pdf`: an **AcroForm** PDF (A4,
595×842) with 9 well-named text fields — `billed_to, number, date, service, quantity,
price, total, subtotal, gran_total`. Filling it by field name works cleanly (POC done,
sample at `C:/tmp/receipt-samples/INVOICE_LauraBravo_SAMPLE.pdf`): black text, values
land in place, `form.flatten()` bakes them (not editable by the recipient).

The strategic question the owner posed: because this template has **fixed** fields, do
we render invoices via **AcroForm fill** (fixed/bounded rows, simpler) or **HTML→PDF**
(variable rows, heavier)?

## 2. The deciding fact

`INVOCE_LauraBravo` has exactly **ONE line-item row** (`service / quantity / price /
total` on a single line), plus `subtotal` + `gran_total`. AcroForm templates express a
**fixed** set of fields — they cannot grow rows at render time. So the axis is:

- **Bounded line items** (a small, known max per invoice) → AcroForm is enough.
- **Unbounded/variable line items** (arbitrary count, itemized lists) → needs HTML→PDF.

## 3. Trade-off

| Dimension | AcroForm fill (chosen) | HTML→PDF |
|---|---|---|
| Line items | Fixed / bounded (fill used rows, blank the rest) | Truly variable, unlimited |
| New dependency | **None** — reuses `pdf-lib` (already in) | Heavy: headless Chromium (~300MB) or a JS PDF renderer (`@react-pdf`, etc.) |
| Backend infra | None extra | Chromium process/memory management, cold-start cost |
| Consistency w/ existing engine | Same PDF pipeline as receipts (overlay); one shared `acroform` mode | A second, divergent rendering pipeline |
| Design authoring | Owner designs in any PDF/form editor, names fields | Owner (or we) maintain an HTML/CSS template |
| Fonts / layout | Embed Carlito, force appearance; positions come from the PDF | Full CSS control, but we own pixel layout again |
| Calibration | **None** — positions are in the PDF (this is the big win) | N/A (CSS layout) |
| Fidelity to a designed template | High — it IS the owner's designed PDF | Requires rebuilding the design in HTML |

## 4. Decision

**Invoice Phase 2 renders via AcroForm fill**, using the generic `acroform` engine mode
(the same mode consolidated for future templates). Rationale:

1. Reuses `pdf-lib`; **zero** new heavy runtime dependency or backend infra.
2. Reuses the calibrated-PDF philosophy — the owner designs the PDF, names the fields,
   and the engine fills by name. No coordinate calibration (the pain point of Phase 1).
3. Service invoices in this business (paver/construction, and the music example) carry a
   **small, bounded** number of line items; a template with a fixed, bounded set of rows
   covers the overwhelming majority. Fill the used rows, blank the unused ones.
4. Keeps one coherent PDF engine (overlay + acroform), not two pipelines.

**When to revisit HTML→PDF:** only if invoices ever need *unbounded/dynamic* line counts
(e.g. 20+ variable itemized materials). At that point, add HTML→PDF **for the invoice
category only**; overlay + acroform stay for everything else. This is a clean future
fork, not a rewrite.

## 5. Open question for the owner (the only blocker for multi-line invoices)

`INVOCE_LauraBravo` supports **one** line item. To support several, we need a base PDF
with a **bounded number of pre-drawn rows** — i.e. fields `service_1..service_N`,
`quantity_1..N`, `price_1..N`, `total_1..N` (say N=5 or 10). Two paths:

- **(A)** Owner confirms 1 line item is enough for now → ship as-is.
- **(B)** Owner produces an invoice base with N bounded rows (well-named) → the engine
  fills used rows and blanks the rest. No code change beyond the mapping.

Everything else (data model, numbering, engine mode, sample) is built and works today
against the single-row template; only the *row count* waits on this answer.

## 6. What was built alongside this decision (see the session summary)

- Additive data model: `TemplateCategory.INVOICE`, an `INVOICE` DocumentType
  (`generationMode: DIRECT_PDF`), a `renderMode` column on the template catalog, and an
  invoice catalog row — all additive migrations, nothing destructive.
- A generic **`acroform`** render mode in the PDF engine (fill by field name, force
  Carlito appearance, flatten), alongside the existing `overlay` mode. Receipts untouched.
- Numbering reuses the existing `(tenant, type, year)` counter with `INV-{YYYY}-{NNNN}`.
- `INVOICE_LauraBravo_SAMPLE.pdf` regenerated through the real engine mode.
