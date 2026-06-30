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
import { useLockoutCountdown, formatMMSS } from "../../lib/use-lockout-countdown";
import { formatUsPhone } from "../../lib/format-phone";

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
  userFound: boolean;
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
  accountType?: string;
  fullName?: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  confirmEmail?: string;
  requestedDocumentTypes?: string;
  otherDocType?: string;
  form?: string;
};

type AccountType = "" | "personal" | "business";

type AccountRequestForm = {
  accountType: AccountType;
  fullName: string;       // Personal only
  companyName: string;    // Business only
  contactName: string;    // Business only
  email: string;
  confirmEmail: string;
  phone: string;          // Optional
  requestedDocumentTypes: string[];
  otherDocType: string;   // Required when "Others" is selected
  referral: string;       // Optional
  notes: string;          // Optional
};

const ACCOUNT_TOTAL_STEPS = 4;
const REFERRAL_OPTIONS = [
  { value: "google", label: "Google Search" },
  { value: "social", label: "Social Media" },
  { value: "referral", label: "Referral from a colleague" },
  { value: "ad", label: "Advertisement" },
  { value: "other", label: "Other" },
];

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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
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
  const [createAccountStep, setCreateAccountStep] = useState<1 | 2 | 3 | 4>(1);
  const [accountRequestForm, setAccountRequestForm] = useState<AccountRequestForm>({
    accountType: "",
    fullName: "",
    companyName: "",
    contactName: "",
    email: "",
    confirmEmail: "",
    phone: "",
    requestedDocumentTypes: [],
    otherDocType: "",
    referral: "",
    notes: "",
  });
  const [forgotPasswordForm, setForgotPasswordForm] = useState<ForgotPasswordForm>({
    email: "",
  });
  const [forgotPasswordErrors, setForgotPasswordErrors] =
    useState<ForgotPasswordErrors>({});
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState("");
  const [forgotPasswordCooldown, setForgotPasswordCooldown] = useState(0);

  useEffect(() => {
    if (forgotPasswordCooldown <= 0) return;
    const id = window.setInterval(() => {
      setForgotPasswordCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [forgotPasswordCooldown]);

  // Lockout / rate-limit countdown. Driven by ACCOUNT_LOCKED.retryAfter (typically
  // 900s = 15min from backend) or RATE_LIMITED (60s default — middleware doesn't
  // send retryAfter). Button disables + shows MM:SS while active.
  const lockoutCountdown = useLockoutCountdown();
  const [lockoutBanner, setLockoutBanner] = useState("");

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
  const isDarkTheme = mounted && resolvedTheme === "dark";
  const loginLogoSrc = isDarkTheme
    ? "/img/NTSSign_blanco_SinFondo.svg"
    : "/img/NTSSign_AzulDark_SinFondo.svg";
  const authCardClassName =
    "flex w-full max-w-[420px] flex-col gap-5 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-8 shadow-[var(--shadow-soft)] transition-colors";

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const nextResetToken = params.get("resetToken")?.trim() ?? "";
    setResetToken(nextResetToken);

    // Deep-link from account-locked email CTA: /login?view=forgotPassword
    if (params.get("view") === "forgotPassword") {
      setActiveView("forgotPassword");
    }
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
    if (createAccountStep === 1) {
      return !accountRequestForm.accountType;
    }
    if (createAccountStep === 2) {
      const email = accountRequestForm.email.trim();
      const confirmEmail = accountRequestForm.confirmEmail.trim();
      const isBusiness = accountRequestForm.accountType === "business";
      const identityFilled = isBusiness
        ? accountRequestForm.companyName.trim() && accountRequestForm.contactName.trim()
        : Boolean(accountRequestForm.fullName.trim());
      return (
        !identityFilled ||
        !email ||
        !confirmEmail ||
        !isValidEmail(email) ||
        !isValidEmail(confirmEmail) ||
        email.toLowerCase() !== confirmEmail.toLowerCase()
      );
    }
    if (createAccountStep === 3) {
      if (accountRequestForm.requestedDocumentTypes.length === 0) return true;
      if (
        accountRequestForm.requestedDocumentTypes.includes("Others") &&
        !accountRequestForm.otherDocType.trim()
      ) {
        return true;
      }
      return false;
    }
    return false;
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

  function validateAccountRequestStep(step: 1 | 2 | 3 | 4) {
    const nextErrors: AccountRequestErrors = {};

    if (step === 1) {
      if (!accountRequestForm.accountType) {
        nextErrors.accountType = "Please choose an account type to continue.";
      }
    }

    if (step === 2) {
      const isBusiness = accountRequestForm.accountType === "business";
      if (isBusiness) {
        if (!accountRequestForm.companyName.trim()) {
          nextErrors.companyName = "Company name is required.";
        }
        if (!accountRequestForm.contactName.trim()) {
          nextErrors.contactName = "Primary contact name is required.";
        }
      } else if (!accountRequestForm.fullName.trim()) {
        nextErrors.fullName = "Full name is required.";
      }

      const normalizedEmail = accountRequestForm.email.trim();
      const normalizedConfirmEmail = accountRequestForm.confirmEmail.trim();

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
    }

    if (step === 3) {
      if (accountRequestForm.requestedDocumentTypes.length === 0) {
        nextErrors.requestedDocumentTypes = "Select at least one document type.";
      } else if (
        accountRequestForm.requestedDocumentTypes.includes("Others") &&
        !accountRequestForm.otherDocType.trim()
      ) {
        nextErrors.otherDocType = "Describe the \"Other\" document type.";
      }
    }

    // Step 4: all fields optional — no validation needed.

    setAccountRequestErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateAccountRequestForm() {
    // Used by submitAccountRequest (final submit) — validate all step bundles.
    for (const step of [1, 2, 3] as const) {
      if (!validateAccountRequestStep(step)) return false;
    }
    return true;
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
        // Typed lockout / rate-limit branch — must come before the legacy
        // path so the countdown UI fires instead of a generic credentials
        // message.
        const errorCode = (data as Record<string, unknown>).errorCode;
        const retryAfter = (data as Record<string, unknown>).retryAfter;

        if (errorCode === "ACCOUNT_PERMANENTLY_LOCKED") {
          lockoutCountdown.clear();
          setLockoutBanner("__permanent__");
          setLoginErrors({});
          return;
        }

        if (errorCode === "ACCOUNT_LOCKED" || response.status === 429) {
          const seconds =
            typeof retryAfter === "number"
              ? retryAfter
              : response.status === 429
                ? 60
                : 900;
          lockoutCountdown.start(seconds);
          const minutes = Math.max(1, Math.ceil(seconds / 60));
          setLockoutBanner(
            errorCode === "ACCOUNT_LOCKED"
              ? `Too many attempts. Account locked for ${minutes} minute${minutes === 1 ? "" : "s"}.`
              : `Too many attempts. Wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
          );
          setLoginErrors({});
          return;
        }

        const message = data.message ?? "Unable to sign in";
        setLockoutBanner("");
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
        router.push("/dashboard?panel=overview");
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

    try {
      const data = await apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: {
          email: forgotPasswordForm.email.trim().toLowerCase(),
        },
      });
      setForgotPasswordSuccess(data.userFound ? "__found__" : "__not_found__");
      if (data.userFound) {
        setForgotPasswordCooldown(60);
      }
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

  async function resendForgotPasswordLink() {
    if (forgotPasswordCooldown > 0 || isSubmittingForgotPassword) return;
    setIsSubmittingForgotPassword(true);
    try {
      await apiRequest<ForgotPasswordResponse>("/auth/forgot-password", {
        method: "POST",
        body: { email: forgotPasswordForm.email.trim().toLowerCase() },
      });
      setForgotPasswordSuccess("__found__");
      setForgotPasswordCooldown(60);
    } catch (submitError) {
      setForgotPasswordErrors({
        form:
          submitError instanceof Error
            ? submitError.message
            : "Unable to resend reset link",
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
        router.push("/dashboard?panel=overview");
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

  function blockFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  async function submitAccountRequest() {
    setAccountRequestErrors({});
    setAccountRequestSuccess("");

    if (!validateAccountRequestForm()) {
      return;
    }

    setIsSubmittingRequest(true);

    try {
      const composedFullName =
        accountRequestForm.accountType === "business"
          ? `${accountRequestForm.companyName.trim()} (Contact: ${accountRequestForm.contactName.trim()})`
          : accountRequestForm.fullName.trim();

      const docTypesForBackend = accountRequestForm.requestedDocumentTypes.map((value) =>
        value === "Others" && accountRequestForm.otherDocType.trim()
          ? `Others: ${accountRequestForm.otherDocType.trim()}`
          : value,
      );

      const response = await fetch(`${API_URL}/users/account-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: composedFullName,
          email: accountRequestForm.email.trim().toLowerCase(),
          requestedDocumentTypes: docTypesForBackend,
        }),
      });

      const data = (await response.json()) as Partial<AccountRequestResponse> & {
        message?: string;
      };

      if (!response.ok) {
        const mapped = mapAccountRequestApiError(
          data.message ?? "Unable to submit account request",
        );
        if (!mapped.form) {
          mapped.form = data.message ?? "Unable to submit account request";
        }
        setAccountRequestErrors(mapped);
        return;
      }

      setAccountRequestSuccess(
        `Request submitted successfully for ${accountRequestForm.email.trim()}.`,
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
    if (!validateAccountRequestStep(createAccountStep)) {
      return;
    }

    setAccountRequestErrors({});
    const next = Math.min(createAccountStep + 1, ACCOUNT_TOTAL_STEPS) as 1 | 2 | 3 | 4;
    setCreateAccountStep(next);
  }

  function previousCreateAccountStep() {
    setAccountRequestErrors({});
    const prev = Math.max(createAccountStep - 1, 1) as 1 | 2 | 3 | 4;
    setCreateAccountStep(prev);
  }

  return (
      <div className="mx-auto flex w-full max-w-[520px] flex-col items-center">
        <header className="mb-7 flex items-center justify-center md:mb-6">
          <div
            className={
              activeView === "login"
                ? "relative h-[60px] w-[120px] md:h-[70px] md:w-[140px] lg:h-[80px] lg:w-[160px] overflow-hidden transition-all duration-200"
                : "relative h-[45px] w-[90px] md:h-[55px] md:w-[110px] lg:h-[60px] lg:w-[120px] overflow-hidden transition-all duration-200"
            }
          >
            <NextImage
              src={loginLogoSrc}
              alt="NTSsign"
              fill
              className="object-contain"
              sizes="160px"
              priority
            />
          </div>
        </header>

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
                setEmail(event.target.value.trim());
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
                  setPassword(event.target.value.trim());
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
            ) : null}
          </div>

          {lockoutBanner === "__permanent__" ? (
            <div
              role="alert"
              className="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-200"
            >
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Your account has been locked. Please reset your password or contact support.</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLockoutBanner("");
                  setActiveView("forgotPassword");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
              >
                Reset Password
              </button>
            </div>
          ) : lockoutBanner ? (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-200 text-sm"
            >
              {lockoutBanner}
            </div>
          ) : loginErrors.form ? (
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
            disabled={isSubmitting || isLoginFormInvalid || lockoutCountdown.isActive || lockoutBanner === "__permanent__"}
            className="h-12 w-full"
          >
            {isSubmitting
              ? "Signing in..."
              : lockoutCountdown.isActive
                ? `Login (${formatMMSS(lockoutCountdown.secondsLeft)})`
                : "Login"}
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
          accountRequestSuccess ? (
            <motion.div
              key="create-account-success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={authCardClassName + " items-center text-center"}
            >
              <div
                aria-hidden
                className="grid h-16 w-16 place-items-center rounded-full bg-[color:var(--success-bg)] text-[color:var(--success)]"
              >
                <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  <path d="m6 16 7 7L26 9" />
                </svg>
              </div>
              <h3 className="m-0 text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-[color:var(--text-primary)]">
                Request received
              </h3>
              <p className="m-0 text-[14px] font-normal leading-[1.6] text-[color:var(--text-secondary)]">
                Thank you for your interest in NTSsign. We&apos;ll review your request and send login credentials within 1-2 business days. Check your email at:
              </p>
              <span className="mt-1 inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--bg-page-subtle)] px-4 py-2 text-[13px] font-medium text-[color:var(--text-primary)]">
                <Mail className="h-3.5 w-3.5 text-[color:var(--brand-secondary)] dark:text-[color:var(--brand-accent)]" />
                {accountRequestForm.email}
              </span>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setAccountRequestSuccess("");
                  setAccountRequestForm({
                    accountType: "",
                    fullName: "",
                    companyName: "",
                    contactName: "",
                    email: "",
                    confirmEmail: "",
                    phone: "",
                    requestedDocumentTypes: [],
                    otherDocType: "",
                    referral: "",
                    notes: "",
                  });
                  setCreateAccountStep(1);
                  setActiveView("login");
                }}
                className="mt-3 h-12 w-full"
              >
                Back to login
              </Button>
            </motion.div>
          ) : (
          <motion.form
            key="create-account-view"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onSubmit={blockFormSubmit}
            className={authCardClassName + " max-w-[520px]"}
            noValidate
          >
            {/* Card title (matches the designer's .card__header) */}
            <header className="flex flex-col gap-2">
              <h3 className="m-0 text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-[color:var(--text-primary)]">
                Request access
              </h3>
              <p className="m-0 text-[14px] font-normal leading-[1.5] text-[color:var(--text-secondary)]">
                Fill out the form below and we&apos;ll get back to you within 1-2 business days.
              </p>
            </header>

            {/* Stepper */}
            <Stepper currentStep={createAccountStep} totalSteps={ACCOUNT_TOTAL_STEPS} labels={["Account", "Identity", "Documents", "Notes"]} />

            {/* ===== Step 1: Account type ===== */}
            {createAccountStep === 1 ? (
              <section className="flex flex-col gap-4">
                <header className="flex flex-col gap-1.5">
                  <h4 className="m-0 text-[15px] font-medium text-[color:var(--text-primary)]">Choose your account type</h4>
                  <p className="m-0 text-[13px] font-normal text-[color:var(--text-secondary)]">This determines what details we&apos;ll need from you.</p>
                </header>
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-required="true">
                  <AccountTypeCard
                    value="personal"
                    label="Personal"
                    checked={accountRequestForm.accountType === "personal"}
                    onSelect={() => {
                      setAccountRequestForm((current) => ({ ...current, accountType: "personal" }));
                      setAccountRequestErrors((current) => ({ ...current, accountType: undefined, form: undefined }));
                    }}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    }
                  />
                  <AccountTypeCard
                    value="business"
                    label="Business"
                    checked={accountRequestForm.accountType === "business"}
                    onSelect={() => {
                      setAccountRequestForm((current) => ({ ...current, accountType: "business" }));
                      setAccountRequestErrors((current) => ({ ...current, accountType: undefined, form: undefined }));
                    }}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M13 9h.01M13 13h.01M13 17h.01" />
                      </svg>
                    }
                  />
                </div>
                {accountRequestErrors.accountType ? <InputError text={accountRequestErrors.accountType} /> : null}
              </section>
            ) : null}

            {/* ===== Step 2: Identity ===== */}
            {createAccountStep === 2 ? (
              <section className="flex flex-col gap-4">
                <header className="flex flex-col gap-1.5">
                  <h4 className="m-0 text-[15px] font-medium text-[color:var(--text-primary)]">
                    {accountRequestForm.accountType === "business" ? "Tell us about your company" : "Tell us about you"}
                  </h4>
                  <p className="m-0 text-[13px] font-normal text-[color:var(--text-secondary)]">
                    {accountRequestForm.accountType === "business"
                      ? "We'll send credentials to the contact email below."
                      : "We'll send your login credentials to this email."}
                  </p>
                </header>

                {accountRequestForm.accountType === "business" ? (
                  <>
                    <div className="grid gap-1">
                      <Label htmlFor="account-companyName">Company name *</Label>
                      <Input
                        id="account-companyName"
                        type="text"
                        value={accountRequestForm.companyName}
                        error={Boolean(accountRequestErrors.companyName)}
                        onChange={(event) => {
                          setAccountRequestForm((current) => ({ ...current, companyName: event.target.value }));
                          setAccountRequestErrors((current) => ({ ...current, companyName: undefined, form: undefined }));
                        }}
                        placeholder="Acme Construction LLC"
                        className="h-12"
                      />
                      {accountRequestErrors.companyName ? <InputError text={accountRequestErrors.companyName} /> : null}
                    </div>
                    <div className="grid gap-1">
                      <Label htmlFor="account-contactName">Primary contact name *</Label>
                      <Input
                        id="account-contactName"
                        type="text"
                        value={accountRequestForm.contactName}
                        error={Boolean(accountRequestErrors.contactName)}
                        onChange={(event) => {
                          setAccountRequestForm((current) => ({ ...current, contactName: event.target.value }));
                          setAccountRequestErrors((current) => ({ ...current, contactName: undefined, form: undefined }));
                        }}
                        placeholder="John Smith"
                        className="h-12"
                      />
                      {accountRequestErrors.contactName ? <InputError text={accountRequestErrors.contactName} /> : null}
                    </div>
                  </>
                ) : (
                  <div className="grid gap-1">
                    <Label htmlFor="account-fullName">Full name *</Label>
                    <Input
                      id="account-fullName"
                      type="text"
                      value={accountRequestForm.fullName}
                      error={Boolean(accountRequestErrors.fullName)}
                      onChange={(event) => {
                        setAccountRequestForm((current) => ({ ...current, fullName: event.target.value }));
                        setAccountRequestErrors((current) => ({ ...current, fullName: undefined, form: undefined }));
                      }}
                      placeholder="John Smith"
                      className="h-12"
                    />
                    {accountRequestErrors.fullName ? <InputError text={accountRequestErrors.fullName} /> : null}
                  </div>
                )}

                <div className="grid gap-1">
                  <Label htmlFor="account-email">Email *</Label>
                  <Input
                    id="account-email"
                    type="email"
                    value={accountRequestForm.email}
                    error={Boolean(accountRequestErrors.email)}
                    onChange={(event) => {
                      setAccountRequestForm((current) => ({ ...current, email: event.target.value }));
                      setAccountRequestErrors((current) => ({ ...current, email: undefined, form: undefined }));
                    }}
                    placeholder="john@company.com"
                    className="h-12"
                  />
                  {accountRequestErrors.email ? <InputError text={accountRequestErrors.email} /> : null}
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="account-confirmEmail">Confirm email *</Label>
                  <Input
                    id="account-confirmEmail"
                    type="email"
                    value={accountRequestForm.confirmEmail}
                    error={Boolean(accountRequestErrors.confirmEmail)}
                    onChange={(event) => {
                      setAccountRequestForm((current) => ({ ...current, confirmEmail: event.target.value }));
                      setAccountRequestErrors((current) => ({ ...current, confirmEmail: undefined, form: undefined }));
                    }}
                    onPaste={(event) => event.preventDefault()}
                    onCopy={(event) => event.preventDefault()}
                    onCut={(event) => event.preventDefault()}
                    autoComplete="off"
                    placeholder="john@company.com"
                    className="h-12"
                  />
                  {accountRequestErrors.confirmEmail ? <InputError text={accountRequestErrors.confirmEmail} /> : null}
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="account-phone">Phone number (optional)</Label>
                  <Input
                    id="account-phone"
                    type="tel"
                    value={accountRequestForm.phone}
                    onChange={(event) => {
                      setAccountRequestForm((current) => ({ ...current, phone: formatUsPhone(event.target.value) }));
                    }}
                    placeholder="(555) 123-4567"
                    className="h-12"
                  />
                </div>
              </section>
            ) : null}

            {/* ===== Step 3: Document types ===== */}
            {createAccountStep === 3 ? (
              <section className="flex flex-col gap-4">
                <header className="flex flex-col gap-1.5">
                  <h4 className="m-0 text-[15px] font-medium text-[color:var(--text-primary)]">What will you be sending?</h4>
                  <p className="m-0 text-[13px] font-normal text-[color:var(--text-secondary)]">
                    Select at least one. You can change this later in your workspace settings.
                  </p>
                </header>
                <div className="grid gap-3 sm:grid-cols-2">
                  {requestableDocuments.map((documentType) => {
                    const checked = accountRequestForm.requestedDocumentTypes.includes(documentType.value);
                    return (
                      <label
                        key={documentType.value}
                        className="inline-flex cursor-pointer items-center gap-2.5 text-[14px] font-normal text-[color:var(--text-secondary)]"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            toggleRequestedDocumentType(documentType.value);
                            setAccountRequestErrors((current) => ({
                              ...current,
                              requestedDocumentTypes: undefined,
                              otherDocType: undefined,
                              form: undefined,
                            }));
                          }}
                          className="h-5 w-5 cursor-pointer appearance-none rounded border-[1.5px] border-[color:var(--border-strong)] bg-[color:var(--bg-elevated)] transition checked:border-[color:var(--brand-secondary)] checked:bg-[color:var(--brand-secondary)] dark:checked:border-[color:var(--brand-accent)] dark:checked:bg-[color:var(--brand-accent)]"
                          style={{
                            backgroundImage: checked
                              ? `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M3 8.5L6.5 12L13 4.5'/></svg>")`
                              : undefined,
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center",
                            backgroundSize: "14px",
                          }}
                        />
                        <span>{documentType.label}</span>
                      </label>
                    );
                  })}
                </div>

                {accountRequestForm.requestedDocumentTypes.includes("Others") ? (
                  <Input
                    id="account-otherDocType"
                    type="text"
                    value={accountRequestForm.otherDocType}
                    error={Boolean(accountRequestErrors.otherDocType)}
                    onChange={(event) => {
                      setAccountRequestForm((current) => ({ ...current, otherDocType: event.target.value }));
                      setAccountRequestErrors((current) => ({ ...current, otherDocType: undefined, form: undefined }));
                    }}
                    placeholder="Specify document types..."
                    className="h-10 text-[13px]"
                  />
                ) : null}

                {accountRequestErrors.requestedDocumentTypes ? <InputError text={accountRequestErrors.requestedDocumentTypes} /> : null}
                {accountRequestErrors.otherDocType ? <InputError text={accountRequestErrors.otherDocType} /> : null}
              </section>
            ) : null}

            {/* ===== Step 4: Notes ===== */}
            {createAccountStep === 4 ? (
              <section className="flex flex-col gap-4">
                <header className="flex flex-col gap-1.5">
                  <h4 className="m-0 text-[15px] font-medium text-[color:var(--text-primary)]">Anything else we should know?</h4>
                  <p className="m-0 text-[13px] font-normal text-[color:var(--text-secondary)]">
                    Optional — this helps us prep your workspace before you log in.
                  </p>
                </header>

                <div className="grid gap-1">
                  <Label htmlFor="account-referral">How did you hear about us?</Label>
                  <div className="relative">
                    <select
                      id="account-referral"
                      value={accountRequestForm.referral}
                      onChange={(event) =>
                        setAccountRequestForm((current) => ({ ...current, referral: event.target.value }))
                      }
                      className="h-12 w-full cursor-pointer appearance-none rounded-lg border-[1.5px] border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 pr-11 text-sm text-[color:var(--text-primary)] transition focus:border-[color:var(--brand-accent)] focus:outline-none"
                    >
                      <option value="">Select an option</option>
                      {REFERRAL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="m4 6 4 4 4-4" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="account-notes">Additional notes</Label>
                  <div className="relative">
                    <textarea
                      id="account-notes"
                      value={accountRequestForm.notes}
                      onChange={(event) =>
                        setAccountRequestForm((current) => ({ ...current, notes: event.target.value.slice(0, 500) }))
                      }
                      placeholder="Tell us more about your needs..."
                      rows={3}
                      className="min-h-[80px] w-full resize-y rounded-lg border-[1.5px] border-[color:var(--border)] bg-[color:var(--bg-elevated)] px-4 pb-6 pt-3 text-sm text-[color:var(--text-primary)] transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--brand-accent)] focus:outline-none"
                    />
                    <span className="pointer-events-none absolute bottom-2 right-3 bg-[color:var(--bg-elevated)] px-1 text-[11px] font-normal text-[color:var(--text-muted)] tabular-nums">
                      {accountRequestForm.notes.length} / 500
                    </span>
                  </div>
                </div>
              </section>
            ) : null}

            {accountRequestErrors.form ? <InputError text={accountRequestErrors.form} /> : null}

            {/* Nav buttons */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              {createAccountStep > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={previousCreateAccountStep}
                  className="h-12 flex-1"
                >
                  Back
                </Button>
              ) : null}
              {createAccountStep < ACCOUNT_TOTAL_STEPS ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={continueCreateAccount}
                  disabled={isAccountRequestInvalid}
                  className="h-12 flex-1"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  onClick={submitAccountRequest}
                  disabled={isSubmittingRequest}
                  className="h-12 flex-1"
                >
                  {isSubmittingRequest ? "Submitting..." : "Submit request"}
                </Button>
              )}
            </div>

            <p className="text-center text-[13px] font-normal text-[color:var(--text-secondary)]">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => backToLogin()}
                className="font-medium text-[color:var(--brand-secondary)] transition hover:underline dark:text-[color:var(--brand-accent)]"
              >
                Back to login
              </button>
            </p>
          </motion.form>
          )
        ) : activeView === "forgotPassword" ? (
          forgotPasswordSuccess === "__found__" ? (
            <motion.div
              key="forgot-password-sent"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={authCardClassName}
            >
              <CardHead
                title="Check your inbox"
                sub="We sent a reset link to your email. It expires in 15 minutes."
                icon="envelope"
              />

              <p className="m-0 text-center text-[13px] font-normal leading-[1.5] text-[color:var(--text-secondary)]">
                The link can only be used once. If you don&apos;t see the email, check your spam folder or try resending.
              </p>

              <Button
                type="button"
                variant="ghost"
                onClick={() => void resendForgotPasswordLink()}
                disabled={forgotPasswordCooldown > 0 || isSubmittingForgotPassword}
                className="h-12 w-full"
              >
                {forgotPasswordCooldown > 0
                  ? `Resend available in ${forgotPasswordCooldown}s`
                  : isSubmittingForgotPassword
                    ? "Resending..."
                    : "Resend link"}
              </Button>

              {forgotPasswordErrors.form ? <InputError text={forgotPasswordErrors.form} /> : null}

              <BackLink
                onClick={() => {
                  setForgotPasswordSuccess("");
                  setForgotPasswordCooldown(0);
                  setActiveView("login");
                }}
                label="Back to login"
              />
            </motion.div>
          ) : forgotPasswordSuccess === "__not_found__" ? (
            <motion.div
              key="forgot-password-not-found"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={authCardClassName}
            >
              <CardHead
                title="Account not found"
                sub="We couldn't find an account with that email."
                icon="envelope"
              />

              <p className="m-0 text-center text-[13px] font-normal leading-[1.5] text-[color:var(--text-secondary)]">
                Don&apos;t have an account?
              </p>

              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setForgotPasswordSuccess("");
                  openCreateAccount();
                }}
                className="h-12 w-full"
              >
                Request access
              </Button>

              <BackLink
                onClick={() => {
                  setForgotPasswordSuccess("");
                  setActiveView("login");
                }}
                label="Back to login"
              />
            </motion.div>
          ) : (
            // ===== State: request (form) =====
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
                {forgotPasswordErrors.email ? <InputError text={forgotPasswordErrors.email} /> : null}
              </div>

              {forgotPasswordErrors.form ? <InputError text={forgotPasswordErrors.form} /> : null}

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
          )
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
          resetPasswordSuccess ? (
            // ===== State: success (designer's success block with check list) =====
            <motion.div
              key="reset-password-success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={authCardClassName + " items-center text-center"}
            >
              <CardHead
                title="Password updated"
                sub="Your account is secure. The recovery event was added to your audit trail."
                icon="lock"
              />

              <ul className="m-0 flex w-full list-none flex-col gap-2 p-0">
                {[
                  "New password set and encrypted at rest with AES-256.",
                  "All previous sessions on other devices have been signed out.",
                  "Confirmation email sent.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5 text-[13px] font-normal leading-[1.5] text-[color:var(--text-secondary)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[color:var(--success)]" aria-hidden>
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setResetPasswordSuccess("");
                  setResetPasswordForm({ password: "", confirmPassword: "" });
                  setActiveView("login");
                }}
                className="mt-2 h-12 w-full"
              >
                Continue to login
              </Button>
            </motion.div>
          ) : (
            // ===== State: reset (form) =====
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

              <div className="grid gap-2">
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
                  onToggleVisibility={() => setShowResetPassword((current) => !current)}
                  hasError={Boolean(resetPasswordErrors.password)}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <StrengthMeter value={resetPasswordForm.password} />
                {resetPasswordErrors.password ? <InputError text={resetPasswordErrors.password} /> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                <PasswordField
                  id="reset-confirm-password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(value) => {
                    setResetPasswordForm((current) => ({ ...current, confirmPassword: value }));
                    setResetPasswordErrors((current) => ({
                      ...current,
                      confirmPassword: undefined,
                      form: undefined,
                    }));
                  }}
                  showValue={showResetConfirmPassword}
                  onToggleVisibility={() => setShowResetConfirmPassword((current) => !current)}
                  hasError={Boolean(resetPasswordErrors.confirmPassword)}
                  autoComplete="new-password"
                  placeholder="Repeat your new password"
                  disablePaste
                />
                <MatchIndicator password={resetPasswordForm.password} confirm={resetPasswordForm.confirmPassword} />
                {resetPasswordErrors.confirmPassword ? <InputError text={resetPasswordErrors.confirmPassword} /> : null}
              </div>

              {resetPasswordErrors.form ? <InputError text={resetPasswordErrors.form} /> : null}

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
          )
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
 * Password strength meter — 4 bars + label.
 * Score mirrors the designer's `score()` function from forgot-password.html:
 *   +1 length>=8, +1 length>=12, +1 mixed case, +1 digit, +1 special
 *   clamped to 0-4. Labels: "—", "Weak", "Fair", "Good", "Strong".
 */
function calcStrength(value: string): number {
  if (!value) return 0;
  let s = 0;
  if (value.length >= 8) s++;
  if (value.length >= 12) s++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) s++;
  if (/\d/.test(value)) s++;
  if (/[^A-Za-z0-9]/.test(value)) s++;
  return Math.max(0, Math.min(4, s));
}

function StrengthMeter({ value }: { value: string }) {
  const score = calcStrength(value);
  const labels = ["—", "Weak", "Fair", "Good", "Strong"];
  const tones = ["", "danger", "warning", "info", "success"] as const;
  const activeTone = tones[score];
  const valueColor =
    activeTone === "danger"
      ? "var(--danger-text)"
      : activeTone === "warning"
        ? "var(--warning-text)"
        : activeTone === "info"
          ? "var(--info-text)"
          : activeTone === "success"
            ? "var(--success)"
            : "var(--text-muted)";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((bar) => {
          const filled = bar <= score;
          const tone = filled ? tones[bar] : "";
          const bg =
            tone === "danger"
              ? "var(--danger-text)"
              : tone === "warning"
                ? "var(--warning-text)"
                : tone === "info"
                  ? "var(--info-text)"
                  : tone === "success"
                    ? "var(--success)"
                    : "var(--border)";
          return (
            <span
              key={bar}
              aria-hidden
              className="h-1.5 flex-1 rounded-full transition"
              style={{ background: bg }}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-medium text-[color:var(--text-muted)]">Strength</span>
        <span style={{ color: valueColor }} className="font-medium">
          {labels[score]}
        </span>
      </div>
    </div>
  );
}

/**
 * Match indicator — green check or red cross with text.
 * Mirrors the designer's `.match` indicator from forgot-password.html.
 */
function MatchIndicator({ password, confirm }: { password: string; confirm: string }) {
  if (!confirm) return null;
  const matches = password === confirm;
  return (
    <div
      className="inline-flex items-center gap-1.5 text-[11px] font-medium"
      style={{
        color: matches ? "var(--success)" : "var(--danger-text)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        {matches ? <path d="m5 12 5 5L20 7" /> : <path d="M6 6 18 18 M18 6 6 18" />}
      </svg>
      <span>{matches ? "Passwords match" : "Passwords don't match"}</span>
    </div>
  );
}

/**
 * Stepper — horizontal dots with connectors. Mirrors the designer's
 * `.stepper` component from request-access.html.
 */
function Stepper({
  currentStep,
  totalSteps,
  labels,
}: {
  currentStep: number;
  totalSteps: number;
  labels: string[];
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={currentStep}
      className="flex items-center gap-1.5"
    >
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const state =
          stepNumber < currentStep ? "complete" : stepNumber === currentStep ? "active" : "idle";
        const isLast = stepNumber === totalSteps;
        return (
          <div key={stepNumber} className="flex flex-1 items-center gap-1.5">
            <div className="flex flex-col items-center gap-1">
              <div
                aria-hidden
                className={
                  "grid h-7 w-7 place-items-center rounded-full text-[11px] font-medium transition " +
                  (state === "active"
                    ? "bg-[color:var(--brand-secondary)] text-white dark:bg-[color:var(--brand-accent)] dark:text-white"
                    : state === "complete"
                      ? "bg-[color:var(--success)] text-white"
                      : "bg-[color:var(--bg-page-subtle)] text-[color:var(--text-muted)] border border-[color:var(--border)]")
                }
              >
                {state === "complete" ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="m3 8.5 3.5 3.5L13 5" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={
                  "text-[10px] font-medium uppercase tracking-[0.1em] " +
                  (state === "active" || state === "complete"
                    ? "text-[color:var(--text-primary)]"
                    : "text-[color:var(--text-muted)]")
                }
              >
                {labels[index]}
              </span>
            </div>
            {!isLast ? (
              <div
                aria-hidden
                className={
                  "mb-5 h-[1px] flex-1 transition " +
                  (state === "complete" ? "bg-[color:var(--success)]" : "bg-[color:var(--border)]")
                }
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Account type card — radio-style card with icon + label + check indicator.
 * Mirrors the designer's `.account-card` from request-access.html.
 */
function AccountTypeCard({
  value,
  label,
  icon,
  checked,
  onSelect,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={
        "flex cursor-pointer items-center gap-3 rounded-lg border-[1.5px] p-3.5 transition " +
        (checked
          ? "border-[color:var(--brand-secondary)] bg-[color:var(--badge-primary-bg)] dark:border-[color:var(--brand-accent)] dark:bg-[color:var(--brand-accent-soft)]"
          : "border-[color:var(--border)] bg-[color:var(--bg-elevated)] hover:border-[color:var(--border-strong)]")
      }
    >
      <input
        type="radio"
        name="accountType"
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        className={
          "grid h-9 w-9 flex-shrink-0 place-items-center rounded-md " +
          (checked
            ? "bg-[color:var(--brand-secondary)] text-white dark:bg-[color:var(--brand-accent)]"
            : "bg-[color:var(--bg-page-subtle)] text-[color:var(--text-secondary)]")
        }
      >
        <span className="block h-[18px] w-[18px]">{icon}</span>
      </span>
      <span className="flex-1 text-[14px] font-medium text-[color:var(--text-primary)]">{label}</span>
      <span
        aria-hidden
        className={
          "grid h-[18px] w-[18px] place-items-center rounded-full border-[1.5px] transition " +
          (checked
            ? "border-[color:var(--brand-secondary)] bg-[color:var(--brand-secondary)] text-white dark:border-[color:var(--brand-accent)] dark:bg-[color:var(--brand-accent)]"
            : "border-[color:var(--border-strong)] bg-transparent")
        }
      >
        {checked ? (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
            <path d="m3 8.5 3.5 3.5L13 5" />
          </svg>
        ) : null}
      </span>
    </label>
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
