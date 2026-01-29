/* ==========================================================================
   Global Application Store - Zustand
   ========================================================================== */

import { create } from 'zustand';
import type { FileEntry, OpenFile, TerminalInstance, PanelDimensions, CursorPosition, ReferencesResult } from '../types';

// -------------------------------------------------------------------------
// Store Interface
// -------------------------------------------------------------------------

interface AppStore {
  // Project State
  projectPath: string | null;
  fileTree: FileEntry[];

  // Editor State
  openFiles: OpenFile[];
  activeFilePath: string | null;
  cursorPosition: CursorPosition;

  // References Panel State
  referencesResult: ReferencesResult | null;
  isReferencesPanelVisible: boolean;

  // UI State
  isSidebarVisible: boolean;
  isTerminalVisible: boolean;
  isAIPanelVisible: boolean;  // AI Chat Panel
  panelDimensions: PanelDimensions;

  // Terminal State
  terminals: TerminalInstance[];
  activeTerminalId: string | null;

  // LSP Loading State
  isLspLoading: boolean;
  lspLoadingMessage: string;
  setLspLoading: (isLoading: boolean, message?: string) => void;

  // Project Actions
  setProjectPath: (path: string | null) => void;
  setFileTree: (tree: FileEntry[]) => void;
  toggleFileExpanded: (path: string) => void;
  openProject: (path: string, fileTree: FileEntry[]) => void;
  closeProject: () => void;
  hasDirtyFiles: () => boolean;

  // Editor Actions
  openFile: (file: OpenFile) => void;
  closeFile: (path: string) => void;
  closeAllFiles: () => void;
  closeOtherFiles: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileSaved: (path: string, content: string) => void;
  markFileDirty: (path: string, isDirty: boolean) => void;
  setCursorPosition: (position: CursorPosition) => void;
  openSettings: () => void;

  // References Panel Actions
  showReferences: (result: ReferencesResult) => void;
  hideReferences: () => void;

  // UI Actions
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  toggleAIPanel: () => void;  // AI Chat Panel
  setSidebarWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
  setPanelDimensions: (dimensions: Partial<PanelDimensions>) => void;

  // Terminal Actions
  addTerminal: (terminal: TerminalInstance) => void;
  removeTerminal: (id: string) => void;
  setActiveTerminal: (id: string | null) => void;
}

// -------------------------------------------------------------------------
// Store Implementation
// -------------------------------------------------------------------------

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial State
  projectPath: null,
  fileTree: [],
  openFiles: [],
  activeFilePath: null,
  cursorPosition: { line: 1, column: 1, selected: 0 },
  referencesResult: null,
  isReferencesPanelVisible: false,
  isSidebarVisible: true,
  isTerminalVisible: true,
  isAIPanelVisible: false,  // AI Chat Panel - hidden by default
  panelDimensions: {
    sidebarWidth: 240,
    terminalHeight: 250,
  },
  terminals: [],
  activeTerminalId: null,

  // LSP Loading
  isLspLoading: false,
  lspLoadingMessage: 'Initializing...',
  setLspLoading: (isLoading, message) => set({
    isLspLoading: isLoading,
    lspLoadingMessage: message || 'Loading...'
  }),

  // Project Actions
  setProjectPath: (path) => set({ projectPath: path }),

  setFileTree: (tree) => set({ fileTree: tree }),

  toggleFileExpanded: (path) => set((state) => {
    const toggleNode = (nodes: FileEntry[]): FileEntry[] => {
      return nodes.map((node) => {
        if (node.path === path) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    return { fileTree: toggleNode(state.fileTree) };
  }),

  // Open a new project - resets workspace state
  openProject: (path, fileTree) => set({
    projectPath: path,
    fileTree: fileTree,
    openFiles: [],
    activeFilePath: null,
    // Keep UI state (sidebar, terminal visibility, dimensions)
  }),

  // Close current project
  closeProject: () => set({
    projectPath: null,
    fileTree: [],
    openFiles: [],
    activeFilePath: null,
  }),

  // Check if there are unsaved files
  hasDirtyFiles: () => {
    return get().openFiles.some(f => f.isDirty && !f.path.startsWith('::'));
  },

  // Open Settings as a special tab
  openSettings: () => set((state) => {
    const settingsPath = '::settings';
    const exists = state.openFiles.find((f) => f.path === settingsPath);
    if (exists) {
      return { activeFilePath: settingsPath };
    }
    return {
      openFiles: [
        ...state.openFiles,
        {
          path: settingsPath,
          name: 'Settings',
          content: '',
          originalContent: '',
          language: 'settings',
          isDirty: false,
        },
      ],
      activeFilePath: settingsPath,
    };
  }),

  // Editor Actions
  openFile: (file) => set((state) => {
    const exists = state.openFiles.find((f) => f.path === file.path);
    if (exists) {
      return { activeFilePath: file.path };
    }
    return {
      openFiles: [...state.openFiles, file],
      activeFilePath: file.path,
    };
  }),

  closeFile: (path) => set((state) => {
    const index = state.openFiles.findIndex((f) => f.path === path);
    const newOpenFiles = state.openFiles.filter((f) => f.path !== path);

    let newActivePath = state.activeFilePath;
    if (state.activeFilePath === path) {
      if (newOpenFiles.length > 0) {
        newActivePath = newOpenFiles[Math.max(0, index - 1)]?.path || null;
      } else {
        newActivePath = null;
      }
    }

    return {
      openFiles: newOpenFiles,
      activeFilePath: newActivePath,
    };
  }),

  closeAllFiles: () => set({
    openFiles: [],
    activeFilePath: null,
  }),

  closeOtherFiles: (path) => set((state) => {
    const fileToKeep = state.openFiles.find((f) => f.path === path);
    if (!fileToKeep) return state;

    return {
      openFiles: [fileToKeep],
      activeFilePath: path,
    };
  }),

  setActiveFile: (path) => set({ activeFilePath: path }),

  updateFileContent: (path, content) => set((state) => ({
    openFiles: state.openFiles.map((f) =>
      f.path === path ? { ...f, content, isDirty: content !== f.originalContent } : f
    ),
  })),

  markFileSaved: (path, content) => set((state) => ({
    openFiles: state.openFiles.map((f) =>
      f.path === path ? { ...f, content, originalContent: content, isDirty: false } : f
    ),
  })),

  markFileDirty: (path, isDirty) => set((state) => ({
    openFiles: state.openFiles.map((f) =>
      f.path === path ? { ...f, isDirty } : f
    ),
  })),

  setCursorPosition: (position) => set({ cursorPosition: position }),

  // References Panel Actions
  showReferences: (result) => set({ referencesResult: result, isReferencesPanelVisible: true }),
  hideReferences: () => set({ referencesResult: null, isReferencesPanelVisible: false }),

  // UI Actions
  toggleSidebar: () => set((state) => ({ isSidebarVisible: !state.isSidebarVisible })),

  toggleTerminal: () => set((state) => ({ isTerminalVisible: !state.isTerminalVisible })),

  toggleAIPanel: () => set((state) => ({ isAIPanelVisible: !state.isAIPanelVisible })),

  setSidebarWidth: (width) => set((state) => ({
    panelDimensions: { ...state.panelDimensions, sidebarWidth: width },
  })),

  setTerminalHeight: (height) => set((state) => ({
    panelDimensions: { ...state.panelDimensions, terminalHeight: height },
  })),

  setPanelDimensions: (dimensions) => set((state) => ({
    panelDimensions: { ...state.panelDimensions, ...dimensions },
  })),

  // Terminal Actions
  addTerminal: (terminal) => set((state) => ({
    terminals: [...state.terminals, terminal],
    activeTerminalId: terminal.id,
  })),

  removeTerminal: (id) => set((state) => {
    const newTerminals = state.terminals.filter((t) => t.id !== id);
    return {
      terminals: newTerminals,
      activeTerminalId: newTerminals.length > 0 ? newTerminals[0].id : null,
    };
  }),

  setActiveTerminal: (id) => set({ activeTerminalId: id }),
}));
