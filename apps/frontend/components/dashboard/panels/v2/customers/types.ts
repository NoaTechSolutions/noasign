// Backend types (from API responses) — match real NoaSign Customer + CustomerBusiness shape.
export interface Customer {
  id: string;
  companyProfileId: string;
  userId: string;
  createdByUserId: string | null;
  customerType: 'PERSONAL' | 'BUSINESS';
  fullName: string;
  // K8: name parts for a PERSONAL customer (nullable for older rows without them).
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  notes: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  // ISO timestamp kept as an audit trail of when the client was deleted. The
  // delete STATE is now driven by status === 'DELETED' (deletedAt is metadata).
  // Optional because page.tsx's own Customer type (off-limits) doesn't include it.
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  business?: CustomerBusiness | null;
  _count?: {
    documents: number;
  };
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export interface CustomerBusiness {
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
}

// Form data (for create/update). userId is master-only assignment at create.
export interface CustomerFormData {
  customerType: 'PERSONAL' | 'BUSINESS';
  userId?: string;
  fullName: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  business?: CustomerBusinessFormData;
}

export interface CustomerBusinessFormData {
  businessName: string;
  businessLegalName?: string;
  licenseNumber?: string;
  industry?: string;
  website?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessPhone2?: string;
  businessAddressLine1?: string;
  businessAddressLine2?: string;
  businessCity?: string;
  businessState?: string;
  businessZipCode?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  primaryContactTitle?: string;
  primaryContactAddressLine1?: string;
  primaryContactCity?: string;
  primaryContactState?: string;
  primaryContactZipCode?: string;
}

// User snapshot returned by /users for the Assign modal dropdown.
export interface CustomerOwnerUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// Helper: split a "Firstname Lastname" string for form display.
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

// Helper: combine first + middle + last into the backend's composed fullName (K8).
export function combineFullName(
  firstName: string,
  middleName: string,
  lastName: string,
): string {
  return [firstName, middleName, lastName]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
}
