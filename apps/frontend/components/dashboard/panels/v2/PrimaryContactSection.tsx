import React from 'react';
import { User as UserIcon, Phone, MapPin, Pencil } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldRow, ProfileSectionSkeleton } from '@/components/dashboard/shared/ui';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { formatUsPhone } from '@/lib/format-phone';
import { formatZipCode } from '@/lib/format-zip';
import { formatTitleCase, formatState } from '@/lib/format-text';

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

interface Props {
  user: User | null;
  companyProfile: CompanyProfile | null;
  isLoading: boolean;
  editingGroup: string | null;
  onOpenGroup: (group: string) => void;
  onCloseGroup: () => void;
  onSaveGroup: () => void;
  isDirty: boolean;
  onUserChange: (field: string, value: string) => void;
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

export function PrimaryContactSection({
  user,
  companyProfile,
  isLoading,
  editingGroup,
  onOpenGroup,
  onCloseGroup,
  onSaveGroup,
  isDirty,
  onUserChange,
  onCompanyChange,
}: Props) {
  if (isLoading || !user) {
    return (
      <CollapsibleSection title="Primary Contact" isLoading={true}>
        <ProfileSectionSkeleton rows={2} />
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Primary Contact" defaultExpanded={true}>
      {/* Row 1: Identity full width */}
      <div className="form-group card-legend">
        <GroupHeader icon={<UserIcon className="group-pair-header__icon" size={14} />} title="Identity" groupKey="pc-identity" onEdit={onOpenGroup} />
        <div className="group-pair" style={{ border: 'none', padding: 0 }}>
          <div className="field-rows">
            <FieldRow label="First Name" value={user.firstName} />
            <FieldRow label="Last Name" value={user.lastName} />
            <FieldRow label="Title" value={companyProfile?.contactTitle} />
          </div>
          <div className="field-rows">
            <FieldRow label="Email" value={user.email} />
            <FieldRow label="Phone" value={companyProfile?.contactPhone} />
          </div>
        </div>
      </div>

      {/* Row 2: Address + Contact side by side */}
      <div className="group-pair">
        <div className="form-group card-legend">
          <GroupHeader icon={<MapPin className="group-pair-header__icon" size={14} />} title="Address" groupKey="pc-address" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Address" value={companyProfile?.contactAddressLine1} />
            {companyProfile?.contactAddressLine2 && <FieldRow label="Address 2" value={companyProfile.contactAddressLine2} />}
            <FieldRow label="City" value={companyProfile?.contactCity} />
            <FieldRow label="State" value={companyProfile?.contactState} />
            <FieldRow label="ZIP Code" value={companyProfile?.contactZip} />
          </div>
        </div>
        <div className="form-group card-legend">
          <GroupHeader icon={<Phone className="group-pair-header__icon" size={14} />} title="Contact" groupKey="pc-contact" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Email" value={user.email} />
            <FieldRow label="Phone" value={companyProfile?.contactPhone} />
          </div>
        </div>
      </div>

      {/* Popups */}
      <GroupEditPopup title="Identity" isOpen={editingGroup === 'pc-identity'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">First Name *</label><input type="text" className="form-input" value={user.firstName || ''} onChange={(e) => onUserChange('firstName', formatTitleCase(e.target.value))} required /></div>
        <div className="form-field"><label className="form-label">Last Name *</label><input type="text" className="form-input" value={user.lastName || ''} onChange={(e) => onUserChange('lastName', formatTitleCase(e.target.value))} required /></div>
        <div className="form-field"><label className="form-label">Title / Position</label><input type="text" className="form-input" value={companyProfile?.contactTitle || ''} onChange={(e) => onCompanyChange('contactTitle', e.target.value)} placeholder="e.g., CEO" /></div>
      </GroupEditPopup>

      <GroupEditPopup title="Contact" isOpen={editingGroup === 'pc-contact'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">Email</label><input type="email" className="form-input" value={user.email || ''} readOnly disabled /><p className="form-hint">Email cannot be changed</p></div>
        <div className="form-field"><label className="form-label">Phone</label><input type="tel" className="form-input" value={companyProfile?.contactPhone || ''} onChange={(e) => onCompanyChange('contactPhone', formatUsPhone(e.target.value))} placeholder="(555) 000-0000" /></div>
      </GroupEditPopup>

      <GroupEditPopup title="Address" isOpen={editingGroup === 'pc-address'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">Address Line 1</label><input type="text" className="form-input" value={companyProfile?.contactAddressLine1 || ''} onChange={(e) => onCompanyChange('contactAddressLine1', formatTitleCase(e.target.value))} /></div>
        <div className="form-field"><label className="form-label">Address Line 2</label><input type="text" className="form-input" value={companyProfile?.contactAddressLine2 || ''} onChange={(e) => onCompanyChange('contactAddressLine2', e.target.value)} /></div>
        <div className="form-field"><label className="form-label">City</label><input type="text" className="form-input" value={companyProfile?.contactCity || ''} onChange={(e) => onCompanyChange('contactCity', formatTitleCase(e.target.value))} /></div>
        <div className="form-field"><label className="form-label">State</label><input type="text" className="form-input" value={companyProfile?.contactState || ''} onChange={(e) => onCompanyChange('contactState', formatState(e.target.value))} placeholder="CA" /></div>
        <div className="form-field"><label className="form-label">ZIP Code</label><input type="text" className="form-input" value={companyProfile?.contactZip || ''} onChange={(e) => onCompanyChange('contactZip', formatZipCode(e.target.value))} placeholder="90210" maxLength={10} /></div>
      </GroupEditPopup>
    </CollapsibleSection>
  );
}
