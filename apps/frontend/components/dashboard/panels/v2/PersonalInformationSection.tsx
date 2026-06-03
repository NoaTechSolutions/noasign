import React, { useState } from 'react';
import { User as UserIcon, Phone, Briefcase, Globe, MapPin, Pencil } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldRow, ProfileSectionSkeleton } from '@/components/dashboard/shared/ui';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { formatUsPhone } from '@/lib/format-phone';
import { formatZipCode } from '@/lib/format-zip';
import { formatTitleCase, formatState } from '@/lib/format-text';

const NICHE_OPTIONS = [
  "Music / Entertainment",
  "Cooking / Gastronomy",
  "Sales / Retail",
  "Photography / Video",
  "Design / Creative",
  "Content Creator",
  "Consulting",
  "Education / Tutoring",
  "Fitness / Personal Training",
  "Beauty / Styling",
  "Crafts / Handmade",
  "Real Estate",
  "Technology / Development",
  "Health / Wellness",
  "Construction / Trades",
];

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  title?: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

interface Props {
  user: User | null;
  isLoading: boolean;
  editingGroup: string | null;
  onOpenGroup: (group: string) => void;
  onCloseGroup: () => void;
  onSaveGroup: () => void;
  isDirty: boolean;
  onUserChange: (field: string, value: string) => void;
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

export function PersonalInformationSection({
  user,
  isLoading,
  editingGroup,
  onOpenGroup,
  onCloseGroup,
  onSaveGroup,
  isDirty,
  onUserChange,
}: Props) {
  const [showCustomNiche, setShowCustomNiche] = useState(
    () => (user?.title ?? '') !== '' && !NICHE_OPTIONS.includes(user?.title ?? ''),
  );

  if (isLoading || !user) {
    return (
      <CollapsibleSection title="Personal Information" collapsible={false} isLoading={true}>
        <ProfileSectionSkeleton rows={3} />
      </CollapsibleSection>
    );
  }

  const nicheValue = showCustomNiche ? '__other__' : (user.title ?? '');

  return (
    <CollapsibleSection title="Personal Information" collapsible={false} defaultExpanded={true}>
      {/* Row 1: Identity + Address */}
      <div className="group-pair">
        <div className="form-group card-legend">
          <GroupHeader icon={<UserIcon className="group-pair-header__icon" size={14} />} title="Identity" groupKey="pi-identity" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="First Name" value={user.firstName} />
            <FieldRow label="Last Name" value={user.lastName} />
            <FieldRow label="Email" value={user.email} />
            <FieldRow label="Phone" value={user.phone} />
          </div>
        </div>
        <div className="form-group card-legend">
          <GroupHeader icon={<MapPin className="group-pair-header__icon" size={14} />} title="Address" groupKey="pi-address" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Address" value={user.addressLine1} />
            <FieldRow label="City" value={user.city} />
            <FieldRow label="State" value={user.state} />
            <FieldRow label="ZIP Code" value={user.zipCode} />
          </div>
        </div>
      </div>

      {/* Row 2: Professional Profile + Online Presence */}
      <div className="group-pair">
        <div className="form-group card-legend">
          <GroupHeader icon={<Briefcase className="group-pair-header__icon" size={14} />} title="Professional Profile" groupKey="pi-niche" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Niche" value={user.title} />
          </div>
        </div>
        <div className="form-group card-legend">
          <GroupHeader icon={<Globe className="group-pair-header__icon" size={14} />} title="Online Presence" groupKey="pi-online" onEdit={onOpenGroup} />
          <div className="field-rows">
            <FieldRow label="Website" value={null} />
          </div>
        </div>
      </div>

      {/* Popups */}
      <GroupEditPopup title="Identity" isOpen={editingGroup === 'pi-identity'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">First Name</label><input type="text" className="form-input" value={user.firstName || ''} onChange={(e) => onUserChange('firstName', formatTitleCase(e.target.value))} /></div>
        <div className="form-field"><label className="form-label">Last Name</label><input type="text" className="form-input" value={user.lastName || ''} onChange={(e) => onUserChange('lastName', formatTitleCase(e.target.value))} /></div>
        <div className="form-field"><label className="form-label">Email</label><input type="email" className="form-input" value={user.email || ''} readOnly disabled /><p className="form-hint">Email cannot be changed</p></div>
        <div className="form-field"><label className="form-label">Phone</label><input type="tel" className="form-input" value={user.phone || ''} onChange={(e) => onUserChange('phone', formatUsPhone(e.target.value))} placeholder="(555) 000-0000" /></div>
      </GroupEditPopup>

      <GroupEditPopup title="Address" isOpen={editingGroup === 'pi-address'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">Address Line 1</label><input type="text" className="form-input" value={user.addressLine1 || ''} onChange={(e) => onUserChange('addressLine1', formatTitleCase(e.target.value))} placeholder="123 Main St" /></div>
        <div className="form-field"><label className="form-label">City</label><input type="text" className="form-input" value={user.city || ''} onChange={(e) => onUserChange('city', formatTitleCase(e.target.value))} /></div>
        <div className="form-field"><label className="form-label">State</label><input type="text" className="form-input" value={user.state || ''} onChange={(e) => onUserChange('state', formatState(e.target.value))} placeholder="CA" /></div>
        <div className="form-field"><label className="form-label">ZIP Code</label><input type="text" className="form-input" value={user.zipCode || ''} onChange={(e) => onUserChange('zipCode', formatZipCode(e.target.value))} placeholder="90210" maxLength={10} /></div>
      </GroupEditPopup>

      <GroupEditPopup title="Professional Profile" isOpen={editingGroup === 'pi-niche'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field">
          <label className="form-label">Niche</label>
          <select className="form-input" value={nicheValue} onChange={(e) => { const v = e.target.value; if (v === '__other__') { setShowCustomNiche(true); onUserChange('title', ''); } else { setShowCustomNiche(false); onUserChange('title', v); } }}>
            <option value="">Select your niche…</option>
            {NICHE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            <option value="__other__">Other</option>
          </select>
          {showCustomNiche && <input type="text" className="form-input" style={{ marginTop: '8px' }} placeholder="Describe your niche…" value={user.title || ''} onChange={(e) => onUserChange('title', e.target.value)} />}
        </div>
      </GroupEditPopup>

      <GroupEditPopup title="Online Presence" isOpen={editingGroup === 'pi-online'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        <div className="form-field"><label className="form-label">Website</label><input type="url" className="form-input" value="" onChange={() => {}} placeholder="https://yourwebsite.com" disabled /><p className="form-hint">Coming soon</p></div>
      </GroupEditPopup>
    </CollapsibleSection>
  );
}
