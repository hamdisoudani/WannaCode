/* ==========================================================================
   LSP Protocol Types
   Language Server Protocol type definitions
   ========================================================================== */

// -------------------------------------------------------------------------
// Base Protocol Types
// -------------------------------------------------------------------------

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface TextDocumentIdentifier {
  uri: string;
}

export interface VersionedTextDocumentIdentifier extends TextDocumentIdentifier {
  version: number;
}

export interface TextDocumentItem {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

export interface TextDocumentContentChangeEvent {
  range?: Range;
  rangeLength?: number;
  text: string;
}

// -------------------------------------------------------------------------
// Diagnostic Types
// -------------------------------------------------------------------------

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export interface Diagnostic {
  range: Range;
  severity?: DiagnosticSeverity;
  code?: number | string;
  source?: string;
  message: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}

export interface DiagnosticRelatedInformation {
  location: Location;
  message: string;
}

export interface PublishDiagnosticsParams {
  uri: string;
  diagnostics: Diagnostic[];
}

// -------------------------------------------------------------------------
// Completion Types
// -------------------------------------------------------------------------

export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

export interface CompletionItem {
  label: string;
  kind?: CompletionItemKind;
  detail?: string;
  documentation?: string | MarkupContent;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  insertTextFormat?: InsertTextFormat;
  textEdit?: TextEdit;
  additionalTextEdits?: TextEdit[];
}

export interface CompletionList {
  isIncomplete: boolean;
  items: CompletionItem[];
}

export enum InsertTextFormat {
  PlainText = 1,
  Snippet = 2,
}

export interface TextEdit {
  range: Range;
  newText: string;
}

export interface MarkupContent {
  kind: 'plaintext' | 'markdown';
  value: string;
}

// -------------------------------------------------------------------------
// Hover Types
// -------------------------------------------------------------------------

export interface Hover {
  contents: MarkupContent | string | { language: string; value: string }[];
  range?: Range;
}

// -------------------------------------------------------------------------
// Signature Help Types
// -------------------------------------------------------------------------

export interface SignatureHelp {
  signatures: SignatureInformation[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface SignatureInformation {
  label: string;
  documentation?: string | MarkupContent;
  parameters?: ParameterInformation[];
}

export interface ParameterInformation {
  label: string | [number, number];
  documentation?: string | MarkupContent;
}

// -------------------------------------------------------------------------
// Definition / References Types
// -------------------------------------------------------------------------

export type Definition = Location | Location[];

export interface ReferenceContext {
  includeDeclaration: boolean;
}

// -------------------------------------------------------------------------
// Document Symbol Types
// -------------------------------------------------------------------------

export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

export interface DocumentSymbol {
  name: string;
  detail?: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

// -------------------------------------------------------------------------
// Code Action Types
// -------------------------------------------------------------------------

export interface CodeAction {
  title: string;
  kind?: string;
  diagnostics?: Diagnostic[];
  isPreferred?: boolean;
  edit?: WorkspaceEdit;
  command?: Command;
}

export interface WorkspaceEdit {
  changes?: { [uri: string]: TextEdit[] };
}

export interface Command {
  title: string;
  command: string;
  arguments?: unknown[];
}

// -------------------------------------------------------------------------
// Rename Types
// -------------------------------------------------------------------------

export interface RenameParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
  newName: string;
}

// -------------------------------------------------------------------------
// LSP Message Types
// -------------------------------------------------------------------------

export interface LspRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

export interface LspResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: LspError;
}

export interface LspNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

export interface LspError {
  code: number;
  message: string;
  data?: unknown;
}

// -------------------------------------------------------------------------
// Server Capabilities
// -------------------------------------------------------------------------

export interface ServerCapabilities {
  textDocumentSync?: number | TextDocumentSyncOptions;
  completionProvider?: CompletionOptions;
  hoverProvider?: boolean;
  signatureHelpProvider?: SignatureHelpOptions;
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentSymbolProvider?: boolean;
  codeActionProvider?: boolean;
  renameProvider?: boolean | RenameOptions;
  semanticTokensProvider?: SemanticTokensOptions;
}

export interface TextDocumentSyncOptions {
  openClose?: boolean;
  change?: number;
  save?: boolean | { includeText?: boolean };
}

export interface CompletionOptions {
  triggerCharacters?: string[];
  resolveProvider?: boolean;
}

export interface SignatureHelpOptions {
  triggerCharacters?: string[];
  retriggerCharacters?: string[];
}

export interface RenameOptions {
  prepareProvider?: boolean;
}

// -------------------------------------------------------------------------
// Semantic Tokens Types
// -------------------------------------------------------------------------

export interface SemanticTokensLegend {
  tokenTypes: string[];
  tokenModifiers: string[];
}

export interface SemanticTokensOptions {
  legend: SemanticTokensLegend;
  full?: boolean | { delta?: boolean };
  range?: boolean;
}

export interface SemanticTokens {
  resultId?: string;
  data: number[];
}

/**
 * Represents an edit to semantic tokens (LSP 3.17)
 */
export interface SemanticTokensEdit {
  /** The start offset of the edit (in the data array) */
  start: number;
  /** The count of elements to remove */
  deleteCount: number;
  /** The elements to insert */
  data?: number[];
}

/**
 * Represents a delta update to semantic tokens (LSP 3.17)
 */
export interface SemanticTokensDelta {
  resultId?: string;
  /** The semantic token edits to transform a previous result into a new result */
  edits: SemanticTokensEdit[];
}
