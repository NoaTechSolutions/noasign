# Mobile bottom-sheet pattern (STANDARD)

On mobile, row/card actions open as a **bottom sheet** (not a dropdown). This is
the **standard across the SaaS** — reuse it for every new feature; do not invent
a new sheet or duplicate the markup/CSS.

Live usages: **Clients** (`CustomerCard` — Actions + "Change status" sub-sheet),
**Documents** (`DocumentCard` — Actions + Resend/Reissue/Void sub-sheet).

---

## The pieces (shared)

- **CSS classes** (`card-actions-*`, defined in
  `components/dashboard/panels/v2/customers/customers-panel.css`): the shared
  sheet styles. A panel that isn't Clients imports that CSS to reuse them — e.g.
  `DocumentsPanel.tsx` does `import '../customers/customers-panel.css'`. The
  `customer-card-*` rules target customer elements only, so importing is safe.
  - `card-actions-overlay` — full-screen dim backdrop (closes everything on click)
  - `card-actions-sheet` — the sheet panel (slides up from the bottom)
  - `card-actions-item` (+ `--danger`, `--submenu`) — a tappable row
  - `card-actions-divider`, `card-actions-sheet__title`
- **`SubSheetHeader`** (`components/dashboard/shared/SubSheetHeader.tsx`): the
  shared header for any **sub-sheet** — a back arrow (‹) + title. **MANDATORY in
  every sub-sheet.**

---

## Rules

1. **Render the sheet in a portal to `window.document.body`** (so a card's
   `overflow:hidden` can't clip it). Note: if your component's prop is named
   `document`, it shadows the global — use `window.document.body`.
2. **Lock background scroll** while any sheet is open:
   `useBlockScroll(sheetOpen || subSheetOpen)` (the ref-counted hook composes
   safely with nested sheets).
3. **A sub-sheet (a sheet opened from another sheet) MUST use `SubSheetHeader`**
   with an `onBack` that closes ONLY that sub-sheet (the parent stays open). The
   overlay/close still dismisses everything — don't change that.
4. **Open the sub-sheet ON TOP** of the parent (keep the parent's `open` state
   true) so "back" reveals it again.
5. Use `card-actions-item--danger` for destructive actions, `--submenu` for the
   row that opens a sub-sheet.

---

## Minimal example

```tsx
const [open, setOpen] = useState(false);
const [subOpen, setSubOpen] = useState(false);
useBlockScroll(open || subOpen);

// trigger
<button onClick={() => setOpen(true)}>Actions</button>

// main sheet (portaled)
{open && typeof window !== 'undefined' && createPortal(
  <div className="card-actions-overlay" onClick={() => { setOpen(false); setSubOpen(false); }}>
    <div className="card-actions-sheet" onClick={(e) => e.stopPropagation()}>
      <button className="card-actions-item" onClick={...}>View details</button>
      <button className="card-actions-item card-actions-item--submenu" onClick={() => setSubOpen(true)}>
        <span className="card-actions-item__label">More</span><ChevronRight size={16} />
      </button>
    </div>
  </div>, window.document.body)}

// sub-sheet (portaled, ON TOP) — back returns to the parent
{subOpen && typeof window !== 'undefined' && createPortal(
  <div className="card-actions-overlay" onClick={() => setSubOpen(false)}>
    <div className="card-actions-sheet" onClick={(e) => e.stopPropagation()}>
      <SubSheetHeader title="More" onBack={() => setSubOpen(false)} />
      {/* sub-sheet items */}
    </div>
  </div>, window.document.body)}
```

---

## Desktop

Desktop is unchanged — it uses a dropdown/kebab (e.g. the documents row kebab
with an "Actions" flyout to the left). The bottom sheet is **mobile-only** (the
card layout). Keep both in sync behaviorally (same actions, same guards).

## PDF preview (related)

PDFs render via **react-pdf** (pdf.js → canvas), not an `<iframe>` (mobile
browsers won't render a PDF in an iframe). See `PdfCanvasViewer.tsx`; worker is
self-hosted at `public/pdf.worker.min.mjs` (keep in sync with `pdfjs-dist` on
upgrade). Loaded via `next/dynamic({ ssr: false })`.
