import React, { useState, useEffect, useCallback } from 'react';
import './profile-panel-v2.css';
import { ProfileHeaderCard } from './ProfileHeaderCard';
import { CompanyInformationSection } from './CompanyInformationSection';
import { PrimaryContactSection } from './PrimaryContactSection';
import { InsuranceInformationSection } from './InsuranceInformationSection';
import { PersonalInformationSection } from './PersonalInformationSection';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountType?: string | null;
  title?: string;
  phone?: string;
  avatarUrl?: string | null;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
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
  contactTitle?: string;
  contactPhone?: string;
  contactAddressLine1?: string;
  contactAddressLine2?: string;
  contactCity?: string;
  contactState?: string;
  contactZip?: string;
  insuranceCompany?: string;
  insurancePolicyNumber?: string;
  insuranceExpiryDate?: string;
  insurancePhone?: string;
}

export interface ProfileStats {
  totalDocuments: number;
  completedDocuments: number;
  memberSince: string | null;
  planName: string;
}

export interface ProfilePanelProps {
  user: User | null;
  companyProfile: CompanyProfile | null;
  isLoading: boolean;
  onSave: (companyData: Partial<CompanyProfile>, userData: Partial<User>) => Promise<void>;
  stats?: ProfileStats;
  onNavigate?: (panel: string) => void;
}

export function ProfilePanel({
  user,
  companyProfile,
  isLoading,
  onSave,
  stats,
  onNavigate,
}: ProfilePanelProps) {
  const [draftUser, setDraftUser] = useState<User | null>(null);
  const [draftCompany, setDraftCompany] = useState<CompanyProfile | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);

  useEffect(() => { if (user) setDraftUser({ ...user }); }, [user]);
  useEffect(() => { if (companyProfile) setDraftCompany({ ...companyProfile }); }, [companyProfile]);

  const openGroup = useCallback((group: string) => {
    if (user) setDraftUser({ ...user });
    if (companyProfile) setDraftCompany({ ...companyProfile });
    setEditingGroup(group);
  }, [user, companyProfile]);

  const closeGroup = useCallback(() => {
    if (user) setDraftUser({ ...user });
    if (companyProfile) setDraftCompany({ ...companyProfile });
    setEditingGroup(null);
  }, [user, companyProfile]);

  const handleUserDraft = useCallback((field: string, value: string) => {
    setDraftUser((prev) => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const handleCompanyDraft = useCallback((field: string, value: string) => {
    setDraftCompany((prev) => prev ? { ...prev, [field]: value } : prev);
  }, []);

  const isUserDirty = useCallback(() => {
    if (!draftUser || !user) return false;
    return (Object.keys(draftUser) as (keyof User)[]).some((k) => draftUser[k] !== user[k]);
  }, [draftUser, user]);

  const isCompanyDirty = useCallback(() => {
    if (!draftCompany || !companyProfile) return false;
    return (Object.keys(draftCompany) as (keyof CompanyProfile)[]).some((k) => draftCompany[k] !== companyProfile[k]);
  }, [draftCompany, companyProfile]);

  const isDirty = isUserDirty() || isCompanyDirty();

  const handleGroupSave = useCallback(async () => {
    const companyChanges: Partial<CompanyProfile> = {};
    const userChanges: Partial<User> = {};

    if (draftCompany && companyProfile) {
      (Object.keys(draftCompany) as (keyof CompanyProfile)[]).forEach((k) => {
        if (draftCompany[k] !== companyProfile[k]) companyChanges[k] = draftCompany[k] as any;
      });
    }
    if (draftUser && user) {
      (Object.keys(draftUser) as (keyof User)[]).forEach((k) => {
        if (draftUser[k] !== user[k]) userChanges[k] = draftUser[k] as any;
      });
    }
    if (Object.keys(companyChanges).length > 0 || Object.keys(userChanges).length > 0) {
      await onSave(companyChanges, userChanges);
    }
    setEditingGroup(null);
  }, [draftCompany, draftUser, companyProfile, user, onSave]);

  const handleAvatarChange = useCallback((avatarUrl: string) => {
    setDraftUser((prev) => prev ? { ...prev, avatarUrl } : prev);
    void onSave({}, { avatarUrl } as Partial<User>);
  }, [onSave]);

  const handleLogoChange = useCallback((logoUrl: string) => {
    handleCompanyDraft('logoUrl', logoUrl);
  }, [handleCompanyDraft]);

  const isIndividual = user?.accountType === 'INDIVIDUAL';

  return (
    <div className="profile-panel-v2">
      <ProfileHeaderCard
        user={draftUser}
        companyProfile={draftCompany}
        isLoading={isLoading}
        onLogoChange={handleLogoChange}
        stats={stats}
        onNavigate={onNavigate}
        onAvatarChange={handleAvatarChange}
      />

      {isIndividual ? (
        <PersonalInformationSection
          user={draftUser}
          isLoading={isLoading}
          editingGroup={editingGroup}
          onOpenGroup={openGroup}
          onCloseGroup={closeGroup}
          onSaveGroup={handleGroupSave}
          isDirty={isDirty}
          onUserChange={handleUserDraft}
        />
      ) : (
        <>
          <CompanyInformationSection
            company={draftCompany}
            isLoading={isLoading}
            editingGroup={editingGroup}
            onOpenGroup={openGroup}
            onCloseGroup={closeGroup}
            onSaveGroup={handleGroupSave}
            isDirty={isDirty}
            onCompanyChange={handleCompanyDraft}
          />
          <PrimaryContactSection
            user={draftUser}
            companyProfile={draftCompany}
            isLoading={isLoading}
            editingGroup={editingGroup}
            onOpenGroup={openGroup}
            onCloseGroup={closeGroup}
            onSaveGroup={handleGroupSave}
            isDirty={isDirty}
            onUserChange={handleUserDraft}
            onCompanyChange={handleCompanyDraft}
          />
          <InsuranceInformationSection
            insurance={{
              company: draftCompany?.insuranceCompany,
              policyNumber: draftCompany?.insurancePolicyNumber,
              expiryDate: draftCompany?.insuranceExpiryDate,
              phone: draftCompany?.insurancePhone,
            }}
            isLoading={isLoading}
            editingGroup={editingGroup}
            onOpenGroup={openGroup}
            onCloseGroup={closeGroup}
            onSaveGroup={handleGroupSave}
            isDirty={isDirty}
            onInsuranceChange={handleCompanyDraft}
          />
        </>
      )}
    </div>
  );
}
