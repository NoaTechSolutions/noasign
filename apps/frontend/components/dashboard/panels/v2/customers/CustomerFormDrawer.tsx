'use client';

import React, { useState, useEffect } from 'react';
import { useBlockScroll } from '@/lib/use-block-scroll';
import type { Customer, CustomerFormData } from './types';
import { splitFullName as split, combineFullName as combine } from './types';

interface CustomerFormDrawerProps {
  mode: 'create' | 'edit';
  type: 'PERSONAL' | 'BUSINESS';
  customer: Customer | null;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onClose: () => void;
}

export function CustomerFormDrawer({ mode, type, customer, onSubmit, onClose }: CustomerFormDrawerProps) {
  useBlockScroll();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // PERSONAL form data
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [notes, setNotes] = useState('');

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
      const { firstName: fName, lastName: lName } = split(customer.fullName);
      setFirstName(fName);
      setLastName(lName);
      setEmail(customer.email || '');
      setPhone(customer.phone || '');
      setAddressLine1(customer.addressLine1 || '');
      setAddressLine2(customer.addressLine2 || '');
      setCity(customer.city || '');
      setState(customer.state || '');
      setZipCode(customer.zipCode || '');
      setNotes(customer.notes || '');

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

  const totalSteps = type === 'PERSONAL' ? 2 : 4;

  const handleNext = () => {
    setError('');

    if (type === 'PERSONAL') {
      if (currentStep === 1 && !firstName.trim()) {
        setError('First name is required');
        return;
      }
    } else {
      if (currentStep === 1 && !businessName.trim()) {
        setError('Business name is required');
        return;
      }
    }

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
    setSubmitting(true);

    try {
      const fullName = type === 'BUSINESS' ? businessName : combine(firstName, lastName);

      const payload: CustomerFormData = {
        customerType: type,
        fullName,
        email: email || undefined,
        phone: phone || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        zipCode: zipCode || undefined,
        notes: notes || undefined,
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
    } catch (err) {
      setError('Failed to save customer. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (type === 'PERSONAL') {
      if (currentStep === 1) {
        return (
          <div className="form-step">
            <h3 className="form-step__title">Personal Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="firstName">First name *</label>
                <input id="firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="form-input" required />
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" />
            </div>
          </div>
        );
      } else {
        return (
          <div className="form-step">
            <h3 className="form-step__title">Address</h3>
            <div className="form-group">
              <label htmlFor="addressLine1">Address line 1</label>
              <input id="addressLine1" type="text" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="addressLine2">Address line 2</label>
              <input id="addressLine2" type="text" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="city">City</label>
                <input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="state">State</label>
                <input id="state" type="text" value={state} onChange={(e) => setState(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="zipCode">ZIP code</label>
                <input id="zipCode" type="text" value={zipCode} onChange={(e) => setZipCode(e.target.value)} className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" rows={3} />
            </div>
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
              <input id="businessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="form-input" required />
            </div>
            <div className="form-group">
              <label htmlFor="businessLegalName">Legal name</label>
              <input id="businessLegalName" type="text" value={businessLegalName} onChange={(e) => setBusinessLegalName(e.target.value)} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="licenseNumber">License number</label>
                <input id="licenseNumber" type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="industry">Industry</label>
                <input id="industry" type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} className="form-input" />
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
                <input id="businessPhone" type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} className="form-input" />
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
              <input id="businessAddressLine1" type="text" value={businessAddressLine1} onChange={(e) => setBusinessAddressLine1(e.target.value)} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="businessAddressLine2">Address line 2</label>
              <input id="businessAddressLine2" type="text" value={businessAddressLine2} onChange={(e) => setBusinessAddressLine2(e.target.value)} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="businessCity">City</label>
                <input id="businessCity" type="text" value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="businessState">State</label>
                <input id="businessState" type="text" value={businessState} onChange={(e) => setBusinessState(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="businessZipCode">ZIP code</label>
                <input id="businessZipCode" type="text" value={businessZipCode} onChange={(e) => setBusinessZipCode(e.target.value)} className="form-input" />
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
              <input id="primaryContactName" type="text" value={primaryContactName} onChange={(e) => setPrimaryContactName(e.target.value)} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="primaryContactEmail">Contact email</label>
                <input id="primaryContactEmail" type="email" value={primaryContactEmail} onChange={(e) => setPrimaryContactEmail(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="primaryContactPhone">Contact phone</label>
                <input id="primaryContactPhone" type="tel" value={primaryContactPhone} onChange={(e) => setPrimaryContactPhone(e.target.value)} className="form-input" />
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
              <input id="primaryContactAddressLine1" type="text" value={primaryContactAddressLine1} onChange={(e) => setPrimaryContactAddressLine1(e.target.value)} className="form-input" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="primaryContactCity">City</label>
                <input id="primaryContactCity" type="text" value={primaryContactCity} onChange={(e) => setPrimaryContactCity(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="primaryContactState">State</label>
                <input id="primaryContactState" type="text" value={primaryContactState} onChange={(e) => setPrimaryContactState(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label htmlFor="primaryContactZipCode">ZIP code</label>
                <input id="primaryContactZipCode" type="text" value={primaryContactZipCode} onChange={(e) => setPrimaryContactZipCode(e.target.value)} className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="form-textarea" rows={3} />
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'New' : 'Edit'} {type === 'PERSONAL' ? 'Personal' : 'Business'} Customer</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
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
          <button type="button" className="btn-secondary" onClick={currentStep === 1 ? onClose : handleBack}>
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>
          {currentStep < totalSteps ? (
            <button type="button" className="btn-primary" onClick={handleNext}>
              Next
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : mode === 'create' ? 'Create customer' : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
