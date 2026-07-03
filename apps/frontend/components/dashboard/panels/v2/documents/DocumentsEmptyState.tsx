'use client';

import React from 'react';
import { FileText, Search } from 'lucide-react';

interface DocumentsEmptyStateProps {
  hasFilters: boolean;
  entity?: 'document' | 'receipt';
}

export function DocumentsEmptyState({ hasFilters, entity = 'document' }: DocumentsEmptyStateProps) {
  const noun = entity === 'receipt' ? 'receipts' : 'documents';

  if (hasFilters) {
    return (
      <div className="documents-v2-empty-state">
        <Search size={48} strokeWidth={1.5} />
        <h3>No {noun} found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="documents-v2-empty-state">
      <FileText size={48} strokeWidth={1.5} />
      <h3>No {noun} yet</h3>
      <p>
        {entity === 'receipt'
          ? 'Issue your first receipt to get started'
          : 'Create your first document to get started'}
      </p>
    </div>
  );
}
