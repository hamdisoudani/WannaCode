/* ==========================================================================
   TypeScript Type Definitions
   ========================================================================== */

// -------------------------------------------------------------------------
// File System Types
// -------------------------------------------------------------------------

export interface FileEntry {
    name: string;
    path: string;
    isDirectory: boolean;
    isFile: boolean;
    children?: FileEntry[];
    isExpanded?: boolean;
}

export interface OpenFile {
    path: string;
    name: string;
    content: string;
    originalContent: string; // Content when file was opened/last saved
    language: string;
    isDirty: boolean;
}

// -------------------------------------------------------------------------
// Editor Types
// -------------------------------------------------------------------------

export interface CursorPosition {
    line: number;
    column: number;
    selected: number;
}

export interface EditorTab {
    id: string;
    path: string;
    name: string;
    isDirty: boolean;
}

export interface EditorState {
    openFiles: Map<string, OpenFile>;
    activeFilePath: string | null;
    tabs: EditorTab[];
}

// -------------------------------------------------------------------------
// References Panel Types
// -------------------------------------------------------------------------

export interface ReferenceLocation {
    uri: string;
    filePath: string;
    fileName: string;
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    preview: string;
}

export interface ReferencesResult {
    symbol: string;
    locations: ReferenceLocation[];
}

// -------------------------------------------------------------------------
// Terminal Types
// -------------------------------------------------------------------------

export interface TerminalInstance {
    id: string;
    title: string;
    isActive: boolean;
}

// -------------------------------------------------------------------------
// UI Types
// -------------------------------------------------------------------------

export interface PanelDimensions {
    sidebarWidth: number;
    terminalHeight: number;
    aiPanelWidth?: number;
}

export interface AppState {
    // Project
    projectPath: string | null;
    fileTree: FileEntry[];

    // Editor
    openFiles: OpenFile[];
    activeFilePath: string | null;

    // UI
    isSidebarVisible: boolean;
    isTerminalVisible: boolean;
    panelDimensions: PanelDimensions;

    // Terminal
    terminals: TerminalInstance[];
    activeTerminalId: string | null;
}

// -------------------------------------------------------------------------
// Utility Types
// -------------------------------------------------------------------------

export type FileLanguage =
    | 'javascript'
    | 'javascriptreact'
    | 'typescript'
    | 'typescriptreact'
    | 'json'
    | 'html'
    | 'css'
    | 'markdown'
    | 'rust'
    | 'python'
    | 'toml'
    | 'yaml'
    | 'plaintext';

export function getLanguageFromPath(path: string): FileLanguage {
    const ext = path.split('.').pop()?.toLowerCase() || '';

    const languageMap: Record<string, FileLanguage> = {
        'js': 'javascript',
        'mjs': 'javascript',
        'cjs': 'javascript',
        'jsx': 'javascript', // Map to javascript for Monaco (LSP handles JSX internally)
        'ts': 'typescript',
        'mts': 'typescript',
        'cts': 'typescript',
        'tsx': 'typescript', // Map to typescript for Monaco (LSP handles TSX internally)
        'json': 'json',
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'scss': 'css',
        'less': 'css',
        'md': 'markdown',
        'mdx': 'markdown',
        'rs': 'rust',
        'py': 'python',
        'toml': 'toml',
        'yaml': 'yaml',
        'yml': 'yaml',
    };

    return languageMap[ext] || 'plaintext';
}
