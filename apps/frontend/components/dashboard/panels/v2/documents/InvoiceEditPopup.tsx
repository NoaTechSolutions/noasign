'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { IssueDateDisclaimerModal } from '@/components/dashboard/shared/IssueDateDisclaimerModal';
import { detectBrowserTimeZone, tenantCurrentYear } from '@/lib/tenant-date';
import { WizardToggleRow } from './wizard/shell/WizardToggleRow';
import { CurrencyInput } from './CurrencyInput';
import { applyDigitsOnly, applyTransform, todayIso } from './wizard/types';
import { forceTwoDecimals, withThousandsSeparator } from './currency';
import { fromIsoDate, toIsoDate, US_DATE_RE } from './document-date';

interface InvoiceEditPopupProps {
  // Which invoice section is being edited — the popup is SCOPED to it (mirrors
  // the contract GroupEditPopup, which edits one card/section at a time). The
  // pencil that opens it lives on the active tab, so only that tab's fields show.
  section: { key: string; label: string };
  // Stored invoice data (DocumentData.dataJson).
  dataJson: Record<string, unknown>;
  // PATCHes the SAME invoice with ONLY the edited section's fields (the backend
  // merges over the stored data, recomputes the money fields, and — when the
  // Billed to edit carries a new issueDate — re-resolves the schedule). Resolves
  // once saved — the parent closes + reloads.
  onSave: (
    data: Record<string, string>,
    notifyOnIssueDate?: boolean,
  ) => Promise<void>;
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
  // event_date held in ISO for the date picker; the stored format is preserved
  // on save (see toIsoDate/fromIsoDate).
  const eventDateWasUs = US_DATE_RE.test(str(dataJson.event_date).trim());
  const [eventDate, setEventDate] = useState(toIsoDate(str(dataJson.event_date)));
  const [eventName, setEventName] = useState(str(dataJson.event_name));
  const [eventLocation, setEventLocation] = useState(str(dataJson.event_location));
  const [quantity, setQuantity] = useState(str(dataJson.quantity));
  const [price, setPrice] = useState(str(dataJson.price));

  // Issue date (Billed to only) — mirrors the wizard's "Different day" toggle +
  // date field. Different day is ON when the stored issue date isn't today.
  const storedIssue = str(dataJson.issueDate).trim();
  const [differentDay, setDifferentDay] = useState(
    Boolean(storedIssue) && storedIssue !== todayIso(),
  );
  const [issueDate, setIssueDate] = useState(storedIssue || todayIso());
  // Queued payload while the issue-date disclaimer is open (null = closed).
  const [pending, setPending] = useState<Record<string, string> | null>(null);
  // Floor for the date picker: Jan 1 of the tenant's current year (backend
  // re-enforces the past-year rule authoritatively).
  const yearStart = `${tenantCurrentYear(detectBrowserTimeZone())}-01-01`;

  // Live total = unit price × quantity (derived, read-only). Editing either the
  // unit price or the quantity recomputes it; the unit price is never cleared.
  // Mirrors the server-side total (buildInvoiceDataJson) so the preview matches
  // what gets saved.
  const pricingTotal = withThousandsSeparator(
    forceTwoDecimals(String((Number(quantity) || 0) * (Number(price) || 0))),
  );

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

  const toggleDifferentDay = (on: boolean): void => {
    setDifferentDay(on);
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
        event_date: fromIsoDate(eventDate, eventDateWasUs),
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
    // the stored ones (the backend merges). issueDate drives the schedule: the
    // chosen date when "Different day" is on, else today (which un-defers).
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
      issueDate: differentDay ? issueDate : todayIso(),
    };
  };

  const commit = (data: Record<string, string>, notify: boolean): void => {
    setSaving(true);
    void onSave(data, notify).catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not save the invoice');
      setSaving(false);
    });
  };

  const handleSave = (): void => {
    const data = buildData();
    if (!data) return;
    setError(null);
    // Billed to can move the issue date → require the disclaimer whenever the
    // effective date isn't today (past = backdate, future = schedule). The notify
    // opt-in inside the disclaimer only applies to a future date.
    if (
      section.key === 'billed_to' &&
      data.issueDate &&
      data.issueDate !== todayIso()
    ) {
      setPending(data);
      return;
    }
    commit(data, false);
  };

  return (
    <>
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
              onChange={(e) =>
                touch(setServiceType)(applyTransform(e.target.value, 'titleCase'))
              }
              placeholder="e.g. Acoustic Performance"
            />
          </div>
          <div className="form-field">
            <label className="form-label">Event date</label>
            <div className="gep-date-wrapper">
              <input
                className="form-input gep-input-date"
                type="date"
                value={eventDate}
                onChange={(e) => touch(setEventDate)(e.target.value)}
              />
              <Calendar className="gep-date-icon" size={15} aria-hidden="true" />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">Event name</label>
            <input
              className="form-input"
              value={eventName}
              onChange={(e) =>
                touch(setEventName)(applyTransform(e.target.value, 'titleCase'))
              }
            />
          </div>
          <div className="form-field">
            <label className="form-label">Event location</label>
            <input
              className="form-input"
              value={eventLocation}
              onChange={(e) =>
                touch(setEventLocation)(
                  applyTransform(e.target.value, 'capitalizeFirst'),
                )
              }
              placeholder="e.g. Miami, FL"
            />
          </div>
        </>
      ) : section.key === 'pricing' ? (
        <>
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
              <label className="form-label">Unit price</label>
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
          {/* Derived total — recomputed live, never editable directly. */}
          <div className="form-field">
            <label className="form-label">Total</label>
            <div className="gep-input-currency">
              <span className="gep-input-prefix">$</span>
              <input
                className="form-input"
                value={pricingTotal}
                readOnly
                disabled
                tabIndex={-1}
                aria-label="Total (quantity times unit price)"
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="gep-toggle-row">
            <WizardToggleRow
              label="Business customer"
              checked={business}
              onChange={toggleBusiness}
            />
            <WizardToggleRow
              label="Different day"
              checked={differentDay}
              onChange={toggleDifferentDay}
            />
          </div>
          {differentDay ? (
            <div className="form-field">
              <label className="form-label">Issue date</label>
              <div className="gep-date-wrapper">
                <input
                  className="form-input gep-input-date"
                  type="date"
                  value={issueDate}
                  min={yearStart}
                  onChange={(e) => {
                    setIssueDate(e.target.value);
                    setDirty(true);
                  }}
                />
                <Calendar className="gep-date-icon" size={15} aria-hidden="true" />
              </div>
            </div>
          ) : null}

          {business ? (
            <div className="form-field">
              <label className="form-label">Company name</label>
              <input
                className="form-input"
                value={companyName}
                onChange={(e) =>
                  touch(setCompanyName)(applyTransform(e.target.value, 'titleCase'))
                }
              />
            </div>
          ) : (
            <>
              <div className="form-field">
                <label className="form-label">First name</label>
                <input
                  className="form-input"
                  value={firstName}
                  onChange={(e) =>
                    touch(setFirstName)(applyTransform(e.target.value, 'titleCase'))
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label">Middle name</label>
                <input
                  className="form-input"
                  value={middleName}
                  onChange={(e) =>
                    touch(setMiddleName)(applyTransform(e.target.value, 'titleCase'))
                  }
                />
              </div>
              <div className="form-field">
                <label className="form-label">Last name</label>
                <input
                  className="form-input"
                  value={lastName}
                  onChange={(e) =>
                    touch(setLastName)(applyTransform(e.target.value, 'titleCase'))
                  }
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
              onChange={(e) =>
                touch(setStreet)(applyTransform(e.target.value, 'titleCase'))
              }
            />
          </div>

          <div className="receipt-detail-grid receipt-detail-grid--2">
            <div className="form-field">
              <label className="form-label">City</label>
              <input
                className="form-input"
                value={city}
                onChange={(e) =>
                  touch(setCity)(applyTransform(e.target.value, 'titleCase'))
                }
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
              inputMode="numeric"
              value={zip}
              onChange={(e) => touch(setZip)(applyDigitsOnly(e.target.value))}
            />
          </div>
        </>
      )}
    </GroupEditPopup>

    {pending ? (
      <IssueDateDisclaimerModal
        showNotifyOptIn={pending.issueDate > todayIso()}
        onCancel={() => setPending(null)}
        onConfirm={(notify) => {
          const p = pending;
          setPending(null);
          commit(p, notify);
        }}
      />
    ) : null}
    </>
  );
}
