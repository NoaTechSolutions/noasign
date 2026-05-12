/**
 * Shared customer-domain types.
 *
 * FASE 3 — extracted from `components/dashboard-sidebar-demo.tsx` so that the
 * monolith, the customers panel, and the create-draft flow can all share one
 * definition instead of duplicating it.
 */

export type CustomerBusiness = {
  id: string;
  customerId: string;
  businessName: string;
  businessLegalName: string | null;
  licenseNumber: string | null;
  industry: string | null;
  website: string | null;
  businessEmail: string | null;
  businessPhone: string | null;
  businessPhone2: string | null;
  businessAddressLine1: string | null;
  businessAddressLine2: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZipCode: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  primaryContactTitle: string | null;
  primaryContactAddressLine1: string | null;
  primaryContactCity: string | null;
  primaryContactState: string | null;
  primaryContactZipCode: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  customerType: "PERSONAL" | "BUSINESS";
  fullName: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  companyProfileId: string;
  userId: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  business?: CustomerBusiness | null;
  _count?: { documents: number };
  // Owner snapshot. Backend includes it on every read so master views can
  // render "Owner: …" without a separate request. Non-master callers see
  // their own data here (it's just themselves).
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

export type CustomerBusinessFormValues = {
  businessName: string;
  businessLegalName: string;
  licenseNumber: string;
  industry: string;
  website: string;
  businessEmail: string;
  businessPhone: string;
  businessPhone2: string;
  businessAddressLine1: string;
  businessAddressLine2: string;
  businessCity: string;
  businessState: string;
  businessZipCode: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactTitle: string;
  primaryContactAddressLine1: string;
  primaryContactCity: string;
  primaryContactState: string;
  primaryContactZipCode: string;
};

export type CustomerFormValues = {
  customerType: "PERSONAL" | "BUSINESS";
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  // Master uses this to assign / reassign ownership; non-master leaves it
  // empty (server forces it to self).
  userId: string;
  business: CustomerBusinessFormValues;
};

// For a BUSINESS customer, the Customer row's email/phone are cleared on
// submit; the contact info lives in the nested business row. Resolve to the
// most relevant business email/phone, falling back to primaryContact when
// the business fields are empty. PERSONAL customers use their own columns.
export function getDisplayEmail(c: Customer): string | null {
  if (c.customerType === "BUSINESS" && c.business) {
    return c.business.businessEmail || c.business.primaryContactEmail || null;
  }
  return c.email;
}

export function getDisplayPhone(c: Customer): string | null {
  if (c.customerType === "BUSINESS" && c.business) {
    return c.business.businessPhone || c.business.primaryContactPhone || null;
  }
  return c.phone;
}

// "Owner: …" display label for the master view. Prefers full name, falls
// back to email when the user record doesn't have first/last set.
export function getOwnerLabel(user: Customer["user"]): string {
  if (!user) return "—";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email;
}
