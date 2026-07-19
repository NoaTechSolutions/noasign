// Export all v2 panel components
export { OverviewPanel } from './OverviewPanel';
export type { OverviewPanelProps } from './OverviewPanel';

export { WelcomeCard } from './WelcomeCard';
export { StatsGrid } from './StatsGrid';
export { StatusBreakdown } from './StatusBreakdown';
export { RecentDocumentsTable } from './RecentDocumentsTable';

// Profile panel V2 (collapsible cards) exports
export { ProfilePanel } from './ProfilePanel';
export type { ProfilePanelProps } from './ProfilePanel';
export { ProfileHeaderCard } from './ProfileHeaderCard';
export { CollapsibleSection } from './CollapsibleSection';
export { CompanyInformationSection } from './CompanyInformationSection';
export { PrimaryContactSection } from './PrimaryContactSection';
export { InsuranceInformationSection } from './InsuranceInformationSection';
export { PersonalInformationSection } from './PersonalInformationSection';
export { SaveChangesBar } from './SaveChangesBar';

// Customers panel V2 (responsive table/cards + wizard + modals) — subfolder.
export { CustomersPanel } from './customers';
export type { CustomersPanelProps } from './customers';

// Members panel V2 (Users + Account Requests, master-only) — subfolder.
export { MembersPanel } from './members';
export type { MembersPanelProps } from './members';

// Locked Users panel V2 (security/lockouts monitor, master-only) — subfolder.
export { LockedUsersPanel } from './locked-users';
export type { LockedUsersPanelProps } from './locked-users';

// Templates panel V2 (Capa 1) — receipt design picker with previews — subfolder.
export { TemplatesPanel } from './templates';
export type { TemplateCatalogItem } from './templates';

// Billing panel V3 (top cards + overage alert + plan-features + compare modal)
export { BillingPanel } from './BillingPanel';
export { TopCardsSection } from './TopCardsSection';
export { OverageAlert } from './OverageAlert';
export { MonthlyUsageSection } from './MonthlyUsageSection';
export { PlanFeaturesSection } from './PlanFeaturesSection';
export { ChangePlanModal } from './ChangePlanModal';
