'use client';

import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  FileText,
  Pencil,
} from 'lucide-react';
import { BaseField } from './wizard/fields/BaseField';
import { isTransportError, draftMaybeSavedMessage } from './submit-error';
import { CurrencyInput } from './CurrencyInput';
import { WizardToggleRow } from './wizard/shell/WizardToggleRow';
import { applyTransform } from './wizard/types';
import { ConfirmActionModal } from '@/components/dashboard/shared/ConfirmActionModal';
import { IssueDateDisclaimerModal } from '@/components/dashboard/shared/IssueDateDisclaimerModal';
import { detectBrowserTimeZone, tenantCurrentYear } from '@/lib/tenant-date';

export interface CreateReceiptPayload {
  // Composed recipient name (kept for the PDF). The backend re-composes it from
  // the split parts below and stores the parts in dataJson.
  client: string;
  business?: boolean;
  company_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  recipientEmail?: string;
  phone?: string;
  amount: number;
  date: string;
  payment_method: PaymentMethod;
  other_label?: string;
  payment_for?: string;
  payment_current?: number;
  payment_total?: number;
  received_by?: string;
  // Free-form notes. Only printed on templates that map `notes` (moderno today).
  notes?: string;
  send: boolean;
  // Opt-in for the deferred (future-dated) "ready to finalize" email.
  notifyOnIssueDate?: boolean;
  // Superadmin flow: borrow the selected user's receipt template (the doc still
  // becomes the creator's). Omitted for normal users (their company template).
  receiptTemplateId?: string;
}

// Outcome of a create attempt — lets the form tell an honest "sent" from a
// "saved but the email failed" (FASE 1: honest send state).
export interface ReceiptCreateResult {
  status: string;
  sendError: string | null;
}

type PaymentMethod =
  | 'CASH'
  | 'CREDIT_DEBIT_CARD'
  | 'CHEQUE'
  | 'BANK_TRANSFER'
  | 'ZELLE'
  | 'OTHER';

// Visual order mirrors the printed receipt (CASH · CREDIT/DEBIT CARD · CHEQUE ·
// BANK TRANSFER · ZELLE · OTHER). Single-select: ticking one unticks the rest.
// Note: basic-v1's printed art has no Zelle checkbox — a Zelle receipt there is
// marked "Other". Text templates (moderno/basic-v2) print "Zelle" via the label map.
const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CREDIT_DEBIT_CARD', label: 'Credit/Debit Card' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'ZELLE', label: 'Zelle' },
  { value: 'OTHER', label: 'Other' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Date input gives YYYY-MM-DD; the receipt template draws it verbatim and the
// approved layout uses MM/DD/YYYY.
function toUsDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface ReceiptFormProps {
  defaultReceivedBy: string;
  // Pre-fill from the client picked in the setup card (shared with contracts).
  prefillClient?: string;
  prefillEmail?: string;
  // Whether the picked customer is a business (drives the initial toggle state).
  prefillBusiness?: boolean;
  // Only the WorldPavers custom template draws the "N of M" field — gate the
  // "part of multiple payments" toggle on it. Global templates hide it.
  supportsMultiPayment?: boolean;
  // Superadmin flow: the selected user's receipt template to borrow (threaded
  // into the create payload). Undefined for the normal company-template path.
  receiptTemplateId?: string;
  // Model C — receipt quota for this tenant (remaining=null when unlimited).
  // Drives the quota/overage hint above the actions. Optional: omit to hide.
  receiptQuota?: {
    remaining: number | null;
    unlimited: boolean;
    overagePrice: number;
  };
  onCreate: (payload: CreateReceiptPayload) => Promise<ReceiptCreateResult>;
  // Closes the host modal (Cancel + after a successful create / on send).
  onClose: () => void;
  // C3: report draft-submit "busy" so the host modal shows its blocking saving
  // card. The send path stays optimistic (closes immediately + progress toast).
  onBusyChange?: (busy: boolean) => void;
}

// Embeddable receipt form — rendered inside DocumentCreationModal below the
// setup card when the selected document type is DIRECT_PDF. No modal shell of
// its own; the host provides it.
export function ReceiptForm({
  defaultReceivedBy,
  prefillClient,
  prefillEmail,
  prefillBusiness,
  receiptTemplateId,
  supportsMultiPayment = false,
  receiptQuota,
  onCreate,
  onClose,
  onBusyChange,
}: ReceiptFormProps) {
  // Billed-to split (mirrors the invoice): Business → company name, else
  // first/middle/last. The composed name feeds validation + the payload.
  const [business, setBusiness] = useState(Boolean(prefillBusiness));
  const [companyName, setCompanyName] = useState(
    prefillBusiness ? (prefillClient ?? '') : '',
  );
  const [firstName, setFirstName] = useState(
    !prefillBusiness ? (prefillClient ?? '') : '',
  );
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const composedClient = business
    ? companyName.trim()
    : [firstName, middleName, lastName]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');
  const [email, setEmail] = useState(prefillEmail ?? '');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  // "Different day" mirrors the invoice: off = issued today (field hidden), on =
  // pick an issue date. The effective date is what validation/submit use.
  const [differentDay, setDifferentDay] = useState(false);
  const effectiveDate = differentDay ? date : todayIso();
  const [paymentFor, setPaymentFor] = useState('');
  // Pending send flag while the issue-date disclaimer is open (null = closed).
  const [disclaimerSend, setDisclaimerSend] = useState<boolean | null>(null);
  // Issue-date floor: Jan 1 of the tenant's current year. Browser zone as a hint;
  // the backend enforces with the authoritative tenant timezone.
  const yearStart = `${tenantCurrentYear(detectBrowserTimeZone())}-01-01`;

  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [otherLabel, setOtherLabel] = useState('');

  const [multiPayment, setMultiPayment] = useState(false);
  const [paymentCurrent, setPaymentCurrent] = useState('1');
  const [paymentTotal, setPaymentTotal] = useState('1');

  const [receivedBy, setReceivedBy] = useState(defaultReceivedBy);
  const [editingReceivedBy, setEditingReceivedBy] = useState(false);
  const [notes, setNotes] = useState('');

  const [error, setError] = useState<string | null>(null);
  // Sending emails the receipt to the client — confirm first (irreversible).
  const [confirmSend, setConfirmSend] = useState(false);

  // Re-fill client/email when a different client is selected in the setup card.
  // Adjust-during-render (React-recommended) instead of an effect — avoids the
  // cascading re-render that setState-in-effect triggers, and re-fills only
  // these two fields (the rest of the form is preserved).
  const [seenPrefillClient, setSeenPrefillClient] = useState(prefillClient);
  if (prefillClient !== seenPrefillClient) {
    setSeenPrefillClient(prefillClient);
    if (prefillClient) {
      // A picked customer's fullName can't be split reliably — drop it into the
      // matching single field for the customer's type; the user adjusts if needed.
      const isBiz = Boolean(prefillBusiness);
      setBusiness(isBiz);
      if (isBiz) {
        setCompanyName(prefillClient);
        setFirstName('');
        setMiddleName('');
        setLastName('');
      } else {
        setFirstName(prefillClient);
        setMiddleName('');
        setLastName('');
        setCompanyName('');
      }
    }
  }
  const [seenPrefillEmail, setSeenPrefillEmail] = useState(prefillEmail);
  if (prefillEmail !== seenPrefillEmail) {
    setSeenPrefillEmail(prefillEmail);
    if (prefillEmail) setEmail(prefillEmail);
  }

  function validate(send: boolean): string | null {
    if (!composedClient) {
      return business ? 'Company name is required' : 'Client name is required';
    }
    if (!amount || Number(amount) <= 0) return 'Amount is required';
    if (differentDay && !date) return 'Date is required';
    if (effectiveDate < yearStart) {
      return 'Issue date cannot be before January 1 of the current year';
    }
    if (!method) return 'Select a payment method';
    if (method === 'OTHER' && !otherLabel.trim()) {
      return 'Describe the "Other" payment method';
    }
    if (!paymentFor.trim()) return 'Payment for is required';
    if (multiPayment) {
      const c = Number(paymentCurrent);
      const t = Number(paymentTotal);
      if (!c || !t || c < 1 || t < 1) return 'Enter valid payment numbers';
      if (c > t) return 'Payment number can’t exceed the total';
    }
    if (send && (!email.trim() || !EMAIL_RE.test(email.trim()))) {
      return 'A valid email is required to send the receipt';
    }
    return null;
  }

  function submit(send: boolean) {
    const err = validate(send);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    // Issue date ≠ today → require the disclaimer acknowledgement before creating.
    if (effectiveDate !== todayIso()) {
      setDisclaimerSend(send);
      return;
    }
    doCreate(send, false);
  }

  function doCreate(send: boolean, notifyOnIssueDate: boolean) {
    const payload: CreateReceiptPayload = {
      client: composedClient,
      business,
      company_name: business ? companyName.trim() : undefined,
      first_name: business ? undefined : firstName.trim() || undefined,
      middle_name: business ? undefined : middleName.trim() || undefined,
      last_name: business ? undefined : lastName.trim() || undefined,
      recipientEmail: email.trim() || undefined,
      phone: phone.trim() || undefined,
      amount: Number(amount),
      date: toUsDate(effectiveDate),
      payment_method: method as PaymentMethod,
      other_label: method === 'OTHER' ? otherLabel.trim() : undefined,
      payment_for: paymentFor.trim(),
      payment_current: multiPayment ? Number(paymentCurrent) : 1,
      payment_total: multiPayment ? Number(paymentTotal) : 1,
      received_by: receivedBy.trim() || undefined,
      notes: notes.trim() || undefined,
      send,
      notifyOnIssueDate,
      receiptTemplateId,
    };
    if (send) {
      // Send stays optimistic: close immediately; the parent's top-right progress
      // toast resolves the REAL SENT / SEND_FAILED result.
      onClose();
      void onCreate(payload);
      return;
    }
    // Draft (C3, saas-ux-patterns §5): block the modal with its saving card,
    // await the create, and close only on success. On failure the card lifts and
    // the form reappears (values intact) with the error — nothing is lost.
    setError(null);
    onBusyChange?.(true);
    onCreate(payload)
      .then(() => onClose())
      .catch((e) => {
        setError(
          isTransportError(e)
            ? draftMaybeSavedMessage('receipt')
            : e instanceof Error
              ? e.message
              : 'Could not save the draft',
        );
        onBusyChange?.(false);
      });
  }

  // "Create & send" validates first, then asks for confirmation (the receipt is
  // emailed to the client — irreversible). "Save draft" skips this.
  function handleSendClick() {
    const err = validate(true);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setConfirmSend(true);
  }

  return (
    <>
      {/* ── Section 1: Payment details ───────────────────────────── */}
      <section className="receipt-section">
        <h3 className="receipt-section__title">Payment details</h3>
        <div className="wizard-section__fields">
          {/* Toggles row (Business customer + Different day) — mirrors the invoice. */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.4rem 1.25rem',
            }}
          >
            <WizardToggleRow
              label="Business customer"
              checked={business}
              onChange={setBusiness}
            />
            <WizardToggleRow
              label="Different day"
              checked={differentDay}
              onChange={setDifferentDay}
            />
          </div>

          {/* Issue date — only when Different day is on (else = today). */}
          {differentDay ? (
            <BaseField label="Issue date" icon={<Calendar size={14} />} required>
              <input
                type="date"
                className="wizard-field__input"
                value={date}
                min={yearStart}
                onChange={(e) => setDate(e.target.value)}
              />
            </BaseField>
          ) : null}

          {/* Recipient name — company OR first/middle/last (billed-to split). */}
          {business ? (
            <BaseField label="Company name" icon={<User size={14} />} required>
              <input
                type="text"
                className="wizard-field__input"
                value={companyName}
                placeholder="Company name"
                onChange={(e) =>
                  setCompanyName(applyTransform(e.target.value, 'capitalizeFirst'))
                }
              />
            </BaseField>
          ) : (
            <>
              <div className="wizard-section__row wizard-section__row--2col">
                <BaseField label="First name" icon={<User size={14} />} required>
                  <input
                    type="text"
                    className="wizard-field__input"
                    value={firstName}
                    onChange={(e) =>
                      setFirstName(applyTransform(e.target.value, 'titleCase'))
                    }
                  />
                </BaseField>
                <BaseField label="Last name" required>
                  <input
                    type="text"
                    className="wizard-field__input"
                    value={lastName}
                    onChange={(e) =>
                      setLastName(applyTransform(e.target.value, 'titleCase'))
                    }
                  />
                </BaseField>
              </div>
              <BaseField label="Middle name">
                <input
                  type="text"
                  className="wizard-field__input"
                  value={middleName}
                  onChange={(e) =>
                    setMiddleName(applyTransform(e.target.value, 'titleCase'))
                  }
                />
              </BaseField>
            </>
          )}

          {/* Email + Phone — 2 columns (stack on mobile) */}
          <div className="wizard-section__row wizard-section__row--2col">
            <BaseField label="Email" icon={<Mail size={14} />}>
              <input
                type="email"
                inputMode="email"
                className="wizard-field__input"
                value={email}
                placeholder="client@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </BaseField>

            <BaseField label="Phone" icon={<Phone size={14} />}>
              <input
                type="tel"
                inputMode="tel"
                className="wizard-field__input"
                value={phone}
                placeholder="(555) 123-4567"
                onChange={(e) => setPhone(applyTransform(e.target.value, 'phone'))}
              />
            </BaseField>
          </div>

          {/* Amount — full width (the Date lives up top behind "Different day"). */}
          <BaseField label="Amount" icon={<DollarSign size={14} />} required>
            <div className="wizard-field__currency-wrapper">
              <span className="wizard-field__currency-prefix">$</span>
              <CurrencyInput
                value={amount}
                onChange={setAmount}
                className="wizard-field__currency-input"
              />
            </div>
          </BaseField>

          {/* Payment for — full width, required */}
          <BaseField label="Payment for" icon={<FileText size={14} />} required>
            <input
              type="text"
              className="wizard-field__input"
              value={paymentFor}
              placeholder="What is this payment for?"
              onChange={(e) => setPaymentFor(e.target.value)}
            />
          </BaseField>
        </div>
      </section>

      {/* ── Section 2: Payment method ────────────────────────────── */}
      <section className="receipt-section">
        <h3 className="receipt-section__title">Payment method</h3>
        <div className="receipt-methods">
          {METHODS.map((m) => (
            <label key={m.value} className="receipt-method">
              <input
                type="checkbox"
                className="wizard-toggle-row__checkbox"
                checked={method === m.value}
                onChange={() => setMethod(m.value)}
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
        {method === 'OTHER' ? (
          <div className="receipt-other">
            <BaseField label="Other method">
              <input
                type="text"
                className="wizard-field__input"
                value={otherLabel}
                placeholder="e.g. Venmo, Zelle"
                onChange={(e) => setOtherLabel(e.target.value)}
              />
            </BaseField>
          </div>
        ) : null}
      </section>

      {/* ── Section 3: Options ───────────────────────────────────── */}
      <section className="receipt-section">
        <h3 className="receipt-section__title">Options</h3>
        {/* Multi-payment ("N of M") only exists on templates that draw it — the
            WorldPavers custom template. Hidden on the global/catalog templates. */}
        {supportsMultiPayment ? (
          <>
            <WizardToggleRow
              label="Part of multiple payments / financing?"
              checked={multiPayment}
              onChange={setMultiPayment}
            />
            {multiPayment ? (
              <div className="receipt-pair-row">
                <BaseField label="Payment #">
                  <input
                    type="number"
                    min={1}
                    className="wizard-field__input"
                    value={paymentCurrent}
                    onChange={(e) => setPaymentCurrent(e.target.value)}
                  />
                </BaseField>
                <BaseField label="Of (total)">
                  <input
                    type="number"
                    min={1}
                    className="wizard-field__input"
                    value={paymentTotal}
                    onChange={(e) => setPaymentTotal(e.target.value)}
                  />
                </BaseField>
              </div>
            ) : null}
          </>
        ) : null}

        <BaseField label="Received by" icon={<User size={14} />}>
          {editingReceivedBy ? (
            <input
              type="text"
              className="wizard-field__input"
              value={receivedBy}
              autoFocus
              onChange={(e) =>
                setReceivedBy(applyTransform(e.target.value, 'titleCase'))
              }
              onBlur={() => setEditingReceivedBy(false)}
            />
          ) : (
            <div className="receipt-received-by">
              <span className="receipt-received-by__value">
                {receivedBy || '—'}
              </span>
              <button
                type="button"
                className="receipt-received-by__edit"
                onClick={() => setEditingReceivedBy(true)}
                aria-label="Edit received by"
              >
                <Pencil size={14} />
              </button>
            </div>
          )}
        </BaseField>

        <BaseField label="Notes" icon={<FileText size={14} />}>
          <textarea
            className="wizard-field__input"
            style={{ resize: 'none' }}
            value={notes}
            rows={2}
            placeholder="Optional — printed only on templates that show notes"
            onChange={(e) => setNotes(e.target.value)}
          />
        </BaseField>
      </section>

      {error ? (
        <div className="docs-v2-creation-modal__error" role="alert">
          {error}
        </div>
      ) : null}

      {/* Model C — receipt quota hint (separate from the contract limit). */}
      {receiptQuota ? (
        <p className="receipt-quota-hint">
          {receiptQuota.unlimited || receiptQuota.remaining === null
            ? 'Unlimited receipts on your plan.'
            : receiptQuota.remaining > 0
              ? `${receiptQuota.remaining} receipt${receiptQuota.remaining === 1 ? '' : 's'} left this month.`
              : `Monthly receipts used up — each new receipt is billed at $${receiptQuota.overagePrice.toFixed(2)} (overage).`}
        </p>
      ) : null}

      <footer className="receipt-modal__footer">
        <button
          type="button"
          className="wizard-btn wizard-btn--secondary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="wizard-btn wizard-btn--secondary"
          onClick={() => submit(false)}
        >
          Save draft
        </button>
        <button
          type="button"
          className="wizard-btn wizard-btn--primary"
          onClick={handleSendClick}
        >
          Create &amp; send
        </button>
      </footer>

      <ConfirmActionModal
        isOpen={confirmSend}
        title="Send receipt?"
        message={
          <>
            This will email the receipt to{' '}
            <strong>{email.trim() || 'the client'}</strong>. This action cannot be
            undone.
          </>
        }
        confirmLabel="Send receipt"
        cancelLabel="Cancel"
        variant="amber"
        onConfirm={() => {
          setConfirmSend(false);
          submit(true);
        }}
        onCancel={() => setConfirmSend(false)}
      />

      {/* Issue date ≠ today → mandatory acknowledgement before creating. Future
          date → also offers the "notify when ready to finalize" opt-in. */}
      {disclaimerSend !== null ? (
        <IssueDateDisclaimerModal
          showNotifyOptIn={effectiveDate > todayIso()}
          onCancel={() => setDisclaimerSend(null)}
          onConfirm={(notify) => {
            const send = disclaimerSend ?? false;
            setDisclaimerSend(null);
            doCreate(send, notify);
          }}
        />
      ) : null}
    </>
  );
}
