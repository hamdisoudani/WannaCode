/* ==========================================================================
   useLsp Hook - Integrates LSP with Monaco Editor
   ========================================================================== */

import { useEffect, useRef, useCallback, useState } from 'react';
import * as monacoTypes from 'monaco-editor';
import { useAppStore } from '../stores/appStore';
import { useDiagnosticsStore } from '../stores/diagnosticsStore';
import {
  typeScriptLsp,
  pathToUri,
  monacoToLspPosition,
  lspToMonacoRange,
} from '../services/lsp';
import type {
  CompletionItem,
  CompletionList,
  Hover,
  Location,
  DiagnosticSeverity,
  CompletionItemKind,
} from '../services/lsp/types';
import { LspClient } from '../services/lsp/LspClient';

// -------------------------------------------------------------------------
// Configuration Constants
// -------------------------------------------------------------------------

/** Enable debug logging for LSP operations */
const LSP_DEBUG = import.meta.env.DEV;

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

interface UseLspOptions {
  editor: monacoTypes.editor.IStandaloneCodeEditor | null;
  filePath: string | null;
  language: string;
}

interface SemanticTokensCacheEntry {
  versionId: number;
  resultId?: string;
  data: Uint32Array;
}

// -------------------------------------------------------------------------
// Module State
// -------------------------------------------------------------------------

// Store the actual Monaco instance from the editor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let monacoInstance: typeof monacoTypes | null = null;

// Track if providers are registered to avoid duplicates
let providersRegistered = false;

// Semantic tokens cache (stored on Monaco instance for persistence across HMR)
function getSemanticTokensCache(): Map<string, SemanticTokensCacheEntry> {
  if (!monacoInstance) return new Map();
  if (!(monacoInstance as any).__semanticTokensCache) {
    (monacoInstance as any).__semanticTokensCache = new Map<string, SemanticTokensCacheEntry>();
  }
  return (monacoInstance as any).__semanticTokensCache;
}

// -------------------------------------------------------------------------
// Monaco Provider Registration
// -------------------------------------------------------------------------

/**
 * Set the Monaco instance (called from Editor component)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setMonacoInstance(instance: any) {
  monacoInstance = instance;

  // Try to register providers if not already done
  if (!providersRegistered) {
    registerMonacoProviders();
  }
}

/**
 * Register Monaco providers that delegate to LSP
 */
function registerMonacoProviders() {
  if (providersRegistered || !monacoInstance) return;

  providersRegistered = true;
  const monaco = monacoInstance;

  // Completion Provider
  monaco.languages.registerCompletionItemProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
    triggerCharacters: ['.', '"', "'", '/', '@', '<'],

    async provideCompletionItems(model, position) {
      const client = typeScriptLsp.getActiveClient();
      console.log('[LSP:Completion] Triggered. Client running:', client?.isRunning());
      if (!client?.isRunning()) return { suggestions: [] };

      const uri = pathToUri(model.uri.path.slice(1));
      const lspPos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await client.completion(uri, lspPos);
        if (!result) return { suggestions: [] };

        const items: CompletionItem[] = Array.isArray(result) ? result : (result as CompletionList).items;

        const suggestions: monacoTypes.languages.CompletionItem[] = items.map((item) => ({
          label: item.label,
          kind: convertCompletionKind(item.kind),
          detail: item.detail,
          documentation: typeof item.documentation === 'string'
            ? item.documentation
            : item.documentation?.value,
          insertText: item.insertText || item.label,
          insertTextRules: item.insertTextFormat === 2
            ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
            : undefined,
          sortText: item.sortText,
          filterText: item.filterText,
          range: undefined as unknown as monacoTypes.IRange, // Monaco will calculate
        }));

        return { suggestions };
      } catch (error) {
        console.error('[LSP] Completion error:', error);
        return { suggestions: [] };
      }
    },
  });

  // Hover Provider
  monaco.languages.registerHoverProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
    async provideHover(model, position) {
      const client = typeScriptLsp.getActiveClient();
      // console.log('[LSP:Hover] Requesting hover'); // Reduce noise
      if (!client?.isRunning()) return null;

      const uri = pathToUri(model.uri.path.slice(1));
      const lspPos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await client.hover(uri, lspPos);
        if (!result) return null;

        const contents = formatHoverContents(result);

        return {
          contents,
          range: result.range ? lspToMonacoRange(result.range) : undefined,
        };
      } catch (error) {
        console.error('[LSP:Hover] Error:', error);
        return null;
      }
    },
  });

  // Signature Help Provider
  monaco.languages.registerSignatureHelpProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],

    async provideSignatureHelp(model, position) {
      const client = typeScriptLsp.getActiveClient();
      if (!client?.isRunning()) return null;

      const uri = pathToUri(model.uri.path.slice(1));
      const lspPos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await client.signatureHelp(uri, lspPos);
        if (!result) return null;

        return {
          value: {
            signatures: result.signatures.map((sig) => ({
              label: sig.label,
              documentation: typeof sig.documentation === 'string'
                ? sig.documentation
                : sig.documentation?.value,
              parameters: sig.parameters?.map((param) => ({
                label: param.label as string,
                documentation: typeof param.documentation === 'string'
                  ? param.documentation
                  : param.documentation?.value,
              })) || [],
            })),
            activeSignature: result.activeSignature ?? 0,
            activeParameter: result.activeParameter ?? 0,
          },
          dispose: () => { },
        };
      } catch (error) {
        console.error('[LSP] Signature help error:', error);
        return null;
      }
    },
  });

  // Definition Provider
  monaco.languages.registerDefinitionProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
    async provideDefinition(model, position) {
      const client = typeScriptLsp.getActiveClient();
      console.log('[LSP:Definition] Requesting definition. URI:', model.uri.path);
      if (!client?.isRunning()) {
        console.warn('[LSP:Definition] Client not ready');
        return null;
      }

      const uri = pathToUri(model.uri.path.slice(1));
      console.log('LSP:Definition] Converted URI:', uri);
      const lspPos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await client.definition(uri, lspPos);
        console.log('[LSP:Definition] Result:', result);
        if (!result) return null;

        const locations: Location[] = Array.isArray(result) ? result : [result];

        return locations.map((loc) => ({
          uri: monaco.Uri.parse(loc.uri),
          range: lspToMonacoRange(loc.range),
        }));
      } catch (error) {
        console.error('[LSP] Definition error:', error);
        return null;
      }
    },
  });

  // References Provider
  monaco.languages.registerReferenceProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
    async provideReferences(model, position, context) {
      const client = typeScriptLsp.getActiveClient();
      if (!client?.isRunning()) return null;

      const uri = pathToUri(model.uri.path.slice(1));
      const lspPos = monacoToLspPosition(position.lineNumber, position.column);

      try {
        const result = await client.references(uri, lspPos, context.includeDeclaration);
        if (!result) return null;

        return result.map((loc) => ({
          uri: monaco.Uri.parse(loc.uri),
          range: lspToMonacoRange(loc.range),
        }));
      } catch (error) {
        console.error('[LSP] References error:', error);
        return null;
      }
    },
  });

  // Event emitter for semantic tokens
  // We need to store this persistently across re-renders
  if (!(monaco as any).__semanticTokensEmitter) {
    (monaco as any).__semanticTokensEmitter = new monaco.Emitter<void>();
  }
  const semanticTokensEmitter = (monaco as any).__semanticTokensEmitter as monacoTypes.Emitter<void>;

  // Use centralized cache accessor
  const semanticTokensCache = getSemanticTokensCache();

  /**
   * Apply semantic token edits to existing token data (LSP 3.17 delta protocol)
   * Edits are applied sequentially to transform the previous data into the new data
   */
  function applySemanticTokenEdits(previousData: Uint32Array, edits: Array<{ start: number; deleteCount: number; data?: number[] }>): Uint32Array {
    // Convert to mutable array for easier manipulation
    const data = Array.from(previousData);

    // Apply edits in reverse order to maintain correct offsets
    const sortedEdits = [...edits].sort((a, b) => b.start - a.start);

    for (const edit of sortedEdits) {
      const insertData = edit.data || [];
      data.splice(edit.start, edit.deleteCount, ...insertData);
    }

    return new Uint32Array(data);
  }

  // Semantic Tokens Provider
  monaco.languages.registerDocumentSemanticTokensProvider(['typescript', 'typescriptreact', 'javascript', 'javascriptreact'], {
    getLegend() {
      return {
        tokenTypes: [
          'namespace', 'type', 'class', 'enum', 'interface',
          'struct', 'typeParameter', 'parameter', 'variable',
          'property', 'enumMember', 'event', 'function',
          'method', 'macro', 'keyword', 'modifier', 'comment',
          'string', 'number', 'regexp', 'operator', 'decorator'
        ],
        tokenModifiers: [
          'declaration', 'definition', 'readonly', 'static',
          'deprecated', 'abstract', 'async', 'modification',
          'documentation', 'defaultLibrary'
        ],
      };
    },

    async provideDocumentSemanticTokens(model) {
      const client = typeScriptLsp.getActiveClient();
      if (!client?.isRunning()) {
        if (LSP_DEBUG) console.log('[LSP:SemanticTokens] Client not ready');
        return null;
      }

      const uri = pathToUri(model.uri.path.slice(1));
      const currentVersionId = model.getVersionId();

      // Check cache - if we have tokens for this exact version, return them immediately
      const cached = semanticTokensCache.get(uri);
      if (cached && cached.versionId === currentVersionId) {
        return { data: cached.data };
      }

      // Only show loading for initial fetch (not on every keystroke)
      const isInitialFetch = !cached;
      if (isInitialFetch) {
        useAppStore.getState().setLspLoading(true, 'Loading Semantic Tokens...');
      }

      try {
        let tokenData: Uint32Array;
        let newResultId: string | undefined;

        // Try delta request if we have a previous resultId
        if (cached?.resultId) {
          if (LSP_DEBUG) console.log('[LSP:SemanticTokens] Requesting delta for', uri);
          const deltaResult = await client.semanticTokensDelta(uri, cached.resultId);

          if (deltaResult) {
            // Check if it's a delta response (has 'edits') or full response (has 'data')
            if ('edits' in deltaResult && deltaResult.edits) {
              // Apply delta edits to previous data
              if (LSP_DEBUG) console.log('[LSP:SemanticTokens] Applying', deltaResult.edits.length, 'delta edits');
              tokenData = applySemanticTokenEdits(cached.data, deltaResult.edits);
              newResultId = deltaResult.resultId;
            } else if ('data' in deltaResult && deltaResult.data) {
              // Server returned full tokens instead of delta
              tokenData = new Uint32Array(deltaResult.data);
              newResultId = deltaResult.resultId;
            } else {
              // Fallback to full request
              throw new Error('Invalid delta response');
            }
          } else {
            throw new Error('No delta response');
          }
        } else {
          // Initial full request
          if (LSP_DEBUG) console.log('[LSP:SemanticTokens] Requesting full tokens for', uri);
          const result = await client.semanticTokensFull(uri);

          if (!result || !result.data) {
            if (LSP_DEBUG) console.log('[LSP:SemanticTokens] No tokens returned');
            if (isInitialFetch) {
              useAppStore.getState().setLspLoading(false);
            }
            return null;
          }

          tokenData = new Uint32Array(result.data);
          newResultId = result.resultId;
        }

        if (isInitialFetch) {
          useAppStore.getState().setLspLoading(false);
        }

        // Only cache if we got actual tokens (0 tokens = server doesn't know about file yet)
        if (tokenData.length > 0) {
          semanticTokensCache.set(uri, {
            versionId: currentVersionId,
            resultId: newResultId,
            data: tokenData
          });
          if (LSP_DEBUG) console.log('[LSP:SemanticTokens] Cached', tokenData.length, 'tokens for version', currentVersionId);
        } else {
          if (LSP_DEBUG) console.log('[LSP:SemanticTokens] Skipping cache for 0 tokens (file not yet opened on server)');
        }

        return { data: tokenData };
      } catch (error) {
        console.error('[LSP:SemanticTokens] Error:', error);

        // On delta error, try full request as fallback
        if (cached?.resultId) {
          if (LSP_DEBUG) console.log('[LSP:SemanticTokens] Delta failed, falling back to full request');
          try {
            const result = await client.semanticTokensFull(uri);
            if (result?.data) {
              const tokenData = new Uint32Array(result.data);
              semanticTokensCache.set(uri, {
                versionId: currentVersionId,
                resultId: result.resultId,
                data: tokenData
              });
              if (isInitialFetch) {
                useAppStore.getState().setLspLoading(false);
              }
              return { data: tokenData };
            }
          } catch (fallbackError) {
            console.error('[LSP:SemanticTokens] Fallback also failed:', fallbackError);
          }
        }

        if (isInitialFetch) {
          useAppStore.getState().setLspLoading(false);
        }
        return null;
      }
    },

    releaseDocumentSemanticTokens() { },
    onDidChange: semanticTokensEmitter.event,
  });

  console.log('[LSP] Monaco providers registered');
}

// Clear semantic tokens cache for a specific file (e.g., when file is closed)
export function clearSemanticTokensCache(uri?: string) {
  if (monacoInstance && (monacoInstance as any).__semanticTokensCache) {
    const cache = (monacoInstance as any).__semanticTokensCache as Map<string, unknown>;
    if (uri) {
      cache.delete(uri);
    } else {
      cache.clear();
    }
  }
}

/**
 * Trigger Monaco to re-request semantic tokens
 * @param uri Optional URI to invalidate from cache before refreshing
 */
export function triggerSemanticTokensRefresh(uri?: string) {
  if (!monacoInstance) return;

  // Invalidate cache for this URI so we fetch fresh tokens
  if (uri) {
    clearSemanticTokensCache(uri);
  }

  if ((monacoInstance as any).__semanticTokensEmitter) {
    if (LSP_DEBUG) console.log('[LSP] Triggering semantic tokens refresh', uri ? `for ${uri}` : '');
    (monacoInstance as any).__semanticTokensEmitter.fire();
  }
}


// -------------------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------------------

function convertCompletionKind(kind?: CompletionItemKind): monacoTypes.languages.CompletionItemKind {
  if (!monacoInstance) return 1 as monacoTypes.languages.CompletionItemKind;
  const monaco = monacoInstance;

  const map: Record<number, monacoTypes.languages.CompletionItemKind> = {
    1: monaco.languages.CompletionItemKind.Text,
    2: monaco.languages.CompletionItemKind.Method,
    3: monaco.languages.CompletionItemKind.Function,
    4: monaco.languages.CompletionItemKind.Constructor,
    5: monaco.languages.CompletionItemKind.Field,
    6: monaco.languages.CompletionItemKind.Variable,
    7: monaco.languages.CompletionItemKind.Class,
    8: monaco.languages.CompletionItemKind.Interface,
    9: monaco.languages.CompletionItemKind.Module,
    10: monaco.languages.CompletionItemKind.Property,
    11: monaco.languages.CompletionItemKind.Unit,
    12: monaco.languages.CompletionItemKind.Value,
    13: monaco.languages.CompletionItemKind.Enum,
    14: monaco.languages.CompletionItemKind.Keyword,
    15: monaco.languages.CompletionItemKind.Snippet,
    16: monaco.languages.CompletionItemKind.Color,
    17: monaco.languages.CompletionItemKind.File,
    18: monaco.languages.CompletionItemKind.Reference,
    19: monaco.languages.CompletionItemKind.Folder,
    20: monaco.languages.CompletionItemKind.EnumMember,
    21: monaco.languages.CompletionItemKind.Constant,
    22: monaco.languages.CompletionItemKind.Struct,
    23: monaco.languages.CompletionItemKind.Event,
    24: monaco.languages.CompletionItemKind.Operator,
    25: monaco.languages.CompletionItemKind.TypeParameter,
  };
  return map[kind || 1] || monaco.languages.CompletionItemKind.Text;
}

function convertDiagnosticSeverity(severity?: DiagnosticSeverity): monacoTypes.MarkerSeverity {
  if (!monacoInstance) return 8 as monacoTypes.MarkerSeverity;
  const monaco = monacoInstance;

  switch (severity) {
    case 1: return monaco.MarkerSeverity.Error;
    case 2: return monaco.MarkerSeverity.Warning;
    case 3: return monaco.MarkerSeverity.Info;
    case 4: return monaco.MarkerSeverity.Hint;
    default: return monaco.MarkerSeverity.Error;
  }
}

function formatHoverContents(hover: Hover): monacoTypes.IMarkdownString[] {
  const contents = hover.contents;
  if (typeof contents === 'string') return [{ value: contents }];
  if ('kind' in contents && 'value' in contents) return [{ value: contents.value }];
  if (Array.isArray(contents)) {
    return contents.map((c) => {
      if (typeof c === 'string') return { value: c };
      return { value: `\`\`\`${c.language}\n${c.value}\n\`\`\`` };
    });
  }
  return [];
}

// -------------------------------------------------------------------------
// Main Hook
// -------------------------------------------------------------------------

export function useLsp({ editor, filePath, language }: UseLspOptions) {
  const projectPath = useAppStore((state) => state.projectPath);
  const setLspLoading = useAppStore((state) => state.setLspLoading);
  const clientRef = useRef<LspClient | null>(null);
  const diagnosticsUnsubscribeRef = useRef<(() => void) | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Check if language is supported
  const isSupported = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'].includes(language);
  const currentUriRef = useRef<string | null>(null);

  // Initialize LSP client when workspace opens
  const initializeLsp = useCallback(async () => {
    if (!projectPath || !isSupported) return;

    setLspLoading(true, 'Initializing JS/TS Language Service...');

    try {
      registerMonacoProviders();

      // Get client and set as active in the service
      const client = await typeScriptLsp.getClient(projectPath);

      // Explicitly set this client as the active one for providers to find
      typeScriptLsp.setActiveClient(client);

      clientRef.current = client;
      setIsReady(true);
      console.log('[useLsp] Client ready and active');

      // Subscribe to diagnostics
      if (diagnosticsUnsubscribeRef.current) diagnosticsUnsubscribeRef.current();

      diagnosticsUnsubscribeRef.current = client.onDiagnostics((uri, diagnostics) => {
        // Update diagnostics store for Problems panel
        useDiagnosticsStore.getState().setDiagnostics(uri, diagnostics);

        if (!monacoInstance) return;

        // Debug: Log the incoming URI
        console.log('[LSP:Diagnostics] Received for URI:', uri);
        console.log('[LSP:Diagnostics] Diagnostics count:', diagnostics.length);

        // Ensure we only set diagnostics for valid models
        const models = monacoInstance.editor.getModels();

        // Debug: Log all model URIs
        console.log('[LSP:Diagnostics] Available models:', models.map((m: any) => m.uri.toString()));

        const model = models.find((m: any) => {
          const modelUriStr = m.uri.toString();
          // Try multiple matching strategies
          const normalizedDiagUri = uri.toLowerCase().replace(/\\/g, '/');
          const normalizedModelUri = modelUriStr.toLowerCase().replace(/\\/g, '/');

          // Direct match
          if (normalizedModelUri === normalizedDiagUri) return true;

          // Check if one contains the other (path portion)
          const diagPath = normalizedDiagUri.replace('file:///', '').replace('file://', '');
          const modelPath = normalizedModelUri.replace('file:///', '').replace('file://', '');

          if (diagPath === modelPath) return true;

          // Decode URI components and compare
          try {
            const decodedDiag = decodeURIComponent(diagPath);
            const decodedModel = decodeURIComponent(modelPath);
            if (decodedDiag === decodedModel) return true;
          } catch { }

          return false;
        });

        if (model) {
          console.log('[LSP:Diagnostics] Found matching model, setting markers');
          const markers: monacoTypes.editor.IMarkerData[] = diagnostics.map((d) => ({
            severity: convertDiagnosticSeverity(d.severity),
            message: d.message,
            startLineNumber: d.range.start.line + 1,
            startColumn: d.range.start.character + 1,
            endLineNumber: d.range.end.line + 1,
            endColumn: d.range.end.character + 1,
            source: d.source,
            code: d.code?.toString(),
          }));
          monacoInstance.editor.setModelMarkers(model, 'lsp', markers);
          console.log('[LSP:Diagnostics] Markers set:', markers.length);
        } else {
          console.warn('[LSP:Diagnostics] No matching model found for URI:', uri);
        }
      });

      setLspLoading(false);

    } catch (error) {
      console.error('[useLsp] Failed to initialize:', error);
      setLspLoading(false);
    }
  }, [projectPath, isSupported, setLspLoading]);


  // Initialize on mount/change
  useEffect(() => {
    initializeLsp();
    return () => {
      if (diagnosticsUnsubscribeRef.current) diagnosticsUnsubscribeRef.current();
    };
  }, [initializeLsp]);


  // Document Synchronization
  const openDocument = useCallback(async (content: string) => {
    if (!clientRef.current?.isRunning() || !filePath) return;
    const uri = pathToUri(filePath);
    currentUriRef.current = uri;
    try {
      if (LSP_DEBUG) console.log('[useLsp] didOpen', uri);
      await clientRef.current.didOpen(uri, content);

      // Request tokens only after the file is definitely open
      triggerSemanticTokensRefresh(uri);
    } catch (error) {
      console.error('[useLsp] Open error:', error);
    }
  }, [filePath]);

  // Debounce changes to avoid flooding the LSP server
  const changeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changeDocument = useCallback((content: string) => {
    if (!clientRef.current?.isRunning() || !filePath) return;

    // Clear previous timeout
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }

    const uri = pathToUri(filePath);

    // Debounce the actual LSP update
    changeTimeoutRef.current = setTimeout(async () => {
      try {
        // Send full content update
        // Note: For large files, we should eventually move to incremental updates
        await clientRef.current?.didChange(uri, [{ text: content }]);
      } catch (error) {
        console.error('[useLsp] Change error:', error);
      }
    }, 150); // 150ms debounce
  }, [filePath]);

  // Handle file close
  const closeDocument = useCallback(async () => {
    if (!clientRef.current?.isRunning() || !filePath) return;
    const uri = pathToUri(filePath);
    try {
      console.log('[useLsp] didClose', uri);
      await clientRef.current.didClose(uri);
      currentUriRef.current = null;
    } catch (error) {
      console.error('[useLsp] Close error:', error);
    }
  }, [filePath]);


  // Effect to handle open/change/close for the specific file
  useEffect(() => {
    if (!editor || !filePath || !isSupported || !isReady) return;

    const model = editor.getModel();
    if (!model) return;

    // Initial Open
    openDocument(model.getValue());

    // Subscribe to content changes
    const changeDisposable = model.onDidChangeContent(() => {
      // Send full text update
      changeDocument(model.getValue());
    });

    return () => {
      changeDisposable.dispose();
      closeDocument();
    };
  }, [editor, filePath, isSupported, isReady, openDocument, changeDocument, closeDocument]);

  // Clean up workspace on unmount (if projectPath is gone)
  useEffect(() => {
    return () => {
      if (!projectPath) {
        typeScriptLsp.stopAll();
      }
    };
  }, [projectPath]);

  return {
    isLspReady: isReady,
  };
}
