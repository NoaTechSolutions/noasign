'use client';

import React from 'react';
import { FileText, Search } from 'lucide-react';

interface DocumentsEmptyStateProps {
  hasFilters: boolean;
}

export function DocumentsEmptyState({ hasFilters }: DocumentsEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="documents-v2-empty-state">
        <Search size={48} strokeWidth={1.5} />
        <h3>No documents found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="documents-v2-empty-state">
      <FileText size={48} strokeWidth={1.5} />
      <h3>No documents yet</h3>
      <p>Create your first document to get started</p>
    </div>
  );
}
