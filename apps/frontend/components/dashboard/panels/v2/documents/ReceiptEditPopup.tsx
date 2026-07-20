'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { WizardToggleRow } from './wizard/shell/WizardToggleRow';
import { CurrencyInput } from './CurrencyInput';
import { applyTransform } from './wizard/types';
import { fromIsoDate, toIsoDate, US_DATE_RE } from './document-date';

interface ReceiptEditPopupProps {
  // Stored receipt data (DocumentData.dataJson).
  dataJson: Record<string, unknown>;
  // PATCHes the receipt (edit) OR creates a corrected copy (reissue); resolves
  // once saved (parent closes + reloads).
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  // Popup title — defaults to the edit flow; reissue overrides it.
  title?: string;
}

const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_DEBIT_CARD', label: 'Credit / Debit card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'OTHER', label: 'Other' },
];

const str = (v: unknown): string => (v == null ? '' : String(v));

// Receipt-specific edit popup (NOT the contract's GroupEditPopup field set).
// Only the fields a receipt has; payment_current/total are preserved by the
// backend's PATCH merge (we don't send them). Reuses the GroupEditPopup shell
// (overlay + Save/Cancel + discard-changes guard) and the form-* field classes.
export function ReceiptEditPopup({
  dataJson,
  onSave,
  onClose,
  title = 'Edit receipt',
}: ReceiptEditPopupProps) {
  // Billed-to split (mirrors the create form). Prefill from the stored parts; an
  // older receipt without parts falls back to the whole `client` string in the
  // First name field (person by default) — the user adjusts if needed.
  const storedBusiness = str(dataJson.business) === 'true';
  const storedCompany = str(dataJson.company_name);
  const storedFirst = str(dataJson.first_name);
  const storedMiddle = str(dataJson.middle_name);
  const storedLast = str(dataJson.last_name);
  const hasParts = Boolean(
    storedCompany || storedFirst || storedMiddle || storedLast,
  );
  const [business, setBusiness] = useState(hasParts ? storedBusiness : false);
  const [companyName, setCompanyName] = useState(storedCompany);
  const [firstName, setFirstName] = useState(
    hasParts ? storedFirst : str(dataJson.client),
  );
  const [middleName, setMiddleName] = useState(storedMiddle);
  const [lastName, setLastName] = useState(storedLast);
  const composedClient = business
    ? companyName.trim()
    : [firstName, middleName, lastName]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');

  const [email, setEmail] = useState(str(dataJson.email));
  const [phone, setPhone] = useState(str(dataJson.phone));
  const [amount, setAmount] = useState(str(dataJson.amount));
  // Date held in ISO for the picker; the stored US format is preserved on save.
  const dateWasUs = US_DATE_RE.test(str(dataJson.date).trim());
  const [date, setDate] = useState(toIsoDate(str(dataJson.date)));
  const [method, setMethod] = useState(str(dataJson.payment_method));
  const [paymentFor, setPaymentFor] = useState(str(dataJson.payment_for));
  const [receivedBy, setReceivedBy] = useState(str(dataJson.received_by));

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const touch =
    (setter: (v: string) => void) =>
    (v: string): void => {
      setter(v);
      setDirty(true);
    };

  const handleSave = (): void => {
    if (!composedClient) {
      setError(business ? 'Company name is required' : 'Client name is required');
      return;
    }
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    if (!date.trim()) {
      setError('Date is required');
      return;
    }
    if (!paymentFor.trim()) {
      setError('Payment for is required');
      return;
    }
    setError(null);
    setSaving(true);
    const payload: Record<string, unknown> = {
      // Send the split; the backend recomposes `client` + stores the parts.
      business,
      company_name: business ? companyName.trim() : '',
      first_name: business ? '' : firstName.trim(),
      middle_name: business ? '' : middleName.trim(),
      last_name: business ? '' : lastName.trim(),
      amount: amt,
      date: fromIsoDate(date, dateWasUs),
      payment_method: method,
      payment_for: paymentFor.trim(),
      received_by: receivedBy.trim(),
      phone: phone.trim(),
    };
    if (email.trim()) payload.recipientEmail = email.trim();
    void onSave(payload).catch((e) => {
      setError(e instanceof Error ? e.message : 'Could not save the receipt');
      setSaving(false);
    });
  };

  return (
    <GroupEditPopup
      title={title}
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

      <WizardToggleRow
        label="Business customer"
        checked={business}
        onChange={(on) => {
          setBusiness(on);
          setDirty(true);
        }}
      />

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
          <div className="receipt-detail-grid receipt-detail-grid--2">
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
              <label className="form-label">Last name</label>
              <input
                className="form-input"
                value={lastName}
                onChange={(e) =>
                  touch(setLastName)(applyTransform(e.target.value, 'titleCase'))
                }
              />
            </div>
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
        </>
      )}

      <div className="form-field">
        <label className="form-label">Email</label>
        <input
          className="form-input"
          type="email"
          value={email}
          onChange={(e) => touch(setEmail)(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Phone</label>
        <input
          className="form-input"
          value={phone}
          onChange={(e) => touch(setPhone)(applyTransform(e.target.value, 'phone'))}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Amount</label>
        <div className="gep-input-currency">
          <span className="gep-input-prefix">$</span>
          <CurrencyInput
            value={amount}
            onChange={touch(setAmount)}
            className="form-input"
          />
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Date</label>
        <div className="gep-date-wrapper">
          <input
            className="form-input gep-input-date"
            type="date"
            value={date}
            onChange={(e) => touch(setDate)(e.target.value)}
          />
          <Calendar className="gep-date-icon" size={15} aria-hidden="true" />
        </div>
      </div>

      <div className="form-field">
        <label className="form-label">Payment method</label>
        <select
          className="form-input"
          value={method}
          onChange={(e) => touch(setMethod)(e.target.value)}
        >
          <option value="">Select…</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label className="form-label">Payment for</label>
        <input
          className="form-input"
          value={paymentFor}
          onChange={(e) => touch(setPaymentFor)(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label className="form-label">Received by</label>
        <input
          className="form-input"
          value={receivedBy}
          onChange={(e) =>
            touch(setReceivedBy)(applyTransform(e.target.value, 'titleCase'))
          }
        />
      </div>
    </GroupEditPopup>
  );
}
