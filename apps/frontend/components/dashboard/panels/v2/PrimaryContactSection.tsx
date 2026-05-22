import React from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface CompanyProfile {
  contactTitle?: string;
  contactPhone?: string;
  contactAddressLine1?: string;
  contactAddressLine2?: string;
  contactCity?: string;
  contactState?: string;
  contactZip?: string;
}

interface PrimaryContactSectionProps {
  user: User | null;
  companyProfile: CompanyProfile | null;
  isLoading: boolean;
  onUserChange: (field: keyof User, value: string) => void;
  onCompanyChange: (field: keyof CompanyProfile, value: string) => void;
}

export function PrimaryContactSection({
  user,
  companyProfile,
  isLoading,
  onUserChange,
  onCompanyChange,
}: PrimaryContactSectionProps) {
  if (isLoading) {
    return (
      <CollapsibleSection title="Primary Contact" isLoading={true}>
        <div className="profile-form-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="form-field">
              <div className="skeleton-pulse skeleton-line" style={{ width: '80px', height: '14px', marginBottom: '8px' }}></div>
              <div className="skeleton-pulse skeleton-line" style={{ width: '100%', height: '40px' }}></div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  if (!user) return null;

  return (
    <CollapsibleSection title="Primary Contact" defaultExpanded={true}>
      <div className="profile-form-grid">
        {/* Row 1: First Name, Last Name */}
        <div className="form-field">
          <label className="form-label">First Name *</label>
          <input
            type="text"
            className="form-input"
            value={user.firstName || ''}
            onChange={(e) => onUserChange('firstName', e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Last Name *</label>
          <input
            type="text"
            className="form-input"
            value={user.lastName || ''}
            onChange={(e) => onUserChange('lastName', e.target.value)}
            required
          />
        </div>

        {/* Row 2: Title/Position, Phone */}
        <div className="form-field">
          <label className="form-label">Title / Position</label>
          <input
            type="text"
            className="form-input"
            value={companyProfile?.contactTitle || ''}
            onChange={(e) => onCompanyChange('contactTitle', e.target.value)}
            placeholder="e.g., CEO, Project Manager"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Phone</label>
          <input
            type="tel"
            className="form-input"
            value={companyProfile?.contactPhone || ''}
            onChange={(e) => onCompanyChange('contactPhone', e.target.value)}
            placeholder="(555) 000-0000"
          />
        </div>

        {/* Row 3: Email (read-only, full width) */}
        <div className="form-field form-field-full">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            value={user.email || ''}
            readOnly
            disabled
            title="Email cannot be changed"
          />
          <p className="form-hint">Email cannot be changed</p>
        </div>

        {/* Row 4: Address Line 1 (full width) */}
        <div className="form-field form-field-full">
          <label className="form-label">Contact Address Line 1</label>
          <input
            type="text"
            className="form-input"
            value={companyProfile?.contactAddressLine1 || ''}
            onChange={(e) => onCompanyChange('contactAddressLine1', e.target.value)}
            placeholder="Leave blank if same as company address"
          />
        </div>

        {/* Row 5: Address Line 2 (full width) */}
        <div className="form-field form-field-full">
          <label className="form-label">Contact Address Line 2</label>
          <input
            type="text"
            className="form-input"
            value={companyProfile?.contactAddressLine2 || ''}
            onChange={(e) => onCompanyChange('contactAddressLine2', e.target.value)}
            placeholder="Suite, unit, etc."
          />
        </div>

        {/* Row 6: City, State */}
        <div className="form-field">
          <label className="form-label">Contact City</label>
          <input
            type="text"
            className="form-input"
            value={companyProfile?.contactCity || ''}
            onChange={(e) => onCompanyChange('contactCity', e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Contact State</label>
          <input
            type="text"
            className="form-input"
            value={companyProfile?.contactState || ''}
            onChange={(e) => onCompanyChange('contactState', e.target.value)}
            placeholder="CA"
          />
        </div>

        {/* Row 7: ZIP */}
        <div className="form-field">
          <label className="form-label">Contact ZIP Code</label>
          <input
            type="text"
            className="form-input"
            value={companyProfile?.contactZip || ''}
            onChange={(e) => onCompanyChange('contactZip', e.target.value)}
            placeholder="90210"
          />
        </div>
      </div>

      <p className="form-hint-section">
        Contact information is used for primary communication and document generation. Leave address fields blank if same as company address.
      </p>
    </CollapsibleSection>
  );
}
