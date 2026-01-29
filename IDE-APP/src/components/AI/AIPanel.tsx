/* ==========================================================================
   AIPanel - Premium Headless Chat UI
   Features: Resizable, Streaming Think Blocks, Tokyo Night Theme
   ========================================================================== */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useCopilotAction, useCopilotChatHeadless_c, useCopilotReadable } from '@copilotkit/react-core';
import { Message, AIMessage } from '@copilotkit/shared';
import ReactMarkdown from 'react-markdown';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
// Import specific languages for smaller bundle
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import { useAppStore } from '../../stores/appStore';
import { useAuth } from '../../contexts/AuthContext';
import { invoke } from '@tauri-apps/api/core';
import './AIPanel.css';

// Register languages
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('tsx', typescript);
SyntaxHighlighter.registerLanguage('jsx', javascript);
SyntaxHighlighter.registerLanguage('ts', typescript);
SyntaxHighlighter.registerLanguage('js', javascript);

// -------------------------------------------------------------------------
// Frontend Tools Definition
// -------------------------------------------------------------------------

// Helper for LSP status
function LspStatus({ status, args, result }: any) {
  return (
      <ToolExecutionStatus 
        toolName="LSP Operation" 
        status={status} 
        args={args} 
        result={result} 
      />
  );
}
// -------------------------------------------------------------------------
/**
 * Hook to register all frontend tools with CopilotKit.
 * These tools are sent to the agent and executed here in the frontend.
 */
function useIDETools() {
  const { projectPath, activeFilePath } = useAppStore();

  // 🔒 Security Context: Enforce Project Boundaries
  useCopilotReadable({
    description: "The strict security context for this session. You MUST ONLY operate within the 'projectRoot'. Accessing any path outside this directory is FORBIDDEN.",
    value: {
      projectRoot: projectPath || "No project open",
      activeFile: activeFilePath || "No file open",
      policy: "STRICT_PROJECT_SCOPED_OPERATIONS_ONLY"
    },
  });

  // Helper to validate paths
  const validatePath = (path: string) => {
    if (!projectPath) throw new Error("No project open");
    // Normalize paths to prevent traversal
    const normalizedPath = path.replace(/\\/g, '/');
    const normalizedRoot = projectPath.replace(/\\/g, '/');
    
    if (!normalizedPath.startsWith(normalizedRoot)) {
      throw new Error(`SECURITY VIOLATION: Access denied to ${path}. You are restricted to ${projectPath}`);
    }
  };

  // 1. Tool: List Directory
  useCopilotAction({
    name: "list_dir",
    description: "List contents of a directory. Use this to explore the file system.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "The absolute path to the directory",
        required: true,
      },
    ],
    handler: async ({ path }) => {
      try {
        validatePath(path);
        console.log(`📂 [list_dir] Listing contents of: ${path}`);
        // Call Rust backend
        const entries = await invoke('read_directory', { path, depth: 1, showIgnored: false });
        // Format for agent
        return JSON.stringify(entries, null, 2);
      } catch (err) {
        console.error("❌ [list_dir] Failed:", err);
        return `Error listing directory: ${err}`;
      }
    },
    render: ({ status, args, result }) => (
      <ToolExecutionStatus 
        toolName="List Directory" 
        status={status} 
        args={args} 
        result={result} 
      />
    ),
  });

// -------------------------------------------------------------------------
// Specialized Renderers
// -------------------------------------------------------------------------

function DirectoryStatsRenderer({ stats }: { stats: any }) {
  if (!stats) return null;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="ai-dir-stats">
      <div className="ai-dir-stats__header">
        <div className="ai-dir-stats__title">
          <span className="ai-dir-stats__item-icon">📂</span>
          {stats.name || stats.path}
        </div>
        <div className="ai-dir-stats__meta">
           <span>{stats.file_count} files</span>
           <span className="ai-dir-stats__divider">•</span>
           <span>{stats.dir_count} folders</span>
           <span className="ai-dir-stats__divider">•</span>
           <span>{formatSize(stats.size_bytes)}</span>
        </div>
      </div>
      
      {stats.children && stats.children.length > 0 && (
        <div className="ai-dir-stats__list">
           <div className="ai-dir-stats__label">Contents (Depth {stats.depth})</div>
           {stats.children.map((child: any, idx: number) => (
             <div key={idx} className="ai-dir-stats__item">
               <span className="ai-dir-stats__item-icon">
                 {child.is_empty && child.dir_count === 0 && child.file_count === 0 ? '📁' : (child.dir_count > 0 ? 'qh' : '📄')}
               </span>
               <span className="ai-dir-stats__item-name">
                 {child.name}
               </span>
               {child.dir_count > 0 && (
                  <span className="ai-dir-stats__item-badge">{child.dir_count} dirs</span>
               )}
                <span style={{ opacity: 0.5, fontSize: '11px', marginLeft: 'auto' }}>
                  {formatSize(child.size_bytes)}
                </span>
             </div>
           ))}
           {stats.children.length > 10 && (
             <div className="ai-dir-stats__more">... and {stats.file_count - 10} more files</div>
           )}
        </div>
      )}
    </div>
  );
}

  // 1.5. Tool: List Directory Stats (Smart Exploration)
  useCopilotAction({
    name: "list_dir_stats",
    description: "Get statistics and structure of a directory without reading all files. Returns size, file counts, and structure depth. Use this FIRST to explore a project.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "The absolute path to the directory",
        required: true,
      },
      {
        name: "depth",
        type: "number",
        description: "How deep to traverse (default: 2). Keep it small (1-3) for speed.",
        required: false,
      },
    ],
    handler: async ({ path, depth }) => {
      try {
        validatePath(path);
        console.log(`📊 [list_dir_stats] Analyzing: ${path}`);
        const stats = await invoke('read_directory_stats', { path, maxDepth: depth || 2 });
        return JSON.stringify(stats, null, 2);
      } catch (err) {
        console.error("❌ [list_dir_stats] Failed:", err);
        return `Error analyzing directory: ${err}`;
      }
    },
    render: ({ status, args, result }) => (
      <UnifiedToolStatus 
        toolName="Analyze Directory" 
        status={status} 
        args={args} 
        result={result}
        resultRenderer={(parsedResult) => <DirectoryStatsRenderer stats={parsedResult} />}
      />
    ),
  });

  // 2. Tool: Read File
  useCopilotAction({
    name: "read_file",
    description: "Read the contents of a file. Use this to examine code or configuration.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "The absolute path to the file",
        required: true,
      },
    ],
    handler: async ({ path }) => {
      try {
        validatePath(path);
        console.log(`📖 [read_file] Reading: ${path}`);
        const content = await invoke('read_file', { path });
        return content as string;
      } catch (err) {
        console.error("❌ [read_file] Failed:", err);
        return `Error reading file: ${err}`;
      }
    },
    render: ({ status, args, result }) => (
      <ToolExecutionStatus 
        toolName="Read File" 
        status={status} 
        args={args} 
        result={result} 
        isContent
      />
    ),
  });

  // 2.5 Tool: Search Code (Ripgrep)
  useCopilotAction({
    name: "search_code",
    description: "Search for code patterns across the codebase using regex or plain text. Extremely fast.",
    parameters: [
      {
        name: "query",
        type: "string",
        description: "The text or regex to search for",
        required: true,
      },
      {
        name: "is_regex",
        type: "boolean",
        description: "Whether the query is a regular expression (default: false)",
        required: false,
      },
      {
        name: "file_pattern",
        type: "string",
        description: "Glob pattern to filter files (e.g., '*.tsx', 'src/**')",
        required: false,
      },
    ],
    handler: async ({ query, is_regex, file_pattern }) => {
      try {
        if (!projectPath) throw new Error("No project open");
        console.log(`🔍 [search_code] Searching for: ${query}`);
        
        const results = await invoke('search_in_files', { 
          options: {
            query,
            path: projectPath,
            is_regex: is_regex || false,
            is_case_sensitive: true,
            is_whole_word: false,
            exclude: [],
            include: file_pattern ? [file_pattern] : [],
            max_results: 50
          }
        });
        
        // Summarize results to avoid context overflow
        // @ts-ignore
        const summary = results.map(r => `${r.file}:${r.line_number}: ${r.line_content.trim()}`);
        
        if (summary.length === 0) return "No matches found.";
        return `Found ${summary.length} matches:\n` + summary.join('\n');
      } catch (err) {
        console.error("❌ [search_code] Failed:", err);
        return `Error searching code: ${err}`;
      }
    },
    render: ({ status, args, result }) => (
      <ToolExecutionStatus 
        toolName="Search Code" 
        status={status} 
        args={args} 
        result={result} 
      />
    ),
  });


  // 3. Tool: Get Diagnostics (LSP)
  useCopilotAction({
    name: "get_diagnostics",
    description: "Get compilation errors and warnings. ALWAYS use this after modifying a file to verify correctness.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "The absolute path to the file to check",
        required: true,
      },
    ],
    handler: async ({ path }) => {
        // Mock implementation for Phase 3/4 transitional state
        // In Phase 5, this will call `lsp_request` 'textDocument/publishDiagnostics'
        // For now, we rely on the user to report build errors or use `run_command`
        return `[LSP Mock] Diagnostics for ${path}: No fatal errors reported (Mock). Pls use run_command with 'npm run typecheck' for validation.`;
    },
    render: props => <LspStatus {...props} />,
  });

  // 4. Tool: Find Definitions (LSP-Heuristic)
  useCopilotAction({
    name: "find_definitions",
    description: "Find where a symbol (class, function, variable) is defined. Use this to understand code dependencies.",
    parameters: [
      {
        name: "symbol_name",
        type: "string",
        description: "The name of the symbol to find (e.g. 'AuthService')",
        required: true,
      },
    ],
    handler: async ({ symbol_name }) => {
      try {
        if (!projectPath) throw new Error("No project open");
        console.log(`🔎 [find_definitions] Looking for symbol: ${symbol_name}`);
        
        // Use ripgrep with regex to simulate "Go to Definition"
        // Matches: "class Symbol", "function Symbol", "const Symbol =", "interface Symbol"
        const results = await invoke('search_in_files', { 
            options: {
              query: `(class|function|const|let|var|interface|type)\\s+${symbol_name}\\b`,
              path: projectPath,
              is_regex: true,
              is_case_sensitive: true,
              is_whole_word: false,
              exclude: [],
              include: [],
              max_results: 5
            }
        });
        
        // @ts-ignore
        if (results && results.length > 0) {
             // @ts-ignore
             return JSON.stringify(results.map(r => ({ file: r.file, line: r.line_number, context: r.line_content.trim()})), null, 2);
        }
        
        return "Definition not found via heuristic search.";
      } catch (err) {
        return `Error finding definition: ${err}`;
      }
    },
    render: props => <LspStatus {...props} />,
  });

  // 5. Tool: Create/Write File
  useCopilotAction({
    name: "write_file",
    description: "Write content to a file. Use this to create new files or overwrite existing ones.",
    parameters: [
      {
        name: "path",
        type: "string",
        description: "The absolute path to the file",
        required: true,
      },
      {
        name: "content",
        type: "string",
        description: "The full content to write",
        required: true,
      },
    ],
    handler: async ({ path, content }) => {
      try {
        validatePath(path);
        console.log(`📝 [write_file] Writing to: ${path}`);
        await invoke('write_file', { path, content });
        return `Successfully wrote to ${path}`;
      } catch (err) {
        console.error("❌ [write_file] Failed:", err);
        return `Error writing file: ${err}`;
      }
    },
    render: ({ status, args, result }) => (
      <ToolExecutionStatus 
        toolName="Write File" 
        status={status} 
        args={args} 
        result={result} 
        isContent
      />
    ),
  });

  // 4. Tool: Run Command
  useCopilotAction({
    name: "run_command",
    description: "Run a shell command in the project root. Use this for git, npm, cargo, etc.",
    parameters: [
      {
        name: "command",
        type: "string",
        description: "The command to run (e.g., 'npm install', 'git status')",
        required: true,
      },
    ],
    handler: async ({ command }) => {
      try {
        if (!projectPath) throw new Error("No open project to run commands in");
        console.log(`🚀 [run_command] Executing: ${command}`);
        // Mock for now, pending real PTY integration
        // In real implementation, this would connect to the PTY service
        return `Command execution simulation: '${command}' started. (Real terminal integration pending)`;
      } catch (err) {
        return `Error running command: ${err}`;
      }
    },
    render: ({ status, args, result }) => (
      <ToolExecutionStatus 
        toolName="Run Command" 
        status={status} 
        args={args} 
        result={result} 
      />
    ),
  });

  // Task Tool Rendering (for subagent delegation)
  useCopilotAction({
    name: "task",
    available: "disabled", // Only for rendering, not for direct calls
    render: ({ status, args }) => {
      return (
        <div className="tool-execution-card" style={{
          background: 'rgba(122, 162, 247, 0.1)',
          border: '1px solid rgba(122, 162, 247, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          margin: '8px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>
              {status === 'complete' ? '✅' : '🔄'}
            </span>
            <span style={{ 
              color: '#7aa2f7', 
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {status === 'complete' ? 'Task Completed' : 'Delegating Task'}
            </span>
          </div>
          <div style={{ 
            color: '#a9b1d6',
            fontSize: '13px',
            lineHeight: '1.6',
            paddingLeft: '26px'
          }}>
            <div style={{ marginBottom: '4px' }}>
              <strong>Subagent:</strong> {args.subagent_type || 'unknown'}
            </div>
            <div>
              <strong>Task:</strong> {args.description || 'No description'}
            </div>
          </div>
        </div>
      );
    },
  });

  // TODO Tool Rendering (for task breakdown)
  useCopilotAction({
    name: "TODO",
    available: "disabled", // Only for rendering, not for direct calls
    render: ({ args }) => {
      // Parse the TODO items from args
      const todoItems = args.items || [];
      
      return (
        <div className="tool-execution-card" style={{
          background: 'rgba(224, 175, 104, 0.1)',
          border: '1px solid rgba(224, 175, 104, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          margin: '8px 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>📋</span>
            <span style={{ 
              color: '#e0af68', 
              fontWeight: '600',
              fontSize: '14px'
            }}>
              Task Breakdown
            </span>
          </div>
          <div style={{ 
            color: '#a9b1d6',
            fontSize: '13px',
            paddingLeft: '26px'
          }}>
            {todoItems.length > 0 ? (
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                {todoItems.map((item: string, index: number) => (
                  <li key={index} style={{ marginBottom: '4px' }}>
                    {item}
                  </li>
                ))}
              </ol>
            ) : (
              <div>Creating task list...</div>
            )}
          </div>
        </div>
      );
    },
  });
}

// Unified Tool Status UI - Supports custom result renderers
function UnifiedToolStatus({ 
  toolName, 
  status, 
  args, 
  result, 
  isContent,
  resultRenderer 
}: { 
  toolName: string;
  status: string;
  args: any;
  result: any;
  isContent?: boolean;
  resultRenderer?: (parsedResult: any) => React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const statusColors: any = {
    inProgress: '#7aa2f7',
    executing: '#e0af68',
    complete: '#7aa2f7',
    error: '#f7768e',
  };

  const statusIcons: any = {
    inProgress: '⏳',
    executing: '⚙️',
    complete: '✓',
    error: '✗',
  };

  const formatValue = (val: any) => {
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  };

  // Create summary for collapsed state
  const getSummary = () => {
    if (args) {
      const firstArg = Object.entries(args)[0];
      if (firstArg) {
        const [key, value] = firstArg;
        const valueStr = String(value);
        return `${key}: ${valueStr.length > 40 ? valueStr.slice(0, 40) + '...' : valueStr}`;
      }
    }
    return 'View details';
  };

  // Parse result for custom renderer
  const parsedResult = useMemo(() => {
    if (!result || !resultRenderer) return null;
    try {
      return typeof result === 'string' ? JSON.parse(result) : result;
    } catch {
      return result;
    }
  }, [result, resultRenderer]);

  return (
    <div style={{
      backgroundColor: 'rgba(26, 27, 38, 0.6)',
      border: `1px solid ${statusColors[status] || '#565f89'}`,
      borderRadius: '8px',
      marginTop: '8px',
      fontSize: '13px',
      fontFamily: 'Inter, monospace',
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}>
      {/* Header - Always visible */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          background: isExpanded ? 'rgba(0,0,0,0.2)' : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        <span style={{ 
          color: statusColors[status], 
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
        }}>
          {statusIcons[status]}
        </span>
        <span style={{ 
          color: '#c0caf5', 
          fontWeight: 600,
          flex: 1,
        }}>
          {toolName}
        </span>
        <span style={{ 
          fontSize: '11px',
          color: '#565f89',
          textTransform: 'capitalize',
        }}>
          {status}
        </span>
        <span style={{
          color: '#7aa2f7',
          fontSize: '12px',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>
          ▶
        </span>
      </div>

      {/* Collapsed summary */}
      {!isExpanded && args && (
        <div style={{
          padding: '0 14px 12px 44px',
          color: '#9aa5ce',
          fontSize: '12px',
          opacity: 0.7,
        }}>
          {getSummary()}
        </div>
      )}
      
      {/* Expanded details */}
      {isExpanded && (
        <div style={{ 
          padding: '0 14px 12px 14px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Arguments */}
          {args && Object.entries(args).map(([key, value]: [string, any]) => (
            <div key={key} style={{ 
              color: '#9aa5ce', 
              marginTop: '10px',
              fontSize: '12px',
            }}>
              <span style={{ 
                color: '#7aa2f7', 
                fontWeight: 500,
                marginRight: '6px',
              }}>
                {key}:
              </span>
              {isContent && key === 'content' ? (
                <span style={{ opacity: 0.7 }}>({value?.length || 0} characters)</span>
              ) : (
                <span style={{ color: '#c0caf5' }}>
                  {formatValue(value).length > 100 
                    ? formatValue(value).slice(0, 100) + '...' 
                    : formatValue(value)
                  }
                </span>
              )}
            </div>
          ))}
          
          {/* Result - Custom renderer or default */}
          {status === 'complete' && result && (
            <div style={{ marginTop: '12px' }}>
              {resultRenderer && parsedResult ? (
                resultRenderer(parsedResult)
              ) : (
                <div style={{ 
                  color: '#9ece6a', 
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '200px',
                  overflow: 'auto',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(122, 162, 247, 0.2)',
                }}>
                  {isContent ? '✓ Content loaded successfully' : formatValue(result).slice(0, 2000)} 
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Reusable Tool Status UI (backward compatibility wrapper)
function ToolExecutionStatus({ toolName, status, args, result, isContent }: any) {
  return (
    <UnifiedToolStatus 
      toolName={toolName}
      status={status}
      args={args}
      result={result}
      isContent={isContent}
    />
  );
}


// -------------------------------------------------------------------------
// Minimal Icons
// -------------------------------------------------------------------------

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12"/>
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.5 2a.5.5 0 0 0-.5.5v.878a2.25 2.25 0 0 1-1.078 1.939l-.704.41A.5.5 0 0 0 7 6.196v1.607a.5.5 0 0 0 .218.414l.704.41A2.251 2.251 0 0 1 9 10.566v.878a.5.5 0 0 0 .5.5h.878a2.25 2.25 0 0 1 1.939 1.078l.41.704a.5.5 0 0 0 .469.218h1.607a.5.5 0 0 0 .414-.218l.41-.704A2.251 2.251 0 0 1 17.566 12h.878a.5.5 0 0 0 .5-.5v-.878a2.25 2.25 0 0 1 1.078-1.939l.704-.41A.5.5 0 0 0 21 7.804V6.196a.5.5 0 0 0-.218-.414l-.704-.41A2.251 2.251 0 0 1 19 3.434V2.5a.5.5 0 0 0-.5-.5h-.878a2.25 2.25 0 0 1-1.939-1.078l-.41-.704A.5.5 0 0 0 14.804 0h-1.607a.5.5 0 0 0-.414.218l-.41.704A2.251 2.251 0 0 1 10.434 2H9.5z"/>
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.35-4.35"/>
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="1"/>
      <circle cx="19" cy="12" r="1"/>
      <circle cx="5" cy="12" r="1"/>
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="5" y="5" width="14" height="14" rx="2"/>
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg 
      width="12" 
      height="12" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2"
      style={{ 
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', 
        transition: 'transform 0.2s',
        opacity: 0.6
      }}
    >
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3m-2.8-7.2 2.2-2.2M5.6 18.4l2.2-2.2m0-8.4L5.6 5.6m12.8 12.8 2.2 2.2"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
  );
}

// Copy button component for code blocks
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <button 
      className={`ai-code-copy-btn ${copied ? 'copied' : ''}`}
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}



// -------------------------------------------------------------------------
// Helper Types & Functions
// -------------------------------------------------------------------------

interface ParsedContent {
  thinkContent: string | null;
  mainContent: string;
  isThinking: boolean;
}

function parseThinkTags(content: string): ParsedContent {
  // Check for complete <think>...</think> block
  const completeThinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
  
  if (completeThinkMatch) {
    const thinkContent = completeThinkMatch[1].trim();
    const mainContent = content.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    return { thinkContent, mainContent, isThinking: false };
  }
  
  // Check for partial/streaming <think>...
  const partialThinkMatch = content.match(/<think>([\s\S]*)$/);
  
  if (partialThinkMatch) {
    const thinkContent = partialThinkMatch[1].trim();
    const mainContent = content.replace(/<think>[\s\S]*$/, '').trim();
    return { thinkContent: thinkContent || null, mainContent, isThinking: true };
  }
  
  return { thinkContent: null, mainContent: content, isThinking: false };
}

function getMessageContent(msg: Message): string {
  if (!msg.content) return '';
  if (typeof msg.content === 'string') return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map(part => part.text)
      .join('\n');
  }
  return '';
}

function isAIMessage(msg: Message): msg is AIMessage {
  return msg.role === 'assistant';
}

// -------------------------------------------------------------------------
// Sub-Components
// -------------------------------------------------------------------------

interface ThinkBlockProps {
  content: string;
  isStreaming?: boolean;
}

function ThinkBlock({ content, isStreaming }: ThinkBlockProps) {
  const [isOpen, setIsOpen] = useState(isStreaming);

  // Auto-expand when streaming starts
  useEffect(() => {
    if (isStreaming) setIsOpen(true);
  }, [isStreaming]);

  return (
    <div className={`ai-think-block ${isOpen ? 'ai-think-block--open' : ''} ${isStreaming ? 'ai-think-block--streaming' : ''}`}>
      <button className="ai-think-block__header" onClick={() => setIsOpen(!isOpen)}>
        <BrainIcon />
        <span>{isStreaming ? 'Thinking...' : 'Thought Process'}</span>
        {isStreaming ? (
          <span className="ai-think-block__dot" />
        ) : (
          <ChevronIcon isOpen={!!isOpen} />
        )}
      </button>
      
      {isOpen && (
        <div className="ai-think-block__content">
          {content}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------

export function AIPanel({ isVisible }: { isVisible: boolean }) {
  const { toggleAIPanel, panelDimensions, setPanelDimensions } = useAppStore();
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // Resizing state
  const panelRef = useRef<HTMLElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const panelWidth = panelDimensions.aiPanelWidth || 360;

  // CopilotKit Hook
  const { messages, sendMessage, stopGeneration, isLoading } = useCopilotChatHeadless_c();

  // Register frontend tools with CopilotKit
  useIDETools();

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle Resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!panelRef.current) return;
      const parentRect = panelRef.current.parentElement?.getBoundingClientRect();
      if (!parentRect) return;
      const newWidth = parentRect.right - e.clientX;
      const clampedWidth = Math.max(320, Math.min(800, newWidth));
      setPanelDimensions({ aiPanelWidth: clampedWidth });
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, setPanelDimensions]);

  // Message Sending
  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    sendMessage({
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
    });
    setInputValue('');
    
    // Reset height
    if (textAreaRef.current) {
      textAreaRef.current.style.height = '48px';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Escape to stop generation
    if (e.key === 'Escape' && isLoading) {
      e.preventDefault();
      stopGeneration();
    }
  };
  
  // Auto-resize textarea with debouncing
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Debounce resize calculation
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      const newHeight = Math.min(textAreaRef.current.scrollHeight, 200);
      textAreaRef.current.style.height = `${newHeight}px`;
    }
  };

  // Toggle message expansion
  const toggleMessageExpanded = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Filter valid messages
  const displayMessages = useMemo(() => 
    messages.filter((msg) => {
      // Always show user messages that have content
      if (msg.role === 'user') return !!getMessageContent(msg);
      
      // For assistant messages, show if they have content OR tool calls OR generative UI
      if (msg.role === 'assistant') {
        const hasContent = !!getMessageContent(msg);
        // @ts-ignore - tool_calls might be present
        const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
        // @ts-ignore - generativeUI might be attached by CopilotKit
        const hasGenerativeUI = !!msg.generativeUI;
        
        return hasContent || hasToolCalls || hasGenerativeUI;
      }
      
      return false;
    }),
  [messages]);
  return (
    <aside 
      ref={panelRef}
      className={`ai-panel ${!isVisible ? 'ai-panel--hidden' : ''} ${isResizing ? 'ai-panel--resizing' : ''}`}
      style={{ width: isVisible ? panelWidth : 0 }}
    >
      <div className="ai-panel__resizer" onMouseDown={handleResizeStart} />

      {/* Header */}
      <div className="ai-panel__header">
        <div className="ai-panel__title">
          <div className="ai-panel__header-icon">
            <SparklesIcon />
          </div>
          <span>CodeSurf AI</span>
        </div>
        <div className="ai-panel__actions">
          <button className="ai-panel__action" onClick={toggleAIPanel} title="Close Panel">
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-panel__content">
        {displayMessages.length === 0 ? (
          <div className="ai-panel__welcome">
            <div className="ai-panel__welcome-icon">
              <SparklesIcon />
            </div>
            <h3>How can I help you?</h3>
            <p>I can explain code, refactor functions, find bugs, or write tests.</p>
            <div className="ai-panel__suggestions">
              <button onClick={() => setInputValue("Explain the selected code")}>Explain selected code</button>
              <button onClick={() => setInputValue("Refactor this for performance")}>Refactor for performance</button>
              <button onClick={() => setInputValue("Find potential bugs here")}>Find potential bugs</button>
            </div>
          </div>
        ) : (
          <div className="ai-panel__messages">
            {displayMessages.map((msg) => {
              const rawContent = getMessageContent(msg);
              const { thinkContent, mainContent, isThinking } = parseThinkTags(rawContent);
              const isUser = msg.role === 'user';
              const isExpanded = expandedMessages.has(msg.id);
              
              // Truncate long user messages
              const shouldTruncate = isUser && mainContent.length > 150;
              const displayContent = shouldTruncate && !isExpanded 
                ? mainContent.slice(0, 150) + '...' 
                : mainContent;
              
              return (
                <div key={msg.id} className={`ai-message ${isUser ? 'ai-message--user' : 'ai-message--assistant'}`}>
                  {/* Avatar */}
                  <div className="ai-message__avatar">
                    {isUser ? (
                      user?.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="User" />
                      ) : (
                        <span>{user?.user_metadata?.full_name?.charAt(0) || 'U'}</span>
                      )
                    ) : (
                      <SparklesIcon />
                    )}
                  </div>
                  
                  <div className="ai-message__content">
                    <div className="ai-message__bubble">
                      {/* Think Block for Assistant */}
                      {!isUser && thinkContent && (
                        <ThinkBlock content={thinkContent} isStreaming={isThinking} />
                      )}
                      
                      {/* Main Content */}
                      {displayContent && (
                        <div className="ai-markdown">
                          {isUser ? (
                            <div className="ai-message__text">{displayContent}</div>
                          ) : (
                            <ReactMarkdown
                              components={{
                                  code(props) {
                                      const { children, className, ...rest } = props;
                                      const isInline = !className;
                                      
                                      if (isInline) {
                                        return <code className="ai-code-inline" {...rest}>{children}</code>;
                                      }
                                      
                                      // Extract language from className (e.g., "language-typescript")
                                      const language = className?.replace('language-', '') || 'text';
                                      const codeString = String(children).replace(/\n$/, '');
                                      
                                      return (
                                        <div className="ai-code-block" data-language={language}>
                                          <CopyButton code={codeString} />
                                          <SyntaxHighlighter
                                            language={language}
                                            style={atomOneDark}
                                            customStyle={{
                                              margin: 0,
                                              padding: '12px',
                                              background: '#16161e',
                                              fontSize: '12px',
                                              borderRadius: '0',
                                            }}
                                            codeTagProps={{
                                              style: {
                                                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                                              }
                                            }}
                                            PreTag="div"
                                          >
                                            {codeString}
                                          </SyntaxHighlighter>
                                        </div>
                                      );
                                  }
                              }}
                            >
                              {displayContent}
                            </ReactMarkdown>
                          )}
                        </div>
                      )}
                      
                      {/* Show More/Less Button */}
                      {shouldTruncate && (
                        <button 
                          className="ai-message__expand-btn"
                          onClick={() => toggleMessageExpanded(msg.id)}
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                      )}
                      
                      {/* Generative UI */}
                      {isAIMessage(msg) && msg.generativeUI?.()}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Loading Indicator - Clean animated dots */}
            {isLoading && (
              <div className="ai-message ai-message--assistant">
                <div className="ai-message__content">
                   <div className="ai-message__bubble">
                     <div style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '8px',
                       color: '#7aa2f7',
                       fontSize: '14px',
                       padding: '8px 0',
                     }}>
                       <div style={{
                         display: 'flex',
                         gap: '4px',
                       }}>
                         <span style={{
                           width: '6px',
                           height: '6px',
                           borderRadius: '50%',
                           backgroundColor: '#7aa2f7',
                           animation: 'pulse 1.4s ease-in-out infinite',
                         }} />
                         <span style={{
                           width: '6px',
                           height: '6px',
                           borderRadius: '50%',
                           backgroundColor: '#7aa2f7',
                           animation: 'pulse 1.4s ease-in-out 0.2s infinite',
                         }} />
                         <span style={{
                           width: '6px',
                           height: '6px',
                           borderRadius: '50%',
                           backgroundColor: '#7aa2f7',
                           animation: 'pulse 1.4s ease-in-out 0.4s infinite',
                         }} />
                       </div>
                       <span style={{ opacity: 0.7 }}>Thinking</span>
                     </div>
                   </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Two-Row Layout (Reference Design) */}
      <div className="ai-panel__input-area">
        <form onSubmit={handleSendMessage} className="ai-panel__form">
          <div className="ai-panel__input-container">
            {/* Row 1: Textarea */}
            <textarea
              ref={textAreaRef}
              className="ai-panel__textarea"
              placeholder="Ask AI anything..."
              value={inputValue}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
              aria-label="Chat message input"
              spellCheck="true"
            />
            
            {/* Row 2: Actions */}
            <div className="ai-panel__actions-row">
              {/* Left Actions */}
              <div className="ai-panel__input-left">
                <button 
                  type="button" 
                  className="ai-panel__input-action"
                  title="Attach file"
                  aria-label="Attach file"
                >
                  <PlusIcon />
                </button>
                
                <button 
                  type="button" 
                  className="ai-panel__input-action"
                  title="Search"
                  aria-label="Search"
                >
                  <SearchIcon />
                </button>
                
                <button 
                  type="button" 
                  className="ai-panel__input-action"
                  title="Voice input"
                  aria-label="Voice input"
                >
                  <MicIcon />
                </button>
              </div>
              
              {/* Right Actions */}
              <div className="ai-panel__input-right">
                <div className="ai-panel__model-selector">
                  <SparklesIcon />
                  <span>CodeSurf AI</span>
                  <span className="ai-panel__beta-badge">Beta</span>
                </div>
                
                <button 
                  type="button" 
                  className="ai-panel__input-action"
                  title="More options"
                  aria-label="More options"
                >
                  <MoreIcon />
                </button>
                
                {isLoading ? (
                  <button 
                    type="button"
                    className="ai-panel__send-btn ai-panel__stop-btn"
                    onClick={stopGeneration}
                    title="Stop generating (Esc)"
                    aria-label="Stop generation"
                  >
                    <StopIcon />
                  </button>
                ) : (
                  <button 
                    type="submit" 
                    className="ai-panel__send-btn"
                    disabled={!inputValue.trim()}
                    title="Send message (Enter)"
                    aria-label="Send message"
                  >
                    <SendIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </aside>
  );
}
