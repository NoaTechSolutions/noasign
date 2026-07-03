'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User as UserIcon, MapPin, Building2, Pencil } from 'lucide-react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { FieldRow } from '@/components/dashboard/shared/ui';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { formatUsPhone } from '@/lib/format-phone';
import { formatZipCode } from '@/lib/format-zip';
import { formatTitleCase, formatState } from '@/lib/format-text';
import type { Customer, CustomerFormData } from './types';
import { splitFullName, combineFullName } from './types';

interface CustomerDetailModalProps {
  customer: Customer;
  role: 'superadmin' | 'user';
  currentUserId: string;
  onUpdateCustomer: (id: string, data: CustomerFormData) => Promise<Customer>;
  onDelete: () => void;
  onAssign: () => void;
  onClose: () => void;
}

// Flat editable draft of every customer + business field.
interface Draft {
  firstName: string; lastName: string; email: string; phone: string;
  addressLine1: string; addressLine2: string; city: string; state: string; zipCode: string;
  businessName: string; businessLegalName: string; licenseNumber: string; industry: string;
  website: string; businessEmail: string; businessPhone: string;
  businessAddressLine1: string; businessAddressLine2: string; businessCity: string;
  businessState: string; businessZipCode: string;
  primaryContactName: string; primaryContactEmail: string; primaryContactPhone: string;
  primaryContactTitle: string; primaryContactAddressLine1: string; primaryContactCity: string;
  primaryContactState: string; primaryContactZipCode: string;
}

function seedDraft(c: Customer): Draft {
  const { firstName, lastName } = splitFullName(c.fullName);
  const b = c.business;
  return {
    firstName, lastName,
    email: c.email ?? '', phone: c.phone ?? '',
    addressLine1: c.addressLine1 ?? '', addressLine2: c.addressLine2 ?? '',
    city: c.city ?? '', state: c.state ?? '', zipCode: c.zipCode ?? '',
    businessName: b?.businessName ?? '', businessLegalName: b?.businessLegalName ?? '',
    licenseNumber: b?.licenseNumber ?? '', industry: b?.industry ?? '',
    website: b?.website ?? '', businessEmail: b?.businessEmail ?? '', businessPhone: b?.businessPhone ?? '',
    businessAddressLine1: b?.businessAddressLine1 ?? '', businessAddressLine2: b?.businessAddressLine2 ?? '',
    businessCity: b?.businessCity ?? '', businessState: b?.businessState ?? '', businessZipCode: b?.businessZipCode ?? '',
    primaryContactName: b?.primaryContactName ?? '', primaryContactEmail: b?.primaryContactEmail ?? '',
    primaryContactPhone: b?.primaryContactPhone ?? '', primaryContactTitle: b?.primaryContactTitle ?? '',
    primaryContactAddressLine1: b?.primaryContactAddressLine1 ?? '', primaryContactCity: b?.primaryContactCity ?? '',
    primaryContactState: b?.primaryContactState ?? '', primaryContactZipCode: b?.primaryContactZipCode ?? '',
  };
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

export function CustomerDetailModal({
  customer,
  role,
  onUpdateCustomer,
  onDelete,
  onAssign,
  onClose,
}: CustomerDetailModalProps) {
  useBlockScroll();

  const [current, setCurrent] = useState<Customer>(customer);
  const [draft, setDraft] = useState<Draft>(() => seedDraft(customer));
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'contact'>('business');

  // Re-seed when a different customer is shown.
  useEffect(() => {
    setCurrent(customer);
    setDraft(seedDraft(customer));
  }, [customer.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBusiness = current.customerType === 'BUSINESS';
  const displayName = isBusiness ? (current.business?.businessName || current.fullName) : current.fullName;

  const canAssign = role === 'superadmin';

  const openGroup = (key: string) => {
    setDraft(seedDraft(current));
    setDirty(false);
    setEditingGroup(key);
  };
  const closeGroup = () => { setEditingGroup(null); setDirty(false); };
  const set = (field: keyof Draft, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }));
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload: CustomerFormData = isBusiness
        ? {
            customerType: 'BUSINESS',
            fullName: draft.businessName.trim() || current.fullName,
            email: current.email || undefined,
            phone: current.phone || undefined,
            addressLine1: current.addressLine1 || undefined,
            addressLine2: current.addressLine2 || undefined,
            city: current.city || undefined,
            state: current.state || undefined,
            zipCode: current.zipCode || undefined,
            // DELETED is soft-delete state, not a form status → coerce to INACTIVE.
            status: current.status === 'DELETED' ? 'INACTIVE' : current.status,
            notes: current.notes || undefined,
            business: {
              businessName: draft.businessName,
              businessLegalName: draft.businessLegalName || undefined,
              licenseNumber: draft.licenseNumber || undefined,
              industry: draft.industry || undefined,
              website: draft.website || undefined,
              businessEmail: draft.businessEmail || undefined,
              businessPhone: draft.businessPhone || undefined,
              businessAddressLine1: draft.businessAddressLine1 || undefined,
              businessAddressLine2: draft.businessAddressLine2 || undefined,
              businessCity: draft.businessCity || undefined,
              businessState: draft.businessState || undefined,
              businessZipCode: draft.businessZipCode || undefined,
              primaryContactName: draft.primaryContactName || undefined,
              primaryContactEmail: draft.primaryContactEmail || undefined,
              primaryContactPhone: draft.primaryContactPhone || undefined,
              primaryContactTitle: draft.primaryContactTitle || undefined,
              primaryContactAddressLine1: draft.primaryContactAddressLine1 || undefined,
              primaryContactCity: draft.primaryContactCity || undefined,
              primaryContactState: draft.primaryContactState || undefined,
              primaryContactZipCode: draft.primaryContactZipCode || undefined,
            },
          }
        : {
            customerType: 'PERSONAL',
            fullName: combineFullName(draft.firstName, draft.lastName),
            email: draft.email || undefined,
            phone: draft.phone || undefined,
            addressLine1: draft.addressLine1 || undefined,
            addressLine2: draft.addressLine2 || undefined,
            city: draft.city || undefined,
            state: draft.state || undefined,
            zipCode: draft.zipCode || undefined,
            // DELETED is soft-delete state, not a form status → coerce to INACTIVE.
            status: current.status === 'DELETED' ? 'INACTIVE' : current.status,
            notes: current.notes || undefined,
          };

      const updated = await onUpdateCustomer(current.id, payload);
      setCurrent(updated);
      setEditingGroup(null);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [isBusiness, draft, current, onUpdateCustomer]);

  return (
    <>
    <div className="modal-overlay" data-modal="customer-detail" onClick={onClose}>
      <div className="modal-content modal-content--lg customer-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{displayName}</h2>
            <div className="customer-detail-header__badges">
              <span className={`customer-type-badge customer-type-badge--${current.customerType.toLowerCase()}`}>
              {current.customerType === 'PERSONAL' ? (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
              )}
              {current.customerType === 'PERSONAL' ? 'Personal' : 'Business'}
            </span>
            <span className={`customer-status-badge customer-status-badge--${(current.status ?? 'ACTIVE').toLowerCase()}`}>
              {(current.status ?? 'ACTIVE') === 'ACTIVE' ? 'Active' : 'Inactive'}
            </span>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body customer-detail-modal-body">
          {!isBusiness ? (
            <div className="detail-section">
              <div className="customer-detail-tab-content">
                <div className="form-group card-legend customer-detail__card">
                  <GroupHeader icon={<UserIcon size={14} />} title="Personal Information" groupKey="pi-personal" onEdit={openGroup} />
                  <div className="field-rows">
                    <FieldRow label="Full name" value={current.fullName} />
                    <FieldRow label="Email" value={current.email} />
                    <FieldRow label="Phone" value={current.phone ? formatUsPhone(current.phone) : undefined} />
                  </div>
                </div>
                <div className="form-group card-legend customer-detail__card">
                  <GroupHeader icon={<MapPin size={14} />} title="Address" groupKey="pi-address" onEdit={openGroup} />
                  <div className="field-rows">
                    <FieldRow label="Street" value={current.addressLine1} />
                    {current.addressLine2 && <FieldRow label="Street 2" value={current.addressLine2} />}
                    <FieldRow label="City" value={current.city} />
                    <FieldRow label="State" value={current.state} />
                    <FieldRow label="ZIP code" value={current.zipCode} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="detail-section">
              <div className="customer-detail-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={activeTab === 'business'} className={`customer-detail-tab${activeTab === 'business' ? ' customer-detail-tab--active' : ''}`} onClick={() => setActiveTab('business')}>
                  Business Info
                </button>
                <button type="button" role="tab" aria-selected={activeTab === 'contact'} className={`customer-detail-tab${activeTab === 'contact' ? ' customer-detail-tab--active' : ''}`} onClick={() => setActiveTab('contact')}>
                  Primary Contact
                </button>
              </div>

              {activeTab === 'business' ? (
                <div className="customer-detail-tab-content">
                  <div className="form-group card-legend customer-detail__card">
                    <GroupHeader icon={<Building2 size={14} />} title="Company Details" groupKey="biz-details" onEdit={openGroup} />
                    <div className="field-rows">
                      <FieldRow label="Business name" value={current.business?.businessName} />
                      <FieldRow label="Legal name" value={current.business?.businessLegalName} />
                      <FieldRow label="License number" value={current.business?.licenseNumber} />
                      <FieldRow label="Industry" value={current.business?.industry} />
                      <FieldRow label="Email" value={current.business?.businessEmail} />
                      <FieldRow label="Phone" value={current.business?.businessPhone ? formatUsPhone(current.business.businessPhone) : undefined} />
                      <FieldRow label="Website" value={current.business?.website} />
                    </div>
                  </div>
                  <div className="form-group card-legend customer-detail__card">
                    <GroupHeader icon={<MapPin size={14} />} title="Address" groupKey="biz-address" onEdit={openGroup} />
                    <div className="field-rows">
                      <FieldRow label="Street" value={current.business?.businessAddressLine1} />
                      {current.business?.businessAddressLine2 && <FieldRow label="Street 2" value={current.business.businessAddressLine2} />}
                      <FieldRow label="City" value={current.business?.businessCity} />
                      <FieldRow label="State" value={current.business?.businessState} />
                      <FieldRow label="ZIP code" value={current.business?.businessZipCode} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="customer-detail-tab-content">
                  <div className="form-group card-legend customer-detail__card">
                    <GroupHeader icon={<UserIcon size={14} />} title="Identity" groupKey="pc-identity" onEdit={openGroup} />
                    <div className="field-rows">
                      <FieldRow label="Name" value={current.business?.primaryContactName} />
                      <FieldRow label="Email" value={current.business?.primaryContactEmail} />
                      <FieldRow label="Phone" value={current.business?.primaryContactPhone ? formatUsPhone(current.business.primaryContactPhone) : undefined} />
                      <FieldRow label="Title" value={current.business?.primaryContactTitle} />
                    </div>
                  </div>
                  <div className="form-group card-legend customer-detail__card">
                    <GroupHeader icon={<MapPin size={14} />} title="Address" groupKey="pc-address" onEdit={openGroup} />
                    <div className="field-rows">
                      <FieldRow label="Street" value={current.business?.primaryContactAddressLine1} />
                      <FieldRow label="City" value={current.business?.primaryContactCity} />
                      <FieldRow label="State" value={current.business?.primaryContactState} />
                      <FieldRow label="ZIP code" value={current.business?.primaryContactZipCode} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-footer__left">
            <button type="button" className="btn-danger" onClick={onDelete}>
              Delete client
            </button>
          </div>
          <div className="modal-footer__right">
            {canAssign && (
              <button type="button" className="btn-secondary" onClick={onAssign}>
                Assign to...
              </button>
            )}
            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* ── Group edit popups ── */}
      {!isBusiness ? (
        <>
          <GroupEditPopup title="Personal Information" isOpen={editingGroup === 'pi-personal'} onClose={closeGroup} onSave={handleSave} isDirty={dirty} isSaving={saving}>
            <div className="form-field"><label className="form-label">First name *</label><input type="text" className="form-input" value={draft.firstName} onChange={(e) => set('firstName', formatTitleCase(e.target.value))} required /></div>
            <div className="form-field"><label className="form-label">Last name</label><input type="text" className="form-input" value={draft.lastName} onChange={(e) => set('lastName', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">Email</label><input type="email" className="form-input" value={draft.email} onChange={(e) => set('email', e.target.value)} /></div>
            <div className="form-field"><label className="form-label">Phone</label><input type="tel" className="form-input" value={draft.phone} onChange={(e) => set('phone', formatUsPhone(e.target.value))} placeholder="(555) 000-0000" /></div>
          </GroupEditPopup>

          <GroupEditPopup title="Address" isOpen={editingGroup === 'pi-address'} onClose={closeGroup} onSave={handleSave} isDirty={dirty} isSaving={saving}>
            <div className="form-field"><label className="form-label">Street</label><input type="text" className="form-input" value={draft.addressLine1} onChange={(e) => set('addressLine1', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">Street 2</label><input type="text" className="form-input" value={draft.addressLine2} onChange={(e) => set('addressLine2', e.target.value)} /></div>
            <div className="form-field"><label className="form-label">City</label><input type="text" className="form-input" value={draft.city} onChange={(e) => set('city', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">State</label><input type="text" className="form-input" value={draft.state} onChange={(e) => set('state', formatState(e.target.value))} placeholder="CA" /></div>
            <div className="form-field"><label className="form-label">ZIP code</label><input type="text" className="form-input" value={draft.zipCode} onChange={(e) => set('zipCode', formatZipCode(e.target.value))} maxLength={10} placeholder="90210" /></div>
          </GroupEditPopup>
        </>
      ) : (
        <>
          <GroupEditPopup title="Company Details" isOpen={editingGroup === 'biz-details'} onClose={closeGroup} onSave={handleSave} isDirty={dirty} isSaving={saving}>
            <div className="form-field"><label className="form-label">Business name *</label><input type="text" className="form-input" value={draft.businessName} onChange={(e) => set('businessName', formatTitleCase(e.target.value))} required /></div>
            <div className="form-field"><label className="form-label">Legal name</label><input type="text" className="form-input" value={draft.businessLegalName} onChange={(e) => set('businessLegalName', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">License number</label><input type="text" className="form-input" value={draft.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} /></div>
            <div className="form-field"><label className="form-label">Industry</label><input type="text" className="form-input" value={draft.industry} onChange={(e) => set('industry', formatTitleCase(e.target.value))} placeholder="e.g., Construction" /></div>
            <div className="form-field"><label className="form-label">Email</label><input type="email" className="form-input" value={draft.businessEmail} onChange={(e) => set('businessEmail', e.target.value)} /></div>
            <div className="form-field"><label className="form-label">Phone</label><input type="tel" className="form-input" value={draft.businessPhone} onChange={(e) => set('businessPhone', formatUsPhone(e.target.value))} placeholder="(555) 000-0000" /></div>
            <div className="form-field"><label className="form-label">Website</label><input type="url" className="form-input" value={draft.website} onChange={(e) => set('website', e.target.value)} placeholder="https://company.com" /></div>
          </GroupEditPopup>

          <GroupEditPopup title="Business Address" isOpen={editingGroup === 'biz-address'} onClose={closeGroup} onSave={handleSave} isDirty={dirty} isSaving={saving}>
            <div className="form-field"><label className="form-label">Street</label><input type="text" className="form-input" value={draft.businessAddressLine1} onChange={(e) => set('businessAddressLine1', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">Street 2</label><input type="text" className="form-input" value={draft.businessAddressLine2} onChange={(e) => set('businessAddressLine2', e.target.value)} /></div>
            <div className="form-field"><label className="form-label">City</label><input type="text" className="form-input" value={draft.businessCity} onChange={(e) => set('businessCity', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">State</label><input type="text" className="form-input" value={draft.businessState} onChange={(e) => set('businessState', formatState(e.target.value))} placeholder="CA" /></div>
            <div className="form-field"><label className="form-label">ZIP code</label><input type="text" className="form-input" value={draft.businessZipCode} onChange={(e) => set('businessZipCode', formatZipCode(e.target.value))} maxLength={10} placeholder="90210" /></div>
          </GroupEditPopup>

          <GroupEditPopup title="Primary Contact" isOpen={editingGroup === 'pc-identity'} onClose={closeGroup} onSave={handleSave} isDirty={dirty} isSaving={saving}>
            <div className="form-field"><label className="form-label">Name</label><input type="text" className="form-input" value={draft.primaryContactName} onChange={(e) => set('primaryContactName', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">Email</label><input type="email" className="form-input" value={draft.primaryContactEmail} onChange={(e) => set('primaryContactEmail', e.target.value)} /></div>
            <div className="form-field"><label className="form-label">Phone</label><input type="tel" className="form-input" value={draft.primaryContactPhone} onChange={(e) => set('primaryContactPhone', formatUsPhone(e.target.value))} placeholder="(555) 000-0000" /></div>
            <div className="form-field"><label className="form-label">Title</label><input type="text" className="form-input" value={draft.primaryContactTitle} onChange={(e) => set('primaryContactTitle', e.target.value)} /></div>
          </GroupEditPopup>

          <GroupEditPopup title="Contact Address" isOpen={editingGroup === 'pc-address'} onClose={closeGroup} onSave={handleSave} isDirty={dirty} isSaving={saving}>
            <div className="form-field"><label className="form-label">Street</label><input type="text" className="form-input" value={draft.primaryContactAddressLine1} onChange={(e) => set('primaryContactAddressLine1', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">City</label><input type="text" className="form-input" value={draft.primaryContactCity} onChange={(e) => set('primaryContactCity', formatTitleCase(e.target.value))} /></div>
            <div className="form-field"><label className="form-label">State</label><input type="text" className="form-input" value={draft.primaryContactState} onChange={(e) => set('primaryContactState', formatState(e.target.value))} placeholder="CA" /></div>
            <div className="form-field"><label className="form-label">ZIP code</label><input type="text" className="form-input" value={draft.primaryContactZipCode} onChange={(e) => set('primaryContactZipCode', formatZipCode(e.target.value))} maxLength={10} placeholder="90210" /></div>
          </GroupEditPopup>
        </>
      )}
    </>
  );
}
