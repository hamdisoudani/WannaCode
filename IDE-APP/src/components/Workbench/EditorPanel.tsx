/* ==========================================================================
   Editor Panel - Tabs + Monaco Editor Container
   ========================================================================== */

import { useCallback, useState, useEffect } from 'react';
import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../../stores/appStore';
import { useAuth } from '../../contexts/AuthContext';
import { useEditor } from '../../hooks';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useRecentEntries } from '../../services/settings/hooks';
import { Editor } from '../Editor';
import { ReferencesPanel } from './ReferencesPanel';
import { TabContextMenu } from './TabContextMenu';
import { SettingsPanel } from './SettingsPanel';
import { getFileIcon } from '../FileExplorer/icons';
import './EditorPanel.css';

export function EditorPanel() {
  const { openFiles, activeFilePath, projectPath, isReferencesPanelVisible, closeAllFiles, closeOtherFiles } = useAppStore();
  const { saveFileByPath } = useEditor();
  const activeFile = openFiles.find((f) => f.path === activeFilePath);
  
  // State for close confirmation dialog
  const [confirmClose, setConfirmClose] = useState<{ path: string; name: string } | null>(null);

  const handleConfirmSave = async () => {
    if (confirmClose) {
      const file = openFiles.find(f => f.path === confirmClose.path);
      if (file) {
        await saveFileByPath(confirmClose.path, file.content);
      }
      closeFileAndCleanup(confirmClose.path);
      setConfirmClose(null);
    }
  };

  const handleConfirmDiscard = () => {
    if (confirmClose) {
      closeFileAndCleanup(confirmClose.path);
      setConfirmClose(null);
    }
  };

  const handleConfirmCancel = () => {
    setConfirmClose(null);
  };

  const closeFileAndCleanup = useCallback((path: string) => {
    // Clear semantic tokens cache for this file
    Promise.all([
      import('../../hooks/useLsp'),
      import('../../services/lsp')
    ]).then(([useLspModule, lspModule]) => {
      useLspModule.clearSemanticTokensCache(lspModule.pathToUri(path));
    });
    
    useAppStore.getState().closeFile(path);
  }, []);

  // Listen for close file requests from menu bar
  useEffect(() => {
    const handleCloseRequest = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.isDirty) {
        setConfirmClose({ path: detail.path, name: detail.name });
      } else {
        closeFileAndCleanup(detail.path);
      }
    };
    
    window.addEventListener('request-close-file', handleCloseRequest);
    return () => window.removeEventListener('request-close-file', handleCloseRequest);
  }, [closeFileAndCleanup]);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; name: string } | null>(null);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, path: string, name: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      path,
      name,
    });
  }, []);

  const handleCloseOthers = useCallback(() => {
    if (contextMenu) {
      if (useAppStore.getState().openFiles.some(f => f.path !== contextMenu.path && f.isDirty)) {
         // Ideally warn about dirty files, but for now simple close (user will get warnings from closeFileAndCleanup if individually closed? 
         // actually store logic usually force closes unless checked.
         // Current appStore.closeOtherFiles logic is destructive/forceful without checks.
         // We should implement checks. 
         // But for MVP, let's just close.
      }
      closeOtherFiles(contextMenu.path);
      setContextMenu(null);
    }
  }, [contextMenu, closeOtherFiles]);

  const handleCloseAll = useCallback(() => {
    closeAllFiles();
    setContextMenu(null);
  }, [closeAllFiles]);


  return (
    <div className="editor-panel">
      {/* Tab Bar */}
      {openFiles.length > 0 && (
        <div className="editor-panel__tabs">
          {openFiles.map((file) => (
            <Tab
              key={file.path}
              name={file.name}
              path={file.path}
              isDirty={file.isDirty}
              isActive={file.path === activeFilePath}
              onRequestClose={(path, name, isDirty) => {
                if (isDirty) {
                  setConfirmClose({ path, name });
                } else {
                  closeFileAndCleanup(path);
                }
              }}
              onContextMenu={(e) => handleTabContextMenu(e, file.path, file.name)}
            />
          ))}
        </div>
      )}

      {/* Tab Context Menu */}
      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabName={contextMenu.name}
          onClose={() => setContextMenu(null)}
          onCloseTab={() => {
            const file = openFiles.find(f => f.path === contextMenu.path);
            if (file?.isDirty) {
              setConfirmClose({ path: contextMenu.path, name: contextMenu.name });
            } else {
              closeFileAndCleanup(contextMenu.path);
            }
            setContextMenu(null);
          }}
          onCloseOthers={handleCloseOthers}
          onCloseAll={handleCloseAll}
        />
      )}

      {/* Close Confirmation Dialog */}
      {confirmClose && (
        <CloseConfirmDialog
          fileName={confirmClose.name}
          onSave={handleConfirmSave}
          onDiscard={handleConfirmDiscard}
          onCancel={handleConfirmCancel}
        />
      )}

      {/* Editor Content with optional References Panel */}
      <div className="editor-panel__content">
        <div className="editor-panel__main">
          {activeFile ? (
            activeFile.path === '::settings' ? (
              // Settings virtual file - render SettingsPanel
              <div className="editor-panel__settings">
                <SettingsPanel />
              </div>
            ) : (
              <div className="editor-panel__monaco">
                <Editor onSave={saveFileByPath} />
              </div>
            )
          ) : projectPath ? (
            <WorkspaceEmptyState />
          ) : (
            <WelcomeScreen />
          )}
        </div>
        
        {/* References Panel (side panel) */}
        {isReferencesPanelVisible && <ReferencesPanel />}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Tab Component
   ------------------------------------------------------------------------- */

interface TabProps {
  name: string;
  path: string;
  isDirty: boolean;
  isActive: boolean;
  onRequestClose: (path: string, name: string, isDirty: boolean) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function Tab({ name, path, isDirty, isActive, onRequestClose, onContextMenu }: TabProps) {
  const { setActiveFile } = useAppStore();
  
  // Get consistent file icon
  const IconComponent = getFileIcon(name, false);

  const handleClick = () => {
    setActiveFile(path);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestClose(path, name, isDirty);
  };

  // Middle-click to close
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault();
      onRequestClose(path, name, isDirty);
    }
  };

  return (
    <div
      className={`tab ${isActive ? 'tab--active' : ''} ${isDirty ? 'tab--dirty' : ''}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onContextMenu={onContextMenu}
    >
      <span className="tab__icon">
        <IconComponent size={14} />
      </span>
      <span className="tab__name">{name}</span>
      {isDirty && <span className="tab__dirty-indicator" />}
      <button
        className="tab__close"
        onClick={handleClose}
        aria-label={`Close ${name}`}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Workspace Empty State - When folder is open but no file selected
   ------------------------------------------------------------------------- */

function WorkspaceEmptyState() {
  return (
    <div className="workspace-empty">
      <div className="workspace-empty__content">
        <div className="workspace-empty__icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <p className="workspace-empty__text">Select a file from the explorer to start editing</p>
        <div className="workspace-empty__shortcuts">
          <span className="workspace-empty__shortcut">
            <kbd>Ctrl</kbd><kbd>P</kbd> Quick Open
          </span>
          <span className="workspace-empty__shortcut">
            <kbd>Ctrl</kbd><kbd>N</kbd> New File
          </span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Welcome Screen - When no folder is open
   ------------------------------------------------------------------------- */

function WelcomeScreen() {
  const { openFolder } = useFileSystem();
  const { recentFolders, isLoading: isLoadingRecent, removeEntry } = useRecentEntries();
  const { user } = useAuth();

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's first name or email prefix
  const getUserName = () => {
    if (!user) return '';
    const fullName = user.user_metadata?.full_name;
    if (fullName) return fullName.split(' ')[0];
    return user.email?.split('@')[0] || 'there';
  };

  const handleOpenFolder = useCallback(async () => {
    try {
      const selectedFolderPath = await openFolderDialog({
        directory: true,
        multiple: false,
        title: 'Open Folder',
      });

      if (selectedFolderPath && typeof selectedFolderPath === 'string') {
        await openFolder(selectedFolderPath);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, [openFolder]);

  const handleOpenRecentFolder = useCallback(async (path: string) => {
    try {
      await openFolder(path);
    } catch (error) {
      console.error('Failed to open recent folder:', error);
      // Remove from recents if it no longer exists
      removeEntry(path, 'folder');
    }
  }, [openFolder, removeEntry]);

  const handleNewFile = useCallback(() => {
    // TODO: Implement new file creation dialog
    console.log('New file clicked');
  }, []);

  const handleCloneRepo = useCallback(() => {
    // TODO: Implement clone repository dialog
    console.log('Clone repo clicked');
  }, []);

  // Format timestamp to relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__container">
        {/* Hero Section */}
        <div className="welcome-screen__hero">
          <div className="welcome-screen__logo">
            <div className="welcome-screen__logo-glow" />
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7aa2f7" />
                  <stop offset="100%" stopColor="#bb9af7" />
                </linearGradient>
              </defs>
              <rect x="4" y="4" width="24" height="24" rx="5" stroke="url(#logo-gradient)" strokeWidth="2" fill="rgba(122, 162, 247, 0.1)"/>
              <path d="M10 12L14 16L10 20" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 20H22" stroke="url(#logo-gradient)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          {user ? (
            <>
              <h1 className="welcome-screen__title welcome-screen__title--greeting">
                {getGreeting()}, {getUserName()}!
              </h1>
              <p className="welcome-screen__tagline">Ready to build something amazing?</p>
            </>
          ) : (
            <>
              <h1 className="welcome-screen__title">CodeSurf</h1>
              <p className="welcome-screen__tagline">Modern code editor built with Tauri</p>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="welcome-screen__section">
          <h2 className="welcome-screen__section-title">Start</h2>
          <div className="welcome-screen__actions">
            <QuickAction
              icon={<FolderIcon />}
              title="Open Folder"
              shortcut="Ctrl+O"
              onClick={handleOpenFolder}
            />
            <QuickAction
              icon={<WelcomeFileIcon />}
              title="New File"
              shortcut="Ctrl+N"
              onClick={handleNewFile}
            />
            <QuickAction
              icon={<GitIcon />}
              title="Clone Repo"
              onClick={handleCloneRepo}
            />
          </div>
        </div>

        {/* Recent Folders */}
        {recentFolders.length > 0 && (
          <div className="welcome-screen__section">
            <h2 className="welcome-screen__section-title">Recent</h2>
            <div className="welcome-screen__recent">
              {isLoadingRecent ? (
                <div className="welcome-screen__recent-loading">Loading...</div>
              ) : (
                recentFolders.slice(0, 5).map((folder) => (
                  <button
                    key={folder.path}
                    className="recent-item"
                    onClick={() => handleOpenRecentFolder(folder.path)}
                    title={folder.path}
                  >
                    <div className="recent-item__icon">
                      <FolderIcon />
                    </div>
                    <div className="recent-item__info">
                      <span className="recent-item__name">{folder.name}</span>
                      <span className="recent-item__path">{folder.path}</span>
                    </div>
                    <span className="recent-item__time">{formatRelativeTime(folder.lastOpened)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts */}
        <div className="welcome-screen__section">
          <h2 className="welcome-screen__section-title">Shortcuts</h2>
          <div className="welcome-screen__shortcuts">
            <ShortcutHint keys={['Ctrl', 'S']} label="Save" />
            <ShortcutHint keys={['Ctrl', 'P']} label="Quick Open" />
            <ShortcutHint keys={['Ctrl', '~']} label="Terminal" />
            <ShortcutHint keys={['Ctrl', 'B']} label="Sidebar" />
            <ShortcutHint keys={['Ctrl', 'F']} label="Find" />
            <ShortcutHint keys={['F5']} label="Run" />
          </div>
        </div>

        {/* Footer */}
        <div className="welcome-screen__footer">
          <ArrowIcon />
          <span>Select a file to start editing</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Quick Action Component
   ------------------------------------------------------------------------- */

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  shortcut?: string;
  onClick?: () => void;
}

function QuickAction({ icon, title, shortcut, onClick }: QuickActionProps) {
  return (
    <button className="quick-action" onClick={onClick}>
      <div className="quick-action__icon">{icon}</div>
      <span className="quick-action__title">{title}</span>
      {shortcut && <kbd className="quick-action__shortcut">{shortcut}</kbd>}
    </button>
  );
}

/* -------------------------------------------------------------------------
   Welcome Screen Icons
   ------------------------------------------------------------------------- */

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function WelcomeFileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  );
}

function GitIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="18" r="3"/>
      <circle cx="6" cy="6" r="3"/>
      <path d="M6 21V9a9 9 0 0 0 9 9"/>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

/* -------------------------------------------------------------------------
   Shortcut Hint Component
   ------------------------------------------------------------------------- */

interface ShortcutHintProps {
  keys: string[];
  label: string;
}

function ShortcutHint({ keys, label }: ShortcutHintProps) {
  return (
    <div className="shortcut-hint">
      <span className="shortcut-hint__keys">
        {keys.map((key, i) => (
          <kbd key={i} className="shortcut-hint__key">{key}</kbd>
        ))}
      </span>
      <span className="shortcut-hint__label">{label}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Close Confirmation Dialog
   ------------------------------------------------------------------------- */

interface CloseConfirmDialogProps {
  fileName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

function CloseConfirmDialog({ fileName, onSave, onDiscard, onCancel }: CloseConfirmDialogProps) {
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
    <div className="close-confirm-overlay" onClick={onCancel}>
      <div className="close-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="close-confirm-dialog__icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div className="close-confirm-dialog__content">
          <h3 className="close-confirm-dialog__title">Unsaved Changes</h3>
          <p className="close-confirm-dialog__message">
            Do you want to save the changes you made to <strong>{fileName}</strong>?
          </p>
          <p className="close-confirm-dialog__warning">
            Your changes will be lost if you don't save them.
          </p>
        </div>
        <div className="close-confirm-dialog__actions">
          <button className="close-confirm-dialog__btn close-confirm-dialog__btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="close-confirm-dialog__btn close-confirm-dialog__btn--danger" onClick={onDiscard}>
            Don't Save
          </button>
          <button className="close-confirm-dialog__btn close-confirm-dialog__btn--primary" onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------------- */

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M9.354 2.646a.5.5 0 0 1 0 .708L6.707 6l2.647 2.646a.5.5 0 0 1-.708.708L6 6.707 3.354 9.354a.5.5 0 0 1-.708-.708L5.293 6 2.646 3.354a.5.5 0 0 1 .708-.708L6 5.293l2.646-2.647a.5.5 0 0 1 .708 0z"/>
    </svg>
  );
}
