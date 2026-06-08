'use client';

import React from 'react';
import { DocumentCard } from './DocumentCard';
import type { V2DocumentItem, V2DocumentAction } from './types';

interface DocumentsCardsProps {
  documents: V2DocumentItem[];
  selectedId: string | null;
  onSelect: (docId: string) => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
  isLoading?: boolean;
}

function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: "var(--bg-card)",
        border: "0.5px solid var(--border-soft)",
        borderRadius: "10px",
        padding: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          className="skeleton-pulse skeleton-line"
          style={{ width: "110px", height: "14px" }}
        />
        <span
          className="skeleton-pulse skeleton-line"
          style={{ width: "64px", height: "20px", borderRadius: "20px" }}
        />
      </div>
      <span
        className="skeleton-pulse skeleton-line"
        style={{ display: "block", width: "70%", height: "12px" }}
      />
      <span
        className="skeleton-pulse skeleton-line"
        style={{ display: "block", width: "50%", height: "12px" }}
      />
    </div>
  );
}

export function DocumentsCards({
  documents,
  selectedId,
  onSelect,
  onAction,
  isLoading,
}: DocumentsCardsProps) {
  return (
    <div className="documents-v2-cards">
      {isLoading
        ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        : documents.map((doc) => (
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
