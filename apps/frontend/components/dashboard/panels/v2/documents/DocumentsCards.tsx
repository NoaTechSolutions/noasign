'use client';

import React from 'react';
import { DocumentCard } from './DocumentCard';
import type { V2DocumentItem, V2DocumentAction } from './types';

interface DocumentsCardsProps {
  documents: V2DocumentItem[];
  selectedId: string | null;
  onSelect: (docId: string) => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
}

export function DocumentsCards({
  documents,
  selectedId,
  onSelect,
  onAction,
}: DocumentsCardsProps) {
  return (
    <div className="documents-v2-cards">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          selected={doc.id === selectedId}
          onSelect={onSelect}
          onAction={onAction}
        />
      ))}
    </div>
  );
}
