import React, { useState } from 'react';

interface User {
  firstName: string;
  lastName: string;
  role: string;
}

interface CompanyProfile {
  companyName: string;
  logoUrl?: string;
  plan?: string;
}

interface ProfileHeaderCardProps {
  user: User | null;
  companyProfile: CompanyProfile | null;
  isLoading: boolean;
  onLogoChange?: (logoUrl: string) => void;
}

export function ProfileHeaderCard({ 
  user, 
  companyProfile, 
  isLoading,
  onLogoChange 
}: ProfileHeaderCardProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(companyProfile?.logoUrl || null);

  const getRoleBadgeClass = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower === 'master') return 'role-badge-master';
    if (roleLower === 'admin') return 'role-badge-admin';
    return 'role-badge-user';
  };

  const getPlanBadgeClass = (plan: string) => {
    const planUpper = plan.toUpperCase();
    if (planUpper === 'LAUNCH') return 'plan-badge-launch';
    if (planUpper === 'PRO') return 'plan-badge-pro';
    if (planUpper === 'SCALE') return 'plan-badge-scale';
    return 'plan-badge-starter';
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);
      onLogoChange?.(base64);
    };
    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="profile-header-card">
        <div className="profile-header-content">
          <div className="profile-header-logo">
            <div className="skeleton-pulse" style={{ width: '80px', height: '80px', borderRadius: '12px' }}></div>
          </div>
          <div className="profile-header-info">
            <div className="skeleton-pulse skeleton-line" style={{ width: '200px', height: '24px', marginBottom: '8px' }}></div>
            <div className="skeleton-pulse skeleton-line" style={{ width: '150px', height: '18px', marginBottom: '12px' }}></div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className="skeleton-pulse skeleton-line" style={{ width: '60px', height: '24px' }}></div>
              <div className="skeleton-pulse skeleton-line" style={{ width: '80px', height: '24px' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
  const companyName = companyProfile?.companyName || 'Your Company';
  const plan = companyProfile?.plan || 'STARTER';

  return (
    <div className="profile-header-card">
      <div className="profile-header-content">
        {/* Logo with edit icon */}
        <div className="profile-header-logo-wrapper">
          <div className="profile-header-logo">
            {logoPreview ? (
              <img src={logoPreview} alt={companyName} />
            ) : (
              <div className="profile-header-logo-placeholder">
                <span>🏢</span>
              </div>
            )}
          </div>
          <label htmlFor="header-logo-upload" className="profile-header-logo-edit">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6663 1.44775C12.914 1.44775 13.1592 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17513 14.3137 2.383 14.4084 2.61178C14.5032 2.84055 14.552 3.08575 14.552 3.33337C14.552 3.58099 14.5032 3.82619 14.4084 4.05497C14.3137 4.28374 14.1748 4.49161 13.9997 4.66671L5.33301 13.3334L1.66634 14.3334L2.66634 10.6667L11.333 2.00004Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </label>
          <input
            type="file"
            id="header-logo-upload"
            accept="image/*"
            onChange={handleLogoUpload}
            style={{ display: 'none' }}
          />
        </div>

        {/* Info */}
        <div className="profile-header-info">
          <h1 className="profile-header-company">{companyName}</h1>
          {fullName && (
            <p className="profile-header-user">{fullName}</p>
          )}
          <div className="profile-header-badges">
            {user && (
              <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            )}
            <span className={`plan-badge ${getPlanBadgeClass(plan)}`}>
              {plan}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
