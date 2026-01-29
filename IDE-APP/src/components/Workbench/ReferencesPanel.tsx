/* ==========================================================================
   References Panel - Shows Find All References results
   Similar to VS Code's references panel
   ========================================================================== */

import { useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import type { ReferenceLocation } from '../../types';
import './ReferencesPanel.css';

export function ReferencesPanel() {
  const { referencesResult, isReferencesPanelVisible, hideReferences } = useAppStore();
  const { openFile } = useFileSystem();

  const handleReferenceClick = useCallback(async (ref: ReferenceLocation) => {
    // Open the file and navigate to the reference location
    await openFile(ref.filePath, ref.fileName);
    
    // The editor will handle scrolling to the line via Monaco
    // We'll dispatch a custom event that the editor can listen to
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('navigate-to-line', {
        detail: { line: ref.line, column: ref.column }
      }));
    }, 100); // Small delay to ensure file is loaded
  }, [openFile]);

  if (!isReferencesPanelVisible || !referencesResult) {
    return null;
  }

  // Group references by file
  const groupedRefs = referencesResult.locations.reduce((acc, ref) => {
    const key = ref.filePath;
    if (!acc[key]) {
      acc[key] = {
        filePath: ref.filePath,
        fileName: ref.fileName,
        refs: []
      };
    }
    acc[key].refs.push(ref);
    return acc;
  }, {} as Record<string, { filePath: string; fileName: string; refs: ReferenceLocation[] }>);

  const fileGroups = Object.values(groupedRefs);
  const totalCount = referencesResult.locations.length;

  return (
    <div className="references-panel">
      {/* Header */}
      <div className="references-panel__header">
        <div className="references-panel__title">
          <span className="references-panel__symbol">{referencesResult.symbol}</span>
          <span className="references-panel__count">
            {totalCount} reference{totalCount !== 1 ? 's' : ''} in {fileGroups.length} file{fileGroups.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button 
          className="references-panel__close"
          onClick={hideReferences}
          aria-label="Close references panel"
        >
          <CloseIcon />
        </button>
      </div>

      {/* References List */}
      <div className="references-panel__content">
        {fileGroups.map((group) => (
          <div key={group.filePath} className="references-panel__file-group">
            <div className="references-panel__file-header">
              <FileIcon fileName={group.fileName} />
              <span className="references-panel__file-name">{group.fileName}</span>
              <span className="references-panel__file-path">{getRelativePath(group.filePath)}</span>
              <span className="references-panel__file-count">{group.refs.length}</span>
            </div>
            <div className="references-panel__refs">
              {group.refs.map((ref, idx) => (
                <button
                  key={`${ref.line}-${ref.column}-${idx}`}
                  className="references-panel__ref"
                  onClick={() => handleReferenceClick(ref)}
                >
                  <span className="references-panel__ref-line">Ln {ref.line}</span>
                  <span className="references-panel__ref-preview">
                    <HighlightedPreview 
                      text={ref.preview} 
                      symbol={referencesResult.symbol}
                    />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------
   Helper Components
   ------------------------------------------------------------------------- */

interface HighlightedPreviewProps {
  text: string;
  symbol: string;
}

function HighlightedPreview({ text, symbol }: HighlightedPreviewProps) {
  if (!symbol) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegex(symbol)})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === symbol.toLowerCase() ? (
          <mark key={i} className="references-panel__highlight">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getRelativePath(fullPath: string): string {
  // Get just the directory part, not the full path
  const parts = fullPath.replace(/\\/g, '/').split('/');
  if (parts.length > 3) {
    return '.../' + parts.slice(-3, -1).join('/');
  }
  return parts.slice(0, -1).join('/');
}

interface FileIconProps {
  fileName: string;
}

function FileIcon({ fileName }: FileIconProps) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  const colors: Record<string, string> = {
    ts: '#3178c6',
    tsx: '#3178c6',
    js: '#f0db4f',
    jsx: '#61dafb',
    json: '#cbcb41',
    css: '#563d7c',
    html: '#e34c26',
    md: '#083fa1',
    rs: '#dea584',
    py: '#3776ab',
  };

  const color = colors[ext] || 'var(--text-muted)';

  return (
    <svg className="references-panel__file-icon" width="14" height="14" viewBox="0 0 16 16" fill={color}>
      <path d="M2 2a1 1 0 0 1 1-1h6l4 4v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2zm7 0v3h3L9 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.354 3.646a.5.5 0 0 1 0 .708L8.707 8l3.647 3.646a.5.5 0 0 1-.708.708L8 8.707l-3.646 3.647a.5.5 0 0 1-.708-.708L7.293 8 3.646 4.354a.5.5 0 0 1 .708-.708L8 7.293l3.646-3.647a.5.5 0 0 1 .708 0z"/>
    </svg>
  );
}
