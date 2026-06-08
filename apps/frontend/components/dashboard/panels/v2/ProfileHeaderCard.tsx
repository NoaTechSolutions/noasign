import React, { useRef } from 'react';
import { Pencil } from 'lucide-react';
import { compressImage } from '@/lib/compress-image';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountType?: string | null;
  avatarUrl?: string | null;
}

interface CompanyProfile {
  companyName: string;
  logoUrl?: string;
  plan?: string;
}

interface ProfileStats {
  totalDocuments: number;
  completedDocuments: number;
  memberSince: string | null;
  planName: string;
}

interface ProfileHeaderCardProps {
  user: User | null;
  companyProfile: CompanyProfile | null;
  isLoading: boolean;
  onLogoChange?: (logoUrl: string) => void;
  onAvatarChange?: (avatarUrl: string) => void;
  stats?: ProfileStats;
  onNavigate?: (panel: string) => void;
}

const MAX_PLANS = ['SCALE', 'ENTERPRISE'];

function formatMemberSince(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function ProfileHeaderCard({
  user,
  companyProfile,
  isLoading,
  onAvatarChange,
  stats,
  onNavigate,
}: ProfileHeaderCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getAccountBadgeClass = (type: string) =>
    type.toUpperCase() === 'INDIVIDUAL' ? 'account-badge-individual' : 'account-badge-business';

  const getPlanBadgeClass = (plan: string) => {
    const p = plan.toUpperCase();
    if (p === 'LAUNCH') return 'plan-badge-launch';
    if (p === 'PRO') return 'plan-badge-pro';
    if (p === 'SCALE') return 'plan-badge-scale';
    return 'plan-badge-starter';
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 400, 0.8);
      onAvatarChange?.(compressed);
    } catch {
      console.error('Failed to compress avatar image');
    }
  };

  if (isLoading) {
    return (
      <div className="profile-header-card">
        <div className="profile-header-content">
          <div className="skeleton-pulse" style={{ width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0 }}></div>
          <div className="profile-header-info">
            <div className="skeleton-pulse skeleton-line" style={{ width: '180px', height: '20px', marginBottom: '6px' }}></div>
            <div className="skeleton-pulse skeleton-line" style={{ width: '140px', height: '14px', marginBottom: '10px' }}></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="skeleton-pulse skeleton-line" style={{ width: '80px', height: '22px' }}></div>
              <div className="skeleton-pulse skeleton-line" style={{ width: '60px', height: '22px' }}></div>
            </div>
          </div>
        </div>
        <div className="profile-stats-row">
          {[1, 2, 3].map((i) => (
            <div key={i} className="profile-stat">
              <div className="skeleton-pulse skeleton-line" style={{ width: '60px', height: '12px', marginBottom: '6px' }}></div>
              <div className="skeleton-pulse skeleton-line" style={{ width: '40px', height: '22px' }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
  const plan = companyProfile?.plan || stats?.planName || 'STARTER';
  const isIndividual = user?.accountType?.toUpperCase() === 'INDIVIDUAL';
  const accountType = user?.accountType;
  const memberSince = formatMemberSince(stats?.memberSince);
  const showUpgrade = !MAX_PLANS.includes(plan.toUpperCase());

  const initials = (() => {
    if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user?.firstName) return user.firstName.slice(0, 2).toUpperCase();
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return '?';
  })();

  return (
    <div className={`profile-header-card ${isIndividual ? '' : 'profile-header-card--business'}`}>
      <div className="profile-header-content">
        {/* Avatar */}
        <div className={`profile-header-avatar-wrapper ${isIndividual ? '' : 'profile-header-avatar-wrapper--lg'}`}>
          <div className={`profile-header-avatar ${isIndividual ? '' : 'profile-header-avatar--lg'}`}>
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={fullName} />
            ) : (
              <span>{initials}</span>
            )}
          </div>
          <button
            type="button"
            className="profile-header-avatar-upload"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload profile photo"
            title="Upload photo"
          >
            <Pencil size={12} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* Center: name, email, badges */}
        <div className="profile-header-info">
          {isIndividual ? (
            <h1 className="profile-header-company">{fullName || 'Your Profile'}</h1>
          ) : (
            <>
              <h1 className="profile-header-company">{companyProfile?.companyName || 'Your Company'}</h1>
              {fullName && <p className="profile-header-user">{fullName}</p>}
            </>
          )}
          {user?.email && <p className="profile-header-email">{user.email}</p>}
          <div className="profile-header-badges">
            {accountType && (
              <span className={`account-badge ${getAccountBadgeClass(accountType)}`}>
                {accountType}
              </span>
            )}
            <span className={`plan-badge ${getPlanBadgeClass(plan)}`}>
              {plan}
            </span>
          </div>
        </div>

        {/* Right: member since + upgrade */}
        <div className="profile-header-right">
          <span className="profile-header-member-since">Member since {memberSince}</span>
          {showUpgrade && (
            <button
              type="button"
              className="profile-header-upgrade"
              onClick={() => onNavigate?.('billing')}
            >
              Upgrade plan
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="profile-stats-row">
        <div className="profile-stat">
          <span className="profile-stat__label">Documents</span>
          <span className="profile-stat__value">{stats?.totalDocuments ?? '—'}</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__label">Completed</span>
          <span className="profile-stat__value">{stats?.completedDocuments ?? '—'}</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat__label">Member since</span>
          <span className="profile-stat__value">{memberSince}</span>
        </div>
      </div>
    </div>
  );
}
