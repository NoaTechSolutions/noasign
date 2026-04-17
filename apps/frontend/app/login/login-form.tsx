"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  PackageCheck,
  Receipt,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import { API_URL, apiRequest } from "../../lib/api";
import { getStoredUser, persistSession, updateStoredUser } from "../../lib/auth-storage";

type LoginResponse = {
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
  const { resolvedTheme } = useTheme();
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
  const [createAccountStep, setCreateAccountStep] = useState<1 | 2>(1);
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
  const isDarkTheme = resolvedTheme === "dark";
  const loginLogoSrc = isDarkTheme
    ? "/img/NTSSign_blanco_SinFondo.svg"
    : "/img/NTSSign_AzulDark_SinFondo.svg";
  const authCardClassName = isDarkTheme
    ? "grid gap-4 bg-transparent p-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[color:var(--border-strong)] sm:bg-[image:var(--bg-form)] sm:p-5 sm:shadow-[var(--shadow-medium)] md:gap-5 md:p-7 lg:p-7"
    : "grid gap-4 bg-transparent p-0 shadow-none sm:rounded-[2rem] sm:border sm:border-[#022977] sm:bg-[image:var(--bg-form)] sm:p-5 sm:shadow-[0_18px_50px_rgba(2,41,119,0.12)] md:gap-5 md:p-7 lg:p-7";
  const neutralButtonClassName = isDarkTheme
    ? "inline-flex items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
    : "inline-flex items-center justify-center rounded-2xl border border-[#022977] bg-white text-[#022977] transition hover:bg-[#f5f8ff]";
  const primaryButtonClassName = isDarkTheme
    ? "inline-flex items-center justify-center rounded-2xl bg-[color:var(--button-primary)] text-white transition hover:bg-[color:var(--button-primary-hover)]"
    : "inline-flex items-center justify-center rounded-2xl bg-[#0400f0] text-white transition hover:bg-[#0300c8]";
  const documentTypeCardClassName = (checked: boolean) =>
    checked
      ? "border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] text-[color:var(--warning-text)]"
      : isDarkTheme
        ? "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface)]"
        : "border-[#022977] bg-white text-[color:var(--text-primary)] hover:bg-[#f5f8ff]";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const nextResetToken =
      new URLSearchParams(window.location.search).get("resetToken")?.trim() ?? "";
    setResetToken(nextResetToken);
  }, []);

  useEffect(() => {
    if (resetToken) {
      setActiveView("resetPassword");
    }
  }, [resetToken, router]);

  const isLoginFormInvalid = useMemo(
    () => Boolean(loginErrors.email || loginErrors.password),
    [loginErrors],
  );
  const isAccountRequestInvalid = useMemo(() => {
    const emailValue = accountRequestForm.email.trim();
    const confirmEmailValue = accountRequestForm.confirmEmail.trim();

    if (createAccountStep === 1) {
      return (
        !accountRequestForm.fullName.trim() ||
        !emailValue ||
        !confirmEmailValue ||
        !isValidEmail(emailValue) ||
        !isValidEmail(confirmEmailValue) ||
        emailValue.toLowerCase() !== confirmEmailValue.toLowerCase()
      );
    }

    return accountRequestForm.requestedDocumentTypes.length === 0;
  }, [accountRequestForm, createAccountStep]);
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

    if (createAccountStep === 2 && accountRequestForm.requestedDocumentTypes.length === 0) {
      nextErrors.requestedDocumentTypes =
        "Select at least one document type.";
    }

    setAccountRequestErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateAccountRequestStepOne() {
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
        credentials: "include",
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

      if (!response.ok || !data.user) {
        const message = data.message ?? "Unable to sign in";
        setLoginErrors(mapLoginApiError(message));
        return;
      }

      persistSession(data.user);

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

    const storedUser = getStoredUser();

    if (!storedUser) {
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
        body: {
          password: forcePasswordForm.password,
        },
      });

      updateStoredUser({ ...storedUser, mustChangePassword: false });
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
      setCreateAccountStep(1);
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

  function openCreateAccount() {
    setAccountRequestSuccess("");
    setAccountRequestErrors({});
    setCreateAccountStep(1);
    setActiveView("createAccount");
  }

  function backToLogin() {
    setCreateAccountStep(1);
    setActiveView("login");
  }

  function continueCreateAccount() {
    if (!validateAccountRequestStepOne()) {
      return;
    }

    setAccountRequestErrors({});
    setCreateAccountStep(2);
  }

  return (
      <div className="mx-auto grid w-full max-w-md gap-4 md:max-w-[30rem] md:gap-6 xl:max-w-md">
        <div className="grid justify-items-center gap-2 text-center md:gap-4">
          <div className="inline-flex flex-col items-center gap-2">
            <div className="relative h-[10.9rem] w-[10.9rem] overflow-hidden md:h-[10.4rem] md:w-[10.4rem]">
              <NextImage
                src={loginLogoSrc}
                alt="NTSsign"
                fill
                className="object-contain"
                sizes="166px"
                priority
              />
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
          className={authCardClassName}
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
              className={inputClass(Boolean(loginErrors.email), isDarkTheme)}
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
                className={`${inputClass(Boolean(loginErrors.password), isDarkTheme)} pr-12`}
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
            ) : password !== password.trim() ? (
              <p className="mt-1.5 text-xs text-amber-500">Your password has leading or trailing spaces — make sure that&apos;s intentional.</p>
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
            className={`${primaryButtonClassName} group h-13 px-5 text-sm font-semibold shadow-[var(--shadow-strong)] disabled:cursor-not-allowed disabled:opacity-70`}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              openCreateAccount();
            }}
            className={`${neutralButtonClassName} h-13 px-5 text-sm font-semibold shadow-[var(--shadow-soft)]`}
          >
            Create account
          </button>

          <a
            href="https://noatechsolutions.com/"
            target="_blank"
            rel="noreferrer"
            className="text-center text-sm text-[color:var(--brand-highlight)] hover:text-[color:var(--button-warning-hover)]"
          >
            Created by{" "}
            <span className="font-semibold text-[color:var(--brand-highlight)]">
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
          className={authCardClassName}
            noValidate
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => backToLogin()}
                className={`${neutralButtonClassName} h-10 w-10 text-[color:var(--text-secondary)]`}
                aria-label="Back to login"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)]">
                  Account request
                </div>
                <div className="mt-1 text-xl font-semibold text-[color:var(--text-primary)]">
                  {createAccountStep === 1 ? "Create account" : "Request document types"}
                </div>
              </div>
            </div>

            {createAccountStep === 1 ? (
              <>
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
                  className={inputClass(Boolean(accountRequestErrors.fullName), isDarkTheme)}
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
                  className={inputClass(Boolean(accountRequestErrors.email), isDarkTheme)}
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
                  className={inputClass(Boolean(accountRequestErrors.confirmEmail), isDarkTheme)}
                />
                {accountRequestErrors.confirmEmail ? (
                  <InputError text={accountRequestErrors.confirmEmail} />
                ) : null}
              </FieldLabel>
              </>
            ) : (
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
                        className={`flex items-center gap-2 rounded-2xl border px-4 py-4 text-left text-sm font-medium transition ${documentTypeCardClassName(
                          checked,
                        )}`}
                      >
                        <span
                          className={`flex h-9 w-9 items-center justify-center ${
                            isDarkTheme
                              ? "bg-transparent"
                              : "rounded-xl bg-[color:var(--bg-page-subtle)]"
                          }`}
                        >
                          {documentType.icon}
                        </span>
                        <span>{documentType.label}</span>
                      </button>
                    );
                  })}
                </div>
                {accountRequestErrors.requestedDocumentTypes ? (
                  <InputError text={accountRequestErrors.requestedDocumentTypes} />
                ) : null}
              </div>
            )}

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
                  onClick={() =>
                    createAccountStep === 1 ? backToLogin() : setCreateAccountStep(1)
                  }
                  className={`${neutralButtonClassName} h-12 px-4 text-sm font-medium`}
                >
                  {createAccountStep === 1 ? "Cancel" : "Back"}
                </button>
                {createAccountStep === 1 ? (
                  <button
                    type="button"
                    onClick={continueCreateAccount}
                    disabled={isAccountRequestInvalid}
                    className={`${primaryButtonClassName} h-12 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmittingRequest || isAccountRequestInvalid}
                    className={`${primaryButtonClassName} h-12 px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {isSubmittingRequest ? "Submitting..." : "Submit request"}
                  </button>
                )}
              </div>

              <a
                href="https://noatechsolutions.com/"
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm text-[color:var(--brand-highlight)] hover:text-[color:var(--button-warning-hover)]"
              >
                Created by{" "}
                <span className="font-semibold text-[color:var(--brand-highlight)]">
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
            className={authCardClassName}
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
                className={inputClass(Boolean(forgotPasswordErrors.email), isDarkTheme)}
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
            className={authCardClassName}
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
                isDarkTheme={isDarkTheme}
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
                isDarkTheme={isDarkTheme}
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
            className={authCardClassName}
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
                isDarkTheme={isDarkTheme}
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
                isDarkTheme={isDarkTheme}
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
  isDarkTheme,
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
  isDarkTheme: boolean;
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
        className={`${inputClass(hasError, isDarkTheme)} pr-12`}
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

function inputClass(hasError: boolean, isDarkTheme = true) {
  return `block h-13 w-full rounded-2xl border bg-[color:var(--surface)] px-4 text-base text-[color:var(--ink)] outline-none transition focus:ring-4 ${
    hasError
      ? "border-[color:var(--danger-border)] focus:border-[color:var(--danger-text)] focus:ring-[color:var(--danger-bg)]"
      : isDarkTheme
        ? "border-[color:var(--border)] focus:border-[color:var(--brand-accent)] focus:ring-[color:var(--brand-accent-soft)]"
        : "border-[#022977] focus:border-[#022977] focus:ring-[rgba(2,41,119,0.12)]"
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
