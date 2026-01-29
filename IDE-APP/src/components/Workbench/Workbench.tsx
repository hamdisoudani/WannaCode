/* ==========================================================================
   Workbench - Main Application Layout with Activity Bar + Resizing
   ========================================================================== */

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import { ActivityBar, type ActivityBarView } from './ActivityBar';
import { Sidebar } from './Sidebar';
import { EditorPanel } from './EditorPanel';
import { BottomPanel } from './BottomPanel';
import { AIPanel } from '../AI';
import { useResizable } from '../../hooks/useResizable';
import { useFileWatcher } from '../../hooks/useFileWatcher';
import { useAutoSave } from '../../hooks/useAutoSave';
import './Workbench.css';

export function Workbench() {
  // Activate file watcher for open files
  useFileWatcher();
  
  // Activate auto-save
  useAutoSave();

  const { 
    isSidebarVisible, 
    isTerminalVisible,
    isAIPanelVisible,
    panelDimensions,
    setSidebarWidth,
    setTerminalHeight,
    toggleTerminal,
    toggleSidebar,
    toggleAIPanel,
    openSettings,
  } = useAppStore();

  // Activity bar state
  const [activeView, setActiveView] = useState<ActivityBarView>('explorer');
  
  // Selected file/folder in explorer for context-aware actions
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // Sidebar resizing
  const sidebarResize = useResizable({
    direction: 'horizontal',
    initialSize: panelDimensions.sidebarWidth,
    minSize: 180,
    maxSize: 500,
    onResize: setSidebarWidth,
  });

  // Terminal resizing (inverted - dragging up increases size)
  const terminalResize = useResizable({
    direction: 'vertical',
    initialSize: panelDimensions.terminalHeight,
    minSize: 100,
    maxSize: 500,
    onResize: setTerminalHeight,
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+J - Toggle bottom panel
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        toggleTerminal();
      }
      
      // Ctrl+B - Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      
      // Ctrl+` - Toggle terminal (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        toggleTerminal();
      }

      // Ctrl+, - Open settings
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        openSettings();
      }

      // Ctrl+Shift+I - Toggle AI Panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        toggleAIPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTerminal, toggleSidebar, openSettings, toggleAIPanel]);

  const handleViewChange = useCallback((view: ActivityBarView) => {
    setActiveView(view);
  }, []);

  return (
    <div 
      className={`workbench ${sidebarResize.isResizing || terminalResize.isResizing ? 'workbench--resizing' : ''}`}
      style={{
        '--sidebar-width': isSidebarVisible ? `${sidebarResize.size}px` : '0px',
        '--terminal-height': isTerminalVisible ? `${terminalResize.size}px` : '0px',
      } as React.CSSProperties}
    >
      {/* Activity Bar - Left icon strip */}
      <ActivityBar 
        activeView={activeView} 
        onViewChange={handleViewChange} 
      />

      {/* Sidebar - File Explorer (CSS hidden to preserve state) */}
      <aside 
        className={`workbench__sidebar ${!isSidebarVisible ? 'workbench__sidebar--hidden' : ''}`}
        style={{ width: isSidebarVisible ? sidebarResize.size : 0 }}
      >
        <Sidebar 
          activeView={activeView}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
        />
        {/* Sidebar Resize Handle */}
        {isSidebarVisible && (
          <div 
            className={`workbench__resizer workbench__resizer--horizontal ${sidebarResize.isResizing ? 'resizer--active' : ''}`}
            onMouseDown={sidebarResize.startResizing}
          />
        )}
      </aside>

      {/* Main Content Area (Editor + Bottom Panel + AI Panel) */}
      <main className="workbench__content">
        {/* Editor + AI Panel Row */}
        <div className="workbench__editor-row">
          {/* Editor Panel */}
          <section className="workbench__editor">
            <EditorPanel />
          </section>

          {/* AI Panel - Always mounted, CSS hidden to preserve chat state */}
          <AIPanel isVisible={isAIPanelVisible} />
        </div>

        {/* Bottom Panel - Always mounted, CSS hidden to preserve terminal state */}
        <section 
          className={`workbench__terminal ${!isTerminalVisible ? 'workbench__terminal--hidden' : ''}`}
          style={{ height: isTerminalVisible ? terminalResize.size : 0 }}
        >
          {/* Terminal Resize Handle */}
          {isTerminalVisible && (
            <div 
              className="workbench__resizer workbench__resizer--vertical"
              onMouseDown={(e) => {
                const startY = e.clientY;
                const startHeight = terminalResize.size;
                
                const handleMove = (moveE: MouseEvent) => {
                  const diff = startY - moveE.clientY;
                  const newHeight = Math.min(500, Math.max(100, startHeight + diff));
                  setTerminalHeight(newHeight);
                };
                
                const handleUp = () => {
                  document.removeEventListener('mousemove', handleMove);
                  document.removeEventListener('mouseup', handleUp);
                  document.body.style.cursor = '';
                  document.body.style.userSelect = '';
                };
                
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
                document.body.style.cursor = 'row-resize';
                document.body.style.userSelect = 'none';
              }}
            />
          )}
          <BottomPanel isVisible={isTerminalVisible} />
        </section>
      </main>
    </div>
  );
}
