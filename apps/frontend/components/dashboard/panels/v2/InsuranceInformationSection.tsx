import React from 'react';
import { Shield, Pencil } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import { FieldRow, ProfileSectionSkeleton } from '@/components/dashboard/shared/ui';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { formatUsPhone } from '@/lib/format-phone';
import { formatTitleCase } from '@/lib/format-text';
import { formatDisplayDate } from '@/lib/format';

interface InsuranceInfo {
  company?: string;
  policyNumber?: string;
  expiryDate?: string;
  phone?: string;
}

interface Props {
  insurance: InsuranceInfo;
  isLoading: boolean;
  editingGroup: string | null;
  onOpenGroup: (group: string) => void;
  onCloseGroup: () => void;
  onSaveGroup: () => void;
  isDirty: boolean;
  onInsuranceChange: (field: string, value: string) => void;
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

export function InsuranceInformationSection({
  insurance,
  isLoading,
  editingGroup,
  onOpenGroup,
  onCloseGroup,
  onSaveGroup,
  isDirty,
  onInsuranceChange,
}: Props) {
  if (isLoading) {
    return (
      <CollapsibleSection title="Insurance Information" subtitle="Optional" isLoading={true}>
        <ProfileSectionSkeleton rows={2} />
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title="Insurance Information" subtitle="Optional" defaultExpanded={false}>
      <div className="form-group card-legend">
        <GroupHeader icon={<Shield className="group-pair-header__icon" size={14} />} title="Policy" groupKey="ins-policy" onEdit={onOpenGroup} />
        <div className="group-pair" style={{ border: 'none', padding: 0 }}>
          <div className="field-rows">
            <FieldRow label="Company" value={insurance.company} />
            <FieldRow label="Policy #" value={insurance.policyNumber} />
          </div>
          <div className="field-rows">
            <FieldRow label="Phone" value={insurance.phone} />
            <FieldRow label="Expiry Date" value={formatDisplayDate(insurance.expiryDate)} />
          </div>
        </div>
      </div>

      <GroupEditPopup title="Policy" isOpen={editingGroup === 'ins-policy'} onClose={onCloseGroup} onSave={onSaveGroup} isDirty={isDirty}>
        {/* autoComplete="off" + distinct name on each input stops the browser
            from cross-autofilling one field with another's value (e.g. company
            name leaking into Policy number on focus). */}
        <div className="form-field"><label className="form-label">Insurance Company</label><input type="text" name="insurance-company" autoComplete="off" className="form-input" value={insurance.company || ''} onChange={(e) => onInsuranceChange('insuranceCompany', formatTitleCase(e.target.value))} placeholder="e.g., State Farm" /></div>
        {/* Policy Number: alphanumeric, capped at 15 (US policy numbers are short
            and may contain letters). Sanitize on input so pasted junk is stripped. */}
        <div className="form-field"><label className="form-label">Policy Number</label><input type="text" name="insurance-policy" autoComplete="off" className="form-input" value={insurance.policyNumber || ''} maxLength={15} onChange={(e) => onInsuranceChange('insurancePolicyNumber', e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15))} placeholder="e.g., ABC123456789" /></div>
        <div className="form-field"><label className="form-label">Phone</label><input type="tel" name="insurance-phone" autoComplete="off" className="form-input" value={insurance.phone || ''} onChange={(e) => onInsuranceChange('insurancePhone', formatUsPhone(e.target.value))} placeholder="(555) 000-0000" /></div>
        <div className="form-field"><label className="form-label">Expiry Date</label><input type="date" name="insurance-expiry" autoComplete="off" className="form-input" value={insurance.expiryDate || ''} onChange={(e) => onInsuranceChange('insuranceExpiryDate', e.target.value)} /></div>
      </GroupEditPopup>
    </CollapsibleSection>
  );
}
