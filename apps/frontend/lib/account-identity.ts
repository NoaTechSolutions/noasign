// Single source of truth for "person vs business" display, so every surface
// (Topbar, WelcomeCard, ...) resolves the account name the SAME way. A business
// user shows the company name; an individual shows their person name — regardless
// of plan (a Receipts user can later migrate to a documents plan and must look
// identical to a documents user of the same account type).

export function isIndividualAccount(accountType?: string | null): boolean {
  return (accountType ?? '').toUpperCase() === 'INDIVIDUAL';
}

/**
 * The primary display name: person name for INDIVIDUAL accounts, company name
 * otherwise (BUSINESS / SUPERADMIN / unknown). Mirrors the Topbar/ProfileHeaderCard
 * logic (`isIndividual ? personName : companyName`).
 */
export function resolveAccountName(args: {
  accountType?: string | null;
  personName?: string | null;
  companyName?: string | null;
}): string {
  const { accountType, personName, companyName } = args;
  if (isIndividualAccount(accountType)) {
    return personName?.trim() || 'Your account';
  }
  return companyName?.trim() || personName?.trim() || 'Your company';
}
