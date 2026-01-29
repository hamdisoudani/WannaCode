/* ==========================================================================
   Monaco Editor Component
   ========================================================================== */

import { useRef, useCallback, useEffect, useState, startTransition } from 'react';
import MonacoEditor, { OnMount, BeforeMount, loader } from '@monaco-editor/react';
import type { editor, IDisposable } from 'monaco-editor';
import { invoke } from '@tauri-apps/api/core';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../stores/appStore';
import { useLsp, setMonacoInstance, useImportValidation } from '../../hooks';
import { useEditorSettings } from '../../services/settings/hooks';
import { catppuccinMochaTheme, THEME_NAME, semanticTokenRules } from './monacoTheme';
import './Editor.css';

// Track global state
let isMonacoConfigured = false;
let typesLoadedForPaths = new Set<string>(); // Track which node_modules paths we've loaded
let extraLibsDisposables: IDisposable[] = []; // Track disposables for cleanup

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let monacoInstance: any = null;

interface TypeLibrary {
  path: string;
  content: string;
}

/**
 * Find the nearest node_modules directory by walking up from the file path
 */
async function findNearestNodeModules(filePath: string): Promise<string | null> {
  try {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    
    // Walk up the directory tree
    for (let i = parts.length - 1; i >= 0; i--) {
      const dirPath = parts.slice(0, i + 1).join('/');
      const nodeModulesPath = `${dirPath}/node_modules`;
      
      // Check if node_modules exists at this level
      const exists = await invoke<boolean>('path_exists', { path: nodeModulesPath });
      if (exists) {
        return dirPath; // Return the project root (parent of node_modules)
      }
    }
    
    return null;
  } catch (error) {
    console.error('[IntelliSense] Error finding node_modules:', error);
    return null;
  }
}

/**
 * Configure Monaco TypeScript defaults globally (runs once)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function configureMonacoGlobally(monaco: any) {
  monacoInstance = monaco;
  setMonacoInstance(monaco);

  // Define the theme with semantic token colors (ALWAYS update this to support HMR/dynamic changes)
  const themeWithSemanticTokens = {
    ...catppuccinMochaTheme,
    rules: [
      ...catppuccinMochaTheme.rules,
      // Add semantic token rules - Monaco uses these for semantic highlighting
      ...Object.entries(semanticTokenRules).map(([tokenType, style]) => ({
        token: tokenType,
        foreground: style.foreground.replace('#', ''),
        fontStyle: style.fontStyle,
      })),
    ],
  };
  
  monaco.editor.defineTheme(THEME_NAME, themeWithSemanticTokens);
  console.log('[Monaco] ✓ Theme defined with semantic token colors');

  if (isMonacoConfigured) return;
  
  console.log('[Monaco] Configuring TypeScript compiler options...');
  
  const ts = monaco.languages.typescript;

  // TypeScript compiler options
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.ReactJSX,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false,
    strict: false, // Disable strict to reduce false positives
    noEmit: true,
    esModuleInterop: true,
    skipLibCheck: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noImplicitAny: false,
  });

  // JavaScript compiler options
  ts.javascriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.ReactJSX,
    allowNonTsExtensions: true,
    allowJs: true,
    checkJs: false,
  });

  // Disable Monaco's semantic validation - LSP provides better diagnostics
  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  });

  ts.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: true,
  });

  // Configure Monaco's built-in TypeScript language features
  ts.typescriptDefaults.setModeConfiguration({
    completionItems: false,
    hovers: false,
    definitions: false,
    references: false,
    signatureHelp: false,
    diagnostics: true,
    documentSymbols: true,
  });

  ts.javascriptDefaults.setModeConfiguration({
    completionItems: false,
    hovers: false,
    definitions: false,
    references: false,
    signatureHelp: false,
    diagnostics: true,
    documentSymbols: true,
  });

  console.log('[Monaco] ✓ TypeScript configured: LSP for interactive features, Monaco for highlighting');

  // Enable eager model sync for better IntelliSense
  ts.typescriptDefaults.setEagerModelSync(true);
  ts.javascriptDefaults.setEagerModelSync(true);

  isMonacoConfigured = true;
  console.log('[Monaco] ✓ TypeScript compiler configured (semantic validation disabled)');
}

/**
 * Load type definitions from the nearest node_modules/@types
 */
async function loadTypeDefinitionsForFile(filePath: string) {
  if (!monacoInstance) return;
  
  // Find the nearest node_modules
  const projectRoot = await findNearestNodeModules(filePath);
  
  if (!projectRoot) {
    console.log('[IntelliSense] No node_modules found for:', filePath);
    return;
  }
  
  // Check if we've already loaded types from this location
  if (typesLoadedForPaths.has(projectRoot)) {
    return;
  }
  
  try {
    // Mark as loaded immediately to prevent double-loading while async fetch happens
    typesLoadedForPaths.add(projectRoot);
    
    console.log('[IntelliSense] Loading comprehensive type definitions from:', projectRoot);
    console.time('[IntelliSense] Load time');
    
    // Use the new comprehensive type loader
    const libraries = await invoke<TypeLibrary[]>('load_all_type_definitions', { 
      projectPath: projectRoot,
      maxFiles: 500 // Increased limit, but we'll batch the processing
    });
    
    const ts = monacoInstance.languages.typescript;
    
    // Batch processing to prevent UI freeze
    const BATCH_SIZE = 50;
    let processedCount = 0;
    
    const processBatch = () => {
      const batch = libraries.slice(processedCount, processedCount + BATCH_SIZE);
      if (batch.length === 0) {
        console.timeEnd('[IntelliSense] Load time');
        console.log(`[IntelliSense] ✓ Successfully loaded ${processedCount} type definition files`);
        return;
      }
      
      // Process current batch
      for (const lib of batch) {
        // Add to both TS and JS defaults and track disposables
        const d1 = ts.typescriptDefaults.addExtraLib(lib.content, lib.path);
        const d2 = ts.javascriptDefaults.addExtraLib(lib.content, lib.path);
        extraLibsDisposables.push(d1, d2);
      }
      
      processedCount += batch.length;
      
      // Schedule next batch
      // Use requestIdleCallback if available for smoother UI, else setTimeout
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => processBatch(), { timeout: 100 });
      } else {
        setTimeout(processBatch, 10);
      }
    };
    
    // Start processing
    processBatch();
    
    // Log some examples of what was loaded
    const examples = libraries.slice(0, 5).map(l => l.path.replace('file:///node_modules/', ''));
    console.log('[IntelliSense] Started batch loading types, e.g.:', examples);
    
  } catch (error) {
    console.error('[IntelliSense] ✗ Failed to load type definitions:', error);
    typesLoadedForPaths.delete(projectRoot); // Allow retry on failure
  }
}

/**
 * Reset type definitions when switching projects
 */
export function resetTypeDefinitions() {
  console.log('[IntelliSense] Resetting type definitions (project switch)');
  
  // Dispose all registered extra libs to free memory
  extraLibsDisposables.forEach(d => d.dispose());
  extraLibsDisposables = [];
  
  typesLoadedForPaths.clear();
}

// Configure Monaco when it loads (before any editor mounts)
loader.init().then((monaco) => {
  configureMonacoGlobally(monaco);
});

// Check if language is TypeScript-related
function isTypeScriptLanguage(language: string): boolean {
  return language === 'typescript' || language === 'typescriptreact';
}

interface EditorProps {
  onSave?: (path: string, content: string) => void;
}

export function Editor({ onSave }: EditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);

  const { openFiles, activeFilePath, updateFileContent, setCursorPosition, showReferences } = useAppStore(
    useShallow((state) => ({
      openFiles: state.openFiles,
      activeFilePath: state.activeFilePath,
      updateFileContent: state.updateFileContent,
      setCursorPosition: state.setCursorPosition,
      showReferences: state.showReferences,
    }))
  );
  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  // Initialize LSP for TypeScript/JavaScript files
  useLsp({
    editor: editorInstance,
    filePath: activeFile?.path ?? null,
    language: activeFile?.language ?? '',
  });

  // Validate and color import paths
  useImportValidation({
    editor: editorInstance,
    filePath: activeFile?.path ?? null,
    content: activeFile?.content ?? '',
    monaco: monacoRef.current,
  });

  /**
   * Load types when TypeScript file is opened (finds nearest node_modules)
   */
  useEffect(() => {
    if (activeFile && isTypeScriptLanguage(activeFile.language)) {
      // Load types from the nearest node_modules to this file
      loadTypeDefinitionsForFile(activeFile.path);
    }
  }, [activeFile?.path, activeFile?.language]);

  // Subscribe to editor settings
  const { settings: editorSettings } = useEditorSettings();

  /**
   * Monitor editor instance and settings to apply updates
   */
  useEffect(() => {
    if (editorRef.current && editorSettings) {
      console.log('[Editor] Applying settings:', editorSettings);
      editorRef.current.updateOptions({
        fontSize: editorSettings.fontSize,
        minimap: { enabled: editorSettings.minimap },
        wordWrap: editorSettings.wordWrap ? 'on' : 'off',
        lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
        tabSize: editorSettings.tabSize,
      });
    }
  }, [editorSettings, editorInstance]); // Add editorInstance to ensure it runs on mount

  /**
   * Register custom theme before Monaco mounts
   */
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monacoRef.current = monaco;
    monaco.editor.defineTheme(THEME_NAME, catppuccinMochaTheme);
    configureMonacoGlobally(monaco);
  }, []);

  /**
   * Handle Monaco editor mount
   */
  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorInstance(editor); // Trigger LSP hook with editor instance

    monaco.editor.setTheme(THEME_NAME);

    // Listen for navigate-to-line events from References Panel
    const handleNavigate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.line) {
        editor.revealLineInCenter(detail.line);
        editor.setPosition({ lineNumber: detail.line, column: detail.column || 1 });
        editor.focus();
      }
    };
    window.addEventListener('navigate-to-line', handleNavigate);

    // Initial options are now passed via props/useEffect, but we set non-configurable basics here
    editor.updateOptions({
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
      lineHeight: 22,
      fontLigatures: true,
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      'semanticHighlighting.enabled': true,
      scrollbar: {
        useShadows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        vertical: 'visible',
        horizontal: 'auto',
      },
      renderLineHighlight: 'all',
      renderWhitespace: 'selection',
      bracketPairColorization: { enabled: true },
      guides: {
        bracketPairs: true,
        indentation: true,
        highlightActiveIndentation: true,
      },
      padding: { top: 16, bottom: 16 },
      stickyScroll: { enabled: false },
      insertSpaces: true,
      detectIndentation: true,
      formatOnPaste: true,
      formatOnType: true,
      autoClosingBrackets: 'always',
      autoClosingQuotes: 'always',
      autoSurround: 'languageDefined',
      suggest: {
        showKeywords: true,
        showSnippets: true,
        showClasses: true,
        showFunctions: true,
        showVariables: true,
        showConstants: true,
        preview: true,
        filterGraceful: true,
        localityBonus: true,
      },
    });

    // ... cursor/selection listeners ...
    editor.onDidChangeCursorPosition((e) => {
      const selection = editor.getSelection();
      let selectedCount = 0;
      if (selection && !selection.isEmpty()) {
        const model = editor.getModel();
        if (model) selectedCount = model.getValueInRange(selection).length;
      }
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
        selected: selectedCount,
      });
    });

    editor.onDidChangeCursorSelection((e) => {
      const selection = e.selection;
      let selectedCount = 0;
      if (!selection.isEmpty()) {
        const model = editor.getModel();
        if (model) selectedCount = model.getValueInRange(selection).length;
      }
      const position = editor.getPosition();
      if (position) {
        setCursorPosition({
          line: position.lineNumber,
          column: position.column,
          selected: selectedCount,
        });
      }
    });

    // Save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (activeFilePath && onSave) {
        onSave(activeFilePath, editor.getValue());
      }
    });
    
    // ... rest of mount logic (references, opener) ...
    // Note: I'm truncating the rest of the existing mount logic for brevity because it's mostly unchanged, 
    // but in REPLACE mode I must provide the full content or valid range.
    // Since I'm replacing the entire component logic, I should be careful.
    // I will use a larger range to cover the options prop too.

    // Register Find References
    editor.addAction({
      id: 'custom-find-all-references',
      label: 'Find All References',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyCode.F12],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: async (ed) => {
         // ... existing implementation ...
         const position = ed.getPosition();
         const model = ed.getModel();
         if (!position || !model) return;
         const wordInfo = model.getWordAtPosition(position);
         if (!wordInfo) return;
         const symbol = wordInfo.word;
         const references = await monaco.languages.provideReferences(model, position, { includeDeclaration: true });
         if (references && references.length > 0) {
            const locations = await Promise.all(references.map(async (ref: any) => {
               const refModel = monaco.editor.getModel(ref.uri);
               let preview = '';
               if (refModel) preview = refModel.getLineContent(ref.range.startLineNumber).trim();
               const filePath = ref.uri.path.startsWith('/') ? ref.uri.path.slice(1) : ref.uri.path;
               return {
                  uri: ref.uri.toString(),
                  filePath: filePath.replace(/\//g, '\\'),
                  fileName: filePath.split('/').pop() || '',
                  line: ref.range.startLineNumber,
                  column: ref.range.startColumn,
                  endLine: ref.range.endLineNumber,
                  endColumn: ref.range.endColumn,
                  preview
               };
            }));
            showReferences({ symbol, locations });
         }
      }
    });

    // Register Editor Opener
    const openerDisposable = monaco.editor.registerEditorOpener({
      openCodeEditor: async (_source: any, resource: any, _selectionOrPosition: any) => {
        let filePath = resource.path.startsWith('/') || resource.path.startsWith('\\') ? resource.path.slice(1) : resource.path;
        filePath = decodeURIComponent(filePath).replace(/\//g, '\\');
        console.log('[Editor] Opening file from navigation:', filePath);
        
        const { openFiles, openFile } = useAppStore.getState();
        const existingFile = openFiles.find(f => f.path.toLowerCase() === filePath.toLowerCase());
        
        if (existingFile) {
          openFile(existingFile);
        } else {
             try {
                const content = await invoke<string>('read_file', { path: filePath });
                let language = 'plaintext';
                if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) language = 'typescript';
                else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) language = 'javascript';
                else if (filePath.endsWith('.css')) language = 'css';
                else if (filePath.endsWith('.json')) language = 'json';
                else if (filePath.endsWith('.html')) language = 'html';

                 openFile({
                   path: filePath,
                   name: filePath.split('\\').pop() || '',
                   language,
                   content,
                   originalContent: content,
                   isDirty: false
                 });
             } catch (err) {
                 console.error('[Editor] Failed to open file:', err);
                 return false;
             }
        }
        return true;
      }
    });

    editor.focus();
    return () => { openerDisposable.dispose(); };

  }, [activeFilePath, onSave, setCursorPosition, showReferences]);

  const handleChange = useCallback((value: string | undefined) => {
    if (activeFilePath && value !== undefined) {
      // Mark this update as a transition so it doesn't block the UI (typing)
      // This allows React to prioritize the editor's internal rendering over the store update
      startTransition(() => {
        updateFileContent(activeFilePath, value);
      });
    }
  }, [activeFilePath, updateFileContent]);

  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeFilePath) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        if (onSave) onSave(activeFilePath, editor.getValue());
      });
    }
  }, [activeFilePath, onSave]);

  if (!activeFile) {
    return null;
  }

  const getMonacoPath = (filePath: string) => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `file:///${normalizedPath}`;
  };

  return (
    <div className="editor-container">
      <div className="editor-transition-wrapper" key={activeFile.path}>
        <MonacoEditor
          key={activeFile.path}
          height="100%"
          language={activeFile.language}
          path={getMonacoPath(activeFile.path)}
          value={activeFile.content}
          theme={THEME_NAME}
          beforeMount={handleBeforeMount}
          onMount={handleMount}
          onChange={handleChange}
          loading={<EditorLoading />}
          options={{
            readOnly: false,
            automaticLayout: true,
            // Pass settings directly here for initial mount
            fontSize: editorSettings.fontSize,
            minimap: { enabled: editorSettings.minimap },
            wordWrap: editorSettings.wordWrap ? 'on' : 'off',
            lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
            tabSize: editorSettings.tabSize,
          }}
        />
      </div>
    </div>
  );
}

function EditorLoading() {
  return (
    <div className="editor-loading">
      <div className="editor-loading__spinner" />
      <span className="editor-loading__text">Loading editor...</span>
    </div>
  );
}
