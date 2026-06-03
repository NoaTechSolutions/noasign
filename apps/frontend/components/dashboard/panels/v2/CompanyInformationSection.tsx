import React from 'react';
import { Building2, Mail, MapPin, Globe, Pencil } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldRow, ProfileSectionSkeleton } from '@/components/dashboard/shared/ui';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { formatUsPhone } from '@/lib/format-phone';
import { formatZipCode } from '@/lib/format-zip';
import { formatTitleCase, formatState } from '@/lib/format-text';

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

interface Props {
  company: CompanyProfile | null;
  isLoading: boolean;
  editingGroup: string | null;
  onOpenGroup: (group: string) => void;
  onCloseGroup: () => void;
  onSaveGroup: () => void;
  isDirty: boolean;
  onCompanyChange: (field: string, value: string) => void;
}

function GroupHeader({ icon, title, groupKey, onEdit }: { icon: React.ReactNode; title: string; groupKey: string; onEdit: (g: string) => void }) {
  return (
    <>
      <span className="card-legend__label">
        <span className="card-legend__icon">{icon}</span>
        <span className="card-legend__title">{title}</span>
      </span>
      <button type="button" className="card-legend__edit gep-edit-btn" onClick={() => onEdit(groupKey)} aria-label={`Edit ${title}`}>
        <Pencil size={13} />
      </button>
    </>
  );
}

export function CompanyInformationSection({
  company,
  isLoading,
  editingGroup,
  onOpenGroup,
  onCloseGroup,
  onSaveGroup,
  isDirty,
  onCompanyChange,
}: Props) {
  if (isLoading || !company) {
    return (
      <CollapsibleSection title="Company Information" isLoading={true}>
        <ProfileSectionSkeleton rows={3} />
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Company Information" defaultExpanded={true}>
      {/* Row 1: Company Details + Address */}
      <div className="group-pair">
        <div className="form-group card-legend">
          <GroupHeader icon={<Building2 className="group-pair-header__icon" size={14} />} title="Company Details" groupKey="ci-details" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Company" value={company.companyName} />
            <FieldRow label="Legal Name" value={company.legalName} />
            <FieldRow label="Industry" value={company.industry} />
          </div>
        </div>
        <div className="form-group card-legend">
          <GroupHeader icon={<MapPin className="group-pair-header__icon" size={14} />} title="Address" groupKey="ci-address" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Address" value={company.addressLine1} />
            {company.addressLine2 && <FieldRow label="Address 2" value={company.addressLine2} />}
            <FieldRow label="City" value={company.city} />
            <FieldRow label="State" value={company.state} />
            <FieldRow label="ZIP Code" value={company.zip} />
            <FieldRow label="Country" value={company.country} />
          </div>
        </div>
      </div>

      {/* Row 2: Contact + Online Presence */}
      <div className="group-pair">
        <div className="form-group card-legend">
          <GroupHeader icon={<Mail className="group-pair-header__icon" size={14} />} title="Contact" groupKey="ci-contact" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Email" value={company.email} />
            <FieldRow label="Phone" value={company.phone} />
          </div>
        </div>
        <div className="form-group card-legend">
          <GroupHeader icon={<Globe className="group-pair-header__icon" size={14} />} title="Online Presence" groupKey="ci-online" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Website" value={company.website} />
          </div>
        </div>
      </div>

      {/* Popups */}
      <GroupEditPopup title="Company Details" isOpen={editingGroup === 'ci-details'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">Company Name *</label><input type="text" className="form-input" value={company.companyName || ''} onChange={(e) => onCompanyChange('companyName', formatTitleCase(e.target.value))} required /></div>
        <div className="form-field"><label className="form-label">Legal Name</label><input type="text" className="form-input" value={company.legalName || ''} onChange={(e) => onCompanyChange('legalName', formatTitleCase(e.target.value))} /></div>
        <div className="form-field"><label className="form-label">Industry</label><input type="text" className="form-input" value={company.industry || ''} onChange={(e) => onCompanyChange('industry', formatTitleCase(e.target.value))} placeholder="e.g., Construction" /></div>
      </GroupEditPopup>

      <GroupEditPopup title="Address" isOpen={editingGroup === 'ci-address'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">Address Line 1</label><input type="text" className="form-input" value={company.addressLine1 || ''} onChange={(e) => onCompanyChange('addressLine1', formatTitleCase(e.target.value))} placeholder="123 Main St" /></div>
        <div className="form-field"><label className="form-label">Address Line 2</label><input type="text" className="form-input" value={company.addressLine2 || ''} onChange={(e) => onCompanyChange('addressLine2', e.target.value)} placeholder="Suite 100" /></div>
        <div className="form-field"><label className="form-label">City</label><input type="text" className="form-input" value={company.city || ''} onChange={(e) => onCompanyChange('city', formatTitleCase(e.target.value))} /></div>
        <div className="form-field"><label className="form-label">State</label><input type="text" className="form-input" value={company.state || ''} onChange={(e) => onCompanyChange('state', formatState(e.target.value))} placeholder="CA" /></div>
        <div className="form-field"><label className="form-label">ZIP Code</label><input type="text" className="form-input" value={company.zip || ''} onChange={(e) => onCompanyChange('zip', formatZipCode(e.target.value))} placeholder="90210" maxLength={10} /></div>
        <div className="form-field"><label className="form-label">Country</label><input type="text" className="form-input" value={company.country || ''} onChange={(e) => onCompanyChange('country', e.target.value)} placeholder="United States" /></div>
      </GroupEditPopup>

      <GroupEditPopup title="Contact" isOpen={editingGroup === 'ci-contact'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">Email</label><input type="email" className="form-input" value={company.email || ''} onChange={(e) => onCompanyChange('email', e.target.value)} placeholder="contact@company.com" /></div>
        <div className="form-field"><label className="form-label">Phone</label><input type="tel" className="form-input" value={company.phone || ''} onChange={(e) => onCompanyChange('phone', formatUsPhone(e.target.value))} placeholder="(555) 000-0000" /></div>
      </GroupEditPopup>

      <GroupEditPopup title="Online Presence" isOpen={editingGroup === 'ci-online'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">Website</label><input type="url" className="form-input" value={company.website || ''} onChange={(e) => onCompanyChange('website', e.target.value)} placeholder="https://company.com" /></div>
      </GroupEditPopup>
    </CollapsibleSection>
  );
}
