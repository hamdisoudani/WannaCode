/* ==========================================================================
   TypeScript LSP Service
   Manages TypeScript Language Server for IntelliSense
   ========================================================================== */

import { LspClient, LspClientConfig } from './LspClient';
import type {
  Position,
  CompletionItem,
  CompletionList,
  Hover,
  Definition,
  Location,
  Diagnostic,
  SignatureHelp,
  DocumentSymbol,
  CodeAction,
  WorkspaceEdit,
} from './types';

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------

export interface TypeScriptLspConfig {
  rootPath: string;
}

// -------------------------------------------------------------------------
// TypeScript LSP Service (Singleton per project)
// -------------------------------------------------------------------------

class TypeScriptLspService {
  private clients = new Map<string, LspClient>();
  private startingClients = new Map<string, Promise<LspClient>>();

  private activeClient: LspClient | null = null;

  /**
   * Get or create an LSP client for a project
   */
  async getClient(rootPath: string): Promise<LspClient> {
    // Return existing client
    const existing = this.clients.get(rootPath);
    if (existing?.isRunning()) {
      return existing;
    }

    // Return client that's currently starting
    const starting = this.startingClients.get(rootPath);
    if (starting) {
      return starting;
    }

    // Start new client
    const startPromise = this.startClient(rootPath);
    this.startingClients.set(rootPath, startPromise);

    try {
      const client = await startPromise;
      this.clients.set(rootPath, client);
      return client;
    } finally {
      this.startingClients.delete(rootPath);
    }
  }

  setActiveClient(client: LspClient) {
    this.activeClient = client;
  }

  getActiveClient(): LspClient | null {
    return this.activeClient;
  }

  /**
   * Stop the LSP client for a project
   */
  async stopClient(rootPath: string): Promise<void> {
    const client = this.clients.get(rootPath);
    if (client) {
      await client.stop();
      this.clients.delete(rootPath);
    }
  }

  /**
   * Stop all LSP clients
   */
  async stopAll(): Promise<void> {
    const stopPromises = Array.from(this.clients.values()).map((client) => client.stop());
    await Promise.all(stopPromises);
    this.clients.clear();
  }

  /**
   * Check if a client exists for a project
   */
  hasClient(rootPath: string): boolean {
    return this.clients.has(rootPath) && this.clients.get(rootPath)!.isRunning();
  }

  private async startClient(rootPath: string): Promise<LspClient> {
    // Determine the server command and args
    // We moved this logic from Rust to Frontend for flexibility

    let cmd = 'typescript-language-server';
    let args = ['--stdio'];
    const isWindows = navigator.userAgent.includes('Windows');

    // 1. Check local node_modules
    const localServerPath = `${rootPath}/node_modules/.bin/typescript-language-server${isWindows ? '.cmd' : ''}`;
    const localExists = await import('@tauri-apps/api/core').then(m => m.invoke<boolean>('path_exists', { path: localServerPath }));

    if (localExists) {
      console.log('[TypeScriptLsp] Found local server:', localServerPath);
      if (isWindows) {
        cmd = 'cmd';
        args = ['/c', localServerPath, '--stdio'];
      } else {
        cmd = localServerPath;
      }
    } else {
      // 2. Try global/fallback
      console.log('[TypeScriptLsp] Using global server (PATH)');
      if (isWindows) {
        cmd = 'cmd';
        args = ['/c', 'typescript-language-server', '--stdio'];
      }
    }

    const config: LspClientConfig = {
      id: `typescript-${Date.now()}`,
      languageId: 'typescript',
      rootPath,
      cmd,
      args,
    };

    const client = new LspClient(config);
    await client.start();

    return client;
  }
}

// Singleton instance
export const typeScriptLsp = new TypeScriptLspService();

// -------------------------------------------------------------------------
// Helper Functions for Monaco Integration
// -------------------------------------------------------------------------

/**
 * Convert file path to LSP URI
 */
export function pathToUri(filePath: string): string {
  // Normalize path separators and encode
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.startsWith('/')) {
    return `file://${normalized}`;
  }
  return `file:///${normalized}`;
}

/**
 * Convert LSP URI to file path
 */
export function uriToPath(uri: string): string {
  let path = uri.replace('file:///', '').replace('file://', '');
  // On Windows, convert forward slashes back (detect by drive letter pattern)
  if (path.match(/^[A-Za-z]:/)) {
    path = path.replace(/\//g, '\\');
  }
  return decodeURIComponent(path);
}

/**
 * Convert Monaco position to LSP position
 * Monaco is 1-based, LSP is 0-based
 */
export function monacoToLspPosition(line: number, column: number): Position {
  return {
    line: line - 1,
    character: column - 1,
  };
}

/**
 * Convert LSP position to Monaco position
 */
export function lspToMonacoPosition(position: Position): { lineNumber: number; column: number } {
  return {
    lineNumber: position.line + 1,
    column: position.character + 1,
  };
}

/**
 * Convert LSP range to Monaco range
 */
export function lspToMonacoRange(range: { start: Position; end: Position }): {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
} {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

// -------------------------------------------------------------------------
// Re-export types for convenience
// -------------------------------------------------------------------------

export type {
  Position,
  CompletionItem,
  CompletionList,
  Hover,
  Definition,
  Location,
  Diagnostic,
  SignatureHelp,
  DocumentSymbol,
  CodeAction,
  WorkspaceEdit,
};
