'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useBlockScroll } from '@/lib/use-block-scroll';
import { useDirtyForm } from '@/components/dashboard/shared/dirty-form-context';
import { formatUsPhone } from '@/lib/format-phone';
import { formatZipCode } from '@/lib/format-zip';
import { formatTitleCase, formatState } from '@/lib/format-text';
import type { Customer, CustomerFormData, CustomerOwnerUser } from './types';
import { splitFullName as split, combineFullName as combine } from './types';

interface CustomerFormDrawerProps {
  mode: 'create' | 'edit';
  type: 'PERSONAL' | 'BUSINESS';
  customer: Customer | null;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onClose: () => void;
  // O1: create-only — go back to the type selector (re-choose PERSONAL/BUSINESS)
  // instead of Cancel on step 1. The drawer stays mounted, so entered data is
  // preserved. Absent in edit (no type step).
  onBack?: () => void;
  // SUPERADMIN-only assignment step (TASK 3). role drives whether the "Assign to
  // user" step appears; currentUserId pre-selects "Assign to myself".
  role: 'superadmin' | 'user';
  currentUserId: string;
  onFetchUsers: () => Promise<CustomerOwnerUser[]>;
}

// Two-letter initials for a user avatar, falling back to the email initial.
function initialsOf(u: Pick<CustomerOwnerUser, 'firstName' | 'lastName' | 'email'>): string {
  const f = u.firstName?.trim()?.[0] ?? '';
  const l = u.lastName?.trim()?.[0] ?? '';
  const ini = (f + l).toUpperCase();
  return ini || u.email?.[0]?.toUpperCase() || '?';
}

export function CustomerFormDrawer({ mode, type, customer, onSubmit, onClose, onBack, role, currentUserId, onFetchUsers }: CustomerFormDrawerProps) {
  useBlockScroll();
  const { setDirty, requestNavigate } = useDirtyForm();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // N3: per-input validation (SaaS-wide standard) — red border + inline message
  // on the specific field, never a generic top error or a silent failure (N2).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // True once the user has interacted with any field. Reset on submit success
  // and on confirmed discard. Synced into the global dirty-form context below.
  const [touched, setTouched] = useState(false);

  // Mirror local "touched" → context. Clear on unmount so the next form
  // doesn't inherit stale dirty state.
  useEffect(() => { setDirty(touched); }, [touched, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);

  // Bubble handler — every input/select/textarea onChange within modal-body
  // bubbles up here and flips touched to true (React state setter bails out
  // when value unchanged, so this is cheap).
  const markTouched = () => setTouched(true);

  const guardedClose = () => requestNavigate(onClose);

  // PERSONAL form data
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');

  // Status (edit mode only)
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Assign step (TASK 3) — SUPERADMIN on create only. Defaults to "myself".
  const showAssignStep = mode === 'create' && role === 'superadmin';
  const [assignUserId, setAssignUserId] = useState(currentUserId);
  const [assignUsers, setAssignUsers] = useState<CustomerOwnerUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Load workspace users once when the assign step is in play. onFetchUsers is
  // memoized upstream (page.tsx), so this fires once — no refetch loop.
  useEffect(() => {
    if (!showAssignStep) return;
    let cancelled = false;
    setUsersLoading(true);
    onFetchUsers()
      .then((list) => { if (!cancelled) setAssignUsers(list); })
      .catch((err) => {
        console.error('Error fetching users for assign step', err);
        if (!cancelled) setAssignUsers([]);
      })
      .finally(() => { if (!cancelled) setUsersLoading(false); });
    return () => { cancelled = true; };
  }, [showAssignStep, onFetchUsers]);

  // BUSINESS form data
  const [businessName, setBusinessName] = useState('');
  const [businessLegalName, setBusinessLegalName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddressLine1, setBusinessAddressLine1] = useState('');
  const [businessAddressLine2, setBusinessAddressLine2] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessState, setBusinessState] = useState('');
  const [businessZipCode, setBusinessZipCode] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');
  const [primaryContactPhone, setPrimaryContactPhone] = useState('');
  const [primaryContactTitle, setPrimaryContactTitle] = useState('');
  const [primaryContactAddressLine1, setPrimaryContactAddressLine1] = useState('');
  const [primaryContactCity, setPrimaryContactCity] = useState('');
  const [primaryContactState, setPrimaryContactState] = useState('');
  const [primaryContactZipCode, setPrimaryContactZipCode] = useState('');

  // Load customer data in edit mode
  useEffect(() => {
    if (mode === 'edit' && customer) {
      // K8: prefer the stored parts; fall back to splitting fullName for older rows.
      if (customer.firstName || customer.lastName) {
        setFirstName(customer.firstName ?? '');
        setMiddleName(customer.middleName ?? '');
        setLastName(customer.lastName ?? '');
      } else {
        const { firstName: fName, lastName: lName } = split(customer.fullName);
        setFirstName(fName);
        setLastName(lName);
      }
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setAddressLine1(customer.addressLine1 || '');
      setAddressLine2(customer.addressLine2 || '');
      setCity(customer.city || '');
      setState(customer.state || '');
      setZipCode(customer.zipCode || '');
      setNotes(customer.notes || '');
      // DELETED is a soft-delete state, not a form-editable status → coerce to
      // INACTIVE (the form only offers ACTIVE/INACTIVE; delete is a separate action).
      setStatus(customer.status === 'DELETED' ? 'INACTIVE' : (customer.status ?? 'ACTIVE'));

      if (customer.business) {
        setBusinessName(customer.business.businessName);
        setBusinessLegalName(customer.business.businessLegalName || '');
        setLicenseNumber(customer.business.licenseNumber || '');
        setIndustry(customer.business.industry || '');
        setWebsite(customer.business.website || '');
        setBusinessEmail(customer.business.businessEmail || '');
        setBusinessPhone(customer.business.businessPhone || '');
        setBusinessAddressLine1(customer.business.businessAddressLine1 || '');
        setBusinessAddressLine2(customer.business.businessAddressLine2 || '');
        setBusinessCity(customer.business.businessCity || '');
        setBusinessState(customer.business.businessState || '');
        setBusinessZipCode(customer.business.businessZipCode || '');
        setPrimaryContactName(customer.business.primaryContactName || '');
        setPrimaryContactEmail(customer.business.primaryContactEmail || '');
        setPrimaryContactPhone(customer.business.primaryContactPhone || '');
        setPrimaryContactTitle(customer.business.primaryContactTitle || '');
        setPrimaryContactAddressLine1(customer.business.primaryContactAddressLine1 || '');
        setPrimaryContactCity(customer.business.primaryContactCity || '');
        setPrimaryContactState(customer.business.primaryContactState || '');
        setPrimaryContactZipCode(customer.business.primaryContactZipCode || '');
      }
    }
  }, [mode, customer]);

  const baseSteps = type === 'PERSONAL' ? 2 : 4;
  const totalSteps = baseSteps + (showAssignStep ? 1 : 0);
  const isAssignStep = showAssignStep && currentStep === totalSteps;

  // N3: validate the required identity fields on step 1, returning a per-field
  // error map ({} when valid). Shared by Next (create) and Save (create + edit)
  // so a missing field can NEVER slip through silently (N2).
  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (type === 'PERSONAL') {
      // K8: first AND last are both required for a person.
      if (!firstName.trim()) errs.firstName = 'First name is required';
      if (!lastName.trim()) errs.lastName = 'Last name is required';
    } else if (!businessName.trim()) {
      errs.businessName = 'Business name is required';
    }
    return errs;
  };

  // Clear a single field's error as the user fixes it (live feedback).
  const clearFieldError = (key: string) =>
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev));

  const handleNext = () => {
    setError('');

    if (currentStep === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        return;
      }
    }
    setFieldErrors({});

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError('');
    // N2 fix: the Save button (edit is single-step) must revalidate — otherwise a
    // cleared required field reached the backend and failed silently. Block here
    // and surface the inline field error (jump back to step 1 if we drifted).
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      if (currentStep !== 1) setCurrentStep(1);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      const fullName =
        type === 'BUSINESS'
          ? businessName
          : combine(firstName, middleName, lastName);

      const payload: CustomerFormData = {
        customerType: type,
        fullName,
        // K8: persist the parts for a person so invoice/receipt create maps each
        // field directly (no lossy re-split). Business customers don't use them.
        ...(type === 'PERSONAL'
          ? {
              firstName: firstName.trim(),
              middleName: middleName.trim() || undefined,
              lastName: lastName.trim(),
            }
          : {}),
        email: email || undefined,
        phone: phone || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        notes: notes || undefined,
        status,
        // SUPERADMIN assigns ownership at create (TASK 3). Omitted for non-master /
        // edit — the backend then assigns to the requesting user.
        ...(showAssignStep ? { userId: assignUserId } : {}),
      };

      if (type === 'BUSINESS') {
        payload.business = {
          businessName,
          businessLegalName: businessLegalName || undefined,
          licenseNumber: licenseNumber || undefined,
          industry: industry || undefined,
          website: website || undefined,
          businessEmail: businessEmail || undefined,
          businessPhone: businessPhone || undefined,
          businessAddressLine1: businessAddressLine1 || undefined,
          businessAddressLine2: businessAddressLine2 || undefined,
          businessCity: businessCity || undefined,
          businessState: businessState || undefined,
          businessZipCode: businessZipCode || undefined,
          primaryContactName: primaryContactName || undefined,
          primaryContactEmail: primaryContactEmail || undefined,
          primaryContactPhone: primaryContactPhone || undefined,
          primaryContactTitle: primaryContactTitle || undefined,
          primaryContactAddressLine1: primaryContactAddressLine1 || undefined,
          primaryContactCity: primaryContactCity || undefined,
          primaryContactState: primaryContactState || undefined,
          primaryContactZipCode: primaryContactZipCode || undefined,
        };
      }

      await onSubmit(payload);
      // Saved — clear dirty so the parent's close doesn't re-prompt.
      setTouched(false);
      setDirty(false);
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setError('Failed to save client. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderAssignStep = () => {
    const q = userSearch.trim().toLowerCase();
    const me = assignUsers.find((u) => u.id === currentUserId);
    const others = assignUsers
      .filter((u) => u.id !== currentUserId)
      .filter((u) => {
        if (!q) return true;
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        return name.includes(q) || u.email.toLowerCase().includes(q);
      });

    return (
      <div className="form-step">
        <h3 className="form-step__title">Assign to</h3>
        <p className="assign-step__subtitle">Who should own this client?</p>

        <div className="form-group">
          <div className="assign-step__search">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="assign-step__list">
          {/* "Assign to myself" — always pinned first, pre-selected by default. */}
          <button
            type="button"
            className={`assign-option${assignUserId === currentUserId ? ' assign-option--selected' : ''}`}
            onClick={() => setAssignUserId(currentUserId)}
          >
            <span className="assign-option__avatar assign-option__avatar--me">
              {me ? initialsOf(me) : 'ME'}
            </span>
            <span className="assign-option__info">
              <span className="assign-option__name">Assign to myself</span>
              {me?.email && <span className="assign-option__email">{me.email}</span>}
            </span>
            <span className="assign-option__radio" aria-hidden="true" />
          </button>

          {usersLoading ? (
            <div className="assign-step__hint">Loading users...</div>
          ) : (
            others.map((u) => {
              const name = `${u.firstName} ${u.lastName}`.trim() || u.email;
              return (
                <button
                  key={u.id}
                  type="button"
                  className={`assign-option${assignUserId === u.id ? ' assign-option--selected' : ''}`}
                  onClick={() => setAssignUserId(u.id)}
                >
                  <span className="assign-option__avatar">{initialsOf(u)}</span>
                  <span className="assign-option__info">
                    <span className="assign-option__name">{name}</span>
                    <span className="assign-option__email">{u.email}</span>
                  </span>
                  <span className="assign-option__radio" aria-hidden="true" />
                </button>
              );
            })
          )}

          {!usersLoading && q && others.length === 0 && (
            <div className="assign-step__hint">No users match &ldquo;{userSearch}&rdquo;</div>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    // Assign step (TASK 3) is the final step for SUPERADMIN on create. Intercept it
    // before the type branches — their `else` fallbacks would otherwise re-render
    // the last data step.
    if (isAssignStep) {
      return renderAssignStep();
    }
    if (type === 'PERSONAL') {
      if (currentStep === 1) {
        return (
          <div className="form-step">
            <h3 className="form-step__title">Personal Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="firstName">First name *</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => { setFirstName(formatTitleCase(e.target.value)); clearFieldError('firstName'); }} className={`form-input${fieldErrors.firstName ? ' form-input--error' : ''}`} required />
                {fieldErrors.firstName && <span className="form-field-error">{fieldErrors.firstName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="middleName">Middle name</label>
                <input id="middleName" type="text" value={middleName} onChange={(e) => setMiddleName(formatTitleCase(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last name *</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => { setLastName(formatTitleCase(e.target.value)); clearFieldError('lastName'); }} className={`form-input${fieldErrors.lastName ? ' form-input--error' : ''}`} required />
                {fieldErrors.lastName && <span className="form-field-error">{fieldErrors.lastName}</span>}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(formatUsPhone(e.target.value))} className="form-input" />
            </div>
          </div>
        );
      } else {
        return (
          <div className="form-step">
            <h3 className="form-step__title">Address</h3>
            <div className="form-group">
              <label htmlFor="addressLine1">Address line 1</label>
              <input id="addressLine1" type="text" value={addressLine1} onChange={(e) => setAddressLine1(formatTitleCase(e.target.value))} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="addressLine2">Address line 2</label>
              <input id="addressLine2" type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input id="city" type="text" value={city} onChange={(e) => setCity(formatTitleCase(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="state">State</label>
                <input id="state" type="text" value={state} onChange={(e) => setState(formatState(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="zipCode">ZIP code</label>
                <input id="zipCode" type="text" value={zipCode} onChange={(e) => setZipCode(formatZipCode(e.target.value))} className="form-input" maxLength={10} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" rows={3} />
            </div>
            {mode === 'edit' && (
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status" className="form-input" value={status} onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
          </div>
        );
      }
    } else {
      // BUSINESS
      if (currentStep === 1) {
        return (
          <div className="form-step">
            <h3 className="form-step__title">Business Information</h3>
            <div className="form-group">
              <label htmlFor="businessName">Business name *</label>
              <input id="businessName" type="text" value={businessName} onChange={(e) => { setBusinessName(formatTitleCase(e.target.value)); clearFieldError('businessName'); }} className={`form-input${fieldErrors.businessName ? ' form-input--error' : ''}`} required />
              {fieldErrors.businessName && <span className="form-field-error">{fieldErrors.businessName}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="businessLegalName">Legal name</label>
              <input id="businessLegalName" type="text" value={businessLegalName} onChange={(e) => setBusinessLegalName(formatTitleCase(e.target.value))} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="licenseNumber">License number</label>
                <input id="licenseNumber" type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="industry">Industry</label>
                <input id="industry" type="text" value={industry} onChange={(e) => setIndustry(formatTitleCase(e.target.value))} className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="website">Website</label>
              <input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="businessEmail">Business email</label>
                <input id="businessEmail" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="businessPhone">Business phone</label>
                <input id="businessPhone" type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(formatUsPhone(e.target.value))} className="form-input" />
              </div>
            </div>
          </div>
        );
      } else if (currentStep === 2) {
        return (
          <div className="form-step">
            <h3 className="form-step__title">Business Address</h3>
            <div className="form-group">
              <label htmlFor="businessAddressLine1">Address line 1</label>
              <input id="businessAddressLine1" type="text" value={businessAddressLine1} onChange={(e) => setBusinessAddressLine1(formatTitleCase(e.target.value))} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="businessAddressLine2">Address line 2</label>
              <input id="businessAddressLine2" type="text" value={businessAddressLine2} onChange={(e) => setBusinessAddressLine2(e.target.value)} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="businessCity">City</label>
                <input id="businessCity" type="text" value={businessCity} onChange={(e) => setBusinessCity(formatTitleCase(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="businessState">State</label>
                <input id="businessState" type="text" value={businessState} onChange={(e) => setBusinessState(formatState(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="businessZipCode">ZIP code</label>
                <input id="businessZipCode" type="text" value={businessZipCode} onChange={(e) => setBusinessZipCode(formatZipCode(e.target.value))} className="form-input" maxLength={10} />
              </div>
            </div>
          </div>
        );
      } else if (currentStep === 3) {
        return (
          <div className="form-step">
            <h3 className="form-step__title">Primary Contact</h3>
            <div className="form-group">
              <label htmlFor="primaryContactName">Contact name</label>
              <input id="primaryContactName" type="text" value={primaryContactName} onChange={(e) => setPrimaryContactName(formatTitleCase(e.target.value))} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="primaryContactEmail">Contact email</label>
                <input id="primaryContactEmail" type="email" value={primaryContactEmail} onChange={(e) => setPrimaryContactEmail(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="primaryContactPhone">Contact phone</label>
                <input id="primaryContactPhone" type="tel" value={primaryContactPhone} onChange={(e) => setPrimaryContactPhone(formatUsPhone(e.target.value))} className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="primaryContactTitle">Title</label>
              <input id="primaryContactTitle" type="text" value={primaryContactTitle} onChange={(e) => setPrimaryContactTitle(e.target.value)} className="form-input" />
            </div>
          </div>
        );
      } else {
        return (
          <div className="form-step">
            <h3 className="form-step__title">Contact Address (Optional)</h3>
            <div className="form-group">
              <label htmlFor="primaryContactAddressLine1">Address line 1</label>
              <input id="primaryContactAddressLine1" type="text" value={primaryContactAddressLine1} onChange={(e) => setPrimaryContactAddressLine1(formatTitleCase(e.target.value))} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="primaryContactCity">City</label>
                <input id="primaryContactCity" type="text" value={primaryContactCity} onChange={(e) => setPrimaryContactCity(formatTitleCase(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="primaryContactState">State</label>
                <input id="primaryContactState" type="text" value={primaryContactState} onChange={(e) => setPrimaryContactState(formatState(e.target.value))} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="primaryContactZipCode">ZIP code</label>
                <input id="primaryContactZipCode" type="text" value={primaryContactZipCode} onChange={(e) => setPrimaryContactZipCode(formatZipCode(e.target.value))} className="form-input" maxLength={10} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" rows={3} />
            </div>
            {mode === 'edit' && (
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status" className="form-input" value={status} onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={guardedClose}>
      <div className="modal-content modal-content--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'New' : 'Edit'} {type === 'PERSONAL' ? 'Personal' : 'Business'} Client</h2>
          <button type="button" className="modal-close" onClick={guardedClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body" onChange={markTouched}>
          <div className="step-indicator">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`step-indicator__dot ${i + 1 <= currentStep ? 'step-indicator__dot--active' : ''}`}
              />
            ))}
          </div>

          {error && (
            <div className="form-error">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {renderStepContent()}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={
              currentStep === 1
                ? // O1: on step 1 of a create, Back returns to the type selector
                  // (data preserved — the drawer stays mounted); no discard guard.
                  mode === 'create' && onBack
                  ? onBack
                  : guardedClose
                : handleBack
            }
          >
            {currentStep === 1 && !(mode === 'create' && onBack) ? 'Cancel' : 'Back'}
          </button>
          {currentStep < totalSteps ? (
            <button type="button" className="btn-primary" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : mode === 'create' ? 'Create client' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
