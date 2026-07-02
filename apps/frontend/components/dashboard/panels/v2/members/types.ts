// Backend response types (from API)
export interface ManagedUser {
  id: string;
  companyProfileId: string | null;
  email: string;
  role: 'SUPERADMIN' | 'USER';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  mustChangePassword?: boolean;
  accountType?: 'INDIVIDUAL' | 'BUSINESS' | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  companyProfile?: {
    id: string;
    companyName: string;
    planName: 'LAUNCH' | 'SCALE' | 'PRO_UNLIMITED';
    logoUrl?: string | null;
  } | null;
}

export interface AccountRequest {
  id: string;
  fullName: string;
  email: string;
  requestedDocumentTypes: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Form data types
export interface CreateUserData {
  email: string;
  password: string;
  role?: 'SUPERADMIN' | 'USER';
  accountType?: 'INDIVIDUAL' | 'BUSINESS';
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UpdateUserData {
  email?: string;
  role?: 'SUPERADMIN' | 'USER';
}

export interface ResetPasswordData {
  password: string;
  temporary: boolean;
}

// Helper functions
export function getDisplayName(user: ManagedUser): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.email.split('@')[0];
}

export function getInitials(user: ManagedUser): string {
  const name = getDisplayName(user);
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function generateRandomPassword(length: number = 14): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}
