'use client';

import React from 'react';
import type { DocumentSchema } from '../types';

interface WizardTabBarProps {
  schema: DocumentSchema;
  activeSection: string;
  onChangeSection: (sectionKey: string) => void;
  canAccessSection: (sectionKey: string) => boolean;
}

export function WizardTabBar({
  schema,
  activeSection,
  onChangeSection,
  canAccessSection,
}: WizardTabBarProps) {
  return (
    <div className="wizard-tabs">
      <div className="wizard-tabs__inner">
        {schema.sections.map((section) => {
          const accessible = canAccessSection(section.key);
          const isActive = section.key === activeSection;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => {
                if (!accessible) return;
                onChangeSection(section.key);
              }}
              disabled={!accessible}
              className={`wizard-tab${isActive ? ' wizard-tab--active' : ''}${!accessible ? ' wizard-tab--disabled' : ''}`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
