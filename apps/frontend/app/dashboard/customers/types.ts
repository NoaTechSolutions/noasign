export type Customer = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
};

export type CustomerWithCount = Customer & {
  _count: { documents: number };
};

export type CustomerListResponse = {
  customers: Customer[];
  total: number;
  limit: number;
  offset: number;
};

export type CustomerFormValues = {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes: string;
};

export type OrderBy = "name" | "createdAt";
export type OrderDir = "asc" | "desc";
