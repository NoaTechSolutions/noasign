// Shared types for the Templates panel (Capa 1). Mirrors the backend
// /templates catalog contract.

export interface TemplateCatalogItem {
  slug: string; // e.g. "receipt-basic-v1"
  name: string; // e.g. "Basic (checkboxes)"
  description: string | null;
  renderMode: string; // "overlay" | "acroform"
  category: string | null; // "RECEIPT"
  previewUrl: string; // RELATIVE path, e.g. "/templates/previews/receipt-basic-v1.png"
  isActive: boolean; // true = the tenant's currently-selected template
}

// PATCH /templates/active response envelope.
export interface SetActiveTemplateResponse {
  message: string;
  templates: TemplateCatalogItem[];
}
