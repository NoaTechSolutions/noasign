import React from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface InsuranceInfo {
  company?: string;
  policyNumber?: string;
  expiryDate?: string;
  phone?: string;
}

interface InsuranceInformationSectionProps {
  insurance: InsuranceInfo;
  isLoading: boolean;
  onChange: (field: string, value: string) => void;
}

export function InsuranceInformationSection({
  insurance,
  isLoading,
  onChange,
}: InsuranceInformationSectionProps) {
  if (isLoading) {
    return (
      <CollapsibleSection title="Insurance Information" subtitle="Optional" isLoading={true}>
        <div className="profile-form-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="form-field">
              <div className="skeleton-pulse skeleton-line" style={{ width: '80px', height: '14px', marginBottom: '8px' }}></div>
              <div className="skeleton-pulse skeleton-line" style={{ width: '100%', height: '40px' }}></div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Insurance Information" subtitle="Optional" defaultExpanded={false}>
      <div className="profile-form-grid">
        {/* Row 1: Insurance Company (full width) */}
        <div className="form-field form-field-full">
          <label className="form-label">Insurance Company</label>
          <input
            type="text"
            className="form-input"
            value={insurance.company || ''}
            onChange={(e) => onChange('insuranceCompany', e.target.value)}
            placeholder="e.g., State Farm, Allstate"
          />
        </div>

        {/* Row 2: Policy Number, Phone */}
        <div className="form-field">
          <label className="form-label">Policy Number</label>
          <input
            type="text"
            className="form-input"
            value={insurance.policyNumber || ''}
            onChange={(e) => onChange('insurancePolicyNumber', e.target.value)}
            placeholder="ABC123456789"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Insurance Phone</label>
          <input
            type="tel"
            className="form-input"
            value={insurance.phone || ''}
            onChange={(e) => onChange('insurancePhone', e.target.value)}
            placeholder="(555) 000-0000"
          />
        </div>

        {/* Row 3: Expiry Date */}
        <div className="form-field">
          <label className="form-label">Expiry Date</label>
          <input
            type="date"
            className="form-input"
            value={insurance.expiryDate || ''}
            onChange={(e) => onChange('insuranceExpiryDate', e.target.value)}
          />
        </div>
      </div>

      <p className="form-hint-section">
        Insurance information is optional and will be included in generated documents when provided.
      </p>
    </CollapsibleSection>
  );
}
