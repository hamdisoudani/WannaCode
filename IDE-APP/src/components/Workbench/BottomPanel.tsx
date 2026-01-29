/* ==========================================================================
   BottomPanel - Multi-terminal support with Problems, Output tabs
   ========================================================================== */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../stores/appStore';
import { useDiagnosticsStore, entriesToFileDiagnostics } from '../../stores/diagnosticsStore';
import { TerminalInstance, TerminalInstanceRef } from '../Terminal';
// import { useResizable } from '../../hooks/useResizable'; // Removed unused import
import { PowerShellIcon, CmdIcon, BashIcon, TerminalIcon } from '../FileExplorer/icons';
import './BottomPanel.css';

type PanelTab = 'problems' | 'output' | 'debug' | 'terminal' | 'ports';

interface TerminalTab {
  id: string;
  name: string;
  pid: number | null;
}

interface BottomPanelProps {
  isVisible: boolean;
}

let terminalIdCounter = 0;

export function BottomPanel({ isVisible }: BottomPanelProps) {
  const { toggleTerminal, projectPath, setTerminalHeight, panelDimensions } = useAppStore();
  const [activeTab, setActiveTab] = useState<PanelTab>('terminal');
  const [terminals, setTerminals] = useState<TerminalTab[]>(() => [
    { id: `term-${++terminalIdCounter}`, name: 'Terminal', pid: null }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState<string>(terminals[0].id);
  
  // Search state
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    terminalId: string | null;
  }>({ visible: false, x: 0, y: 0, terminalId: null });
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  const terminalRefs = useRef<Map<string, TerminalInstanceRef>>(new Map());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu.visible]);

  // Focus search input when toggled
  useEffect(() => {
    if (isSearchVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchVisible]);

  /* Removed unused activeTerminal */

  const handleNewTerminal = useCallback(() => {
    const newId = `term-${++terminalIdCounter}`;
    const newTerminal: TerminalTab = {
      id: newId,
      name: `Terminal ${terminals.length + 1}`,
      pid: null,
    };
    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminalId(newId);
  }, [terminals.length]);

  const handleKillTerminal = useCallback(() => {
    if (terminals.length <= 1) return; // Keep at least one terminal
    
    const currentIndex = terminals.findIndex(t => t.id === activeTerminalId);
    const newTerminals = terminals.filter(t => t.id !== activeTerminalId);
    
    // Switch to adjacent terminal
    const newIndex = Math.min(currentIndex, newTerminals.length - 1);
    setActiveTerminalId(newTerminals[newIndex].id);
    setTerminals(newTerminals);
    
    // Cleanup ref
    terminalRefs.current.delete(activeTerminalId);
  }, [terminals, activeTerminalId]);

  const handleRestartTerminal = useCallback(() => {
    const ref = terminalRefs.current.get(activeTerminalId);
    ref?.restart();
  }, [activeTerminalId]);

  const handleClearTerminal = useCallback(() => {
    const ref = terminalRefs.current.get(activeTerminalId);
    ref?.clear();
  }, [activeTerminalId]);

  const handleShellInfo = useCallback((id: string, shell: string, pid: number | null) => {
    setTerminals(prev => prev.map(t => 
      t.id === id ? { ...t, name: shell, pid } : t
    ));
  }, []);

  /* Removed unused handleTerminalSelect */

  const setTerminalRef = useCallback((id: string, ref: TerminalInstanceRef | null) => {
    if (ref) {
      terminalRefs.current.set(id, ref);
    } else {
      terminalRefs.current.delete(id);
    }
  }, []);

  const getShellIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('powershell') || lower.includes('pwsh')) return <PowerShellIcon />;
    if (lower.includes('calc') || lower.includes('cmd')) return <CmdIcon />;
    if (lower.includes('bash')) return <BashIcon />;
    return <TerminalIcon />;
  };

  const diagnosticsCounts = useDiagnosticsStore(useShallow((state) => state.counts));
  const totalProblems = diagnosticsCounts.errors + diagnosticsCounts.warnings;

  return (
    <div className="bottom-panel">
      <div className="bottom-panel__header">
        <div className="bottom-panel__tabs">
          <TabButton label="Problems" count={totalProblems} isActive={activeTab === 'problems'} onClick={() => setActiveTab('problems')} />
          <TabButton label="Output" isActive={activeTab === 'output'} onClick={() => setActiveTab('output')} />
          <TabButton label="Debug Console" isActive={activeTab === 'debug'} onClick={() => setActiveTab('debug')} />
          <TabButton label="Terminal" isActive={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')} />
          <TabButton label="Ports" isActive={activeTab === 'ports'} onClick={() => setActiveTab('ports')} />
        </div>

        {activeTab === 'terminal' && (
          <div className="bottom-panel__terminal-controls">
            {/* Replaces Dropdown with new split view buttons in sidebar, effectively removing the dropdown control here */}
            {/* Old controls can be minimized or removed as they move to the sidebar header */}

            <button 
              className={`bottom-panel__action ${isSearchVisible ? 'bottom-panel__action--active' : ''}`}
              title="Find in Terminal (Ctrl+F)" 
              onClick={() => setIsSearchVisible(!isSearchVisible)}
            >
              <SearchIcon />
            </button>
            
            <div className="bottom-panel__divider" />
            
            <button className="bottom-panel__action" title="Clear Terminal" onClick={handleClearTerminal}>
              <ClearIcon />
            </button>
            <button className="bottom-panel__action" title="Restart Terminal" onClick={handleRestartTerminal}>
              <RefreshIcon />
            </button>
          </div>
        )}

        <div className="bottom-panel__actions">
          <button 
            className="bottom-panel__action" 
            title="Maximize Panel"
            onClick={() => {
                const isMaximized = panelDimensions.terminalHeight > 500;
                setTerminalHeight(isMaximized ? 250 : window.innerHeight - 50);
            }}
          >
            <MaximizeIcon />
          </button>
          <button className="bottom-panel__action" title="Close Panel" onClick={toggleTerminal}>
            <CloseIcon />
          </button>
        </div>
      </div>
      
      {/* Search Bar - only shows when toggled */}
      {isSearchVisible && activeTab === 'terminal' && (
        <div className="bottom-panel__search-bar">
           <input 
             ref={searchInputRef}
             type="text" 
             placeholder="Find in terminal..." 
             className="bottom-panel__search-input"
             value={searchQuery}
             onChange={(e) => {
               setSearchQuery(e.target.value);
               const ref = terminalRefs.current.get(activeTerminalId);
               if (ref) ref.findNext(e.target.value);
             }}
             onKeyDown={(e) => {
               if (e.key === 'Enter') {
                 const ref = terminalRefs.current.get(activeTerminalId);
                 if (e.shiftKey) ref?.findPrevious(searchQuery);
                 else ref?.findNext(searchQuery);
               }
               if (e.key === 'Escape') {
                 setIsSearchVisible(false);
                 terminalRefs.current.get(activeTerminalId)?.focus();
               }
             }}
           />
           <div className="bottom-panel__search-actions">
             <button onClick={() => terminalRefs.current.get(activeTerminalId)?.findPrevious(searchQuery)} title="Previous match"><ChevronUpIcon /></button>
             <button onClick={() => terminalRefs.current.get(activeTerminalId)?.findNext(searchQuery)} title="Next match"><ChevronDownIcon /></button>
             <button onClick={() => setIsSearchVisible(false)} title="Close"><CloseIcon /></button>
           </div>
        </div>
      )}


      <div className="bottom-panel__content">
        {activeTab === 'problems' && <ProblemsView />}
        {activeTab === 'output' && (
          <div className="bottom-panel__placeholder">No output yet.</div>
        )}
        {activeTab === 'debug' && (
          <div className="bottom-panel__placeholder">Debug console is empty.</div>
        )}
        
        {/* Render all terminals but only show active one */}
        {/* Container for terminal content + Sidebar List */}
        <div 
           className="bottom-panel__container"
           style={{ display: activeTab === 'terminal' ? 'flex' : 'none' }}
        >
            <div className="bottom-panel__terminal-wrapper">
                {terminals.map(term => (
                    <div
                        key={term.id}
                        className={`bottom-panel__terminal-pane ${term.id !== activeTerminalId ? 'bottom-panel__terminal-pane--hidden' : ''}`}
                    >
                        <TerminalInstance
                            ref={(ref) => setTerminalRef(term.id, ref)}
                            id={term.id}
                            cwd={projectPath}
                            isVisible={isVisible && activeTab === 'terminal' && term.id === activeTerminalId}
                            onShellInfo={handleShellInfo}
                        />
                    </div>
                ))}
            </div>

            {/* Terminal Sidebar List */}
            <div className="bottom-panel__sidebar">
                <div className="bottom-panel__sidebar-header">
                    <span>Terminals</span>
                    <button className="bottom-panel__action" title="New Terminal" onClick={handleNewTerminal}>
                        <PlusIcon />
                    </button>
                </div>
                <div className="bottom-panel__sidebar-list">
                    {terminals.map((term) => (
                        <div 
                            key={term.id}
                            className={`bottom-panel__sidebar-item ${term.id === activeTerminalId ? 'bottom-panel__sidebar-item--active' : ''}`}
                            onClick={() => setActiveTerminalId(term.id)}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({
                                    visible: true,
                                    x: e.clientX,
                                    y: e.clientY,
                                    terminalId: term.id,
                                });
                            }}
                        >
                            {renameId === term.id ? (
                                <input
                                    autoFocus
                                    className="bottom-panel__rename-input"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onBlur={() => {
                                        if (renameValue.trim()) {
                                            setTerminals(prev => prev.map(t => 
                                                t.id === term.id ? { ...t, name: renameValue.trim() } : t
                                            ));
                                        }
                                        setRenameId(null);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            if (renameValue.trim()) {
                                                setTerminals(prev => prev.map(t => 
                                                    t.id === term.id ? { ...t, name: renameValue.trim() } : t
                                                ));
                                            }
                                            setRenameId(null);
                                        }
                                        if (e.key === 'Escape') setRenameId(null);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            ) : (
                                <>
                                    {getShellIcon(term.name)}
                                    <span style={{flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                        {term.name}
                                    </span>
                                    <button
                                        className="bottom-panel__action trash-icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if(terminals.length > 1) {
                                                if(term.id === activeTerminalId) {
                                                    handleKillTerminal();
                                                } else {
                                                    const newTerminals = terminals.filter(t => t.id !== term.id);
                                                    setTerminals(newTerminals);
                                                    terminalRefs.current.delete(term.id);
                                                }
                                            }
                                        }}
                                        title="Kill Terminal"
                                    >
                                        <TrashIcon />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Context Menu */}
                {contextMenu.visible && (
                    <div
                        ref={contextMenuRef}
                        className="bottom-panel__context-menu"
                        style={{ top: contextMenu.y, left: contextMenu.x }}
                    >
                        <button
                            className="bottom-panel__context-menu-item"
                            onClick={() => {
                                const term = terminals.find(t => t.id === contextMenu.terminalId);
                                if (term) {
                                    setRenameId(term.id);
                                    setRenameValue(term.name);
                                }
                                setContextMenu(prev => ({ ...prev, visible: false }));
                            }}
                        >
                            <RenameIcon /> Rename
                        </button>
                        <button
                            className="bottom-panel__context-menu-item"
                            onClick={() => {
                                if (contextMenu.terminalId) {
                                    terminalRefs.current.get(contextMenu.terminalId)?.clear();
                                }
                                setContextMenu(prev => ({ ...prev, visible: false }));
                            }}
                        >
                            <ClearIcon /> Clear
                        </button>
                        <button
                            className="bottom-panel__context-menu-item"
                            onClick={() => {
                                if (contextMenu.terminalId) {
                                    terminalRefs.current.get(contextMenu.terminalId)?.restart();
                                }
                                setContextMenu(prev => ({ ...prev, visible: false }));
                            }}
                        >
                            <RefreshIcon /> Restart
                        </button>
                        <div className="bottom-panel__context-menu-divider" />
                        <button
                            className="bottom-panel__context-menu-item bottom-panel__context-menu-item--danger"
                            onClick={() => {
                                if (contextMenu.terminalId && terminals.length > 1) {
                                    if (contextMenu.terminalId === activeTerminalId) {
                                        handleKillTerminal();
                                    } else {
                                        const newTerminals = terminals.filter(t => t.id !== contextMenu.terminalId);
                                        setTerminals(newTerminals);
                                        terminalRefs.current.delete(contextMenu.terminalId);
                                    }
                                }
                                setContextMenu(prev => ({ ...prev, visible: false }));
                            }}
                            disabled={terminals.length <= 1}
                        >
                            <TrashIcon /> Kill Terminal
                        </button>
                    </div>
                )}
            </div>
        </div>
        
        {activeTab === 'ports' && (
          <div className="bottom-panel__placeholder">No forwarded ports.</div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// Problems View Component
// -------------------------------------------------------------------------

function ProblemsView() {
  // Use useShallow to get stable references from the store
  const diagnosticsEntries = useDiagnosticsStore(useShallow((state) => state.diagnosticsEntries));
  const counts = useDiagnosticsStore(useShallow((state) => state.counts));
  
  // Compute the file diagnostics list with useMemo for stable reference
  const allDiagnostics = useMemo(
    () => entriesToFileDiagnostics(diagnosticsEntries),
    [diagnosticsEntries]
  );
  
  const total = counts.errors + counts.warnings + counts.info + counts.hints;
  
  if (total === 0) {
    return <div className="bottom-panel__placeholder">No problems detected.</div>;
  }
  
  return (
    <div className="problems-view">
      <div className="problems-view__summary">
        {counts.errors > 0 && <span className="problems-view__count problems-view__count--error"><ErrorIcon /> {counts.errors}</span>}
        {counts.warnings > 0 && <span className="problems-view__count problems-view__count--warning"><WarningIcon /> {counts.warnings}</span>}
        {counts.info > 0 && <span className="problems-view__count problems-view__count--info"><InfoIcon /> {counts.info}</span>}
      </div>
      <div className="problems-view__list">
        {allDiagnostics.map((file) => (
          <div key={file.uri} className="problems-view__file">
            <div className="problems-view__file-header">
              <span className="problems-view__file-name">{file.path.split(/[/\\]/).pop()}</span>
              <span className="problems-view__file-path">{file.path}</span>
            </div>
            {file.diagnostics.map((d, idx) => (
              <button
                key={idx}
                className="problems-view__item"
                onClick={() => {
                  // Files with diagnostics are already tracked by the editor (LSP already opened them)
                  // Just set the active file - the editor will handle loading if needed
                  const { openFiles, setActiveFile: setActive } = useAppStore.getState();
                  const existingFile = openFiles.find(f => f.path === file.path);
                  if (existingFile) {
                    setActive(file.path);
                  }
                  // TODO: Jump to line/column
                }}
              >
                <span className={`problems-view__severity problems-view__severity--${getSeverityClass(d.severity)}`}>
                  {getSeverityIcon(d.severity)}
                </span>
                <span className="problems-view__message">{d.message}</span>
                <span className="problems-view__location">[Ln {d.range.start.line + 1}, Col {d.range.start.character + 1}]</span>
                {d.source && <span className="problems-view__source">{d.source}</span>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function getSeverityClass(severity?: number): string {
  switch (severity) {
    case 1: return 'error';
    case 2: return 'warning';
    case 3: return 'info';
    case 4: return 'hint';
    default: return 'error';
  }
}

function getSeverityIcon(severity?: number) {
  switch (severity) {
    case 1: return <ErrorIcon />;
    case 2: return <WarningIcon />;
    case 3: return <InfoIcon />;
    case 4: return <InfoIcon />;
    default: return <ErrorIcon />;
  }
}

function ErrorIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="#f7768e"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#1a1b26" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function WarningIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1l7 13H1L8 1z" fill="#e0af68"/><path d="M8 5v4M8 11v1" stroke="#1a1b26" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function InfoIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="7" fill="#7aa2f7"/><path d="M8 5v1M8 7v4" stroke="#1a1b26" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function TabButton({ label, count, isActive, onClick }: { label: string; count?: number; isActive: boolean; onClick: () => void }) {
  return (
    <button className={`bottom-panel__tab ${isActive ? 'bottom-panel__tab--active' : ''}`} onClick={onClick}>
      {label}
      {count !== undefined && count > 0 && <span className="bottom-panel__tab-count">{count}</span>}
    </button>
  );
}

// Icons
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 4v8M4 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>;
}
function ClearIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M10 12.6l.7.7 1.6-1.6 1.6 1.6.8-.7L13 11l1.7-1.6-.8-.8-1.6 1.7-1.6-1.7-.7.8 1.6 1.6-1.6 1.6zM1 4h14V3H1v1zm0 3h14V6H1v1zm8 2.5V9H1v1h8v-.5zM9 13v-1H1v1h8z"/></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M5.5 1h5a.5.5 0 0 1 .5.5V3h2.5a.5.5 0 0 1 0 1H13v9.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.5V4h-.5a.5.5 0 0 1 0-1H5V1.5a.5.5 0 0 1 .5-.5zM6 2v1h4V2H6zm6 2H4v9.5a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5V4z"/></svg>;
}
function RefreshIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>;
}
function MaximizeIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3v10h10V3H3zm9 9H4V4h8v8z"/></svg>;
}
function CloseIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/></svg>;
}
function ChevronDownIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
}
const ChevronUpIcon = () => <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 7.5L6 4L9.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
const SearchIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>;
function RenameIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M11.293 1.293a1 1 0 0 1 1.414 0l2 2a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-.39.242l-3 1a1 1 0 0 1-1.266-1.265l1-3a1 1 0 0 1 .242-.391l8-8zM12 2l2 2-8 8-2.5.833L4.333 10 12 2z"/></svg>;
}
