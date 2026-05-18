"use client";

import { useEffect, useRef, useState, type ChangeEvent, type MutableRefObject } from "react";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronRight,
  Compass,
  Factory,
  FileText,
  Globe,
  Landmark,
  Mail,
  MapPinned,
  MapPlus,
  Pencil,
  Phone,
  Pin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleLayout } from "@/components/layouts";
import {
  formatUsPhone,
  getCompanyInitials,
  toTitleCase,
} from "@/lib/format";
import { DetailRow, EditableField } from "@/components/dashboard/shared/ui";

// ─── Types (narrowed from monolith Props) ─────────────────────────────────────

type User = {
  id?: string | null;
  companyProfileId?: string | null;
  email: string;
  role: string;
  status: string;
  mustChangePassword?: boolean;
  accountType?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  avatarUrl?: string | null;
} | null;

type CompanyProfile = {
  id: string;
  companyName: string;
  legalName: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  insuranceName: string | null;
  insurancePhone: string | null;
  insurancePolicyNumber: string | null;
  contactEmail: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactTitle: string | null;
  contactPhone: string | null;
  contactAddressLine1: string | null;
  contactAddressLine2: string | null;
  contactCity: string | null;
  contactState: string | null;
  contactZipCode: string | null;
  contactCountry: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  logoUrl: string | null;
  licenseNumber: string | null;
  planName: string;
} | null;

type Usage = {
  planName: string;
  billingPeriod: string;
  monthlyDocLimit: number;
  documentsUsed: number;
  remainingDocuments: number | null;
  isUnlimited: boolean;
  overagePrice: string | number;
  overageDocuments: number;
} | null;

type UpdateMePayload = {
  firstName?: string;
  lastName?: string;
  title?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  avatarUrl?: string;
};

type UpdateCompanyProfilePayload = {
  companyName?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  insuranceName?: string;
  insurancePhone?: string;
  insurancePolicyNumber?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logoUrl?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactAddressLine1?: string;
  contactAddressLine2?: string;
  contactCity?: string;
  contactState?: string;
  contactZipCode?: string;
  contactCountry?: string;
};

interface ProfilePanelProps {
  user: User;
  companyProfile: CompanyProfile;
  usage: Usage;
  currentUserRole: string | null;
  onUpdateMe: (payload: UpdateMePayload) => Promise<unknown>;
  onUpdateCompanyProfile: (payload: UpdateCompanyProfilePayload) => Promise<unknown>;
  navGuardRef: MutableRefObject<((onGo: () => void) => void) | null>;
}

// ─── Profile-only helpers (moved from monolith) ───────────────────────────────

function ProfileChip({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elevated)]/88 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)]">
      {label}
    </div>
  );
}

function ProfileEditActions({
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
}: {
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full border border-transparent bg-[color:var(--button-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--button-primary-hover)]"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="rounded-full border border-[color:var(--border)] bg-[color:var(--button-neutral-hover)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-primary)] transition hover:bg-[color:var(--button-neutral)] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="rounded-full bg-[color:var(--button-success)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[color:var(--button-success-hover)] disabled:opacity-60"
      >
        {isSaving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function buildChangedProfilePayload(
  original: Record<string, string>,
  current: Record<string, string>,
) {
  return Object.fromEntries(
    Object.entries(current).filter(([key, value]) => {
      const normalizedCurrent = value.trim();
      const normalizedOriginal = (original[key] ?? "").trim();
      return normalizedCurrent !== normalizedOriginal;
    }),
  );
}

function splitFullName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const parts = normalized.split(" ");
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1] ?? "",
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function resizeImageFile(file: File, maxDimension: number) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return source;
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/webp", 0.88);
}

async function resizeImageFileSquare(file: File, size: number) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);

  // Center-crop to square, then scale to target size
  const cropSize = Math.min(image.width, image.height);
  const srcX = Math.floor((image.width - cropSize) / 2);
  const srcY = Math.floor((image.height - cropSize) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    return source;
  }

  context.drawImage(image, srcX, srcY, cropSize, cropSize, 0, 0, size, size);
  return canvas.toDataURL("image/webp", 0.88);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read image file"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image preview"));
    image.src = source;
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfilePanel({
  user,
  companyProfile,
  usage,
  currentUserRole,
  onUpdateMe,
  onUpdateCompanyProfile,
  navGuardRef,
}: ProfilePanelProps) {
  const companyName = companyProfile?.companyName ?? "Company not defined";
  const contactName = [companyProfile?.contactFirstName, companyProfile?.contactLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const primaryContact = contactName || companyProfile?.contactEmail || "Contact not defined";
  const location = [companyProfile?.city, companyProfile?.state, companyProfile?.country]
    .filter(Boolean)
    .join(", ");
  const logoFallback = getCompanyInitials(companyProfile?.companyName);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingCompanyDetails, setIsEditingCompanyDetails] = useState(false);
  const [isEditingInsurance, setIsEditingInsurance] = useState(false);
  const [isEditingPrimaryContact, setIsEditingPrimaryContact] = useState(false);
  const [isCompanyDetailsOpen, setIsCompanyDetailsOpen] = useState(true);
  const [isInsuranceOpen, setIsInsuranceOpen] = useState(false);
  const [isPrimaryContactOpen, setIsPrimaryContactOpen] = useState(
    currentUserRole !== "MASTER" && user?.accountType === "INDIVIDUAL",
  );
  const [isSavingCompanyDetails, setIsSavingCompanyDetails] = useState(false);
  const [isSavingInsurance, setIsSavingInsurance] = useState(false);
  const [isSavingPrimaryContact, setIsSavingPrimaryContact] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [profileErrorMessage, setProfileErrorMessage] = useState("");
  const [profileSuccessMessage, setProfileSuccessMessage] = useState("");
  const [companyDetailsForm, setCompanyDetailsForm] = useState({
    companyName: "",
    legalName: "",
    industry: "",
    licenseNumber: "",
    phone: "",
    phone2: "",
    email: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    state: "",
    city: "",
    zipCode: "",
  });
  const [insuranceForm, setInsuranceForm] = useState({
    insuranceName: "",
    insurancePhone: "",
    insurancePolicyNumber: "",
  });
  const [primaryContactForm, setPrimaryContactForm] = useState({
    contactFullName: "",
    contactTitle: "",
    contactEmail: "",
    contactPhone: "",
    contactAddressLine1: "",
    contactAddressLine2: "",
    contactState: "",
    contactCity: "",
    contactZipCode: "",
  });
  const [userProfileForm, setUserProfileForm] = useState({
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    title: user?.title ?? "",
    phone: user?.phone ?? "",
    addressLine1: user?.addressLine1 ?? "",
    addressLine2: user?.addressLine2 ?? "",
    city: user?.city ?? "",
    state: user?.state ?? "",
    zipCode: user?.zipCode ?? "",
  });
  const [isEditingUserProfile, setIsEditingUserProfile] = useState(false);
  const [isSavingUserProfile, setIsSavingUserProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const userAvatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setUserProfileForm({
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      title: user?.title ?? "",
      phone: formatUsPhone(user?.phone ?? ""),
      addressLine1: user?.addressLine1 ?? "",
      addressLine2: user?.addressLine2 ?? "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      zipCode: user?.zipCode ?? "",
    });
  }, [user?.firstName, user?.lastName, user?.title, user?.phone, user?.addressLine1, user?.addressLine2, user?.city, user?.state, user?.zipCode]);

  useEffect(() => {
    if (currentUserRole !== "MASTER" && user?.accountType === "INDIVIDUAL") {
      setIsPrimaryContactOpen(true);
    }
  }, [currentUserRole, user?.accountType]);

  useEffect(() => {
    setCompanyDetailsForm({
      companyName: companyProfile?.companyName ?? "",
      legalName: companyProfile?.legalName ?? "",
      industry: companyProfile?.industry ?? "",
      licenseNumber: companyProfile?.licenseNumber ?? "",
      phone: formatUsPhone(companyProfile?.phone ?? ""),
      phone2: formatUsPhone(companyProfile?.phone2 ?? ""),
      email: companyProfile?.email ?? "",
      website: companyProfile?.website ?? "",
      addressLine1: companyProfile?.addressLine1 ?? "",
      addressLine2: companyProfile?.addressLine2 ?? "",
      state: companyProfile?.state ?? "",
      city: companyProfile?.city ?? "",
      zipCode: companyProfile?.zipCode ?? "",
    });
    setInsuranceForm({
      insuranceName: companyProfile?.insuranceName ?? "",
      insurancePhone: formatUsPhone(companyProfile?.insurancePhone ?? ""),
      insurancePolicyNumber: companyProfile?.insurancePolicyNumber ?? "",
    });
    setPrimaryContactForm({
      contactFullName: [companyProfile?.contactFirstName, companyProfile?.contactLastName]
        .filter(Boolean)
        .join(" ")
        .trim(),
      contactTitle: companyProfile?.contactTitle ?? "",
      contactEmail: companyProfile?.contactEmail ?? "",
      contactPhone: formatUsPhone(companyProfile?.contactPhone ?? ""),
      contactAddressLine1: companyProfile?.contactAddressLine1 ?? "",
      contactAddressLine2: companyProfile?.contactAddressLine2 ?? "",
      contactState: companyProfile?.contactState ?? "",
      contactCity: companyProfile?.contactCity ?? "",
      contactZipCode: companyProfile?.contactZipCode ?? "",
    });
  }, [companyProfile]);

  useEffect(() => {
    navGuardRef.current = (onGo: () => void) => {
      const isEditing = isEditingUserProfile || isEditingCompanyDetails || isEditingInsurance || isEditingPrimaryContact;
      if (!isEditing) {
        onGo();
        return;
      }

      let dirty = false;
      if (isEditingUserProfile) {
        dirty = Object.keys(buildChangedProfilePayload(getUserProfileOriginal(), userProfileForm)).length > 0;
      } else if (isEditingCompanyDetails) {
        dirty = Object.keys(buildChangedProfilePayload(
          { companyName: companyProfile?.companyName ?? "", legalName: companyProfile?.legalName ?? "", industry: companyProfile?.industry ?? "", licenseNumber: companyProfile?.licenseNumber ?? "", phone: formatUsPhone(companyProfile?.phone ?? ""), phone2: formatUsPhone(companyProfile?.phone2 ?? ""), email: companyProfile?.email ?? "", website: companyProfile?.website ?? "", addressLine1: companyProfile?.addressLine1 ?? "", state: companyProfile?.state ?? "", city: companyProfile?.city ?? "", zipCode: companyProfile?.zipCode ?? "" },
          companyDetailsForm,
        )).length > 0;
      } else if (isEditingInsurance) {
        dirty = Object.keys(buildChangedProfilePayload(
          { insuranceName: companyProfile?.insuranceName ?? "", insurancePhone: formatUsPhone(companyProfile?.insurancePhone ?? ""), insurancePolicyNumber: companyProfile?.insurancePolicyNumber ?? "" },
          { insuranceName: insuranceForm.insuranceName, insurancePhone: formatUsPhone(insuranceForm.insurancePhone), insurancePolicyNumber: insuranceForm.insurancePolicyNumber },
        )).length > 0;
      } else if (isEditingPrimaryContact) {
        dirty = Object.keys(buildChangedProfilePayload(
          { contactFullName: [companyProfile?.contactFirstName, companyProfile?.contactLastName].filter(Boolean).join(" ").trim(), contactTitle: companyProfile?.contactTitle ?? "", contactEmail: companyProfile?.contactEmail ?? "", contactPhone: formatUsPhone(companyProfile?.contactPhone ?? ""), contactAddressLine1: companyProfile?.contactAddressLine1 ?? "", contactState: companyProfile?.contactState ?? "", contactCity: companyProfile?.contactCity ?? "", contactZipCode: companyProfile?.contactZipCode ?? "" },
          primaryContactForm,
        )).length > 0;
      }

      if (!dirty) {
        setIsEditingUserProfile(false);
        setIsEditingCompanyDetails(false);
        setIsEditingInsurance(false);
        setIsEditingPrimaryContact(false);
        onGo();
        return;
      }

      setConfirmDialog({
        title: "Unsaved changes",
        message: "You have unsaved changes. Are you sure you want to leave without saving?",
        onConfirm: () => {
          setIsEditingUserProfile(false);
          setIsEditingCompanyDetails(false);
          setIsEditingInsurance(false);
          setIsEditingPrimaryContact(false);
          setConfirmDialog(null);
          onGo();
        },
      });
    };
    return () => {
      navGuardRef.current = null;
    };
  }, [isEditingUserProfile, isEditingCompanyDetails, isEditingInsurance, isEditingPrimaryContact, userProfileForm, companyDetailsForm, insuranceForm, primaryContactForm, companyProfile, user, navGuardRef]);

  async function saveCompanyDetails() {
    if (companyDetailsForm.email.trim() && !isValidEmail(companyDetailsForm.email)) {
      setProfileErrorMessage("Enter a valid company email address");
      return;
    }

    const payload = buildChangedProfilePayload(
      {
        companyName: companyProfile?.companyName ?? "",
        legalName: companyProfile?.legalName ?? "",
        industry: companyProfile?.industry ?? "",
        licenseNumber: companyProfile?.licenseNumber ?? "",
        phone: formatUsPhone(companyProfile?.phone ?? ""),
        phone2: formatUsPhone(companyProfile?.phone2 ?? ""),
        email: companyProfile?.email ?? "",
        website: companyProfile?.website ?? "",
        addressLine1: companyProfile?.addressLine1 ?? "",
        addressLine2: companyProfile?.addressLine2 ?? "",
        state: companyProfile?.state ?? "",
        city: companyProfile?.city ?? "",
        zipCode: companyProfile?.zipCode ?? "",
      },
      {
        ...companyDetailsForm,
        phone: formatUsPhone(companyDetailsForm.phone),
        phone2: formatUsPhone(companyDetailsForm.phone2),
      },
    );

    if (Object.keys(payload).length === 0) {
      setIsEditingCompanyDetails(false);
      return;
    }

    setIsSavingCompanyDetails(true);
    try {
      await onUpdateCompanyProfile(payload);
      setIsEditingCompanyDetails(false);
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsSavingCompanyDetails(false);
    }
  }

  async function saveInsurance() {
    const payload = buildChangedProfilePayload(
      {
        insuranceName: companyProfile?.insuranceName ?? "",
        insurancePhone: formatUsPhone(companyProfile?.insurancePhone ?? ""),
        insurancePolicyNumber: companyProfile?.insurancePolicyNumber ?? "",
      },
      {
        insuranceName: insuranceForm.insuranceName,
        insurancePhone: formatUsPhone(insuranceForm.insurancePhone),
        insurancePolicyNumber: insuranceForm.insurancePolicyNumber,
      },
    );

    if (Object.keys(payload).length === 0) {
      setIsEditingInsurance(false);
      return;
    }

    setIsSavingInsurance(true);
    try {
      await onUpdateCompanyProfile(payload);
      setIsEditingInsurance(false);
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsSavingInsurance(false);
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      event.target.value = "";
      return;
    }

    const maxFileSizeBytes = 3 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      event.target.value = "";
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const avatarUrl = await resizeImageFileSquare(file, 512);
      await onUpdateMe({ avatarUrl });
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  }

  function getUserProfileOriginal() {
    return {
      fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
      title: user?.title ?? "",
      phone: user?.phone ?? "",
      addressLine1: user?.addressLine1 ?? "",
      addressLine2: user?.addressLine2 ?? "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      zipCode: user?.zipCode ?? "",
    };
  }

  async function saveUserProfile() {
    const changed = buildChangedProfilePayload(getUserProfileOriginal(), userProfileForm);
    if (Object.keys(changed).length === 0) {
      setIsEditingUserProfile(false);
      return;
    }

    const { firstName, lastName } = splitFullName(userProfileForm.fullName);

    setIsSavingUserProfile(true);
    try {
      await onUpdateMe({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        title: userProfileForm.title.trim() || undefined,
        phone: userProfileForm.phone.trim() || undefined,
        addressLine1: userProfileForm.addressLine1.trim() || undefined,
        addressLine2: userProfileForm.addressLine2.trim() || undefined,
        city: userProfileForm.city.trim() || undefined,
        state: userProfileForm.state.trim() || undefined,
        zipCode: userProfileForm.zipCode.trim() || undefined,
      });
      setIsEditingUserProfile(false);
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsSavingUserProfile(false);
    }
  }

  async function savePrimaryContact() {
    const { firstName, lastName } = splitFullName(primaryContactForm.contactFullName);

    if (primaryContactForm.contactEmail.trim() && !isValidEmail(primaryContactForm.contactEmail)) {
      setProfileErrorMessage("Enter a valid primary contact email address");
      return;
    }

    const payload = buildChangedProfilePayload(
      {
        contactFirstName: companyProfile?.contactFirstName ?? "",
        contactLastName: companyProfile?.contactLastName ?? "",
        contactTitle: companyProfile?.contactTitle ?? "",
        contactEmail: companyProfile?.contactEmail ?? "",
        contactPhone: formatUsPhone(companyProfile?.contactPhone ?? ""),
        contactAddressLine1: companyProfile?.contactAddressLine1 ?? "",
        contactAddressLine2: companyProfile?.contactAddressLine2 ?? "",
        contactState: companyProfile?.contactState ?? "",
        contactCity: companyProfile?.contactCity ?? "",
        contactZipCode: companyProfile?.contactZipCode ?? "",
      },
      {
        contactFirstName: firstName,
        contactLastName: lastName,
        contactTitle: primaryContactForm.contactTitle,
        contactEmail: primaryContactForm.contactEmail,
        contactPhone: formatUsPhone(primaryContactForm.contactPhone),
        contactAddressLine1: primaryContactForm.contactAddressLine1,
        contactAddressLine2: primaryContactForm.contactAddressLine2,
        contactState: primaryContactForm.contactState,
        contactCity: primaryContactForm.contactCity,
        contactZipCode: primaryContactForm.contactZipCode,
      },
    );

    if (Object.keys(payload).length === 0) {
      setIsEditingPrimaryContact(false);
      return;
    }

    setIsSavingPrimaryContact(true);
    try {
      await onUpdateCompanyProfile(payload);
      setIsEditingPrimaryContact(false);
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsSavingPrimaryContact(false);
    }
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      event.target.value = "";
      return;
    }

    // Keep uploads lightweight enough to store in the existing logoUrl string field.
    const maxFileSizeBytes = 3 * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      event.target.value = "";
      return;
    }

    setIsUploadingLogo(true);

    try {
      const logoUrl = await resizeImageFile(file, 512);
      await onUpdateCompanyProfile({ logoUrl });
      setProfileSuccessMessage("Changes saved successfully");
    } finally {
      setIsUploadingLogo(false);
      event.target.value = "";
    }
  }

  function toggleCompanyDetailsOpen() {
    setIsCompanyDetailsOpen((current) => {
      const next = !current;
      if (!next) {
        setIsEditingCompanyDetails(false);
      }
      return next;
    });
  }

  function toggleInsuranceOpen() {
    setIsInsuranceOpen((current) => {
      const next = !current;
      if (!next) {
        setIsEditingInsurance(false);
      }
      return next;
    });
  }

  function togglePrimaryContactOpen() {
    setIsPrimaryContactOpen((current) => {
      const next = !current;
      if (!next) {
        setIsEditingPrimaryContact(false);
      }
      return next;
    });
  }

  if (currentUserRole !== "MASTER" && user?.accountType === "INDIVIDUAL") {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    const initials = (() => {
      if (user.firstName && user.lastName) {
        return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
      }
      if (user.firstName) {
        return user.firstName.slice(0, 2).toUpperCase();
      }
      return user.email.slice(0, 2).toUpperCase();
    })();

    return (
      <ModuleLayout
        title="Profile"
        description="Manage your personal information"
        icon={<UserRound className="h-5 w-5" />}
      >
        <section className="grid gap-4">
          {/* Error / success popups — identical to MASTER */}
          {profileErrorMessage ? (
            <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
              <button type="button" aria-label="Close error popup" className="absolute inset-0" onClick={() => setProfileErrorMessage("")} />
              <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--danger-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
                <div className="text-lg font-semibold text-[color:var(--text-primary)]">Validation error</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{profileErrorMessage}</p>
                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={() => setProfileErrorMessage("")} className="rounded-xl bg-[color:var(--button-danger)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-danger-hover)]">Close</button>
                </div>
              </div>
            </div>
          ) : null}
          {profileSuccessMessage ? (
            <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
              <button type="button" aria-label="Close success popup" className="absolute inset-0" onClick={() => setProfileSuccessMessage("")} />
              <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--success-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
                <div className="text-lg font-semibold text-[color:var(--text-primary)]">Saved</div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{profileSuccessMessage}</p>
                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={() => setProfileSuccessMessage("")} className="rounded-xl bg-[color:var(--button-success)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-success-hover)]">Close</button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Hero — same gradient/layout as MASTER, avatar circle with edit button */}
          <div className="rounded-[1.9rem] border border-[color:var(--brand-accent-soft)] bg-[linear-gradient(135deg,#ffffff_0%,#f0f4ff_42%,#dbeafe_100%)] p-6 shadow-[0_24px_70px_rgba(36,76,144,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b0f1a_0%,#0f1628_42%,#1d4ed8_100%)] dark:shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start md:gap-5">
                <div className="relative h-24 w-24 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white text-2xl font-semibold text-[color:var(--brand-secondary)] shadow-[0_18px_40px_rgba(37,99,235,0.18)] dark:border-white/10 dark:bg-[color:var(--bg-page)] dark:text-[color:var(--brand-accent)] sm:h-20 sm:w-20 sm:text-xl md:h-24 md:w-24 md:text-2xl">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => userAvatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute -bottom-2 -right-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[color:var(--button-primary)] text-white shadow-[0_10px_22px_rgba(37,99,235,0.30)] transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[color:var(--bg-page)]"
                    aria-label="Upload profile picture"
                    title="Upload profile picture"
                  >
                    {isUploadingAvatar ? (
                      <span className="text-[10px] font-semibold">...</span>
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                  </button>
                  <input
                    ref={userAvatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    capture="environment"
                    className="hidden"
                    onChange={(event) => void handleAvatarUpload(event)}
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)] md:text-5xl">
                    {displayName}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)] dark:text-[color:var(--text-primary)]/88">{user.email}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <ProfileChip label={user.role} />
                    {user.accountType ? <ProfileChip label={user.accountType.charAt(0) + user.accountType.slice(1).toLowerCase()} /> : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Personal info — same card, edit button and all fields identical to MASTER Primary Contact */}
          <div className="grid gap-4">
            <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)]">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={togglePrimaryContactOpen}
                  className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)] transition hover:text-[color:var(--text-secondary)] dark:text-[color:var(--text-muted)] dark:hover:text-[color:var(--text-primary)]"
                  aria-expanded={isPrimaryContactOpen}
                >
                  <ChevronRight className={cn("h-4 w-4 transition-transform", isPrimaryContactOpen && "rotate-90")} />
                  <span>Personal info</span>
                </button>
                {isPrimaryContactOpen ? (
                  <ProfileEditActions
                    isEditing={isEditingUserProfile}
                    isSaving={isSavingUserProfile}
                    onEdit={() => setIsEditingUserProfile(true)}
                    onCancel={() => {
                      const isDirty = Object.keys(buildChangedProfilePayload(getUserProfileOriginal(), userProfileForm)).length > 0;
                      if (!isDirty) { setIsEditingUserProfile(false); setUserProfileForm(getUserProfileOriginal()); return; }
                      setConfirmDialog({ title: "Unsaved changes", message: "You have unsaved changes. Are you sure you want to cancel?", onConfirm: () => { setConfirmDialog(null); setIsEditingUserProfile(false); setUserProfileForm(getUserProfileOriginal()); } });
                    }}
                    onSave={() => void saveUserProfile()}
                  />
                ) : null}
              </div>
              {isPrimaryContactOpen ? (isEditingUserProfile ? (
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={userProfileForm.fullName} onChange={(value) => setUserProfileForm((c) => ({ ...c, fullName: toTitleCase(value.replace(/\d/g, "")) }))} />
                    <EditableField icon={<Briefcase className="h-4 w-4" />} label="Title" value={userProfileForm.title} onChange={(value) => setUserProfileForm((c) => ({ ...c, title: toTitleCase(value) }))} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <EditableField icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} onChange={() => {}} disabled={true} />
                    <EditableField icon={<Phone className="h-4 w-4" />} label="Phone" value={userProfileForm.phone} onChange={(value) => setUserProfileForm((c) => ({ ...c, phone: formatUsPhone(value) }))} />
                  </div>
                  <EditableField icon={<MapPlus className="h-4 w-4" />} label="Address line 1" value={userProfileForm.addressLine1} onChange={(value) => setUserProfileForm((c) => ({ ...c, addressLine1: value }))} />
                  <div className="grid gap-3 md:grid-cols-3">
                    <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={userProfileForm.city} onChange={(value) => setUserProfileForm((c) => ({ ...c, city: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                    <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={userProfileForm.state} onChange={(value) => setUserProfileForm((c) => ({ ...c, state: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                    <EditableField icon={<Pin className="h-4 w-4" />} label="ZIP code" value={userProfileForm.zipCode} onChange={(value) => setUserProfileForm((c) => ({ ...c, zipCode: value }))} />
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={[user.firstName, user.lastName].filter(Boolean).join(" ")} />
                    <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Title" value={user.title} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={user.email} />
                    <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={formatUsPhone(user.phone ?? "")} />
                  </div>
                  <DetailRow icon={<MapPlus className="h-4 w-4" />} label="Address line 1" value={user.addressLine1} />
                  {user.addressLine2 ? <DetailRow icon={<MapPinned className="h-4 w-4" />} label="Address line 2" value={user.addressLine2} /> : null}
                  <div className="grid gap-3 md:grid-cols-3">
                    <DetailRow icon={<Landmark className="h-4 w-4" />} label="State" value={user.state} />
                    <DetailRow icon={<Compass className="h-4 w-4" />} label="City" value={user.city} />
                    <DetailRow icon={<Pin className="h-4 w-4" />} label="ZIP code" value={user.zipCode} />
                  </div>
                </div>
              )) : null}
            </div>
          </div>
        </section>
      </ModuleLayout>
    );
  }

  // Only MASTER gets the full company profile render below

  return (
    <ModuleLayout
      title="Profile"
      description="Manage your company profile and settings"
      icon={<UserRound className="h-5 w-5" />}
    >
      <section className="grid gap-4">
        {profileErrorMessage ? (
          <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
            <button
              type="button"
              aria-label="Close error popup"
              className="absolute inset-0"
              onClick={() => setProfileErrorMessage("")}
            />
            <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--danger-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
              <div className="text-lg font-semibold text-[color:var(--text-primary)]">Validation error</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                {profileErrorMessage}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setProfileErrorMessage("")}
                  className="rounded-xl bg-[color:var(--button-danger)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-danger-hover)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {profileSuccessMessage ? (
          <div className="fixed inset-0 z-[70] flex items-start justify-center md:items-center bg-black/60 backdrop-blur p-4 pt-20 md:pt-0">
            <button
              type="button"
              aria-label="Close success popup"
              className="absolute inset-0"
              onClick={() => setProfileSuccessMessage("")}
            />
            <div className="relative z-[71] w-full max-w-sm rounded-[1.75rem] border border-[color:var(--success-border)] bg-[color:var(--bg-elevated)] p-6 shadow-[var(--shadow-modal)]">
              <div className="text-lg font-semibold text-[color:var(--text-primary)]">Saved</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                {profileSuccessMessage}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setProfileSuccessMessage("")}
                  className="rounded-xl bg-[color:var(--button-success)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-success-hover)]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <div className="rounded-[1.9rem] border border-[color:var(--brand-accent-soft)] bg-[linear-gradient(135deg,#ffffff_0%,#f0f4ff_42%,#dbeafe_100%)] p-6 shadow-[0_24px_70px_rgba(36,76,144,0.14)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#0b0f1a_0%,#0f1628_42%,#1d4ed8_100%)] dark:shadow-[0_24px_70px_rgba(16,37,56,0.22)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start md:gap-5">
              <div className="relative h-24 w-24 shrink-0 sm:h-20 sm:w-20 md:h-24 md:w-24">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white text-2xl font-semibold text-[color:var(--brand-secondary)] shadow-[0_18px_40px_rgba(37,99,235,0.18)] dark:border-white/10 dark:bg-[color:var(--bg-page)] dark:text-[color:var(--brand-accent)] sm:h-20 sm:w-20 sm:text-xl md:h-24 md:w-24 md:text-2xl">
                  {companyProfile?.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={companyProfile.logoUrl}
                      alt={`${companyName} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{logoFallback}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="absolute -bottom-2 -right-2 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[color:var(--button-primary)] text-white shadow-[0_10px_22px_rgba(37,99,235,0.30)] transition hover:bg-[color:var(--button-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[color:var(--bg-page)]"
                  aria-label="Upload company logo"
                  title="Upload logo"
                >
                  {isUploadingLogo ? (
                    <span className="text-[10px] font-semibold">...</span>
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => void handleLogoUpload(event)}
                />
              </div>
              <div className="text-center sm:text-left">
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)] md:text-5xl">
                  {companyName}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] dark:text-[color:var(--text-primary)]/88 md:text-base">
                  {companyProfile?.email ?? ""}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ProfileChip label={companyProfile?.industry ?? "Industry not defined"} />
                  <ProfileChip label={location || "Location not defined"} />
                  <ProfileChip label={primaryContact} />
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--brand-accent-soft)] bg-white/90 px-4 py-3 text-[color:var(--text-primary)] shadow-[0_10px_30px_rgba(37,99,235,0.10)] backdrop-blur dark:border-white/14 dark:bg-white/10 dark:text-[color:var(--text-primary)] dark:shadow-none">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] dark:text-[color:var(--text-primary)]/60">Current plan</span>
              <span className="rounded-full bg-[color:var(--button-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.32)]">
                {usage?.planName ?? companyProfile?.planName ?? "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleCompanyDetailsOpen}
                className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--text-muted)] transition hover:text-[color:var(--text-secondary)] dark:text-[color:var(--text-muted)] dark:hover:text-[color:var(--text-primary)]"
                aria-expanded={isCompanyDetailsOpen}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", isCompanyDetailsOpen && "rotate-90")} />
                <span>Company details</span>
              </button>
              {isCompanyDetailsOpen ? (
                <ProfileEditActions
                  isEditing={isEditingCompanyDetails}
                  isSaving={isSavingCompanyDetails}
                  onEdit={() => setIsEditingCompanyDetails(true)}
                  onCancel={() => {
                    const original = {
                      companyName: companyProfile?.companyName ?? "",
                      legalName: companyProfile?.legalName ?? "",
                      industry: companyProfile?.industry ?? "",
                      licenseNumber: companyProfile?.licenseNumber ?? "",
                      phone: formatUsPhone(companyProfile?.phone ?? ""),
                      phone2: formatUsPhone(companyProfile?.phone2 ?? ""),
                      email: companyProfile?.email ?? "",
                      website: companyProfile?.website ?? "",
                      addressLine1: companyProfile?.addressLine1 ?? "",
                      addressLine2: companyProfile?.addressLine2 ?? "",
                      state: companyProfile?.state ?? "",
                      city: companyProfile?.city ?? "",
                      zipCode: companyProfile?.zipCode ?? "",
                    };
                    const isDirty = Object.keys(buildChangedProfilePayload(original, companyDetailsForm)).length > 0;
                    if (!isDirty) { setIsEditingCompanyDetails(false); setCompanyDetailsForm(original); return; }
                    setConfirmDialog({ title: "Unsaved changes", message: "You have unsaved changes. Are you sure you want to cancel?", onConfirm: () => { setConfirmDialog(null); setIsEditingCompanyDetails(false); setCompanyDetailsForm(original); } });
                  }}
                  onSave={() => void saveCompanyDetails()}
                />
              ) : null}
            </div>
            {isCompanyDetailsOpen ? (isEditingCompanyDetails ? (
              <div className="mt-5 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <EditableField icon={<Building2 className="h-4 w-4" />} label="Company name" value={companyDetailsForm.companyName} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, companyName: toTitleCase(value) }))} />
                  <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Legal name" value={companyDetailsForm.legalName} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, legalName: toTitleCase(value) }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <EditableField icon={<Factory className="h-4 w-4" />} label="Industry" value={companyDetailsForm.industry} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, industry: value }))} />
                  <EditableField icon={<FileText className="h-4 w-4" />} label="License number" value={companyDetailsForm.licenseNumber} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, licenseNumber: value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <EditableField icon={<Phone className="h-4 w-4" />} label="Phone" value={companyDetailsForm.phone} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, phone: formatUsPhone(value) }))} />
                  <EditableField icon={<Phone className="h-4 w-4" />} label="Fax" value={companyDetailsForm.phone2} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, phone2: formatUsPhone(value) }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <EditableField icon={<Mail className="h-4 w-4" />} label="Company email" value={companyDetailsForm.email} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, email: value }))} />
                  <EditableField icon={<Globe className="h-4 w-4" />} label="Website" value={companyDetailsForm.website} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, website: value }))} />
                </div>
                <EditableField icon={<MapPlus className="h-4 w-4" />} label="Address line 1" value={companyDetailsForm.addressLine1} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, addressLine1: value }))} />
                <div className="grid gap-3 md:grid-cols-3">
                  <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={companyDetailsForm.city} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, city: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                  <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={companyDetailsForm.state} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, state: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                  <EditableField icon={<Pin className="h-4 w-4" />} label="ZIP" value={companyDetailsForm.zipCode} onChange={(value) => setCompanyDetailsForm((current) => ({ ...current, zipCode: value.replace(/\D/g, "") }))} />
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow icon={<Building2 className="h-4 w-4" />} label="Company name" value={companyName} />
                  <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Legal name" value={companyProfile?.legalName ?? ""} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow icon={<Factory className="h-4 w-4" />} label="Industry" value={companyProfile?.industry ?? ""} />
                  <DetailRow icon={<FileText className="h-4 w-4" />} label="License number" value={companyProfile?.licenseNumber ?? ""} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={formatUsPhone(companyProfile?.phone ?? "")} />
                  <DetailRow icon={<Phone className="h-4 w-4" />} label="Fax" value={formatUsPhone(companyProfile?.phone2 ?? "")} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow icon={<Mail className="h-4 w-4" />} label="Company email" value={companyProfile?.email ?? ""} />
                  <DetailRow icon={<Globe className="h-4 w-4" />} label="Website" value={companyProfile?.website ?? ""} />
                </div>
                <DetailRow
                  icon={<MapPlus className="h-4 w-4" />}
                  label="Address line 1"
                  value={companyProfile?.addressLine1 ?? ""}
                />
                {companyProfile?.addressLine2?.trim() ? (
                  <DetailRow
                    icon={<MapPinned className="h-4 w-4" />}
                    label="Address line 2"
                    value={companyProfile.addressLine2}
                  />
                ) : null}
                <div className="grid gap-3 md:grid-cols-3">
                  <DetailRow icon={<Compass className="h-4 w-4" />} label="City" value={companyProfile?.city ?? ""} />
                  <DetailRow icon={<Landmark className="h-4 w-4" />} label="State" value={companyProfile?.state ?? ""} />
                  <DetailRow icon={<Pin className="h-4 w-4" />} label="ZIP" value={companyProfile?.zipCode ?? ""} />
                </div>
              </div>
            )) : null}
          </div>

          <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)] md:p-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleInsuranceOpen}
                className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)] transition hover:text-[color:var(--text-secondary)] dark:text-[color:var(--text-muted)] dark:hover:text-[color:var(--text-primary)]"
                aria-expanded={isInsuranceOpen}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", isInsuranceOpen && "rotate-90")} />
                <span>Insurance</span>
              </button>
              {isInsuranceOpen ? (
                <ProfileEditActions
                  isEditing={isEditingInsurance}
                  isSaving={isSavingInsurance}
                  onEdit={() => setIsEditingInsurance(true)}
                  onCancel={() => {
                    const original = {
                      insuranceName: companyProfile?.insuranceName ?? "",
                      insurancePhone: formatUsPhone(companyProfile?.insurancePhone ?? ""),
                      insurancePolicyNumber: companyProfile?.insurancePolicyNumber ?? "",
                    };
                    const current = {
                      insuranceName: insuranceForm.insuranceName,
                      insurancePhone: formatUsPhone(insuranceForm.insurancePhone),
                      insurancePolicyNumber: insuranceForm.insurancePolicyNumber,
                    };
                    const isDirty = Object.keys(buildChangedProfilePayload(original, current)).length > 0;
                    if (!isDirty) { setIsEditingInsurance(false); setInsuranceForm(original); return; }
                    setConfirmDialog({ title: "Unsaved changes", message: "You have unsaved changes. Are you sure you want to cancel?", onConfirm: () => { setConfirmDialog(null); setIsEditingInsurance(false); setInsuranceForm(original); } });
                  }}
                  onSave={() => void saveInsurance()}
                />
              ) : null}
            </div>
            {isInsuranceOpen ? (isEditingInsurance ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <EditableField icon={<ShieldCheck className="h-4 w-4" />} label="Insurance name" value={insuranceForm.insuranceName} onChange={(value) => setInsuranceForm((current) => ({ ...current, insuranceName: toTitleCase(value) }))} />
                <EditableField icon={<Phone className="h-4 w-4" />} label="Insurance phone" value={insuranceForm.insurancePhone} onChange={(value) => setInsuranceForm((current) => ({ ...current, insurancePhone: formatUsPhone(value) }))} />
                <EditableField icon={<FileText className="h-4 w-4" />} label="Policy number" value={insuranceForm.insurancePolicyNumber} onChange={(value) => setInsuranceForm((current) => ({ ...current, insurancePolicyNumber: value }))} />
              </div>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <DetailRow icon={<ShieldCheck className="h-4 w-4" />} label="Insurance name" value={companyProfile?.insuranceName ?? ""} />
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Insurance phone" value={formatUsPhone(companyProfile?.insurancePhone ?? "")} />
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Policy number" value={companyProfile?.insurancePolicyNumber ?? ""} />
              </div>
            )) : null}
          </div>

          <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_50px_rgba(36,76,144,0.08)] dark:border-white/10 dark:bg-[color:var(--bg-elevated)]/90 dark:shadow-[0_20px_50px_rgba(2,6,23,0.35)]">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={togglePrimaryContactOpen}
                className="inline-flex items-center gap-2 rounded-full text-left text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--text-muted)] transition hover:text-[color:var(--text-secondary)] dark:text-[color:var(--text-muted)] dark:hover:text-[color:var(--text-primary)]"
                aria-expanded={isPrimaryContactOpen}
              >
                <ChevronRight className={cn("h-4 w-4 transition-transform", isPrimaryContactOpen && "rotate-90")} />
                <span>Primary contact</span>
              </button>
              {isPrimaryContactOpen ? (
                <ProfileEditActions
                  isEditing={isEditingPrimaryContact}
                  isSaving={isSavingPrimaryContact}
                  onEdit={() => setIsEditingPrimaryContact(true)}
                  onCancel={() => {
                    const original = {
                      contactFullName: [companyProfile?.contactFirstName, companyProfile?.contactLastName]
                        .filter(Boolean)
                        .join(" ")
                        .trim(),
                      contactTitle: companyProfile?.contactTitle ?? "",
                      contactEmail: companyProfile?.contactEmail ?? "",
                      contactPhone: formatUsPhone(companyProfile?.contactPhone ?? ""),
                      contactAddressLine1: companyProfile?.contactAddressLine1 ?? "",
                      contactAddressLine2: companyProfile?.contactAddressLine2 ?? "",
                      contactState: companyProfile?.contactState ?? "",
                      contactCity: companyProfile?.contactCity ?? "",
                      contactZipCode: companyProfile?.contactZipCode ?? "",
                    };
                    const isDirty = Object.keys(buildChangedProfilePayload(original, primaryContactForm)).length > 0;
                    if (!isDirty) { setIsEditingPrimaryContact(false); setPrimaryContactForm(original); return; }
                    setConfirmDialog({ title: "Unsaved changes", message: "You have unsaved changes. Are you sure you want to cancel?", onConfirm: () => { setConfirmDialog(null); setIsEditingPrimaryContact(false); setPrimaryContactForm(original); } });
                  }}
                  onSave={() => void savePrimaryContact()}
                />
              ) : null}
            </div>
            {isPrimaryContactOpen ? (isEditingPrimaryContact ? (
              <div className="mt-4 grid gap-3">
                <EditableField icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={primaryContactForm.contactFullName} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactFullName: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                <EditableField icon={<Briefcase className="h-4 w-4" />} label="Title" value={primaryContactForm.contactTitle} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactTitle: toTitleCase(value) }))} />
                <div className="grid gap-3 md:grid-cols-2">
                  <EditableField icon={<Mail className="h-4 w-4" />} label="Email" value={primaryContactForm.contactEmail} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactEmail: value }))} />
                  <EditableField icon={<Phone className="h-4 w-4" />} label="Phone" value={primaryContactForm.contactPhone} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactPhone: formatUsPhone(value) }))} />
                </div>
                <EditableField icon={<MapPinned className="h-4 w-4" />} label="Address line 1" value={primaryContactForm.contactAddressLine1} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactAddressLine1: value }))} />
                <div className="grid gap-3 md:grid-cols-3">
                  <EditableField icon={<Compass className="h-4 w-4" />} label="City" value={primaryContactForm.contactCity} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactCity: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                  <EditableField icon={<Landmark className="h-4 w-4" />} label="State" value={primaryContactForm.contactState} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactState: toTitleCase(value.replace(/[0-9]/g, "")) }))} />
                  <EditableField icon={<Pin className="h-4 w-4" />} label="ZIP code" value={primaryContactForm.contactZipCode} onChange={(value) => setPrimaryContactForm((current) => ({ ...current, contactZipCode: value.replace(/\D/g, "") }))} />
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Full name" value={contactName || ""} />
                  <DetailRow icon={<Briefcase className="h-4 w-4" />} label="Title" value={companyProfile?.contactTitle ?? ""} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailRow icon={<Mail className="h-4 w-4" />} label="Email" value={companyProfile?.contactEmail ?? ""} />
                  <DetailRow icon={<Phone className="h-4 w-4" />} label="Phone" value={formatUsPhone(companyProfile?.contactPhone ?? "")} />
                </div>
                <DetailRow
                  icon={<MapPlus className="h-4 w-4" />}
                  label="Address line 1"
                  value={companyProfile?.contactAddressLine1 ?? ""}
                />
                {companyProfile?.contactAddressLine2?.trim() ? (
                  <DetailRow
                    icon={<MapPinned className="h-4 w-4" />}
                    label="Address line 2"
                    value={companyProfile.contactAddressLine2}
                  />
                ) : null}
                <div className="grid gap-3 md:grid-cols-3">
                  <DetailRow icon={<Compass className="h-4 w-4" />} label="City" value={companyProfile?.contactCity ?? ""} />
                  <DetailRow icon={<Landmark className="h-4 w-4" />} label="State" value={companyProfile?.contactState ?? ""} />
                  <DetailRow icon={<Pin className="h-4 w-4" />} label="ZIP code" value={companyProfile?.contactZipCode ?? ""} />
                </div>
              </div>
            )) : null}
          </div>
        </div>
        {confirmDialog ? (
          <div className="fixed inset-0 z-[80] flex items-start justify-center md:items-center bg-black/60 p-4 pt-20 md:pt-0 backdrop-blur">
            <div className="w-full max-w-sm rounded-[1.75rem] border border-[color:var(--border)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[color:var(--bg-page)]">
              <div className="text-lg font-semibold text-[color:var(--text-primary)] dark:text-[color:var(--text-primary)]">{confirmDialog.title}</div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-muted)] dark:text-[color:var(--text-muted)]">{confirmDialog.message}</p>
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="rounded-xl border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] transition hover:bg-[color:var(--bg-page-subtle)] dark:border-white/10 dark:bg-white/[0.04] dark:text-[color:var(--text-primary)] dark:hover:bg-white/10"
                >
                  No
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="rounded-xl bg-[color:var(--button-danger)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--button-danger-hover)]"
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </ModuleLayout>
  );
}
