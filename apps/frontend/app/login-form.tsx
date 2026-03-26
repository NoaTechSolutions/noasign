"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckSquare,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  PackageCheck,
  Receipt,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { API_URL, apiRequest } from "../lib/api";
import { getStoredToken, getStoredUser, persistSession } from "../lib/auth-storage";

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    companyProfileId: string | null;
    email: string;
    role: string;
    status: string;
    mustChangePassword?: boolean;
  };
  message: string;
};

type AccountRequestResponse = {
  message: string;
};

type ForgotPasswordResponse = {
  message: string;
  resetLink?: string;
};

type ForgotPasswordErrors = {
  email?: string;
  form?: string;
};

type ChangePasswordErrors = {
  password?: string;
  confirmPassword?: string;
  form?: string;
};

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

type AccountRequestErrors = {
  fullName?: string;
  email?: string;
  confirmEmail?: string;
  requestedDocumentTypes?: string;
  form?: string;
};

type AccountRequestForm = {
  fullName: string;
  email: string;
  confirmEmail: string;
  requestedDocumentTypes: string[];
};

type ForgotPasswordForm = {
  email: string;
};

type ForcePasswordForm = {
  password: string;
  confirmPassword: string;
};

const requestableDocuments = [
  { value: "Contract", label: "Contract", icon: <FileText className="h-4 w-4" /> },
  { value: "Invoice", label: "Invoice", icon: <Receipt className="h-4 w-4" /> },
  { value: "Proposal", label: "Proposal", icon: <ShieldCheck className="h-4 w-4" /> },
  { value: "Quote", label: "Quote", icon: <ScrollText className="h-4 w-4" /> },
  { value: "Work Order", label: "Work order", icon: <PackageCheck className="h-4 w-4" /> },
  { value: "Others", label: "Others", icon: <FileSpreadsheet className="h-4 w-4" /> },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForcedPassword, setShowForcedPassword] = useState(true);
  const [showForcedConfirmPassword, setShowForcedConfirmPassword] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(true);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(true);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [activeView, setActiveView] = useState<
    "login" | "createAccount" | "forgotPassword" | "forcePasswordChange" | "resetPassword"
  >("login");
  const [accountRequestForm, setAccountRequestForm] = useState<AccountRequestForm>({
    fullName: "",
    email: "",
    confirmEmail: "",
    requestedDocumentTypes: [],
  });
  const [forgotPasswordForm, setForgotPasswordForm] = useState<ForgotPasswordForm>({
    email: "",
  });
  const [forgotPasswordErrors, setForgotPasswordErrors] =
    useState<ForgotPasswordErrors>({});
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState("");
  const [forgotPasswordResetLink, setForgotPasswordResetLink] = useState("");
  const [forcePasswordForm, setForcePasswordForm] = useState<ForcePasswordForm>({
    password: "",
    confirmPassword: "",
  });
  const [forcePasswordErrors, setForcePasswordErrors] =
    useState<ChangePasswordErrors>({});
  const [forcePasswordSuccess, setForcePasswordSuccess] = useState("");
  const [resetPasswordForm, setResetPasswordForm] = useState<ForcePasswordForm>({
    password: "",
    confirmPassword: "",
  });
  const [resetPasswordErrors, setResetPasswordErrors] =
    useState<ChangePasswordErrors>({});
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState("");
  const [accountRequestErrors, setAccountRequestErrors] =
    useState<AccountRequestErrors>({});
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isSubmittingForgotPassword, setIsSubmittingForgotPassword] = useState(false);
  const [isSubmittingForcePassword, setIsSubmittingForcePassword] = useState(false);
  const [isSubmittingResetPassword, setIsSubmittingResetPassword] = useState(false);
  const [accountRequestSuccess, setAccountRequestSuccess] = useState("");
  const [resetToken, setResetToken] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextResetToken =
      new URLSearchParams(window.location.search).get("resetToken")?.trim() ?? "";
    setResetToken(nextResetToken);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (token && storedUser?.mustChangePassword) {
      setEmail(storedUser.email);
      setActiveView("forcePasswordChange");
      return;
    }

    if (resetToken) {
      setActiveView("resetPassword");
      return;
    }

    if (token) {
      router.replace("/dashboard");
    }
  }, [resetToken, router]);

  const isLoginFormInvalid = useMemo(
    () => Boolean(loginErrors.email || loginErrors.password),
    [loginErrors],
  );
  const isAccountRequestInvalid = useMemo(() => {
    const emailValue = accountRequestForm.email.trim();
    const confirmEmailValue = accountRequestForm.confirmEmail.trim();

    return (
      !accountRequestForm.fullName.trim() ||
      !emailValue ||
      !confirmEmailValue ||
      !isValidEmail(emailValue) ||
      !isValidEmail(confirmEmailValue) ||
      emailValue.toLowerCase() !== confirmEmailValue.toLowerCase() ||
      accountRequestForm.requestedDocumentTypes.length === 0
    );
  }, [accountRequestForm]);
  const isForgotPasswordInvalid = useMemo(() => {
    const emailValue = forgotPasswordForm.email.trim();
    return !emailValue || !isValidEmail(emailValue);
  }, [forgotPasswordForm.email]);
  const isForcePasswordInvalid = useMemo(() => {
    if (!forcePasswordForm.password.trim() || !forcePasswordForm.confirmPassword.trim()) {
      return true;
    }

    if (forcePasswordForm.password.length < 8) {
      return true;
    }

    return forcePasswordForm.password !== forcePasswordForm.confirmPassword;
  }, [forcePasswordForm]);
  const isResetPasswordInvalid = useMemo(() => {
    if (!resetPasswordForm.password.trim() || !resetPasswordForm.confirmPassword.trim()) {
      return true;
    }

    if (resetPasswordForm.password.length < 8) {
      return true;
    }

    return resetPasswordForm.password !== resetPasswordForm.confirmPassword;
  }, [resetPasswordForm]);

  function validateLoginForm() {
    const nextErrors: LoginErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setLoginErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateForgotPasswordForm() {
    const nextErrors: ForgotPasswordErrors = {};
    const normalizedEmail = forgotPasswordForm.email.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    setForgotPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateForcePasswordForm() {
    const nextErrors: ChangePasswordErrors = {};

    if (!forcePasswordForm.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (forcePasswordForm.password.length < 8) {
      nextErrors.password = "Password must have at least 8 characters.";
    }

    if (!forcePasswordForm.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Confirm password is required.";
    } else if (forcePasswordForm.password !== forcePasswordForm.confirmPassword) {
      nextErrors.confirmPassword = "Both password fields must match.";
    }

    setForcePasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateResetPasswordForm() {
    const nextErrors: ChangePasswordErrors = {};

    if (!resetPasswordForm.password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (resetPasswordForm.password.length < 8) {
      nextErrors.password = "Password must have at least 8 characters.";
    }

    if (!resetPasswordForm.confirmPassword.trim()) {
      nextErrors.confirmPassword = "Confirm password is required.";
    } else if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      nextErrors.confirmPassword = "Both password fields must match.";
    }

    setResetPasswordErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateAccountRequestForm() {
    const nextErrors: AccountRequestErrors = {};
    const normalizedFullName = accountRequestForm.fullName.trim();
    const normalizedEmail = accountRequestForm.email.trim();
    const normalizedConfirmEmail = accountRequestForm.confirmEmail.trim();

    if (!normalizedFullName) {
      nextErrors.fullName = "Full name is required.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Email is required.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!normalizedConfirmEmail) {
      nextErrors.confirmEmail = "Confirm email is required.";
    } else if (!isValidEmail(normalizedConfirmEmail)) {
      nextErrors.confirmEmail = "Enter a valid email address.";
    } else if (
      normalizedEmail &&
      isValidEmail(normalizedEmail) &&
      normalizedEmail.toLowerCase() !== normalizedConfirmEmail.toLowerCase()
    ) {
      nextErrors.confirmEmail = "Both email fields must match.";
    }

    if (accountRequestForm.requestedDocumentTypes.length === 0) {
      nextErrors.requestedDocumentTypes =
        "Select at least one document type.";
    }

    setAccountRequestErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateLoginForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoginErrors({});

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = (await response.json()) as Partial<LoginResponse> & {
        message?: string;
      };

      if (!response.ok || !data.accessToken || !data.user) {
        const message = data.message ?? "Unable to sign in";
        setLoginErrors(mapLoginApiError(message));
        return;
      }

      persistSession(data.accessToken, data.user);

      if (data.user.mustChangePassword) {
        setForcePasswordForm({ password: "", confirmPassword: "" });
        setForcePasswordErrors({});
        setForcePasswordSuccess("");
        setEmail(data.user.email);
        setActiveView("forcePasswordChange");
        return;
      }

      startTransition(() => {
        router.push("/dashboard");
      });
    } catch (submitError) {
      setLoginErrors({
        form:
          submitError instanceof Error
            ? submitError.message
            : "Unable to sign in",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPasswordSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validateForgotPasswordForm()) {
      return;
    }

    setIsSubmittingForgotPassword(true);
    setForgotPasswordErrors({});
    setForgotPasswordSuccess("");
    setForgotPasswordResetLink("");

    try {
      const data = await apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: {
          email: forgotPasswordForm.email.trim().toLowerCase(),
        },
      });
      setForgotPasswordSuccess(data.message);
      setForgotPasswordResetLink(data.resetLink ?? "");
    } catch (submitError) {
      setForgotPasswordErrors({
        form:
          submitError instanceof Error
            ? submitError.message
            : "Unable to process forgot password request",
      });
    } finally {
      setIsSubmittingForgotPassword(false);
    }
  }

  async function handleResetPasswordSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validateResetPasswordForm()) {
      return;
    }

    if (!resetToken) {
      setResetPasswordErrors({
        form: "Reset token is missing or invalid.",
      });
      return;
    }

    setIsSubmittingResetPassword(true);
    setResetPasswordErrors({});
    setResetPasswordSuccess("");

    try {
      const data = await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: {
          token: resetToken,
          password: resetPasswordForm.password,
        },
      });

      setResetPasswordSuccess(data.message);
      setResetPasswordForm({ password: "", confirmPassword: "" });
      router.replace("/");
      setActiveView("login");
    } catch (submitError) {
      setResetPasswordErrors({
        form:
          submitError instanceof Error
            ? submitError.message
            : "Unable to reset password",
      });
    } finally {
      setIsSubmittingResetPassword(false);
    }
  }

  async function handleForcePasswordSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validateForcePasswordForm()) {
      return;
    }

    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      setForcePasswordErrors({
        form: "Your session expired. Please sign in again.",
      });
      return;
    }

    setIsSubmittingForcePassword(true);
    setForcePasswordErrors({});
    setForcePasswordSuccess("");

    try {
      await apiRequest<{ message: string }>("/auth/change-password", {
        method: "POST",
        token,
        body: {
          password: forcePasswordForm.password,
        },
      });

      persistSession(token, { ...storedUser, mustChangePassword: false });
      setForcePasswordSuccess("Password updated successfully.");

      startTransition(() => {
        router.push("/dashboard");
      });
    } catch (submitError) {
      setForcePasswordErrors({
        form:
          submitError instanceof Error
            ? submitError.message
            : "Unable to update password",
      });
    } finally {
      setIsSubmittingForcePassword(false);
    }
  }

  async function handleAccountRequestSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validateAccountRequestForm()) {
      return;
    }

    setIsSubmittingRequest(true);
    setAccountRequestErrors({});
    setAccountRequestSuccess("");

    try {
      const response = await fetch(`${API_URL}/users/account-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: accountRequestForm.fullName.trim(),
          email: accountRequestForm.email.trim().toLowerCase(),
          requestedDocumentTypes: accountRequestForm.requestedDocumentTypes,
        }),
      });

      const data = (await response.json()) as Partial<AccountRequestResponse> & {
        message?: string;
      };

      if (!response.ok) {
        setAccountRequestErrors(
          mapAccountRequestApiError(
            data.message ?? "Unable to submit account request",
          ),
        );
        return;
      }

      setAccountRequestForm({
        fullName: "",
        email: "",
        confirmEmail: "",
        requestedDocumentTypes: [],
      });
      setAccountRequestSuccess(
        "Request submitted successfully. Our team will contact you as soon as possible.",
      );
    } catch (submitError) {
      setAccountRequestErrors({
        form:
          submitError instanceof Error
            ? submitError.message
            : "Unable to submit account request",
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  }

  function toggleRequestedDocumentType(value: string) {
    setAccountRequestForm((current) => {
      const exists = current.requestedDocumentTypes.includes(value);
      return {
        ...current,
        requestedDocumentTypes: exists
          ? current.requestedDocumentTypes.filter((item) => item !== value)
          : [...current.requestedDocumentTypes, value],
      };
    });
  }

  return (
      <div className="mx-auto grid w-full max-w-md gap-6 md:max-w-[30rem] md:gap-8 xl:max-w-md">
        <div className="grid justify-items-center gap-3 text-center md:gap-4">
          <div className="inline-flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--brand-secondary)] text-base font-bold tracking-[-0.04em] text-white shadow-[var(--shadow-medium)]">
              N
            </span>
            <div>
              <div className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--brand-secondary)]">
                NTSsign
              </div>
              <div className="text-sm text-[color:var(--text-secondary)]">
                Contract workflow platform
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
        {activeView === "login" ? (
        <motion.form
          key="login-view"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid gap-5 bg-transparent p-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--border-strong)] sm:bg-[image:var(--bg-form)] sm:p-6 sm:shadow-[var(--shadow-medium)] md:p-7 lg:p-8"
          onSubmit={handleSubmit}
          noValidate
        >
          <FieldLabel label="Email">
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="owner@company.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setLoginErrors((current) => ({ ...current, email: undefined, form: undefined }));
              }}
              className={inputClass(Boolean(loginErrors.email))}
            />
            {loginErrors.email ? (
              <InputError text={loginErrors.email} />
            ) : null}
          </FieldLabel>

          <FieldLabel label="Password">
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLoginErrors((current) => ({
                    ...current,
                    password: undefined,
                    form: undefined,
                  }));
                }}
                className={`${inputClass(Boolean(loginErrors.password))} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-surface)] hover:text-[color:var(--text-primary)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
            {loginErrors.password ? (
              <InputError text={loginErrors.password} />
            ) : null}
          </FieldLabel>

          {loginErrors.form ? (
            <InputError text={loginErrors.form} />
          ) : null}

          <div className="flex flex-col gap-3 text-sm text-[color:var(--ink-soft)] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-[color:var(--border-strong)] text-[color:var(--brand-accent)] focus:ring-[color:var(--brand-accent-soft)]"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoginFormInvalid}
            className="group inline-flex h-13 items-center justify-center rounded-2xl bg-[color:var(--button-primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-strong)] transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setAccountRequestSuccess("");
              setAccountRequestErrors({});
              setActiveView("createAccount");
            }}
            className="inline-flex h-13 items-center justify-center rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--button-neutral)] px-5 text-sm font-semibold text-[color:var(--brand-secondary)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-neutral-hover)]"
          >
            Create account
          </button>

          <a
            href="https://noatechsolutions.com/"
            target="_blank"
            rel="noreferrer"
            className="text-center text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:text-[color:var(--brand-secondary)]"
          >
            Created by{" "}
            <span className="text-[color:var(--brand-secondary)]">
              NoaTechSolutions
            </span>
          </a>
        </motion.form>
        ) : activeView === "createAccount" ? (
          <motion.form
            key="create-account-view"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onSubmit={handleAccountRequestSubmit}
            className="grid gap-5 bg-transparent p-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--border-strong)] sm:bg-[image:var(--bg-form)] sm:p-6 sm:shadow-[var(--shadow-medium)] md:p-7 lg:p-8"
            noValidate
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView("login")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)] transition hover:bg-[color:var(--button-neutral-hover)]"
                aria-label="Back to login"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Account request
                </div>
                <div className="mt-1 text-xl font-semibold text-[color:var(--text-primary)]">
                  Create account
                </div>
              </div>
            </div>

              <FieldLabel label="Full name">
                <input
                  type="text"
                  value={accountRequestForm.fullName}
                  onChange={(event) => {
                    setAccountRequestForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }));
                    setAccountRequestErrors((current) => ({
                      ...current,
                      fullName: undefined,
                      form: undefined,
                    }));
                  }}
                  placeholder="John Smith"
                  className={inputClass(Boolean(accountRequestErrors.fullName))}
                />
                {accountRequestErrors.fullName ? (
                  <InputError text={accountRequestErrors.fullName} />
                ) : null}
              </FieldLabel>

              <FieldLabel label="Email">
                <input
                  type="email"
                  value={accountRequestForm.email}
                  onChange={(event) => {
                    setAccountRequestForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }));
                    setAccountRequestErrors((current) => ({
                      ...current,
                      email: undefined,
                      form: undefined,
                    }));
                  }}
                  placeholder="owner@company.com"
                  className={inputClass(Boolean(accountRequestErrors.email))}
                />
                {accountRequestErrors.email ? (
                  <InputError text={accountRequestErrors.email} />
                ) : null}
              </FieldLabel>

              <FieldLabel label="Confirm email">
                <input
                  type="email"
                  value={accountRequestForm.confirmEmail}
                  onChange={(event) => {
                    setAccountRequestForm((current) => ({
                      ...current,
                      confirmEmail: event.target.value,
                    }));
                    setAccountRequestErrors((current) => ({
                      ...current,
                      confirmEmail: undefined,
                      form: undefined,
                    }));
                  }}
                  onPaste={(event) => event.preventDefault()}
                  onCopy={(event) => event.preventDefault()}
                  onCut={(event) => event.preventDefault()}
                  autoComplete="off"
                  placeholder="Confirm your email"
                  className={inputClass(Boolean(accountRequestErrors.confirmEmail))}
                />
                {accountRequestErrors.confirmEmail ? (
                  <InputError text={accountRequestErrors.confirmEmail} />
                ) : null}
              </FieldLabel>

              <div className="grid gap-2">
                <div className="text-sm font-medium text-[color:var(--ink)]">
                  Requested document types
                </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {requestableDocuments.map((documentType) => {
                    const checked = accountRequestForm.requestedDocumentTypes.includes(
                      documentType.value,
                    );

                    return (
                      <button
                        key={documentType.value}
                        type="button"
                        onClick={() => {
                          toggleRequestedDocumentType(documentType.value);
                          setAccountRequestErrors((current) => ({
                            ...current,
                            requestedDocumentTypes: undefined,
                            form: undefined,
                          }));
                        }}
                        className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${
                          checked
                            ? "border-[color:var(--brand-accent)] bg-[color:var(--badge-primary-bg)] text-[color:var(--brand-secondary)]"
                            : "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface)]"
                        }`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--bg-page-subtle)]">
                          {documentType.icon}
                        </span>
                        <span className="flex-1">{documentType.label}</span>
                        <CheckSquare
                          className={`h-4.5 w-4.5 ${
                            checked
                              ? "text-[color:var(--brand-accent-strong)]"
                              : "text-[color:var(--text-muted)]"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                {accountRequestErrors.requestedDocumentTypes ? (
                  <InputError text={accountRequestErrors.requestedDocumentTypes} />
                ) : null}
              </div>

              {accountRequestErrors.form ? (
                <InputError text={accountRequestErrors.form} />
              ) : null}

              {accountRequestSuccess ? (
                <div className="rounded-2xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]">
                  {accountRequestSuccess}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setActiveView("login")}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-4 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest || isAccountRequestInvalid}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[color:var(--button-primary)] px-4 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingRequest ? "Submitting..." : "Submit request"}
                </button>
              </div>

              <a
                href="https://noatechsolutions.com/"
                target="_blank"
                rel="noreferrer"
                className="text-center text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--text-muted)] hover:text-[color:var(--brand-secondary)]"
              >
                Created by{" "}
                <span className="text-[color:var(--brand-secondary)]">
                  NoaTechSolutions
                </span>
              </a>
            </motion.form>
        ) : activeView === "forgotPassword" ? (
          <motion.form
            key="forgot-password-view"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onSubmit={handleForgotPasswordSubmit}
            className="grid gap-5 bg-transparent p-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--border-strong)] sm:bg-[image:var(--bg-form)] sm:p-6 sm:shadow-[var(--shadow-medium)] md:p-7 lg:p-8"
            noValidate
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView("login")}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] text-[color:var(--text-secondary)] transition hover:bg-[color:var(--button-neutral-hover)]"
                aria-label="Back to login"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Account recovery
                </div>
                <div className="mt-1 text-xl font-semibold text-[color:var(--text-primary)]">
                  Forgot password
                </div>
              </div>
            </div>

            <FieldLabel label="Email">
              <input
                type="email"
                value={forgotPasswordForm.email}
                onChange={(event) => {
                  setForgotPasswordForm({ email: event.target.value });
                  setForgotPasswordErrors((current) => ({
                    ...current,
                    email: undefined,
                    form: undefined,
                  }));
                }}
                placeholder="owner@company.com"
                className={inputClass(Boolean(forgotPasswordErrors.email))}
              />
              {forgotPasswordErrors.email ? (
                <InputError text={forgotPasswordErrors.email} />
              ) : null}
            </FieldLabel>

            {forgotPasswordErrors.form ? (
              <InputError text={forgotPasswordErrors.form} />
            ) : null}

            {forgotPasswordSuccess ? (
              <div className="rounded-2xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]">
                {forgotPasswordSuccess}
              </div>
            ) : null}

            {forgotPasswordResetLink ? (
              <a
                href={forgotPasswordResetLink}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-4 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
              >
                Open reset link
              </a>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setActiveView("login")}
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] px-4 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingForgotPassword || isForgotPasswordInvalid}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[color:var(--button-primary)] px-4 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingForgotPassword ? "Submitting..." : "Send instructions"}
              </button>
            </div>
          </motion.form>
        ) : activeView === "forcePasswordChange" ? (
          <motion.form
            key="force-password-view"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onSubmit={handleForcePasswordSubmit}
            className="grid gap-5 bg-transparent p-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--border-strong)] sm:bg-[image:var(--bg-form)] sm:p-6 sm:shadow-[var(--shadow-medium)] md:p-7 lg:p-8"
            noValidate
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                Security update
              </div>
              <div className="mt-1 text-xl font-semibold text-[color:var(--text-primary)]">
                Change temporary password
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-secondary)]">
                For security, create a new password before entering the workspace.
              </div>
            </div>

            <FieldLabel label="New password">
              <PasswordField
                id="forced-password"
                value={forcePasswordForm.password}
                onChange={(value) => {
                  setForcePasswordForm((current) => ({ ...current, password: value }));
                  setForcePasswordErrors((current) => ({
                    ...current,
                    password: undefined,
                    confirmPassword: undefined,
                    form: undefined,
                  }));
                }}
                showValue={showForcedPassword}
                onToggleVisibility={() =>
                  setShowForcedPassword((current) => !current)
                }
                hasError={Boolean(forcePasswordErrors.password)}
                autoComplete="new-password"
                placeholder="Create a new password"
              />
              {forcePasswordErrors.password ? (
                <InputError text={forcePasswordErrors.password} />
              ) : null}
            </FieldLabel>

            <FieldLabel label="Confirm password">
              <PasswordField
                id="forced-confirm-password"
                value={forcePasswordForm.confirmPassword}
                onChange={(value) => {
                  setForcePasswordForm((current) => ({
                    ...current,
                    confirmPassword: value,
                  }));
                  setForcePasswordErrors((current) => ({
                    ...current,
                    confirmPassword: undefined,
                    form: undefined,
                  }));
                }}
                showValue={showForcedConfirmPassword}
                onToggleVisibility={() =>
                  setShowForcedConfirmPassword((current) => !current)
                }
                hasError={Boolean(forcePasswordErrors.confirmPassword)}
                autoComplete="new-password"
                placeholder="Confirm your new password"
                disablePaste
              />
              {forcePasswordErrors.confirmPassword ? (
                <InputError text={forcePasswordErrors.confirmPassword} />
              ) : null}
            </FieldLabel>

            {forcePasswordErrors.form ? (
              <InputError text={forcePasswordErrors.form} />
            ) : null}

            {forcePasswordSuccess ? (
              <div className="rounded-2xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]">
                {forcePasswordSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmittingForcePassword || isForcePasswordInvalid}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[color:var(--button-primary)] px-4 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmittingForcePassword ? "Saving..." : "Update password"}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="reset-password-view"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onSubmit={handleResetPasswordSubmit}
            className="grid gap-5 bg-transparent p-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--border-strong)] sm:bg-[image:var(--bg-form)] sm:p-6 sm:shadow-[var(--shadow-medium)] md:p-7 lg:p-8"
            noValidate
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                Account recovery
              </div>
              <div className="mt-1 text-xl font-semibold text-[color:var(--text-primary)]">
                Reset password
              </div>
              <div className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Create a new password to recover access to your workspace.
              </div>
            </div>

            <FieldLabel label="New password">
              <PasswordField
                id="reset-password"
                value={resetPasswordForm.password}
                onChange={(value) => {
                  setResetPasswordForm((current) => ({ ...current, password: value }));
                  setResetPasswordErrors((current) => ({
                    ...current,
                    password: undefined,
                    confirmPassword: undefined,
                    form: undefined,
                  }));
                }}
                showValue={showResetPassword}
                onToggleVisibility={() =>
                  setShowResetPassword((current) => !current)
                }
                hasError={Boolean(resetPasswordErrors.password)}
                autoComplete="new-password"
                placeholder="Create a new password"
              />
              {resetPasswordErrors.password ? (
                <InputError text={resetPasswordErrors.password} />
              ) : null}
            </FieldLabel>

            <FieldLabel label="Confirm password">
              <PasswordField
                id="reset-confirm-password"
                value={resetPasswordForm.confirmPassword}
                onChange={(value) => {
                  setResetPasswordForm((current) => ({
                    ...current,
                    confirmPassword: value,
                  }));
                  setResetPasswordErrors((current) => ({
                    ...current,
                    confirmPassword: undefined,
                    form: undefined,
                  }));
                }}
                showValue={showResetConfirmPassword}
                onToggleVisibility={() =>
                  setShowResetConfirmPassword((current) => !current)
                }
                hasError={Boolean(resetPasswordErrors.confirmPassword)}
                autoComplete="new-password"
                placeholder="Confirm your new password"
                disablePaste
              />
              {resetPasswordErrors.confirmPassword ? (
                <InputError text={resetPasswordErrors.confirmPassword} />
              ) : null}
            </FieldLabel>

            {resetPasswordErrors.form ? (
              <InputError text={resetPasswordErrors.form} />
            ) : null}

            {resetPasswordSuccess ? (
              <div className="rounded-2xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]">
                {resetPasswordSuccess}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmittingResetPassword || isResetPasswordInvalid}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[color:var(--button-primary)] px-4 text-sm font-medium text-white transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmittingResetPassword ? "Saving..." : "Reset password"}
            </button>
          </motion.form>
        )}
        </AnimatePresence>
      </div>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  showValue,
  onToggleVisibility,
  hasError,
  autoComplete,
  placeholder,
  disablePaste = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  showValue: boolean;
  onToggleVisibility: () => void;
  hasError: boolean;
  autoComplete?: string;
  placeholder: string;
  disablePaste?: boolean;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={showValue ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={disablePaste ? (event) => event.preventDefault() : undefined}
        onCopy={disablePaste ? (event) => event.preventDefault() : undefined}
        onCut={disablePaste ? (event) => event.preventDefault() : undefined}
        className={`${inputClass(hasError)} pr-12`}
      />
      <button
        type="button"
        onClick={onToggleVisibility}
        className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-surface)] hover:text-[color:var(--text-primary)]"
        aria-label={showValue ? "Hide password" : "Show password"}
      >
        {showValue ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
      </button>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium text-[color:var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

function InputError({ text }: { text: string }) {
  return <div className="text-sm text-[color:var(--danger-text)]">{text}</div>;
}

function inputClass(hasError: boolean) {
  return `block h-13 w-full rounded-2xl border bg-[color:var(--surface)] px-4 text-base text-[color:var(--ink)] outline-none transition focus:ring-4 ${
    hasError
      ? "border-[color:var(--danger-border)] focus:border-[color:var(--danger-text)] focus:ring-[color:var(--danger-bg)]"
      : "border-[color:var(--border)] focus:border-[color:var(--brand-accent)] focus:ring-[color:var(--brand-accent-soft)]"
  }`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function mapLoginApiError(message: string): LoginErrors {
  if (message === "User does not exist") {
    return { email: "This user does not exist." };
  }

  if (message === "Invalid password") {
    return { password: "The password is incorrect." };
  }

  if (message === "Account is not active") {
    return { form: "This account is not active." };
  }

  return { form: message };
}

function mapAccountRequestApiError(message: string): AccountRequestErrors {
  if (message === "Email already exists") {
    return { email: "This email already exists in the system." };
  }

  if (message === "An account request already exists for this email") {
    return { email: "There is already a pending request for this email." };
  }

  if (message === "Select at least one requested document type") {
    return { requestedDocumentTypes: message };
  }

  return { form: message };
}
