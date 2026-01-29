# CodeSurf Agent Tools Architecture

> **Created:** 2026-01-12  
> **Status:** 🔴 PLANNING PHASE  
> **Goal:** Design a professional-grade AI agent tool system that can handle real-world codebases

---

## 📋 Table of Contents

1. [Core Questions We Must Answer](#1-core-questions-we-must-answer)
2. [The Senior Developer Mindset](#2-the-senior-developer-mindset)
3. [Scale Considerations](#3-scale-considerations)
4. [Tool Categories](#4-tool-categories)
5. [Code Understanding Strategy](#5-code-understanding-strategy)
6. [Efficient Editing (Patches)](#6-efficient-editing-patches)
7. [Performance Architecture](#7-performance-architecture)
8. [Language Agnostic Design](#8-language-agnostic-design)
9. **[CopilotKit Context Hooks](#9-copilotkit-context-hooks)** ⭐ NEW
10. [Implementation Phases](#10-implementation-phases)

---

## 1. Core Questions We Must Answer

### 🤔 Before Writing Any Code

| Question | Why It Matters |
|----------|----------------|
| **How does the agent handle 100k+ file codebases?** | Can't load everything into memory/context |
| **How does it find the right file to edit?** | Wrong file = wrong edit = bugs |
| **How does it understand file relationships?** | Changing A might break B, C, D |
| **How does it apply surgical edits?** | Full file replacement is wasteful and error-prone |
| **How do we keep the UI smooth?** | Heavy operations must not block the WebView |
| **How do we handle different languages?** | Python ≠ TypeScript ≠ Rust ≠ Go |
| **How do we handle databases/configs?** | SQL, JSON, YAML, TOML all need different handling |

---

## 2. The Senior Developer Mindset

A senior developer with 30+ years would approach this differently than a junior:

### ❌ Junior Approach (What NOT to do)
```
User: "Add error handling to the login function"

Junior AI:
1. Read entire codebase into context ❌ (won't fit)
2. Find login function by searching "login" ❌ (too many matches)
3. Replace entire file content ❌ (overwrites other code)
4. Hope it works ❌ (no validation)
```

### ✅ Senior Approach (What TO do)
```
User: "Add error handling to the login function"

Senior AI:
1. Ask: "Which login function?" (auth/login.ts? api/login.ts?)
2. Use LSP to find the exact symbol definition
3. Read only that function + its dependencies
4. Generate a PATCH (not full file replacement)
5. Validate: Does it compile? Do tests pass?
6. Show diff to user before applying
```

### Key Principles

1. **Ask Before Assuming** - Ambiguity = clarification, not guessing
2. **Surgical Precision** - Edit exactly what's needed, nothing more
3. **Understand Context** - Know what depends on what
4. **Validate Before Committing** - Compile, lint, test
5. **Show, Don't Just Do** - User should see diffs before applying

---

## 3. Scale Considerations

### The Reality of Real Codebases

| Codebase Size | Files | What Breaks |
|---------------|-------|-------------|
| Small (hobby) | ~100 | Nothing |
| Medium (startup) | ~1,000 | Naive search |
| Large (enterprise) | ~10,000 | Memory limits |
| Huge (monorepo) | ~100,000+ | Everything |

### Strategies for Scale

#### A. **Never Load Everything**
```
❌ Bad:  Read all files → Send to AI → Hope for best
✅ Good: Index once → Search index → Read only needed files
```

#### B. **Index, Don't Scan**
```rust
// Rust backend creates persistent index
struct CodeIndex {
    files: HashMap<PathBuf, FileMetadata>,
    symbols: HashMap<String, Vec<Location>>,
    imports: HashMap<PathBuf, Vec<Import>>,
    last_updated: DateTime,
}
```

#### C. **Streaming Results**
```
❌ Bad:  Wait for all results → Show to AI
✅ Good: Stream results as found → AI can start early
```

#### D. **Smart Caching**
```
- File content hashes (skip unchanged files)
- Symbol table caching (don't re-parse)
- LRU cache for recently accessed files
```

---

## 4. Tool Categories

### Category A: **Navigation & Discovery**

| Tool | Purpose | Implementation |
|------|---------|----------------|
| `find_files` | Find files by pattern (glob, regex) | Rust: `fd` or `walkdir` |
| `search_code` | Search content in files | Rust: `ripgrep` integration |
| `find_symbol` | Find function/class by name | LSP: `workspace/symbol` |
| `find_references` | Find all usages of a symbol | LSP: `textDocument/references` |
| `find_definition` | Go to definition | LSP: `textDocument/definition` |
| `get_file_tree` | Get directory structure | Rust: filtered `walkdir` |

### Category B: **Code Understanding**

| Tool | Purpose | Implementation |
|------|---------|----------------|
| `read_file` | Read file contents | Rust: `fs::read_to_string` |
| `read_file_range` | Read specific lines | Rust: efficient line reader |
| `get_file_outline` | Get functions/classes in file | LSP: `textDocument/documentSymbol` |
| `get_imports` | Get file dependencies | Tree-sitter or LSP |
| `get_dependents` | Find what imports this file | Index lookup |
| `get_diagnostics` | Get errors/warnings | LSP: `textDocument/diagnostic` |

### Category C: **Code Modification**

| Tool | Purpose | Implementation |
|------|---------|----------------|
| `create_file` | Create new file | Rust: `fs::write` |
| `edit_file` | Apply surgical edits | **See Section 6** |
| `delete_file` | Delete file | Rust: `fs::remove_file` |
| `rename_file` | Rename/move file | Rust: `fs::rename` + LSP refactor |
| `apply_patch` | Apply unified diff | Rust: `patch` crate |

### Category D: **Execution & Validation**

| Tool | Purpose | Implementation |
|------|---------|----------------|
| `run_command` | Run terminal command | Rust: PTY integration |
| `run_linter` | Run linter on file | Terminal + parse output |
| `run_tests` | Run test suite | Terminal + parse output |
| `build_project` | Build/compile | Terminal + parse output |

### Category E: **User Interaction**

| Tool | Purpose | Implementation |
|------|---------|----------------|
| `show_diff` | Show proposed changes | UI: Diff viewer component |
| `ask_user` | Ask for clarification | UI: Input modal |
| `show_options` | Present choices | UI: Selection dialog |
| `notify` | Show notification | UI: Toast notification |

---

## 5. Code Understanding Strategy

### The Relationship Problem

When the agent edits `auth/login.ts`, it might break:
- `pages/login.tsx` (imports login function)
- `tests/auth.test.ts` (tests login function)
- `api/routes.ts` (uses login handler)

### Solution: Dependency Graph

```
┌────────────────────────────────────────────────────────────┐
│                    CODE GRAPH INDEX                         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  auth/login.ts                                              │
│  ├── exports: login(), validateCredentials()                │
│  ├── imports: ./hash, ../db/users, ../types                 │
│  └── imported_by:                                           │
│      ├── pages/login.tsx (uses: login)                      │
│      ├── api/auth.ts (uses: login, validateCredentials)     │
│      └── tests/auth.test.ts (uses: login)                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Implementation Options

#### Option A: **Build-Time Index (Recommended)**
```rust
// On project open, build index in background
async fn build_code_index(project_path: &Path) -> CodeIndex {
    // 1. Walk all source files
    // 2. Parse imports/exports using tree-sitter
    // 3. Build dependency graph
    // 4. Store in memory + optional disk cache
}

// On file change, update incrementally
async fn update_index(path: &Path, event: FileEvent) {
    // Only re-parse changed file
    // Update edges in graph
}
```

#### Option B: **LSP-Based (Simpler, Less Control)**
```typescript
// Use LSP for on-demand lookups
const references = await lsp.findReferences(symbol);
const definition = await lsp.goToDefinition(symbol);
```

#### Option C: **Hybrid (Best of Both)**
```
- Build basic import graph on open (fast, simple)
- Use LSP for precise symbol resolution (accurate)
- Cache LSP results for repeat queries (fast)
```

---

## 6. Efficient Editing (Patches)

### The Problem

```
❌ Replace entire file

File: 500 lines
Agent output: 500 lines (mostly unchanged)
Token cost: 500 lines of tokens
Error risk: High (might change wrong things)
```

### The Solution: Surgical Patches

```
✅ Patch format

File: 500 lines
Agent output: 20 lines of changes
Token cost: 20 lines of tokens
Error risk: Low (explicit changes only)
```

### Patch Formats to Support

#### Format 1: **Line-Based Replacement**
```json
{
  "file": "src/auth/login.ts",
  "edits": [
    {
      "startLine": 45,
      "endLine": 52,
      "newContent": "async function login(user, pass) {\n  try {\n    // new code\n  } catch (e) {\n    throw new AuthError(e);\n  }\n}"
    }
  ]
}
```

#### Format 2: **Search-Replace**
```json
{
  "file": "src/auth/login.ts",
  "edits": [
    {
      "find": "function login(user, pass) {",
      "replace": "async function login(user, pass) {",
      "occurrence": "first"  // or "all"
    }
  ]
}
```

#### Format 3: **Unified Diff**
```diff
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -45,3 +45,7 @@
-function login(user, pass) {
+async function login(user, pass) {
+  try {
     // existing code
+  } catch (e) {
+    throw new AuthError(e);
+  }
 }
```

### Multi-Edit Tool

```typescript
// Agent can batch multiple edits
useCopilotAction({
  name: "edit_file",
  parameters: [
    { name: "path", type: "string" },
    {
      name: "edits",
      type: "array",
      items: {
        type: "object",
        properties: {
          startLine: { type: "number" },
          endLine: { type: "number" },
          content: { type: "string" }
        }
      }
    }
  ],
  handler: async ({ path, edits }) => {
    // Apply all edits in one operation
    // Sort by line number (descending) to avoid offset issues
    // Validate line ranges before applying
  }
});
```

### Validation Before Apply

```
1. Parse file before edit
2. Apply edit
3. Parse file after edit
4. If parse fails → Reject edit, show error
5. Run LSP diagnostics
6. If new errors → Warn user, ask for confirmation
```

---

## 7. Performance Architecture

### Tauri's Advantage: Rust Backend

```
┌─────────────────────────────────────────────────────────────┐
│                     TAURI ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────┐         ┌──────────────────────────┐ │
│   │    FRONTEND      │         │      RUST BACKEND        │ │
│   │    (WebView)     │         │                          │ │
│   │                  │  IPC    │  ┌────────────────────┐  │ │
│   │  React UI        │◄───────►│  │  Heavy Operations  │  │ │
│   │  Stays smooth    │         │  │                    │  │ │
│   │  60fps           │         │  │  - File indexing   │  │ │
│   │                  │         │  │  - Ripgrep search  │  │ │
│   │  Only renders:   │         │  │  - Tree-sitter     │  │ │
│   │  - Results       │         │  │  - Git operations  │  │ │
│   │  - Diffs         │         │  │  - Large file ops  │  │ │
│   │  - UI state      │         │  │                    │  │ │
│   │                  │         │  └────────────────────┘  │ │
│   └──────────────────┘         └──────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Performance Rules

#### Rule 1: **Never Block the WebView**
```rust
// BAD: Synchronous heavy operation
#[tauri::command]
fn search_files(pattern: &str) -> Vec<Match> {
    // Blocks UI until complete ❌
    ripgrep_search(pattern)
}

// GOOD: Async with streaming
#[tauri::command]
async fn search_files(
    pattern: &str,
    app: AppHandle
) -> Result<(), Error> {
    // Stream results as found ✅
    for result in ripgrep_search_iter(pattern) {
        app.emit_all("search_result", result)?;
    }
}
```

#### Rule 2: **Limit Data Transfer**
```
❌ Bad:  Send entire file content to frontend for display
✅ Good: Send file path, let Monaco load it directly
```

#### Rule 3: **Debounce User Input**
```typescript
// Debounce search input (500ms)
const debouncedSearch = useMemo(
    () => debounce(searchFiles, 500),
    []
);
```

#### Rule 4: **Virtualize Long Lists**
```typescript
// Don't render 10,000 search results at once
<VirtualList
    items={searchResults}
    itemHeight={24}
    renderItem={(result) => <SearchResult {...result} />}
/>
```

---

## 8. Language Agnostic Design

### The Challenge

| Language | File Extensions | Comment Syntax | Import Syntax |
|----------|-----------------|----------------|---------------|
| TypeScript | .ts, .tsx | // /* */ | import X from 'y' |
| Python | .py | # """ """ | import x / from x import y |
| Rust | .rs | // /* */ | use x::y; mod x; |
| Go | .go | // /* */ | import "x" |
| Java | .java | // /* */ | import x.y.z; |

### Solution: Abstract Language Operations

```typescript
interface LanguageProvider {
    id: string;
    extensions: string[];
    
    // Parsing
    parseImports(content: string): Import[];
    parseExports(content: string): Export[];
    parseSymbols(content: string): Symbol[];
    
    // LSP
    getServerCommand(): string[];
    getServerConfig(): object;
    
    // Formatting
    getFormatter(): string | null;
    getLinter(): string | null;
}
```

### Tree-sitter for Universal Parsing

```rust
// Tree-sitter grammars available for most languages
fn get_imports(file: &Path, content: &str) -> Vec<Import> {
    let language = detect_language(file);
    let parser = tree_sitter::Parser::new();
    parser.set_language(get_grammar(language));
    
    let tree = parser.parse(content, None)?;
    extract_imports(tree, language)
}
```

### Language Registry

```typescript
// src/languages/registry.ts
const LANGUAGE_REGISTRY: Map<string, LanguageProvider> = new Map();

LANGUAGE_REGISTRY.set('typescript', new TypeScriptProvider());
LANGUAGE_REGISTRY.set('python', new PythonProvider());
LANGUAGE_REGISTRY.set('rust', new RustProvider());
// ... etc

export function getLanguageForFile(path: string): LanguageProvider {
    const ext = extname(path);
    return [...LANGUAGE_REGISTRY.values()]
        .find(lang => lang.extensions.includes(ext));
}
```

---

## 9. CopilotKit Context Hooks

> **Key Insight:** Tools let the agent *do* things. Context hooks let the agent *know* things.

### The Problem: Blind Agent

Without context, the agent is flying blind:

```
User: "Fix the error on line 45"

Blind Agent:
- What file? 🤷
- What's on line 45? 🤷
- What's the error message? 🤷
- What other files are open? 🤷
```

### The Solution: useCopilotReadable

CopilotKit provides hooks to share IDE state with the agent:

```typescript
import { useCopilotReadable } from "@copilotkit/react-core";

// Share current file with agent
useCopilotReadable({
    description: "The currently open file in the editor",
    value: {
        path: currentFile.path,
        language: currentFile.language,
        content: currentFile.content,
        cursorLine: cursor.line,
        cursorColumn: cursor.column,
        selection: selection?.text || null,
    },
});
```

Now the agent knows:
- ✅ Which file is open
- ✅ What language it is
- ✅ Where the cursor is
- ✅ What's selected

---

### Available CopilotKit Hooks

| Hook | Purpose | Direction |
|------|---------|-----------|
| `useCopilotReadable` | Share state with agent | Frontend → Agent |
| `useCopilotAction` | Agent can trigger frontend actions | Agent → Frontend |
| `useCoAgent` | Two-way state sync | Frontend ↔ Agent |
| `useCoAgentAction` | Trigger agent from frontend | Frontend → Agent |

---

### IDE Context Strategy

> **Key Principle:** Only share what the agent can actually USE.

#### Human vs Agent: Different Needs

| Need | Human | Agent | Share? |
|------|-------|-------|--------|
| **Cursor position** | ✅ Visual orientation | ❌ Uses line numbers in tools | **NO** |
| **Selection highlight** | ✅ Shows what's selected | ❌ Pass as tool param if needed | **NO** |
| **Scroll position** | ✅ Shows visible area | ❌ Irrelevant | **NO** |
| **Error messages** | ✅ Visual feedback | ✅ Knows what to fix | **YES** |
| **Project structure** | ✅ Navigate visually | ✅ Know where files are | **YES** |
| **Current file path** | ✅ Tab shows it | ✅ Know context of conversation | **YES** |
| **File language** | ✅ Syntax highlighting | ✅ Know how to write code | **YES** |
| **Terminal output** | ✅ See results | ✅ Know if command worked | **YES** |

#### What Agent ACTUALLY Needs

| Context | Why Agent Needs It | Example Use |
|---------|-------------------|-------------|
| **Current file path** | Know context without asking | "Fix the bug" → knows which file |
| **File language** | Write correct syntax | TypeScript vs Python |
| **LSP errors for current file** | Self-correct, help fix bugs | "Type 'X' not assignable to 'Y'" |
| **Project root path** | Create files in correct location | `src/components/` vs `./components/` |
| **Recent terminal output** | Know if last command worked | "npm install failed" |
| **Open file paths** | Know what user is working on | Multi-file context |

#### What Agent DOESN'T Need

| Context | Why Not | Alternative |
|---------|---------|-------------|
| Cursor position | Agent uses explicit line numbers | Tool: `read_file_range(line=45, count=10)` |
| Selection text | Only useful if user references it | User: "edit THIS" → pass selection as tool param |
| Scroll position | Agent doesn't "see" the editor | Irrelevant |
| Every keystroke | Wastes tokens, no value | Debounce heavy changes |
| Full file content of all open files | Too much data | Summarize or fetch on demand |
| UI state (panel open, etc.) | Agent can't interact with UI | Irrelevant |

---

### Minimal Context Implementation (v1)

Only share what the agent can actually use:

```typescript
// src/components/AI/IDEContext.tsx

import { useCopilotReadable } from "@copilotkit/react-core";
import { useAppStore } from "../../stores/appStore";

export function IDEContextProvider() {
    const { 
        projectPath,
        currentFile, 
        openFiles,
    } = useAppStore();
    
    const lspDiagnostics = useLSPDiagnostics();
    const terminalOutput = useTerminalOutput();

    // ===== 1. Project Context (Essential) =====
    useCopilotReadable({
        description: "The root path of the currently open project",
        value: projectPath || null,
    });

    // ===== 2. Current File (Essential) =====
    useCopilotReadable({
        description: "The file currently open in the editor",
        value: currentFile ? {
            path: currentFile.path,
            language: currentFile.language,
            // NOT sending content - agent can read_file if needed
        } : null,
    });

    // ===== 3. Open Files List (Helpful) =====
    useCopilotReadable({
        description: "List of files currently open in editor tabs",
        value: openFiles.map(f => f.path), // Just paths, not content
    });

    // ===== 4. Errors in Current File (Essential) =====
    useCopilotReadable({
        description: "Compilation errors and warnings in the current file",
        value: currentFile ? 
            lspDiagnostics
                .filter(d => d.path === currentFile.path)
                .slice(0, 10) // Limit to first 10
                .map(d => ({
                    line: d.line,
                    severity: d.severity,
                    message: d.message,
                }))
            : [],
    });

    // ===== 5. Recent Terminal Output (Helpful) =====
    useCopilotReadable({
        description: "Last 20 lines of terminal output",
        value: terminalOutput.slice(-20).join('\n'),
    });

    return null; // Context-only component
}
```

---

### When to Share vs When to Fetch

| Data | Share via Context | Fetch via Tool | Why |
|------|-------------------|----------------|-----|
| Current file **path** | ✅ | | Small, always relevant |
| Current file **content** | | ✅ `read_file` | Could be large |
| Error messages | ✅ | | Small, agent needs to know |
| All project files | | ✅ `find_files` | Too many files |
| File dependencies | | ✅ `get_imports` | On-demand when needed |

**Rule of Thumb:**
- **Context**: Small, always-relevant metadata
- **Tools**: Large data, on-demand when needed
```

---

### useCoAgent: Two-Way Sync (Advanced)

> **Note:** This is an advanced feature for later phases. Start with `useCopilotReadable` for v1.

`useCoAgent` enables the **agent to update frontend state**, not just read it:

```typescript
const { state, setState } = useCoAgent<AgentState>({
    name: "codesurf_agent",
    initialState: { currentTask: null },
});

// Agent can set state.currentTask = "Fixing type errors"
// Frontend automatically reflects this
{state.currentTask && <p>Agent is: {state.currentTask}</p>}
```

**Use cases for later:**
- Show agent's current task/progress
- Queue of pending edits for user approval
- Agent setting preferences based on project analysis

---

### Best Practices

#### ✅ DO

1. **Share metadata, not content**
   ```typescript
   // Good: Agent can use read_file if it needs content
   value: { path: file.path, language: file.language }
   ```

2. **Include actionable information**
   ```typescript
   // Good: Agent knows exactly where the error is
   value: { line: 45, message: "Type error", severity: "error" }
   ```

3. **Write helpful descriptions**
   ```typescript
   description: "Compilation errors in the current file that may need fixing"
   ```

#### ❌ DON'T

1. **Don't send what agent can fetch**
   ```typescript
   // Bad: Agent has read_file tool for this
   value: { path: file.path, content: file.fullContent }
   ```

2. **Don't share UI-only state**
   ```typescript
   // Bad: Agent can't do anything with this
   value: { scrollPosition: 250, sidebarOpen: true }
   ```

---

### Context + Tools = Smart Agent

**Minimal Example Flow:**

```
1. useCopilotReadable shares:
   - projectPath: "/Users/dev/my-app"
   - currentFile: { path: "src/auth/login.ts", language: "typescript" }
   - errors: [{ line: 45, message: "Type 'string' not assignable to 'number'" }]

2. User: "Fix the type error"

3. Agent knows:
   - File to edit: src/auth/login.ts
   - Line with error: 45
   - What's wrong: type mismatch

4. Agent uses tools:
   - read_file("src/auth/login.ts") → gets content
   - edit_file("src/auth/login.ts", line=45, ...) → fixes it

5. No guessing, no asking "which file?"
```

**The Pattern:**
- **Context** = Metadata the agent needs to understand the situation
- **Tools** = Actions the agent takes based on that understanding

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1-2)
> Get basic tools working end-to-end

1. **Basic File Operations**
   - `create_file` (with real Tauri command)
   - `read_file` (efficient, with line range support)
   - `delete_file`

2. **Basic Search**
   - `find_files` (glob patterns)
   - `search_code` (ripgrep integration)

3. **Basic Editing**
   - `edit_file` (line-based replacement)
   - Diff preview before apply

### Phase 2: Intelligence (Week 3-4)
> Add code understanding capabilities

1. **Symbol Navigation**
   - `find_symbol` (LSP workspace/symbol)
   - `find_definition` (LSP definition)
   - `find_references` (LSP references)

2. **File Outline**
   - `get_file_outline` (LSP documentSymbol)
   - Function/class list for navigation

3. **Diagnostics**
   - `get_diagnostics` (LSP errors/warnings)
   - Surface to agent for self-correction

### Phase 3: Scale (Week 5-6)
> Handle large codebases

1. **Code Index**
   - Build import graph on project open
   - Incremental updates on file change
   - Disk caching for fast reload

2. **Dependency Awareness**
   - `get_imports` (what this file depends on)
   - `get_dependents` (what depends on this file)

3. **Smart Context**
   - Automatically include related files in agent context
   - Summarize large files before including

### Phase 4: Advanced Editing (Week 7-8)
> Surgical, validated edits

1. **Patch Formats**
   - Unified diff support
   - Search-replace with regex
   - Multi-location edits

2. **Validation**
   - Parse before/after
   - LSP diagnostic check
   - Optional test run

3. **Undo/Redo**
   - Track all agent changes
   - One-click undo for agent edits
   - Git integration for safety

### Phase 5: Execution (Week 9-10)
> Terminal and build integration

1. **Terminal Tools**
   - `run_command` (with timeout)
   - `run_in_background` (long processes)
   - Output capture and parsing

2. **Build Integration**
   - `build_project` (detect build system)
   - `run_tests` (parse test output)
   - `run_linter` (parse lint output)

---

## 🎯 Success Criteria

### What "Done" Looks Like

- [ ] Agent can navigate 100k+ file codebase without lag
- [ ] Agent finds correct file 95%+ of the time
- [ ] Agent understands import relationships
- [ ] Edits are surgical (patches, not full replacement)
- [ ] All edits are validated before applying
- [ ] UI stays 60fps during heavy operations
- [ ] Works with TypeScript, Python, Rust, Go (at minimum)

### What We Avoid

- [ ] No full file replacements for small changes
- [ ] No loading entire codebase into memory
- [ ] No blocking UI for heavy operations
- [ ] No hardcoded language-specific logic
- [ ] No guessing when unsure (ask user)

---

## 📝 Next Steps

1. **Review this document** - Is anything missing? Priorities correct?
2. **Define v1 tool set** - What's the minimal viable tool set?
3. **Audit existing Tauri commands** - What do we already have?
4. **Design tool API** - Exact parameters and return types
5. **Start Phase 1** - Implement foundation tools

---

## 📚 References

- [Deep Agents Docs](https://github.com/langchain-ai/deepagents)
- [AG-UI Protocol](https://docs.ag-ui.com)
- [CopilotKit useCopilotAction](https://docs.copilotkit.ai)
- [Tree-sitter](https://tree-sitter.github.io/tree-sitter/)
- [Ripgrep](https://github.com/BurntSushi/ripgrep)
- [Tauri Commands](https://tauri.app/develop/calling-rust/)

---

*Document created: 2026-01-12 | Last updated: 2026-01-12*
