'use client';

import { useState } from 'react';
import { GroupEditPopup } from '@/components/dashboard/shared/GroupEditPopup';
import { CurrencyInput } from './CurrencyInput';

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
  const [client, setClient] = useState(str(dataJson.client));
  const [email, setEmail] = useState(str(dataJson.email));
  const [phone, setPhone] = useState(str(dataJson.phone));
  const [amount, setAmount] = useState(str(dataJson.amount));
  const [date, setDate] = useState(str(dataJson.date));
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
    if (!client.trim()) {
      setError('Client is required');
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
      client: client.trim(),
      amount: amt,
      date: date.trim(),
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

      <div className="form-field">
        <label className="form-label">Client</label>
        <input
          className="form-input"
          value={client}
          onChange={(e) => touch(setClient)(e.target.value)}
        />
      </div>

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
          onChange={(e) => touch(setPhone)(e.target.value)}
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
        <input
          className="form-input"
          value={date}
          onChange={(e) => touch(setDate)(e.target.value)}
          placeholder="MM/DD/YYYY"
        />
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
          onChange={(e) => touch(setReceivedBy)(e.target.value)}
        />
      </div>
    </GroupEditPopup>
  );
}
