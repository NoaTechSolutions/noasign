import { apiRequest } from "./api";

export type DocumentTypeRef = {
  id: string;
  code: string;
  name: string;
};

export type FormDefinition = {
  id: string;
  name: string;
  documentTypeId: string;
  schemaJson: unknown | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  documentType?: DocumentTypeRef;
  _count?: {
    userConfigs: number;
  };
};

export type CreateFormDefinitionInput = {
  name: string;
  documentTypeId: string;
  schemaJson?: unknown;
  description?: string | null;
  isActive?: boolean;
};

export type UpdateFormDefinitionInput = Partial<CreateFormDefinitionInput>;

export const adminApi = {
  listDocumentTypes: () => apiRequest<DocumentTypeRef[]>("/admin/document-types"),

  listFormDefinitions: (documentTypeId?: string) => {
    const qs = documentTypeId ? `?documentTypeId=${encodeURIComponent(documentTypeId)}` : "";
    return apiRequest<FormDefinition[]>(`/admin/form-definitions${qs}`);
  },

  getFormDefinition: (id: string) =>
    apiRequest<FormDefinition>(`/admin/form-definitions/${id}`),

  createFormDefinition: (body: CreateFormDefinitionInput) =>
    apiRequest<FormDefinition>("/admin/form-definitions", { method: "POST", body }),

  updateFormDefinition: (id: string, body: UpdateFormDefinitionInput) =>
    apiRequest<FormDefinition>(`/admin/form-definitions/${id}`, { method: "PATCH", body }),

  deleteFormDefinition: (id: string) =>
    apiRequest<{ message: string }>(`/admin/form-definitions/${id}`, { method: "DELETE" }),
};
