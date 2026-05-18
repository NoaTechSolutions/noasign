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
  Lock,
  Mail,
  PackageCheck,
  Receipt,
  ScrollText,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button, Checkbox, Input, Label } from "@/components/ui";
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
  const authCardClassName =
    "flex w-full max-w-[420px] flex-col gap-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8 shadow-[var(--shadow-soft)] transition-colors";
  const neutralButtonClassName = isDarkTheme
    ? "inline-flex items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-neutral)] text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral-hover)]"
    : "inline-flex items-center justify-center rounded-2xl border border-[color:var(--brand-secondary)] bg-white text-[color:var(--brand-secondary)] transition hover:bg-[color:var(--bg-page-subtle)]";
  const documentTypeCardClassName = (checked: boolean) =>
    checked
      ? "border-[color:var(--warning-border)] bg-[color:var(--warning-bg)] text-[color:var(--warning-text)]"
      : isDarkTheme
        ? "border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-surface)]"
        : "border-[color:var(--brand-secondary)] bg-white text-[color:var(--text-primary)] hover:bg-[color:var(--bg-page-subtle)]";

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
      <div className="mx-auto flex w-full max-w-[420px] flex-col items-center">
        {/* Phone: vertical brand block (logo + wordmark stacked) */}
        <header className="mb-7 flex flex-col items-center gap-3 md:hidden">
          <div className="relative h-12 w-12 overflow-hidden">
            <NextImage
              src={loginLogoSrc}
              alt="NTSsign"
              fill
              className="object-contain"
              sizes="48px"
              priority
            />
          </div>
          <div className="text-[18px] font-medium leading-[1.25] tracking-[-0.01em] text-[color:var(--text-primary)]">
            NTSsign
          </div>
        </header>

        {/* Tablet+ (when no side panel): brand horizontal row above form header */}
        <header className="mb-6 hidden items-center gap-3 self-start md:flex lg:hidden">
          <div className="relative h-11 w-11 overflow-hidden">
            <NextImage
              src={loginLogoSrc}
              alt="NTSsign"
              fill
              className="object-contain"
              sizes="44px"
              priority
            />
          </div>
          <div className="text-[17px] font-medium text-[color:var(--text-primary)]">
            NTSsign
          </div>
        </header>

        {/* Tablet+: form header (title + subtitle). Hidden on phone. */}
        {activeView === "login" ? (
          <header className="mb-6 hidden w-full max-w-[420px] flex-col gap-1.5 md:flex">
            <h2 className="m-0 text-[24px] font-medium leading-[1.2] tracking-[-0.015em] text-[color:var(--text-primary)] lg:text-[28px]">
              Welcome back
            </h2>
            <p className="m-0 text-sm font-normal leading-[1.5] text-[color:var(--text-secondary)] lg:text-[15px]">
              Sign in to continue managing your documents.
            </p>
          </header>
        ) : null}

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
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-xs font-medium leading-[1.25] text-[color:var(--text-muted)]"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              error={Boolean(loginErrors.email)}
              onChange={(event) => {
                setEmail(event.target.value);
                setLoginErrors((current) => ({ ...current, email: undefined, form: undefined }));
              }}
              className="h-12"
            />
            {loginErrors.email ? (
              <InputError text={loginErrors.email} />
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-xs font-medium leading-[1.25] text-[color:var(--text-muted)]"
            >
              Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                error={Boolean(loginErrors.password)}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setLoginErrors((current) => ({
                    ...current,
                    password: undefined,
                    form: undefined,
                  }));
                }}
                className="h-12 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[color:var(--text-muted)] transition hover:bg-[color:var(--bg-page-subtle)] hover:text-[color:var(--text-primary)]"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? (
                  <EyeOff className="h-[18px] w-[18px]" />
                ) : (
                  <Eye className="h-[18px] w-[18px]" />
                )}
              </button>
            </div>
            {loginErrors.password ? (
              <InputError text={loginErrors.password} />
            ) : password !== password.trim() ? (
              <p className="mt-1 text-[11px] font-medium leading-[1.25] text-[color:var(--brand-highlight)]">
                Your password has leading or trailing spaces — make sure that&apos;s intentional.
              </p>
            ) : null}
          </div>

          {loginErrors.form ? (
            <InputError text={loginErrors.form} />
          ) : null}

          {/* Remember-me + Forgot password row */}
          <div className="-mt-1 flex items-center justify-between gap-3">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              label="Remember me"
            />
            <button
              type="button"
              onClick={() => setActiveView("forgotPassword")}
              className="text-[13px] font-medium leading-[1.25] text-[color:var(--brand-secondary)] transition hover:underline dark:text-[color:var(--brand-accent)]"
            >
              Forgot password?
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || isLoginFormInvalid}
            className="h-12 w-full"
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </Button>

          <p className="text-center text-[13px] font-normal leading-[1.5] text-[color:var(--text-secondary)]">
            Don&apos;t have access?{" "}
            <button
              type="button"
              onClick={() => openCreateAccount()}
              className="font-medium text-[color:var(--brand-secondary)] transition hover:underline dark:text-[color:var(--brand-accent)]"
            >
              Request access
            </button>
          </p>
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
            <CardHead
              title={createAccountStep === 1 ? "Request access" : "Document types"}
              sub={
                createAccountStep === 1
                  ? "Tell us a bit about you. We'll review and reach out shortly."
                  : "Pick the document types you'd like to use in your workspace."
              }
              icon={createAccountStep === 1 ? "user-plus" : "files"}
            />

            {createAccountStep === 1 ? (
              <>
              <div className="grid gap-1">
                <Label htmlFor="account-fullName">Full name</Label>
                <Input
                  id="account-fullName"
                  type="text"
                  value={accountRequestForm.fullName}
                  error={Boolean(accountRequestErrors.fullName)}
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
                />
                {accountRequestErrors.fullName ? (
                  <InputError text={accountRequestErrors.fullName} />
                ) : null}
              </div>

              <div className="grid gap-1">
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  type="email"
                  value={accountRequestForm.email}
                  error={Boolean(accountRequestErrors.email)}
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
                />
                {accountRequestErrors.email ? (
                  <InputError text={accountRequestErrors.email} />
                ) : null}
              </div>

              <div className="grid gap-1">
                <Label htmlFor="account-confirmEmail">Confirm email</Label>
                <Input
                  id="account-confirmEmail"
                  type="email"
                  value={accountRequestForm.confirmEmail}
                  error={Boolean(accountRequestErrors.confirmEmail)}
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
                />
                {accountRequestErrors.confirmEmail ? (
                  <InputError text={accountRequestErrors.confirmEmail} />
                ) : null}
              </div>
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

              {createAccountStep === 1 ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={continueCreateAccount}
                  disabled={isAccountRequestInvalid}
                  className="h-12 w-full"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmittingRequest || isAccountRequestInvalid}
                  className="h-12 w-full"
                >
                  {isSubmittingRequest ? "Submitting..." : "Submit request"}
                </Button>
              )}

              <BackLink
                onClick={() => (createAccountStep === 1 ? backToLogin() : setCreateAccountStep(1))}
                label={createAccountStep === 1 ? "Back to login" : "Back"}
              />
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
            <CardHead
              title="Reset your password"
              sub="We'll email you a single-use link that expires in 15 minutes."
              icon="envelope"
            />

            <div className="grid gap-1">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotPasswordForm.email}
                error={Boolean(forgotPasswordErrors.email)}
                onChange={(event) => {
                  setForgotPasswordForm({ email: event.target.value });
                  setForgotPasswordErrors((current) => ({
                    ...current,
                    email: undefined,
                    form: undefined,
                  }));
                }}
                placeholder="you@company.com"
                className="h-12"
              />
              {forgotPasswordErrors.email ? (
                <InputError text={forgotPasswordErrors.email} />
              ) : null}
            </div>

            {forgotPasswordErrors.form ? (
              <InputError text={forgotPasswordErrors.form} />
            ) : null}

            {forgotPasswordSuccess ? (
              <div className="rounded-xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]">
                {forgotPasswordSuccess}
              </div>
            ) : null}

            {forgotPasswordResetLink ? (
              <a
                href={forgotPasswordResetLink}
                className="inline-flex h-12 items-center justify-center rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-4 text-sm font-medium text-[color:var(--text-primary)] transition hover:bg-[color:var(--bg-surface-strong)]"
              >
                Open reset link
              </a>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingForgotPassword || isForgotPasswordInvalid}
              className="h-12 w-full"
            >
              {isSubmittingForgotPassword ? "Sending..." : "Send reset link"}
            </Button>

            <BackLink onClick={() => setActiveView("login")} label="Back to login" />
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
            <CardHead
              title="Choose a new password"
              sub="For security, create a new password before entering the workspace."
              icon="lock"
              tone="warning"
            />

            <div className="grid gap-1">
              <Label htmlFor="forced-password">New password</Label>
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
            </div>

            <div className="grid gap-1">
              <Label htmlFor="forced-confirm-password">Confirm password</Label>
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
            </div>

            {forcePasswordErrors.form ? (
              <InputError text={forcePasswordErrors.form} />
            ) : null}

            {forcePasswordSuccess ? (
              <div className="rounded-2xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]">
                {forcePasswordSuccess}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingForcePassword || isForcePasswordInvalid}
              className="h-12 w-full"
            >
              {isSubmittingForcePassword ? "Saving..." : "Update password"}
            </Button>
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
            <CardHead
              title="Set a new password"
              sub="Pick something strong — minimum 8 characters with a mix of letters and numbers."
              icon="lock"
            />

            <div className="grid gap-1">
              <Label htmlFor="reset-password">New password</Label>
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
            </div>

            <div className="grid gap-1">
              <Label htmlFor="reset-confirm-password">Confirm password</Label>
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
            </div>

            {resetPasswordErrors.form ? (
              <InputError text={resetPasswordErrors.form} />
            ) : null}

            {resetPasswordSuccess ? (
              <div className="rounded-2xl border border-[color:var(--success-border)] bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success-text)]">
                {resetPasswordSuccess}
              </div>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingResetPassword || isResetPasswordInvalid}
              className="h-12 w-full"
            >
              {isSubmittingResetPassword ? "Saving..." : "Update password"}
            </Button>

            <BackLink onClick={() => setActiveView("login")} label="Cancel and back to login" />
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
      <Input
        id={id}
        type={showValue ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        error={hasError}
        onChange={(event) => onChange(event.target.value)}
        onPaste={disablePaste ? (event) => event.preventDefault() : undefined}
        onCopy={disablePaste ? (event) => event.preventDefault() : undefined}
        onCut={disablePaste ? (event) => event.preventDefault() : undefined}
        className="pr-12"
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

function InputError({ text }: { text: string }) {
  return <div className="text-sm text-[color:var(--danger-text)]">{text}</div>;
}

/**
 * Card head — icon container + title + subtitle.
 * Mirrors the designer's `.card__head` block from forgot-password.html.
 */
function CardHead({
  title,
  sub,
  icon,
  tone = "brand",
}: {
  title: string;
  sub: string;
  icon: "envelope" | "lock" | "user-plus" | "files";
  tone?: "brand" | "warning";
}) {
  const IconCmp =
    icon === "envelope" ? Mail : icon === "lock" ? Lock : icon === "user-plus" ? UserPlus : FileText;

  const toneStyles =
    tone === "warning"
      ? "bg-[color:var(--warning-bg)] text-[color:var(--warning-text)]"
      : "bg-[color:var(--badge-primary-bg)] text-[color:var(--brand-secondary)] dark:text-[color:var(--brand-accent)]";

  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <div
        aria-hidden
        className={`grid h-12 w-12 place-items-center rounded-xl ${toneStyles}`}
      >
        <IconCmp className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h3 className="m-0 text-[20px] font-medium leading-[1.25] tracking-[-0.01em] text-[color:var(--text-primary)]">
        {title}
      </h3>
      <p className="m-0 text-[13px] font-normal leading-[1.5] text-[color:var(--text-secondary)]">
        {sub}
      </p>
    </header>
  );
}

/**
 * Back link — inline "← Back to login" at the bottom of secondary views.
 */
function BackLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto inline-flex items-center gap-1.5 text-[13px] font-medium text-[color:var(--text-secondary)] transition hover:text-[color:var(--brand-secondary)] dark:hover:text-[color:var(--brand-accent)]"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
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
