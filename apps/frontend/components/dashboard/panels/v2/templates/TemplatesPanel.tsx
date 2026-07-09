'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiRequest } from '@/lib/api';
import { TemplateCard } from './TemplateCard';
import type { TemplateCatalogItem, SetActiveTemplateResponse } from './types';
import './templates-panel.css';

// Capa 1: only the "receipts" tab fetches (category RECEIPT). Additional tabs
// (e.g. Invoice) are placeholders for now. Adding a 3rd category later = append
// one entry here + (if it fetches) a branch in the tab-content switch.
type TabKey = 'receipts' | 'invoice';

interface TemplateTab {
  key: TabKey;
  label: string;
}

const TABS: readonly TemplateTab[] = [
  { key: 'receipts', label: 'Recibos' },
  { key: 'invoice', label: 'Invoice' },
];

const CATEGORY = 'RECEIPT';
const SKELETON_COUNT = 3;

export function TemplatesPanel() {
  const [activeTab, setActiveTab] = useState<TabKey>('receipts');
  const [templates, setTemplates] = useState<TemplateCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // slug currently being activated (null = idle). Gates all card interactions.
  const [activatingSlug, setActivatingSlug] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await apiRequest<TemplateCatalogItem[]>(
        `/templates?category=${CATEGORY}`,
      );
      setTemplates(list);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load templates',
      );
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const handleActivate = useCallback(
    async (slug: string) => {
      // Ignore if already active or a request is in flight.
      if (activatingSlug) return;
      const target = templates.find((t) => t.slug === slug);
      if (!target || target.isActive) return;

      setActivatingSlug(slug);
      try {
        const res = await apiRequest<SetActiveTemplateResponse>(
          '/templates/active',
          { method: 'PATCH', body: { category: CATEGORY, slug } },
        );
        // Trust the server's updated list — it carries the new isActive flags.
        setTemplates(res.templates);
        toast.success(res.message || 'Template updated');
      } catch (activateError) {
        toast.error(
          activateError instanceof Error
            ? activateError.message
            : 'Unable to update template',
        );
      } finally {
        setActivatingSlug(null);
      }
    },
    [activatingSlug, templates],
  );

  const busy = activatingSlug !== null;
  const showEmpty = !loading && !error && templates.length === 0;

  return (
    <div className="templates-panel">
      <header className="panel-head">
        <div className="panel-head__main">
          {/* GLOBAL RULE: panel headers have title only — NO subtitle line. */}
          <h1 className="panel-head__title">Templates</h1>
        </div>
      </header>

      {/* Tab bar + (on Recibos) the customize CTA share one row. */}
      <div className="templates-tabbar-row">
        <div className="templates-tabs" role="tablist" aria-label="Template categories">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={`templates-tab-${tab.key}`}
              aria-selected={activeTab === tab.key}
              aria-controls={`templates-tabpanel-${tab.key}`}
              className={`templates-tab${activeTab === tab.key ? ' templates-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'receipts' && (
          <button
            type="button"
            className="templates-cta"
            onClick={() => toast('Coming soon', { icon: '✨' })}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
            Personaliza tu recibo
          </button>
        )}
      </div>

      {activeTab === 'receipts' ? (
        <div
          id="templates-tabpanel-receipts"
          role="tabpanel"
          aria-labelledby="templates-tab-receipts"
        >
          {error ? (
            <div className="templates-panel__error" role="alert">
              <span>{error}</span>
              <button
                type="button"
                className="templates-panel__retry"
                onClick={() => void loadTemplates()}
              >
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="templates-grid">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div key={i} className="template-card template-card--skeleton">
                  <div className="template-card__thumb skeleton-pulse" />
                  <div className="template-card__body">
                    <div
                      className="skeleton-pulse skeleton-line"
                      style={{ width: '60%', height: '16px' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : showEmpty ? (
            <div className="templates-panel__empty">
              No templates are available yet.
            </div>
          ) : (
            <div className="templates-grid">
              {templates.map((template) => (
                <TemplateCard
                  key={template.slug}
                  template={template}
                  activating={activatingSlug === template.slug}
                  busy={busy}
                  onActivate={handleActivate}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          id="templates-tabpanel-invoice"
          role="tabpanel"
          aria-labelledby="templates-tab-invoice"
          className="templates-soon"
        >
          <div className="templates-soon__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="15" y2="17" />
            </svg>
          </div>
          <div className="templates-soon__title">Invoice templates are coming soon</div>
          <p className="templates-soon__text">
            We&apos;re working on invoice designs. Check back later.
          </p>
        </div>
      )}
    </div>
  );
}
