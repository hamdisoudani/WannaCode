/* ==========================================================================
   Sidebar - File Explorer Container with Context-Aware Actions
   VS Code-like behavior with inline file creation
   ========================================================================== */

import { useState, useCallback, createContext, useContext } from 'react';
import { open as openFolderDialog } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../../stores/appStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { FileExplorer } from '../FileExplorer';
import { SearchPanel } from './SearchPanel';
import './Sidebar.css';

// Context for file creation state - allows FileNode to render input inline
export interface CreateContextType {
  isCreating: 'file' | 'folder' | null;
  creatingInPath: string | null;
  newItemName: string;
  setNewItemName: (name: string) => void;
  handleSubmit: () => void;
  handleCancel: () => void;
}

export const CreateContext = createContext<CreateContextType | null>(null);

export function useCreateContext() {
  return useContext(CreateContext);
}

interface SidebarProps {
  activeView: 'explorer' | 'search';
  selectedPath: string | null;
  onSelectPath: (path: string | null) => void;
}

export function Sidebar({ activeView, selectedPath, onSelectPath }: SidebarProps) {
  const projectPath = useAppStore((state) => state.projectPath);
  const { openFolder, refreshFileTree, createFile, createDirectory } = useFileSystem();
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [creatingInPath, setCreatingInPath] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [isProjectExpanded, setIsProjectExpanded] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Get project name from path
  const projectName = projectPath?.split(/[/\\]/).pop() || '';

  const handleOpenFolder = useCallback(async () => {
    try {
      const selectedFolderPath = await openFolderDialog({
        directory: true,
        multiple: false,
        title: 'Open Folder',
      });

      if (selectedFolderPath && typeof selectedFolderPath === 'string') {
        await openFolder(selectedFolderPath);
        setIsProjectExpanded(true);
      }
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  }, [openFolder]);

  const handleRefresh = useCallback(async () => {
    if (projectPath) {
      await refreshFileTree();
    }
  }, [projectPath, refreshFileTree]);

  const handleCollapseAll = useCallback(() => {
    setIsProjectExpanded(false);
  }, []);

  const handleToggleProject = useCallback(() => {
    setIsProjectExpanded(prev => !prev);
  }, []);

  // Determine the target path for new items
  const getTargetPath = useCallback(() => {
    if (selectedPath) {
      return selectedPath;
    }
    return projectPath;
  }, [selectedPath, projectPath]);

  const handleNewFile = useCallback(() => {
    if (!projectPath) return;
    const targetPath = getTargetPath();
    setCreatingInPath(targetPath);
    setIsCreating('file');
    setNewItemName('');
  }, [projectPath, getTargetPath]);

  const handleNewFolder = useCallback(() => {
    if (!projectPath) return;
    const targetPath = getTargetPath();
    setCreatingInPath(targetPath);
    setIsCreating('folder');
    setNewItemName('');
  }, [projectPath, getTargetPath]);

  const handleCreateSubmit = useCallback(async () => {
    if (!newItemName.trim() || !isCreating || !creatingInPath) return;

    const separator = creatingInPath.includes('/') ? '/' : '\\';
    const newPath = `${creatingInPath}${separator}${newItemName.trim()}`;

    try {
      if (isCreating === 'file') {
        await createFile(newPath);
      } else {
        await createDirectory(newPath);
      }
      await refreshFileTree();
    } catch (error) {
      console.error(`Failed to create ${isCreating}:`, error);
    } finally {
      setIsCreating(null);
      setCreatingInPath(null);
      setNewItemName('');
    }
  }, [newItemName, isCreating, creatingInPath, createFile, createDirectory, refreshFileTree]);

  const handleCreateCancel = useCallback(() => {
    setIsCreating(null);
    setCreatingInPath(null);
    setNewItemName('');
  }, []);

  // Context value for inline creation
  const createContextValue: CreateContextType = {
    isCreating,
    creatingInPath,
    newItemName,
    setNewItemName,
    handleSubmit: handleCreateSubmit,
    handleCancel: handleCreateCancel,
  };

  return (
    <div 
      className={`sidebar ${isSidebarHovered ? 'sidebar--hovered' : ''}`}
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
    >
      {activeView === 'explorer' ? (
        <>
          {/* Explorer Section Header */}
          <div className="sidebar__section">
            <header className="sidebar__header">
              <span className="sidebar__section-title">Explorer</span>
              <div className="sidebar__header-actions">
                <button className="sidebar__action" onClick={() => {}} title="Views and More Actions">
                  <MoreIcon />
                </button>
              </div>
            </header>

            {/* Project Header with Actions - Always visible on sidebar hover */}
            {projectPath && (
              <div className="sidebar__project-header">
                <button 
                  className="sidebar__project-toggle"
                  onClick={handleToggleProject}
                  title={isProjectExpanded ? "Collapse" : "Expand"}
                >
                  <span className={`sidebar__project-chevron ${isProjectExpanded ? 'sidebar__project-chevron--expanded' : ''}`}>
                    <ChevronRightIcon />
                  </span>
                  <span className="sidebar__project-name">{projectName.toUpperCase()}</span>
                </button>
                <div className="sidebar__project-actions">
                  <button 
                    className="sidebar__action" 
                    onClick={handleNewFile}
                    title="New File..."
                  >
                    <NewFileIcon />
                  </button>
                  <button 
                    className="sidebar__action" 
                    onClick={handleNewFolder}
                    title="New Folder..."
                  >
                    <NewFolderIcon />
                  </button>
                  <button 
                    className="sidebar__action" 
                    onClick={handleRefresh}
                    title="Refresh Explorer"
                  >
                    <RefreshIcon />
                  </button>
                  <button 
                    className="sidebar__action" 
                    onClick={handleCollapseAll}
                    title="Collapse Folders in Explorer"
                  >
                    <CollapseIcon />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* File Tree Content - Only shown when expanded */}
          <div className={`sidebar__content ${!isProjectExpanded ? 'sidebar__content--collapsed' : ''}`}>
            {projectPath ? (
              <>
                {isProjectExpanded && (
                  <CreateContext.Provider value={createContextValue}>
                    <FileExplorer 
                      selectedPath={selectedPath}
                      onSelectPath={onSelectPath}
                    />
                  </CreateContext.Provider>
                )}
              </>
            ) : (
              <div className="sidebar__empty">
                <p className="sidebar__empty-text">No folder opened</p>
                <button 
                  className="sidebar__open-button"
                  onClick={handleOpenFolder}
                >
                  Open Folder
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Search View */
        <SearchPanel />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------------- */

function MoreIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function NewFileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9.5 1H3.5A1.5 1.5 0 0 0 2 2.5v11A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5V5.5L9.5 1z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9.5 1 9.5 5.5 14 5.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="9" x2="8" y2="13" stroke="currentColor" strokeLinecap="round" />
      <line x1="6" y1="11" x2="10" y2="11" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function NewFolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M14 4H7.5L6.354 2.854A.5.5 0 0 0 6 2.5H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="8" x2="8" y2="12" stroke="currentColor" strokeLinecap="round" />
      <line x1="6" y1="10" x2="10" y2="10" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
      <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M9 9H4v1h5V9z"/>
      <path d="M4 4h5v1H4V4z"/>
      <path d="M9 4h1l3 3-3 3H9v-1l2.29-2L9 5V4z"/>
      <path fillRule="evenodd" d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11z"/>
    </svg>
  );
}


