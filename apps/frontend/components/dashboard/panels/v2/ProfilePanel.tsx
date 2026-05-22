import React, { useState, useEffect } from 'react';
import './profile-panel-v2.css';
import { ProfileHeaderCard } from './ProfileHeaderCard';
import { CompanyInformationSection } from './CompanyInformationSection';
import { PrimaryContactSection } from './PrimaryContactSection';
import { InsuranceInformationSection } from './InsuranceInformationSection';
import { SaveChangesBar } from './SaveChangesBar';

// Types matching backend
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface CompanyProfile {
  id: string;
  companyName: string;
  legalName?: string;
  industry?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  logoUrl?: string;
  plan?: string;
  // Primary Contact fields
  contactTitle?: string;
  contactPhone?: string;
  contactAddressLine1?: string;
  contactAddressLine2?: string;
  contactCity?: string;
  contactState?: string;
  contactZip?: string;
  // Insurance
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  insurancePhone?: string;
}

export interface ProfilePanelProps {
  user: User | null;
  companyProfile: CompanyProfile | null;
  isLoading: boolean;
  onSave: (companyData: Partial<CompanyProfile>, userData: Partial<User>) => Promise<void>;
}

export function ProfilePanel({
  user,
  companyProfile,
  isLoading,
  onSave,
}: ProfilePanelProps) {
  // Local state for editing
  const [editedCompany, setEditedCompany] = useState<CompanyProfile | null>(null);
  const [editedUser, setEditedUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize edited state when data loads
  useEffect(() => {
    if (companyProfile) {
      setEditedCompany(companyProfile);
    }
  }, [companyProfile]);

  useEffect(() => {
    if (user) {
      setEditedUser(user);
    }
  }, [user]);

  // Detect changes
  useEffect(() => {
    const companyChanged = JSON.stringify(companyProfile) !== JSON.stringify(editedCompany);
    const userChanged = JSON.stringify(user) !== JSON.stringify(editedUser);
    setHasChanges(companyChanged || userChanged);
  }, [companyProfile, editedCompany, user, editedUser]);

  const handleCompanyChange = (field: keyof CompanyProfile, value: any) => {
    if (!editedCompany) return;
    setEditedCompany({ ...editedCompany, [field]: value });
  };

  const handleUserChange = (field: keyof User, value: any) => {
    if (!editedUser) return;
    setEditedUser({ ...editedUser, [field]: value });
  };

  const handleLogoChange = (logoUrl: string) => {
    handleCompanyChange('logoUrl', logoUrl);
  };

  const handleSave = async () => {
    if (!hasChanges || !editedCompany || !editedUser) return;

    setIsSaving(true);
    try {
      // Extract only changed fields
      const companyChanges: Partial<CompanyProfile> = {};
      const userChanges: Partial<User> = {};

      // Compare and extract company changes
      Object.keys(editedCompany).forEach((key) => {
        const k = key as keyof CompanyProfile;
        if (editedCompany[k] !== companyProfile?.[k]) {
          companyChanges[k] = editedCompany[k] as any;
        }
      });

      // Compare and extract user changes
      Object.keys(editedUser).forEach((key) => {
        const k = key as keyof User;
        if (editedUser[k] !== user?.[k]) {
          userChanges[k] = editedUser[k] as any;
        }
      });

      await onSave(companyChanges, userChanges);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      // TODO: Show error toast
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedCompany(companyProfile);
    setEditedUser(user);
    setHasChanges(false);
  };

  return (
    <div className="profile-panel-v2">
      {/* Header Card - Logo with edit icon, Company Name, User Name, Badges */}
      <ProfileHeaderCard
        user={editedUser}
        companyProfile={editedCompany}
        isLoading={isLoading}
        onLogoChange={handleLogoChange}
      />

      {/* Company Information - Collapsible (no logo section) */}
      <CompanyInformationSection
        company={editedCompany}
        isLoading={isLoading}
        onChange={handleCompanyChange}
      />

      {/* Primary Contact - Collapsible (expanded fields) */}
      <PrimaryContactSection
        user={editedUser}
        companyProfile={editedCompany}
        isLoading={isLoading}
        onUserChange={handleUserChange}
        onCompanyChange={handleCompanyChange}
      />

      {/* Insurance Information - Collapsible (with phone) */}
      <InsuranceInformationSection
        insurance={{
          company: editedCompany?.insuranceCompany,
          policyNumber: editedCompany?.insurancePolicyNumber,
          expiryDate: editedCompany?.insuranceExpiryDate,
          phone: editedCompany?.insurancePhone,
        }}
        isLoading={isLoading}
        onChange={(field, value) => handleCompanyChange(field as keyof CompanyProfile, value)}
      />

      {/* Save changes bar (sticky, appears when hasChanges) */}
      {hasChanges && (
        <SaveChangesBar
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
