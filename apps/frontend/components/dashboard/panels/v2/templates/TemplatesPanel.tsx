'use client';

import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiRequest } from '@/lib/api';
import { TemplateCard } from './TemplateCard';
import type { TemplateCatalogItem, SetActiveTemplateResponse } from './types';
import './templates-panel.css';

// Capa 1: RECEIPT category only.
const CATEGORY = 'RECEIPT';
const SKELETON_COUNT = 3;

export function TemplatesPanel() {
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

      {/* Intro copy lives in the body (not the panel-head) per the panel
          header convention — this is meaningful section UI, not a header sub. */}
      <p className="templates-panel__intro">
        Choose the design used for your receipts. New receipts automatically use
        your active template.
      </p>

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
                <div
                  className="skeleton-pulse skeleton-line"
                  style={{ width: '90%', height: '12px', marginTop: '10px' }}
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
  );
}
