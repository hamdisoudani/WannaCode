/* ==========================================================================
   Unsaved Changes Dialog - Global Window Close Confirmation
   ========================================================================== */

import { useEffect } from 'react';
import './UnsavedChangesDialog.css';

interface UnsavedChangesDialogProps {
  dirtyFiles: Array<{ path: string; name: string }>;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({ dirtyFiles, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, onSave]);

  return (
    <div className="unsaved-changes-overlay" onClick={onCancel}>
      <div className="unsaved-changes-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="unsaved-changes-dialog__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        
        <div className="unsaved-changes-dialog__content">
          <h3 className="unsaved-changes-dialog__title">Unsaved Changes</h3>
          
          <p className="unsaved-changes-dialog__message">
            You have {dirtyFiles.length} unsaved file{dirtyFiles.length === 1 ? '' : 's'}. 
            Do you want to save your changes before exiting?
          </p>
          
          <ul className="unsaved-changes-dialog__list">
            {dirtyFiles.slice(0, 5).map(file => (
              <li key={file.path} className="unsaved-changes-dialog__item">
                <span className="unsaved-changes-dialog__file-icon">📄</span>
                <span className="unsaved-changes-dialog__file-name">{file.name}</span>
                <span className="unsaved-changes-dialog__file-path">{file.path}</span>
              </li>
            ))}
            {dirtyFiles.length > 5 && (
              <li className="unsaved-changes-dialog__more">
                ...and {dirtyFiles.length - 5} more
              </li>
            )}
          </ul>
          
          <p className="unsaved-changes-dialog__warning">
            If you don't save, your changes will be lost permanently.
          </p>
        </div>
        
        <div className="unsaved-changes-dialog__actions">
          <button className="unsaved-changes-dialog__btn unsaved-changes-dialog__btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="unsaved-changes-dialog__btn unsaved-changes-dialog__btn--danger" onClick={onDiscard}>
            Don't Save
          </button>
          <button className="unsaved-changes-dialog__btn unsaved-changes-dialog__btn--primary" onClick={onSave}>
            Save All
          </button>
        </div>
      </div>
    </div>
  );
}
