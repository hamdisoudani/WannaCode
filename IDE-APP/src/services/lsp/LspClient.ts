/* ==========================================================================
   LSP Client - Generic Language Server Protocol Client
   Reusable for any LSP-compatible language server
   ========================================================================== */

import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import type {
  Position,
  CompletionItem,
  CompletionList,
  Hover,
  Definition,
  Location,
  Diagnostic,
  PublishDiagnosticsParams,
  SignatureHelp,
  DocumentSymbol,
  CodeAction,
  WorkspaceEdit,
  TextDocumentContentChangeEvent,
  ServerCapabilities,
  LspResponse,
  SemanticTokens,
  SemanticTokensDelta,
} from './types';

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface LspClientConfig {
  /** Unique identifier for this LSP instance */
  id: string;
  /** Language ID (e.g., 'typescript', 'rust', 'python') */
  languageId: string;
  /** Root path of the workspace */
  rootPath: string;
  /** Command to execute (e.g., 'typescript-language-server') */
  cmd: string;
  /** Arguments for the command */
  args: string[];
}

export interface LspServerInfo {
  id: string;
  languageId: string;
  rootPath: string;
  capabilities: ServerCapabilities;
}

type DiagnosticsCallback = (uri: string, diagnostics: Diagnostic[]) => void;

// -------------------------------------------------------------------------
// LSP Client Class
// -------------------------------------------------------------------------

export class LspClient {
  private id: string;
  private languageId: string;
  private rootPath: string;
  private cmd: string;
  private args: string[];
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private diagnosticsCallbacks: DiagnosticsCallback[] = [];
  private unlistenFns: UnlistenFn[] = [];
  private isInitialized = false;
  private capabilities: ServerCapabilities = {};
  private documentVersions = new Map<string, number>();

  constructor(config: LspClientConfig) {
    this.id = config.id;
    this.languageId = config.languageId;
    this.rootPath = config.rootPath;
    this.cmd = config.cmd;
    this.args = config.args;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Start the LSP server and initialize the connection
   */
  async start(): Promise<ServerCapabilities> {
    console.log(`[LSP:${this.languageId}] Starting server...`);
    console.log(`[LSP:${this.languageId}] Command: ${this.cmd} ${this.args.join(' ')}`);

    // Start the LSP server process
    const serverInfo = await invoke<LspServerInfo>('lsp_start', {
      id: this.id,
      languageId: this.languageId,
      rootPath: this.rootPath,
      cmd: this.cmd,
      args: this.args,
    });

    this.capabilities = serverInfo.capabilities;

    // Listen for responses from the server
    const unlistenResponse = await listen<LspResponse>(`lsp-response-${this.id}`, (event) => {
      this.handleResponse(event.payload);
    });
    this.unlistenFns.push(unlistenResponse);

    // Listen for diagnostics
    const unlistenDiagnostics = await listen<PublishDiagnosticsParams>(
      `lsp-diagnostics-${this.id}`,
      (event) => {
        this.handleDiagnostics(event.payload);
      }
    );
    this.unlistenFns.push(unlistenDiagnostics);

    this.isInitialized = true;
    console.log(`[LSP:${this.languageId}] Server started with capabilities:`, this.capabilities);

    return this.capabilities;
  }

  /**
   * Stop the LSP server
   */
  async stop(): Promise<void> {
    console.log(`[LSP:${this.languageId}] Stopping server...`);

    // Unsubscribe from events
    for (const unlisten of this.unlistenFns) {
      unlisten();
    }
    this.unlistenFns = [];

    // Stop the server process
    await invoke('lsp_stop', { id: this.id });

    this.isInitialized = false;
    this.pendingRequests.clear();
    this.documentVersions.clear();

    console.log(`[LSP:${this.languageId}] Server stopped`);
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.isInitialized;
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): ServerCapabilities {
    return this.capabilities;
  }

  // -------------------------------------------------------------------------
  // Document Synchronization
  // -------------------------------------------------------------------------

  /**
   * Notify the server that a document was opened
   */
  async didOpen(uri: string, text: string, languageId?: string): Promise<void> {
    this.documentVersions.set(uri, 1);

    // Determine language ID from file extension if not provided
    const lang = languageId || this.getLanguageIdFromUri(uri);

    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: lang,
        version: 1,
        text,
      },
    });
  }

  /**
   * Get language ID from file URI
   */
  private getLanguageIdFromUri(uri: string): string {
    if (uri.endsWith('.tsx')) return 'typescriptreact';
    if (uri.endsWith('.jsx')) return 'javascriptreact';
    if (uri.endsWith('.ts')) return 'typescript';
    if (uri.endsWith('.js') || uri.endsWith('.mjs') || uri.endsWith('.cjs')) return 'javascript';
    return this.languageId;
  }

  /**
   * Notify the server that a document was changed
   */
  async didChange(uri: string, changes: TextDocumentContentChangeEvent[]): Promise<void> {
    const version = (this.documentVersions.get(uri) || 0) + 1;
    this.documentVersions.set(uri, version);

    await this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: changes,
    });
  }

  /**
   * Notify the server that a document was saved
   */
  async didSave(uri: string, text?: string): Promise<void> {
    await this.sendNotification('textDocument/didSave', {
      textDocument: { uri },
      text,
    });
  }

  /**
   * Notify the server that a document was closed
   */
  async didClose(uri: string): Promise<void> {
    this.documentVersions.delete(uri);

    await this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });
  }

  // -------------------------------------------------------------------------
  // Language Features
  // -------------------------------------------------------------------------

  /**
   * Request completions at a position
   */
  async completion(uri: string, position: Position): Promise<CompletionItem[] | CompletionList | null> {
    if (!this.capabilities.completionProvider) return null;

    const result = await this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position,
    });

    return result as CompletionItem[] | CompletionList | null;
  }

  /**
   * Request hover information at a position
   */
  async hover(uri: string, position: Position): Promise<Hover | null> {
    if (!this.capabilities.hoverProvider) return null;

    const result = await this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position,
    });

    return result as Hover | null;
  }

  /**
   * Request signature help at a position
   */
  async signatureHelp(uri: string, position: Position): Promise<SignatureHelp | null> {
    if (!this.capabilities.signatureHelpProvider) return null;

    const result = await this.sendRequest('textDocument/signatureHelp', {
      textDocument: { uri },
      position,
    });

    return result as SignatureHelp | null;
  }

  /**
   * Request definition location(s) for a symbol
   */
  async definition(uri: string, position: Position): Promise<Definition | null> {
    if (!this.capabilities.definitionProvider) return null;

    const result = await this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position,
    });

    return result as Definition | null;
  }

  /**
   * Request all references to a symbol
   */
  async references(uri: string, position: Position, includeDeclaration = true): Promise<Location[] | null> {
    if (!this.capabilities.referencesProvider) return null;

    const result = await this.sendRequest('textDocument/references', {
      textDocument: { uri },
      position,
      context: { includeDeclaration },
    });

    return result as Location[] | null;
  }

  /**
   * Request document symbols (outline)
   */
  async documentSymbols(uri: string): Promise<DocumentSymbol[] | null> {
    if (!this.capabilities.documentSymbolProvider) return null;

    const result = await this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri },
    });

    return result as DocumentSymbol[] | null;
  }

  /**
   * Request code actions at a range
   */
  async codeActions(uri: string, range: { start: Position; end: Position }, diagnostics: Diagnostic[] = []): Promise<CodeAction[] | null> {
    if (!this.capabilities.codeActionProvider) return null;

    const result = await this.sendRequest('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context: { diagnostics },
    });

    return result as CodeAction[] | null;
  }

  /**
   * Request rename edits
   */
  async rename(uri: string, position: Position, newName: string): Promise<WorkspaceEdit | null> {
    if (!this.capabilities.renameProvider) return null;

    const result = await this.sendRequest('textDocument/rename', {
      textDocument: { uri },
      position,
      newName,
    });

    return result as WorkspaceEdit | null;
  }

  /**
   * Request semantic tokens for the full document
   */
  async semanticTokensFull(uri: string): Promise<SemanticTokens | null> {
    if (!this.capabilities.semanticTokensProvider) return null;

    const result = await this.sendRequest('textDocument/semanticTokens/full', {
      textDocument: { uri },
    });

    return result as SemanticTokens | null;
  }

  /**
   * Request semantic tokens delta (incremental update)
   * Returns either full SemanticTokens (if server can't provide delta) or SemanticTokensDelta
   */
  async semanticTokensDelta(uri: string, previousResultId: string): Promise<SemanticTokens | SemanticTokensDelta | null> {
    // Check if server supports delta
    const provider = this.capabilities.semanticTokensProvider;
    if (!provider) return null;

    // Check if delta is supported (full.delta must be true)
    const supportsDelta = typeof provider === 'object' &&
      provider.full &&
      typeof provider.full === 'object' &&
      provider.full.delta === true;

    if (!supportsDelta) {
      // Fall back to full request
      return this.semanticTokensFull(uri);
    }

    const result = await this.sendRequest('textDocument/semanticTokens/full/delta', {
      textDocument: { uri },
      previousResultId,
    });

    return result as SemanticTokens | SemanticTokensDelta | null;
  }

  // -------------------------------------------------------------------------
  // Diagnostics
  // -------------------------------------------------------------------------

  /**
   * Subscribe to diagnostics updates
   */
  onDiagnostics(callback: DiagnosticsCallback): () => void {
    this.diagnosticsCallbacks.push(callback);
    return () => {
      const index = this.diagnosticsCallbacks.indexOf(callback);
      if (index !== -1) {
        this.diagnosticsCallbacks.splice(index, 1);
      }
    };
  }

  // -------------------------------------------------------------------------
  // Internal Methods
  // -------------------------------------------------------------------------

  private async sendRequest(method: string, params: unknown): Promise<unknown> {
    const id = ++this.requestId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      invoke('lsp_request', {
        id: this.id,
        requestId: id,
        method,
        params,
      }).catch((error) => {
        this.pendingRequests.delete(id);
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`LSP request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  private async sendNotification(method: string, params: unknown): Promise<void> {
    await invoke('lsp_notify', {
      id: this.id,
      method,
      params,
    });
  }

  private handleResponse(response: LspResponse): void {
    if (response.id === null || response.id === undefined) return;

    // Handle both number and string IDs from JSON
    const responseId = typeof response.id === 'string' ? parseInt(response.id, 10) : response.id as number;

    const pending = this.pendingRequests.get(responseId);
    if (!pending) return;

    this.pendingRequests.delete(responseId);

    if (response.error) {
      pending.reject(new Error(response.error.message));
    } else {
      pending.resolve(response.result);
    }
  }

  private handleDiagnostics(params: PublishDiagnosticsParams): void {
    console.log(`[LSP:${this.languageId}] Diagnostics received for:`, params.uri, 'count:', params.diagnostics.length);
    for (const callback of this.diagnosticsCallbacks) {
      callback(params.uri, params.diagnostics);
    }
  }
}
