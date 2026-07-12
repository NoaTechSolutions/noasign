'use client';

import { useState } from 'react';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { WizardToggleRow } from './wizard/shell/WizardToggleRow';
import { CurrencyInput } from './CurrencyInput';

interface InvoiceEditPopupProps {
  // Which invoice section is being edited — the popup is SCOPED to it (mirrors
  // the contract GroupEditPopup, which edits one card/section at a time). The
  // pencil that opens it lives on the active tab, so only that tab's fields show.
  section: { key: string; label: string };
  // Stored invoice data (DocumentData.dataJson).
  dataJson: Record<string, unknown>;
  // PATCHes the SAME invoice with ONLY the edited section's fields (the backend
  // merges over the stored data, recomputes the money fields and preserves the
  // number + issue date). Resolves once saved — the parent closes + reloads.
  onSave: (data: Record<string, string>) => Promise<void>;
  onClose: () => void;
}

const str = (v: unknown): string => (v == null ? '' : String(v));

// Invoice-specific edit popup — the in-place counterpart to ReceiptEditPopup, and
// SCOPED to a single section like the contract GroupEditPopup. Editing "Billed to"
// shows only billed_to fields, "Service" only service fields, "Pricing" only
// pricing. The backend merges the partial payload, so untouched sections are
// preserved; it also recomputes total/subtotal/gran_total and keeps the number +
// issue date. A "business" invoice bills a company; otherwise a person.
export function InvoiceEditPopup({
  section,
  dataJson,
  onSave,
  onClose,
}: InvoiceEditPopupProps) {
  // A stored company_name means the invoice was created as a business.
  const [business, setBusiness] = useState(
    Boolean(str(dataJson.company_name).trim()),
  );
  const [companyName, setCompanyName] = useState(str(dataJson.company_name));
  const [firstName, setFirstName] = useState(str(dataJson.first_name));
  const [middleName, setMiddleName] = useState(str(dataJson.middle_name));
  const [lastName, setLastName] = useState(str(dataJson.last_name));
  const [email, setEmail] = useState(str(dataJson.recipient_email));
  const [street, setStreet] = useState(str(dataJson.street));
  const [city, setCity] = useState(str(dataJson.city));
  const [state, setState] = useState(str(dataJson.state));
  const [zip, setZip] = useState(str(dataJson.zip));
  const [serviceType, setServiceType] = useState(str(dataJson.service_type));
  const [eventDate, setEventDate] = useState(str(dataJson.event_date));
  const [eventName, setEventName] = useState(str(dataJson.event_name));
  const [eventLocation, setEventLocation] = useState(str(dataJson.event_location));
  const [quantity, setQuantity] = useState(str(dataJson.quantity));
  const [price, setPrice] = useState(str(dataJson.price));

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const touch =
    (setter: (v: string) => void) =>
    (v: string): void => {
      setter(v);
      setDirty(true);
    };

  const toggleBusiness = (on: boolean): void => {
    setBusiness(on);
    setDirty(true);
  };

  // Build the payload for the ACTIVE section only (partial PATCH). Returns null
  // and sets an error when the section's required fields are missing.
  const buildData = (): Record<string, string> | null => {
    if (section.key === 'service') {
      if (!serviceType.trim()) {
        setError('Service is required');
        return null;
      }
      return {
        service_type: serviceType.trim(),
        event_date: eventDate.trim(),
        event_name: eventName.trim(),
        event_location: eventLocation.trim(),
      };
    }
    if (section.key === 'pricing') {
      const qty = Number(quantity);
      if (!qty || qty < 1) {
        setError('Quantity must be at least 1');
        return null;
      }
      const amt = Number(price);
      if (!amt || amt <= 0) {
        setError('Price must be greater than 0');
        return null;
      }
      // Totals are recomputed server-side from quantity × price.
      return { quantity: String(qty), price: price.trim() };
    }
    // billed_to (default)
    const recipient = business
      ? companyName.trim()
      : [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(' ');
    if (!recipient) {
      setError(
        business ? 'Company name is required' : 'First and last name are required',
      );
      return null;
    }
    // Clear the unused name fields so switching business <-> individual overrides
    // the stored ones (the backend merges).
    return {
      company_name: business ? companyName.trim() : '',
      first_name: business ? '' : firstName.trim(),
      middle_name: business ? '' : middleName.trim(),
      last_name: business ? '' : lastName.trim(),
      recipient_email: email.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
    };
  };

  const handleSave = (): void => {
    const data = buildData();
    if (!data) return;
    setError(null);
    setSaving(true);
    void onSave(data).catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not save the invoice');
      setSaving(false);
    });
  };

  return (
    <GroupEditPopup
      title={`Edit ${section.label.toLowerCase()}`}
      isOpen
      onClose={onClose}
      onSave={handleSave}
      isDirty={dirty}
      isSaving={saving}
    >
      {error ? (
        <div
          style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {section.key === 'service' ? (
        <>
          <div className="form-field">
            <label className="form-label">Service</label>
            <input
              className="form-input"
              value={serviceType}
              onChange={(e) => touch(setServiceType)(e.target.value)}
              placeholder="e.g. Acoustic Performance"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Event date</label>
            <input
              className="form-input"
              value={eventDate}
              onChange={(e) => touch(setEventDate)(e.target.value)}
              placeholder="MM/DD/YYYY"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Event name</label>
            <input
              className="form-input"
              value={eventName}
              onChange={(e) => touch(setEventName)(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label className="form-label">Event location</label>
            <input
              className="form-input"
              value={eventLocation}
              onChange={(e) => touch(setEventLocation)(e.target.value)}
              placeholder="e.g. Miami, FL"
            />
          </div>
        </>
      ) : section.key === 'pricing' ? (
        <div className="receipt-detail-grid receipt-detail-grid--2">
          <div className="form-field">
            <label className="form-label">Quantity</label>
            <input
              className="form-input"
              inputMode="numeric"
              value={quantity}
              onChange={(e) =>
                touch(setQuantity)(e.target.value.replace(/[^0-9]/g, ''))
              }
            />
          </div>
          <div className="form-field">
            <label className="form-label">Price</label>
            <div className="gep-input-currency">
              <span className="gep-input-prefix">$</span>
              <CurrencyInput
                value={price}
                onChange={touch(setPrice)}
                className="form-input"
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          <WizardToggleRow
            label="Business customer"
            checked={business}
            onChange={toggleBusiness}
          />

          {business ? (
            <div className="form-field">
              <label className="form-label">Company name</label>
              <input
                className="form-input"
                value={companyName}
                onChange={(e) => touch(setCompanyName)(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="form-field">
                <label className="form-label">First name</label>
                <input
                  className="form-input"
                  value={firstName}
                  onChange={(e) => touch(setFirstName)(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Middle name</label>
                <input
                  className="form-input"
                  value={middleName}
                  onChange={(e) => touch(setMiddleName)(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Last name</label>
                <input
                  className="form-input"
                  value={lastName}
                  onChange={(e) => touch(setLastName)(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="form-field">
            <label className="form-label">Recipient email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => touch(setEmail)(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Street address</label>
            <input
              className="form-input"
              value={street}
              onChange={(e) => touch(setStreet)(e.target.value)}
            />
          </div>

          <div className="receipt-detail-grid receipt-detail-grid--2">
            <div className="form-field">
              <label className="form-label">City</label>
              <input
                className="form-input"
                value={city}
                onChange={(e) => touch(setCity)(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">State</label>
              <input
                className="form-input"
                maxLength={2}
                value={state}
                onChange={(e) => touch(setState)(e.target.value.toUpperCase())}
                placeholder="FL"
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">Zip code</label>
            <input
              className="form-input"
              value={zip}
              onChange={(e) => touch(setZip)(e.target.value)}
            />
          </div>
        </>
      )}
    </GroupEditPopup>
  );
}
