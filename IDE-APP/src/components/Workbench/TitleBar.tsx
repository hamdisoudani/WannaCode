/* ==========================================================================
   TitleBar - Custom window title bar with menus and controls
   ========================================================================== */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { useAppStore } from '../../stores/appStore';
import { useFileSystem } from '../../hooks/useFileSystem';
import { useEditor } from '../../hooks/useEditor';
import { getLanguageFromPath } from '../../types';
import './TitleBar.css';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);
  
  const { 
    isTerminalVisible, 
    isSidebarVisible,
    isAIPanelVisible,
    toggleTerminal, 
    toggleSidebar,
    toggleAIPanel,
    projectPath,
    openFiles,
    activeFilePath,
    closeFile,
    closeAllFiles,
    openFile: openFileInStore,
  } = useAppStore();
  
  const { openFolder, openFile, saveFile } = useFileSystem();
  const { hasUnsavedChanges, getUnsavedFiles } = useEditor();

  // Get project name from path
  const projectName = projectPath?.split(/[/\\]/).pop() || 'CodeSurf';
  const activeFile = openFiles.find(f => f.path === activeFilePath);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    
    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeMenu]);

  // Close menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenu(null);
      }
    };
    
    if (activeMenu) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [activeMenu]);

  // Check initial maximized state
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await getCurrentWindow().isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check maximized state:', error);
      }
    };
    checkMaximized();

    const unlisten = getCurrentWindow().onResized(async () => {
      try {
        const maximized = await getCurrentWindow().isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check maximized state:', error);
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // Window control handlers
  const handleMinimize = useCallback(async () => {
    await getCurrentWindow().minimize();
  }, []);

  const handleMaximize = useCallback(async () => {
    const win = getCurrentWindow();
    if (await win.isMaximized()) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  }, []);

  const handleClose = useCallback(async () => {
    // TODO: Check for unsaved files before closing
    await getCurrentWindow().close();
  }, []);

  // Menu actions
  const handleNewFile = useCallback(() => {
    setActiveMenu(null);
    // Create an untitled file in memory
    const untitledCount = openFiles.filter(f => f.name.startsWith('Untitled')).length;
    const fileName = untitledCount === 0 ? 'Untitled-1' : `Untitled-${untitledCount + 1}`;
    const filePath = projectPath ? `${projectPath}\\${fileName}` : fileName;
    
    openFileInStore({
      path: filePath,
      name: fileName,
      content: '',
      originalContent: '',
      language: 'plaintext',
      isDirty: true, // New file is dirty until saved
    });
  }, [openFiles, projectPath, openFileInStore]);

  const handleOpenFile = useCallback(async () => {
    setActiveMenu(null);
    const selected = await openDialog({
      directory: false,
      multiple: false,
      title: 'Open File',
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'TypeScript', extensions: ['ts', 'tsx'] },
        { name: 'JavaScript', extensions: ['js', 'jsx'] },
        { name: 'JSON', extensions: ['json'] },
        { name: 'HTML', extensions: ['html', 'htm'] },
        { name: 'CSS', extensions: ['css', 'scss', 'less'] },
        { name: 'Markdown', extensions: ['md', 'mdx'] },
      ],
    });
    if (selected && typeof selected === 'string') {
      const fileName = selected.split(/[/\\]/).pop() || 'file';
      await openFile(selected, fileName);
    }
  }, [openFile]);

  const handleOpenFolder = useCallback(async () => {
    setActiveMenu(null);
    const selected = await openDialog({
      directory: true,
      multiple: false,
      title: 'Open Folder',
    });
    if (selected && typeof selected === 'string') {
      await openFolder(selected);
    }
  }, [openFolder]);

  const handleSave = useCallback(async () => {
    setActiveMenu(null);
    if (activeFile) {
      // Check if it's an untitled file (needs Save As)
      if (activeFile.name.startsWith('Untitled')) {
        const savePath = await saveDialog({
          title: 'Save File',
          defaultPath: projectPath || undefined,
          filters: [
            { name: 'TypeScript', extensions: ['ts', 'tsx'] },
            { name: 'JavaScript', extensions: ['js', 'jsx'] },
            { name: 'JSON', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        });
        if (savePath) {
          await saveFile(savePath, activeFile.content);
          // Update the file in store with new path
          const fileName = savePath.split(/[/\\]/).pop() || 'file';
          closeFile(activeFile.path);
          openFileInStore({
            path: savePath,
            name: fileName,
            content: activeFile.content,
            originalContent: activeFile.content,
            language: getLanguageFromPath(savePath),
            isDirty: false,
          });
        }
      } else {
        await saveFile(activeFile.path, activeFile.content);
      }
    }
  }, [activeFile, projectPath, saveFile, closeFile, openFileInStore]);

  const handleSaveAll = useCallback(async () => {
    setActiveMenu(null);
    const unsaved = getUnsavedFiles();
    for (const file of unsaved) {
      // Skip untitled files for Save All
      if (!file.name.startsWith('Untitled')) {
        await saveFile(file.path, file.content);
      }
    }
  }, [getUnsavedFiles, saveFile]);

  const handleCloseFile = useCallback(() => {
    setActiveMenu(null);
    if (activeFilePath && activeFile) {
      if (activeFile.isDirty) {
        window.dispatchEvent(new CustomEvent('request-close-file', { 
          detail: { path: activeFilePath, name: activeFile.name, isDirty: true }
        }));
      } else {
        closeFile(activeFilePath);
      }
    }
  }, [activeFilePath, activeFile, closeFile]);

  const handleCloseAllFiles = useCallback(async () => {
    setActiveMenu(null);
    const dirtyFiles = openFiles.filter(f => f.isDirty && !f.name.startsWith('Untitled'));
    if (dirtyFiles.length > 0) {
      for (const file of dirtyFiles) {
        await saveFile(file.path, file.content);
      }
    }
    closeAllFiles();
  }, [closeAllFiles, openFiles, saveFile]);

  const handleToggleTerminal = useCallback(() => {
    setActiveMenu(null);
    toggleTerminal();
  }, [toggleTerminal]);

  const handleToggleSidebar = useCallback(() => {
    setActiveMenu(null);
    toggleSidebar();
  }, [toggleSidebar]);

  const handleToggleAIPanel = useCallback(() => {
    setActiveMenu(null);
    toggleAIPanel();
  }, [toggleAIPanel]);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleMenuHover = (menu: string) => {
    if (activeMenu !== null) {
      setActiveMenu(menu);
    }
  };

  return (
    <div className="titlebar" data-tauri-drag-region>
      {/* App Icon */}
      <div className="titlebar__icon">
        <AppIcon />
      </div>

      {/* Menu Bar */}
      <div className="titlebar__menus" ref={menuBarRef}>
        {/* File Menu */}
        <div className="titlebar__menu-container">
          <button 
            className={`titlebar__menu ${activeMenu === 'file' ? 'titlebar__menu--active' : ''}`}
            onClick={() => handleMenuClick('file')}
            onMouseEnter={() => handleMenuHover('file')}
          >
            File
          </button>
          {activeMenu === 'file' && (
            <div className="titlebar__dropdown">
              <MenuItem label="New File" shortcut="Ctrl+N" onClick={handleNewFile} />
              <MenuDivider />
              <MenuItem label="Open File..." shortcut="Ctrl+O" onClick={handleOpenFile} />
              <MenuItem label="Open Folder..." onClick={handleOpenFolder} />
              <MenuDivider />
              <MenuItem 
                label="Save" 
                shortcut="Ctrl+S" 
                onClick={handleSave}
                disabled={!activeFile?.isDirty}
              />
              <MenuItem 
                label="Save All" 
                shortcut="Ctrl+K S" 
                onClick={handleSaveAll}
                disabled={!hasUnsavedChanges()}
              />
              <MenuDivider />
              <MenuItem 
                label="Close Editor" 
                shortcut="Ctrl+W" 
                onClick={handleCloseFile}
                disabled={!activeFilePath}
              />
              <MenuItem 
                label="Close All Editors" 
                onClick={handleCloseAllFiles}
                disabled={openFiles.length === 0}
              />
              <MenuDivider />
              <MenuItem label="Exit" shortcut="Alt+F4" onClick={handleClose} />
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div className="titlebar__menu-container">
          <button 
            className={`titlebar__menu ${activeMenu === 'edit' ? 'titlebar__menu--active' : ''}`}
            onClick={() => handleMenuClick('edit')}
            onMouseEnter={() => handleMenuHover('edit')}
          >
            Edit
          </button>
          {activeMenu === 'edit' && (
            <div className="titlebar__dropdown">
              <MenuItem label="Undo" shortcut="Ctrl+Z" disabled />
              <MenuItem label="Redo" shortcut="Ctrl+Y" disabled />
              <MenuDivider />
              <MenuItem label="Cut" shortcut="Ctrl+X" disabled />
              <MenuItem label="Copy" shortcut="Ctrl+C" disabled />
              <MenuItem label="Paste" shortcut="Ctrl+V" disabled />
              <MenuDivider />
              <MenuItem label="Find" shortcut="Ctrl+F" disabled />
              <MenuItem label="Replace" shortcut="Ctrl+H" disabled />
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="titlebar__menu-container">
          <button 
            className={`titlebar__menu ${activeMenu === 'view' ? 'titlebar__menu--active' : ''}`}
            onClick={() => handleMenuClick('view')}
            onMouseEnter={() => handleMenuHover('view')}
          >
            View
          </button>
          {activeMenu === 'view' && (
            <div className="titlebar__dropdown">
              <MenuItem 
                label="Explorer" 
                shortcut="Ctrl+Shift+E" 
                onClick={handleToggleSidebar}
                checked={isSidebarVisible}
              />
              <MenuDivider />
              <MenuItem 
                label="Terminal" 
                shortcut="Ctrl+`" 
                onClick={handleToggleTerminal}
                checked={isTerminalVisible}
              />
              <MenuItem label="Problems" shortcut="Ctrl+Shift+M" disabled />
              <MenuDivider />
              <MenuItem 
                label="AI Assistant" 
                shortcut="Ctrl+Shift+I" 
                onClick={handleToggleAIPanel}
                checked={isAIPanelVisible}
              />
            </div>
          )}
        </div>

        {/* Terminal Menu */}
        <div className="titlebar__menu-container">
          <button 
            className={`titlebar__menu ${activeMenu === 'terminal' ? 'titlebar__menu--active' : ''}`}
            onClick={() => handleMenuClick('terminal')}
            onMouseEnter={() => handleMenuHover('terminal')}
          >
            Terminal
          </button>
          {activeMenu === 'terminal' && (
            <div className="titlebar__dropdown">
              <MenuItem label="New Terminal" shortcut="Ctrl+Shift+`" disabled />
              <MenuDivider />
              <MenuItem 
                label={isTerminalVisible ? "Hide Terminal Panel" : "Show Terminal Panel"}
                onClick={handleToggleTerminal}
              />
            </div>
          )}
        </div>
      </div>

      {/* Draggable spacer / Title */}
      <div className="titlebar__title" data-tauri-drag-region>
        <span className="titlebar__project-name">{projectName}</span>
      </div>

      {/* Right-side layout actions */}
      <div className="titlebar__actions">
        <button 
          className={`titlebar__action ${isSidebarVisible ? 'titlebar__action--active' : ''}`} 
          title="Toggle Primary Side Bar (Ctrl+B)"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </button>
        <button 
          className={`titlebar__action ${isTerminalVisible ? 'titlebar__action--active' : ''}`} 
          title="Toggle Panel (Ctrl+J)"
          onClick={toggleTerminal}
        >
          <PanelIcon />
        </button>
        <button 
          className={`titlebar__action ${isAIPanelVisible ? 'titlebar__action--active' : ''}`} 
          title="Toggle AI Assistant (Ctrl+Shift+I)"
          onClick={toggleAIPanel}
        >
          <AIIcon />
        </button>
      </div>

      {/* Window Controls */}
      <div className="titlebar__controls">
        <button 
          className="titlebar__control titlebar__control--minimize"
          onClick={handleMinimize}
          title="Minimize"
        >
          <MinimizeIcon />
        </button>
        <button 
          className="titlebar__control titlebar__control--maximize"
          onClick={handleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>
        <button 
          className="titlebar__control titlebar__control--close"
          onClick={handleClose}
          title="Close"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Menu Item Component
   ------------------------------------------------------------------------- */

interface MenuItemProps {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  checked?: boolean;
}

function MenuItem({ label, shortcut, onClick, disabled, checked }: MenuItemProps) {
  return (
    <button 
      className={`titlebar__dropdown-item ${disabled ? 'titlebar__dropdown-item--disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="titlebar__dropdown-item-check">
        {checked && <CheckIcon />}
      </span>
      <span className="titlebar__dropdown-item-label">{label}</span>
      {shortcut && (
        <span className="titlebar__dropdown-item-shortcut">{shortcut}</span>
      )}
    </button>
  );
}

function MenuDivider() {
  return <div className="titlebar__dropdown-divider" />;
}

/* -------------------------------------------------------------------------
   Icons
   ------------------------------------------------------------------------- */

function AppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function SidebarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M2 3h12v10H2V3zm1 1v8h3V4H3zm4 0v8h6V4H7z"/>
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M2 3h12v10H2V3zm1 1v5h10V4H3zm0 6v2h10v-2H3z"/>
    </svg>
  );
}

function AIIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
      <path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/>
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2" y="5.5" width="8" height="1" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="2" y="2" width="8" height="8" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="3.5" y="1" width="6.5" height="6.5" />
      <path d="M2 4v6.5h6.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L6 4.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L7.06 6l2.72 2.72a.75.75 0 1 1-1.06 1.06L6 7.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 0 1 0-1.06z" />
    </svg>
  );
}
