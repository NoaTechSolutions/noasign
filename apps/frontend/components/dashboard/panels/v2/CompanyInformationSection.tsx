import React from 'react';
import { CollapsibleSection } from './CollapsibleSection';
import { formatUsPhone } from '@/lib/format-phone';

interface CompanyProfile {
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
}

interface CompanyInformationSectionProps {
  company: CompanyProfile | null;
  isLoading: boolean;
  onChange: (field: keyof CompanyProfile, value: string) => void;
}

export function CompanyInformationSection({
  company,
  isLoading,
  onChange,
}: CompanyInformationSectionProps) {
  if (isLoading) {
    return (
      <CollapsibleSection title="Company Information" isLoading={true}>
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

  if (!company) return null;

  return (
    <CollapsibleSection title="Company Information" defaultExpanded={true}>
      <div className="profile-form-grid">
        {/* Row 1: Company Name, Legal Name */}
        <div className="form-field">
          <label className="form-label">Company Name *</label>
          <input
            type="text"
            className="form-input"
            value={company.companyName || ''}
            onChange={(e) => onChange('companyName', e.target.value)}
            required
          />
        </div>

        <div className="form-field">
          <label className="form-label">Legal Name</label>
          <input
            type="text"
            className="form-input"
            value={company.legalName || ''}
            onChange={(e) => onChange('legalName', e.target.value)}
            placeholder="Same as company name if not different"
          />
        </div>

        {/* Row 2: Industry, Email */}
        <div className="form-field">
          <label className="form-label">Industry</label>
          <input
            type="text"
            className="form-input"
            value={company.industry || ''}
            onChange={(e) => onChange('industry', e.target.value)}
            placeholder="e.g., Construction, Healthcare"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Company Email</label>
          <input
            type="email"
            className="form-input"
            value={company.email || ''}
            onChange={(e) => onChange('email', e.target.value)}
            placeholder="contact@company.com"
          />
        </div>

        {/* Row 3: Phone, Website */}
        <div className="form-field">
          <label className="form-label">Phone</label>
          <input
            type="tel"
            className="form-input"
            value={company.phone || ''}
            onChange={(e) => onChange('phone', formatUsPhone(e.target.value))}
            placeholder="(555) 000-0000"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Website</label>
          <input
            type="url"
            className="form-input"
            value={company.website || ''}
            onChange={(e) => onChange('website', e.target.value)}
            placeholder="https://company.com"
          />
        </div>

        {/* Row 4: Address Line 1 (full width) */}
        <div className="form-field form-field-full">
          <label className="form-label">Address Line 1</label>
          <input
            type="text"
            className="form-input"
            value={company.addressLine1 || ''}
            onChange={(e) => onChange('addressLine1', e.target.value)}
            placeholder="123 Main St"
          />
        </div>

        {/* Row 5: Address Line 2 (full width) */}
        <div className="form-field form-field-full">
          <label className="form-label">Address Line 2</label>
          <input
            type="text"
            className="form-input"
            value={company.addressLine2 || ''}
            onChange={(e) => onChange('addressLine2', e.target.value)}
            placeholder="Suite 100"
          />
        </div>

        {/* Row 6: City, State */}
        <div className="form-field">
          <label className="form-label">City</label>
          <input
            type="text"
            className="form-input"
            value={company.city || ''}
            onChange={(e) => onChange('city', e.target.value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">State</label>
          <input
            type="text"
            className="form-input"
            value={company.state || ''}
            onChange={(e) => onChange('state', e.target.value)}
            placeholder="CA"
          />
        </div>

        {/* Row 7: ZIP, Country */}
        <div className="form-field">
          <label className="form-label">ZIP Code</label>
          <input
            type="text"
            className="form-input"
            value={company.zip || ''}
            onChange={(e) => onChange('zip', e.target.value)}
            placeholder="90210"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Country</label>
          <input
            type="text"
            className="form-input"
            value={company.country || ''}
            onChange={(e) => onChange('country', e.target.value)}
            placeholder="United States"
          />
        </div>
      </div>
    </CollapsibleSection>
  );
}
