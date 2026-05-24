'use client';

import React from 'react';
import { DocumentTableRow } from './DocumentTableRow';
import type { V2DocumentItem, V2DocumentAction } from './types';

interface DocumentsTableProps {
  documents: V2DocumentItem[];
  selectedId: string | null;
  onSelect: (docId: string) => void;
  onAction: (action: V2DocumentAction, docId: string) => void | Promise<void>;
}

export function DocumentsTable({
  documents,
  selectedId,
  onSelect,
  onAction,
}: DocumentsTableProps) {
  return (
    <div className="documents-v2-table-wrapper">
      <table className="documents-v2-table">
        <thead>
          <tr>
            <th>Number</th>
            <th>Customer</th>
            <th>Type</th>
            <th>Status</th>
            <th>Created</th>
            <th>Sent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <DocumentTableRow
              key={doc.id}
              document={doc}
              selected={doc.id === selectedId}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
