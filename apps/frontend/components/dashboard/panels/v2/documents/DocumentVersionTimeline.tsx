'use client';

import React, { useMemo } from 'react';
import type { DocumentVersion } from './types';
import { formatRelativeTime } from './types';

interface DocumentVersionTimelineProps {
  versions: DocumentVersion[];
}

export function DocumentVersionTimeline({ versions }: DocumentVersionTimelineProps) {
  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.versionNumber - a.versionNumber),
    [versions],
  );

  return (
    <div className="documents-v2-version-timeline">
      {sortedVersions.map((version, index) => (
        <div key={version.id} className="documents-v2-version-timeline__entry">
          <div className="documents-v2-version-timeline__dot" />
          {index < sortedVersions.length - 1 ? (
            <div className="documents-v2-version-timeline__line" />
          ) : null}
          <div className="documents-v2-version-timeline__content">
            <div className="documents-v2-version-timeline__header">
              <span className="documents-v2-version-timeline__version">
                Version {version.versionNumber}
              </span>
              <span className="documents-v2-version-timeline__time">
                {formatRelativeTime(version.createdAt)}
              </span>
            </div>
            {version.changedBy ? (
              <div className="documents-v2-version-timeline__user">
                {version.changedBy.name || version.changedBy.email}
              </div>
            ) : null}
            {/* M1: WHAT changed in this edit. v1 (or no diff) is the creation;
                later versions list the changed field labels as chips. */}
            {version.versionNumber <= 1 || !version.changedFields?.length ? (
              <div className="documents-v2-version-timeline__change documents-v2-version-timeline__change--created">
                {version.versionNumber <= 1 ? 'Created' : 'No field changes'}
              </div>
            ) : (
              <div className="documents-v2-version-timeline__changes">
                {version.changedFields.map((field) => (
                  <span key={field} className="documents-v2-version-timeline__change-chip">
                    {field}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
