'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { apiRequest } from '@/lib/api';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import type { TemplateCatalogItem, SetActiveTemplateResponse } from './types';
import './templates-panel.css';

// Both tabs fetch their catalog (RECEIPT / INVOICE) with the same grid + preview
// + visibility filter. Receipts pick a default ("Set as active"); invoices open
// the creation form for the chosen design ("Create invoice"). Adding a 3rd
// category later = one entry here + its category mapping.
type TabKey = 'receipts' | 'invoice';

interface TemplateTab {
  key: TabKey;
  label: string;
}

const TABS: readonly TemplateTab[] = [
  { key: 'receipts', label: 'Receipts' },
  { key: 'invoice', label: 'Invoice' },
];

const CATEGORY_BY_TAB: Record<TabKey, 'RECEIPT' | 'INVOICE'> = {
  receipts: 'RECEIPT',
  invoice: 'INVOICE',
};

const SKELETON_COUNT = 3;

export function TemplatesPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('receipts');
  const [templates, setTemplates] = useState<TemplateCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // slug currently being activated/opened (null = idle). Gates all card interactions.
  const [activatingSlug, setActivatingSlug] = useState<string | null>(null);
  // Template whose full-page preview modal is open (null = closed).
  const [previewTemplate, setPreviewTemplate] = useState<TemplateCatalogItem | null>(null);

  const category = CATEGORY_BY_TAB[activeTab];
  const isInvoiceTab = activeTab === 'invoice';

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await apiRequest<TemplateCatalogItem[]>(
        `/templates?category=${category}`,
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
  }, [category]);

  // Refetch whenever the active tab (category) changes.
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
          { method: 'PATCH', body: { category, slug } },
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
    [activatingSlug, templates, category],
  );

  // Invoice: make the chosen design the tenant's active invoice template (so the
  // backend renders THIS one), then jump to the create modal preset to the invoice
  // type. If it's already active we skip straight to the form.
  const handleCreateInvoice = useCallback(
    async (slug: string) => {
      if (activatingSlug) return;
      const target = templates.find((t) => t.slug === slug);
      if (!target) return;
      try {
        if (!target.isActive) {
          setActivatingSlug(slug);
          const res = await apiRequest<SetActiveTemplateResponse>(
            '/templates/active',
            { method: 'PATCH', body: { category: 'INVOICE', slug } },
          );
          setTemplates(res.templates);
        }
        router.push('/dashboard?panel=documents&new=1&newType=INVOICE');
      } catch (createError) {
        toast.error(
          createError instanceof Error
            ? createError.message
            : 'Unable to open the invoice form',
        );
      } finally {
        setActivatingSlug(null);
      }
    },
    [activatingSlug, templates, router],
  );

  const busy = activatingSlug !== null;
  const showEmpty = !loading && !error && templates.length === 0;

  // Shared grid/states for both tabs — the only per-tab difference is the card's
  // primary action (Set as active for receipts, Create invoice for invoices).
  const tabContent = error ? (
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
          onPreview={setPreviewTemplate}
          onCreate={isInvoiceTab ? handleCreateInvoice : undefined}
        />
      ))}
    </div>
  );

  return (
    <div className="templates-panel">
      {/* Header grid (grid-areas): desktop = title on its own row, then tabs
          (left) + CTA (right). Mobile = title (left) + CTA (right) on one row,
          tabs full-width below. Reuses the global panel-head__title styling. */}
      <div className="templates-header">
        <h1 className="panel-head__title templates-header__title">Templates</h1>

        {activeTab === 'receipts' && (
          <button
            type="button"
            className="templates-cta templates-header__cta"
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
            Personalize your receipt
          </button>
        )}

        <div
          className="templates-tabs templates-header__tabs"
          role="tablist"
          aria-label="Template categories"
        >
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
      </div>

      <div
        id={`templates-tabpanel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`templates-tab-${activeTab}`}
      >
        {tabContent}
      </div>

      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
}
