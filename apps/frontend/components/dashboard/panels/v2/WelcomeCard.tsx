import React from 'react';

interface DashboardUser {
  name: string;
  email: string;
  role: string;
}

interface CompanyProfile {
  name: string;
  plan: string;
}

interface WelcomeCardProps {
  user: DashboardUser | null;
  company: CompanyProfile | null;
  isLoading: boolean;
}

export function WelcomeCard({ user, company, isLoading }: WelcomeCardProps) {
  // Format current date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Plan badge styling
  const getPlanBadgeClass = (plan: string) => {
    const planLower = plan.toLowerCase();
    if (planLower.includes('launch') || planLower.includes('popular')) {
      return 'plan-badge-launch';
    }
    if (planLower.includes('scale') || planLower.includes('purple')) {
      return 'plan-badge-scale';
    }
    if (planLower.includes('pro') || planLower.includes('growth')) {
      return 'plan-badge-pro';
    }
    return 'plan-badge-default';
  };

  if (isLoading) {
    return (
      <div className="welcome-card loading">
        <div className="welcome-skeleton-line welcome-skeleton-title"></div>
        <div className="welcome-skeleton-line welcome-skeleton-subtitle"></div>
        <div className="welcome-skeleton-line welcome-skeleton-date"></div>
      </div>
    );
  }

  if (!user || !company) {
    return null;
  }

  return (
    <div className="welcome-card">
      <div className="welcome-content">
        <h1 className="welcome-greeting">
          Welcome back, <span className="welcome-user-name">{user.name}</span>
        </h1>
        
        <div className="welcome-company-info">
          <span className="welcome-company-name">{company.name}</span>
          <span className="welcome-separator">•</span>
          <span className={`plan-badge ${getPlanBadgeClass(company.plan)}`}>
            {company.plan}
          </span>
        </div>

        <p className="welcome-date">{today}</p>
      </div>
    </div>
  );
}
