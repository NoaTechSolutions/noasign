import React from 'react';

interface SaveChangesBarProps {
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function SaveChangesBar({ onSave, onCancel, isSaving }: SaveChangesBarProps) {
  return (
    <div className="save-changes-bar">
      <div className="save-changes-content">
        <div className="save-changes-message">
          <span className="save-changes-icon">⚠️</span>
          <span className="save-changes-text">You have unsaved changes</span>
        </div>
        <div className="save-changes-actions">
          <button
            className="btn-cancel"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className="btn-save"
            onClick={onSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
