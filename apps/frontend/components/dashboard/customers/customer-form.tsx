"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import type {
  Customer,
  CustomerFormValues,
} from "@/app/dashboard/customers/types";

type Props = {
  initialData?: Customer | null;
  onSubmit: (values: CustomerFormValues) => Promise<void>;
  submitLabel: string;
  onCancel?: () => void;
};

const EMPTY_FORM: CustomerFormValues = {
  fullName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  notes: "",
};

function toFormValues(customer: Customer | null | undefined): CustomerFormValues {
  if (!customer) return EMPTY_FORM;
  return {
    fullName: customer.fullName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    addressLine1: customer.addressLine1 ?? "",
    addressLine2: customer.addressLine2 ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    zipCode: customer.zipCode ?? "",
    country: customer.country ?? "",
    notes: customer.notes ?? "",
  };
}

export function CustomerForm({ initialData, onSubmit, submitLabel, onCancel }: Props) {
  const [values, setValues] = useState<CustomerFormValues>(() => toFormValues(initialData));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof CustomerFormValues, string>>>({});

  function update<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function validate(): boolean {
    const next: Partial<Record<keyof CustomerFormValues, string>> = {};
    if (!values.fullName.trim()) {
      next.fullName = "Full name is required";
    } else if (values.fullName.trim().length > 200) {
      next.fullName = "Max 200 characters";
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      next.email = "Invalid email";
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save customer");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-slate-900/90 dark:shadow-[0_18px_40px_rgba(2,6,23,0.35)] md:p-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name *" error={fieldErrors.fullName}>
          <Input
            type="text"
            value={values.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            maxLength={200}
            required
            hasError={Boolean(fieldErrors.fullName)}
            autoComplete="name"
          />
        </Field>
        <Field label="Email" error={fieldErrors.email}>
          <Input
            type="email"
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            maxLength={254}
            hasError={Boolean(fieldErrors.email)}
            autoComplete="email"
          />
        </Field>
        <Field label="Phone">
          <Input
            type="tel"
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            maxLength={40}
            hasError={false}
            autoComplete="tel"
          />
        </Field>
        <Field label="Country">
          <Input
            type="text"
            value={values.country}
            onChange={(e) => update("country", e.target.value)}
            maxLength={100}
            hasError={false}
            autoComplete="country"
          />
        </Field>
        <Field label="Address line 1">
          <Input
            type="text"
            value={values.addressLine1}
            onChange={(e) => update("addressLine1", e.target.value)}
            maxLength={200}
            hasError={false}
            autoComplete="address-line1"
          />
        </Field>
        <Field label="Address line 2">
          <Input
            type="text"
            value={values.addressLine2}
            onChange={(e) => update("addressLine2", e.target.value)}
            maxLength={200}
            hasError={false}
            autoComplete="address-line2"
          />
        </Field>
        <Field label="City">
          <Input
            type="text"
            value={values.city}
            onChange={(e) => update("city", e.target.value)}
            maxLength={100}
            hasError={false}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="State / Province">
          <Input
            type="text"
            value={values.state}
            onChange={(e) => update("state", e.target.value)}
            maxLength={100}
            hasError={false}
            autoComplete="address-level1"
          />
        </Field>
        <Field label="ZIP / Postal code">
          <Input
            type="text"
            value={values.zipCode}
            onChange={(e) => update("zipCode", e.target.value)}
            maxLength={20}
            hasError={false}
            autoComplete="postal-code"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Internal notes">
          <textarea
            value={values.notes}
            onChange={(e) => update("notes", e.target.value)}
            maxLength={2000}
            rows={4}
            className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-400 dark:focus:bg-slate-900"
          />
        </Field>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-blue-600 px-6 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-rose-600 dark:text-rose-400">{error}</span>
      ) : null}
    </label>
  );
}

function Input({
  hasError,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { hasError: boolean }) {
  return (
    <input
      {...props}
      className={cn(
        "h-12 w-full rounded-2xl border bg-slate-50 px-4 text-sm text-slate-900 caret-blue-600 outline-none transition placeholder:text-slate-400 focus:bg-white dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-900",
        hasError
          ? "border-rose-400 focus:border-rose-500 dark:border-rose-500/50"
          : "border-slate-200 focus:border-blue-300 dark:border-white/10 dark:focus:border-blue-400",
        className,
      )}
    />
  );
}
