# CodeSurf - Tauri Lightweight IDE

A minimalist, high-performance code editor built with **Tauri + React + TypeScript**, featuring VS Code-like functionality with a Tokyo Night-inspired aesthetic.

---

## � CRITIOCAL CONSTRAINTS (DO NOT MODIFY)

> ⚠️ **READ THIS FIRST ON EVERY SESSION** - These rules are permanent and must never be changed unless explicitly requested by the user.

### 1. Documentation Source of Truth
- **ALWAYS use Context7 MCP tools** (`mcp_context7_resolve_library_id` + `mcp_context7_query_docs`) as the ONLY source of truth for library documentation
- Never rely on training data for package APIs - always query Context7 first
- This ensures we use the latest, accurate documentation

### 2. Code Quality Standards
- **Clean Code**: Every function should do one thing well
- **Reusable**: Extract common patterns into hooks/utilities
- **Type-Safe**: Full TypeScript coverage, no `any` unless absolutely necessary
- **Secure**: Validate all inputs, sanitize file paths, no eval(), no unsafe operations
- **No Vulnerabilities**: Always consider security implications of file system and terminal access

### 3. Security Requirements
- Sanitize all file paths before operations
- Validate user inputs on both frontend and Rust backend
- No arbitrary code execution from user input
- Terminal commands should be sandboxed to project directory
- LSP communication must be validated

---

## 🎯 PROJECT VISION (DO NOT MODIFY)

> ⚠️ **This defines what CodeSurf IS and IS NOT** - Do not deviate from this vision.

### What CodeSurf IS:
- **The first AI-Native IDE** - Built from the ground up for AI-assisted development
- **For Vibe Coders** - Non-technical users who want to code through conversation
- **Lightweight & Fast** - No bloat, no unnecessary features
- **Agent-First Architecture** - The AI agent can reach and control ANY part of the IDE

### What CodeSurf IS NOT:
- ❌ NOT a VS Code clone - We don't need all VS Code features
- ❌ NOT for power users who want 500 keyboard shortcuts
- ❌ NOT an extension platform - Batteries included, zero config

### The Future Vision:
```
┌─────────────────────────────────────────────────────────────────┐
│  USER: "Create a login page with email and password"           │
│                           ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   LANGGRAPH AGENT                        │   │
│  │  • Understands intent                                    │   │
│  │  • Creates files                                         │   │
│  │  • Writes code                                           │   │
│  │  • Runs terminal commands                                │   │
│  │  • Fixes errors automatically                            │   │
│  │  • Asks for clarification when needed                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                     │
│  RESULT: Working login page, tested, committed to git          │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Capabilities (Planned):
- **File System**: Create, read, update, delete any file
- **Editor**: Navigate to files, highlight code, show diffs
- **Terminal**: Run commands, install packages, start servers
- **LSP**: Get diagnostics, fix errors, refactor code
- **UI**: Show progress, ask questions, display results
- **Git**: Commit, branch, push (all automated)

### Why This Matters:
Traditional IDEs are built for developers who know how to code. CodeSurf is built for anyone who knows what they want to build. The AI agent bridges the gap between intent and implementation.

---

## 🔔 SESSION NOTES

> **Last Updated:** 2026-01-11 @ 23:29
> **Status:** AI Panel UI/UX Complete ✅ | Runtime Server Phase 4 In Progress 🚀

### What Was Done This Session (2026-01-11 Evening)

1. **AI Panel UI/UX Complete Overhaul** ✅
   - Implemented fully custom headless chat UI using `useCopilotChatHeadless_c` with `publicLicenseKey`
   - **Resizable Panel**: Drag-to-resize from left edge (320px-800px range)
   - **Toggle Controls**:
     - Added AI toggle icon in TitleBar (right-side actions)
     - Added "AI Assistant" menu item in View menu (`Ctrl+Shift+I`)
     - Icon highlights when panel is open
   
2. **Streaming Think Block Implementation** ✅
   - Parses `<think>...</think>` tags from AI responses
   - **Progressive Rendering**: Detects partial/unclosed tags during streaming
   - **Collapsible UI**: Click header to expand/collapse reasoning
   - **Visual Indicators**:
     - Pulsing purple dot while streaming
     - Blinking cursor at content end
     - Auto-expands during active streaming
   - **Scrollable Content**: Max height 200px with custom scrollbar

3. **Smart Message Truncation** ✅
   - User messages over 150 characters auto-truncate
   - "Show more/less" button for expansion
   - Think blocks have proper scroll areas instead of expanding infinitely
   - Prevents overwhelming UI with long messages

4. **Perplexity-Inspired Design** ✅
   - **User Messages**: Large (24px), bold heading style, pure white
   - **AI Messages**: Standard reading size (14px), softer gray
   - **Minimalist Aesthetic**:
     - Removed all message bubbles/backgrounds
     - Removed user/AI name labels
     - Removed avatar icons
     - Left-aligned document flow (Q&A article style)
   - **Typography Hierarchy**: Clear distinction through size/weight instead of visual artifacts

5. **State Management** ✅
   - Added `aiPanelWidth` to `panelDimensions` in store
   - Added `setPanelDimensions()` action for resizing
   - Added `isAIPanelVisible` and `toggleAIPanel()` for panel control
   - Message expansion state tracked with `Set<string>`

### Files Created/Modified (AI Panel Session):

**Component Files:**
- `src/components/AI/AIPanel.tsx` - Complete rewrite with headless UI, message truncation, Perplexity design
- `src/components/AI/AIPanel.css` - Minimal clean design, think block styles, resizer, Perplexity typography
- `src/components/Workbench/TitleBar.tsx` - Added AI toggle button and View menu item
- `src/App.tsx` - Added `publicLicenseKey` to CopilotKit provider

**Type & Store Updates:**
- `src/types/index.ts` - Added `aiPanelWidth?` to `PanelDimensions`
- `src/stores/appStore.ts` - Added `setPanelDimensions()`, `isAIPanelVisible`, `toggleAIPanel()`

**Key Features Implemented:**
- ✅ Resizable AI panel with drag handle
- ✅ Think tag streaming detection
- ✅ Message truncation with expand/collapse
- ✅ Perplexity-style typography hierarchy
- ✅ Clean minimal aesthetic (no bubbles/avatars)

---

<details>
<summary>Previous Session (2026-01-11 Afternoon) - NestJS Runtime Setup</summary>

### What Was Done This Session (2026-01-11 Afternoon)
   - Created full NestJS backend in `/backend/` directory
   - Installed dependencies: `@copilotkit/runtime@1.50.1`, `@supabase/supabase-js`, `@nestjs/config`, `class-validator`, `class-transformer`, `@nestjs/passport`, `passport`
   - Configured TypeScript with `moduleResolution: Node16` for subpath exports support
   - Added environment validation with class-validator
   - Loads config from `.env.local` (development)

2. **Supabase Authentication Guard** ✅
   - Created `SupabaseService` for JWT token verification via `auth.getUser()`
   - Created `SupabaseAuthGuard` to protect all `/copilotkit` endpoints
   - Attaches authenticated user to request for downstream use

3. **CopilotKit Runtime Integration** ✅
   - Using `ExperimentalEmptyAdapter` (LLM handled by Python agent)
   - Using `LangGraphHttpAgent` from `@copilotkit/runtime/langgraph`
   - Points to Python agent at `http://localhost:8080/copilotkit`
   - Protected by Supabase JWT authentication

4. **Agent Server Update** ✅
   - Changed default port from 8123 to 8080
   - Renamed agent to `codesurf_agent`

### Files Created (Backend):
- `backend/src/config/env.validation.ts` - Type-safe environment validation
- `backend/src/common/services/supabase.service.ts` - JWT verification service
- `backend/src/common/guards/supabase-auth.guard.ts` - Auth guard for routes
- `backend/src/copilotkit/copilotkit.module.ts` - CopilotKit NestJS module
- `backend/src/copilotkit/copilotkit.service.ts` - Agent config service
- `backend/src/copilotkit/copilotkit.controller.ts` - Main `/copilotkit` endpoint
- `backend/src/copilotkit/dto/copilotkit-request.dto.ts` - Request validation DTO
- `backend/src/app.module.ts` - Updated with ConfigModule + CopilotKitModule
- `backend/src/main.ts` - Enhanced with CORS, validation pipes, port 5000
- `backend/tsconfig.json` - Updated for Node16 module resolution
- `backend/.env.example` - Environment template
- `backend/README.md` - Setup documentation

### Architecture Now:
```
Tauri Frontend (IDE) → NestJS Runtime (port 5000) → Python Agent (port 8080)
                              ↓
                    Supabase JWT Verification
```

</details>

---

<details>
<summary>Previous Session (2026-01-10 Evening)</summary>

### What Was Done (2026-01-10 Evening)

1. **Google OAuth Authentication** ✅
   - Implemented Supabase Google OAuth with PKCE flow
   - Added `tauri-plugin-deep-link` for OAuth callback handling (`codesurf://` scheme)
   - Added `tauri-plugin-single-instance` to ensure callbacks go to running instance
   - Created `src/services/supabase/index.ts` - Supabase client with deep-link OAuth handling
   - Created `src/contexts/AuthContext.tsx` - React context for auth state management
   - Created `src/components/Auth/LoginScreen.tsx` - Premium login screen UI
   - Updated `src/App.tsx` to conditionally render login or main IDE

2. **User Profile Integration** ✅
   - Added user avatar to Activity Bar (bottom section)
   - User dropdown menu with profile info and sign out
   - Personalized welcome screen greeting ("Good evening, {name}!")
   - Time-based greetings (morning/afternoon/evening)

3. **Premium Login Screen Design** ✅
   - Professional dark theme matching GitHub's aesthetic
   - Animated ambient background orbs
   - Subtle grid pattern overlay
   - Proper SVG icons (no emojis)
   - Refined glassmorphism card
   - Error shake animation
   - Version badge (v0.1.0 Alpha)

</details>

<details>
<summary>Previous Session (2026-01-10 Afternoon)</summary>

### What Was Done (2026-01-10 Afternoon)

1. **AI Integration Research & Architecture** ✅
   - Researched CopilotKit, DeepAgents, LangGraph, and AG-UI protocol
   - Designed complete SaaS architecture (Frontend ↔ Runtime ↔ Agent)
   - Planned security model (JWT auth, internal keys, defense in depth)
   - Designed token billing system (pre-flight check, real-time tracking, batch update)
   - Created comprehensive documentation: **`/docs/ai-integration-architecture.md`**

2. **Extension Architecture Audit** ✅
   - Reviewed current LSP implementation status
   - Documented what's implemented vs missing
   - Marked multi-language LSP support as Future TODO

</details>

---

<details>
<summary>Previous Session (2026-01-09)</summary>

### What Was Done (2026-01-09)

1. **Persistent Settings Layer** ✅
   - **Backend (Rust)**:
     - Added `tauri-plugin-store = "2"` to Cargo.toml
     - Registered store plugin in `lib.rs`
     - Added `store:default` permission to capabilities
   - **Frontend (TypeScript)**:
     - Installed `@tauri-apps/plugin-store` package
     - Created `src/services/settings/index.ts` - Full settings service with:
       - **Type-safe schemas** for all settings categories
       - **In-memory caching** for fast reads
       - **Schema versioning** for future migrations
       - **Path sanitization** for security (prevents directory traversal)
       - **Ready for LLM integration** with `LLMSettings` schema (provider, model, baseUrl, etc.)
     - Created `src/services/settings/hooks.ts` - React hooks for components:
       - `useRecentEntries()` - Recent files/folders with add/remove/clear
       - `useEditorSettings()` - Auto-save, font size, tab size, etc.
       - `useLLMSettings()` - Future LLM provider configuration
       - `useUISettings()` - Theme, sidebar position, etc.

2. **Recent Folders in Welcome Screen** ✅
   - Integrated `useRecentEntries` hook into `EditorPanel.tsx`
   - Dynamic "Recent" section shows last 5 opened projects
   - Displays folder name, full path, and relative time ("2h ago", "3d ago")
   - Click to reopen, auto-remove if folder no longer exists
   - Smooth hover animations with Tokyo Night styling

3. **Automatic Tracking** ✅
   - Updated `useFileSystem.ts` to auto-track:
     - Recent folders when `openFolder()` is called
     - Recent files when `openFile()` is called
   - Non-blocking async calls (won't slow down file operations)

4. **Settings Panel UI & Logic** ✅
   - **Settings as Editor Tab**: Implemented `::settings` virtual file to render settings in the main editor area (VS Code style).
   - **Instant Apply**: Editor settings (font size, word wrap, etc.) apply immediately to the Monaco instance without reload.
   - **Access**: `Ctrl+,` or Activity Bar gear icon opens the settings tab.
   - **Virtual File System**: Updated `appStore` to handle `::settings` path specially.

5. **Code Quality** ✅
   - Fixed TypeScript compilation issues
   - Removed unused components (RecentIcon)
   - Prefixed unused parameters with underscore

### 🔧 Key Files Created/Modified

| File | Changes |
|------|---------|
| `src/services/settings/index.ts` | **NEW** - Complete settings service |
| `src/services/settings/hooks.ts` | **NEW** - React hooks for settings |
| `src/hooks/useFileSystem.ts` | Auto-track recent files/folders |
| `src/components/Workbench/EditorPanel.tsx` | Recent folders UI in welcome screen |
| `src/components/Workbench/EditorPanel.css` | Styles for recent items |
| `src/components/Workbench/SettingsPanel.tsx` | **NEW** - Settings UI with toggles |
| `src/components/Workbench/SettingsPanel.css` | **NEW** - Settings panel styles |
| `src/components/Workbench/ActivityBar.tsx` | Settings button now functional |
| `src/components/Workbench/Sidebar.tsx` | Renders SettingsPanel view |
| `src/components/Workbench/Workbench.tsx` | Added Ctrl+, shortcut for settings |
| `src-tauri/Cargo.toml` | Added tauri-plugin-store |
| `src-tauri/src/lib.rs` | Registered store plugin |
| `src-tauri/capabilities/default.json` | Added store permission |

</details>

<details>
<summary>Previous Session (2026-01-08 Late Afternoon)</summary>

1. **Global Search Feature** ✅

### What Was Done (2026-01-08 Early Afternoon)

1. **Smart Import Path Validation & Coloring** ✅
   - Created `useImportValidation` hook to validate import statements in real-time
   - **Visual Feedback System**:
     - **Green** (`#9ece6a`) - Valid relative imports (`./`, `../`)
     - **Cyan** (`#7dcfff`) - Valid node_modules packages
     - **Red** (`#f7768e`) with wavy underline - Missing/invalid modules
   - Subtle background highlighting for better visibility
   - Hover tooltips showing module status (✓ found or ⚠️ not found)
   
2. **Import Detection Engine** ✅
   - Parses multiple import patterns:
     - `import X from 'path'`
     - `import { X } from 'path'`
     - `import * as X from 'path'`
     - `const X = require('path')`
   - Smart path resolution for both relative and node_modules imports
   - Checks common extensions (.ts, .tsx, .js, .jsx, .json, .d.ts)
   - Checks for index files in directories
   
3. **Performance Optimizations** ✅
   - Debounced validation (500ms) to avoid excessive file system checks
   - Validation caching to prevent redundant lookups
   - Decorations cleanup on component unmount

4. **Visual Polish** ✅
   - Professional Tokyo Night color scheme integration
   - Smooth animations and transitions
   - Non-intrusive decoration system
   - Clear visual distinction between import types

### 🔧 Key Files Modified

| File | Changes |
|------|---------|
| `src/hooks/useImportValidation.ts` | New hook for import validation & coloring |
| `src/components/Editor/Editor.css` | Import path decoration styles |
| `src/components/Editor/Editor.tsx` | Integrated useImportValidation hook |
| `src/hooks/index.ts` | Exported useImportValidation |

---

<details>
<summary>Previous Session (2026-01-04 Evening)</summary>

### What Was Done (2026-01-04 Evening)

1. **LSP Diagnostics Fix** ✅
   - Added `publishDiagnostics` capability to Rust backend (`lsp.rs`)
   - Fixed URI matching for Monaco model markers
   - Diagnostics now show in Problems panel and editor squiggles

2. **Dirty State Tracking (Undo/Redo Aware)** ✅
   - Added `originalContent` field to track saved state
   - `isDirty` now compares `content !== originalContent`
   - Undo back to original state correctly clears dirty indicator

3. **Close Dirty File Confirmation Dialog** ✅
   - Professional modal with Save/Don't Save/Cancel options
   - Keyboard shortcuts: Enter=Save, Escape=Cancel
   - Middle-click to close tabs

4. **Simplified Menu Bar** ✅
   - Removed: Selection, Go, Run, Help menus
   - Kept: File, Edit, View, Terminal
   - Removed: Split Editor, Customize Layout buttons

5. **Working File Menu** ✅
   - **New File** - Creates Untitled-N file in memory
   - **Open File...** - File picker with type filters
   - **Open Folder...** - Folder picker
   - **Save** - Saves file; shows Save As for untitled files
   - **Save All** - Saves all dirty files
   - **Close Editor** - With dirty confirmation
   - **Close All Editors** - Saves dirty files first
   - **Exit** - Closes window

6. **Dropdown Menu Polish** ✅
   - Hover-to-switch between menus (VS Code style)
   - Checkmarks for toggle items
   - Disabled states with visual feedback
   - Proper width (280px) to prevent text wrapping

### 🔧 Key Files Modified (2026-01-04)

| File | Changes |
|------|---------|
| `src-tauri/src/commands/lsp.rs` | Added `publishDiagnostics` capability |
| `src/hooks/useLsp.ts` | Fixed URI matching, added debug logging |
| `src/hooks/useTypeScript.ts` | Fixed `noSemanticValidation` conflict |
| `src/types/index.ts` | Added `originalContent` to `OpenFile` |
| `src/stores/appStore.ts` | Added `markFileSaved`, updated `updateFileContent` |
| `src/hooks/useFileSystem.ts` | Uses `markFileSaved` for proper state |
| `src/components/Workbench/TitleBar.tsx` | Complete rewrite with working menus |
| `src/components/Workbench/TitleBar.css` | Dropdown menu styles |
| `src/components/Workbench/EditorPanel.tsx` | Close confirmation dialog |
| `src/components/Workbench/EditorPanel.css` | Dialog styles |
| `src/components/Editor/Editor.tsx` | Added `originalContent` to file opens |

</details>

---

## 📁 File Structure

```
src/
├── components/
│   ├── Workbench/          # Main layout components
│   ├── FileExplorer/       # File tree with icons
│   ├── Editor/             # Monaco editor + theme
│   └── Terminal/           # xterm.js terminal
├── hooks/                  # React hooks (LSP, filesystem, etc.)
├── services/lsp/           # LSP client implementation
├── stores/                 # Zustand state management
├── styles/                 # CSS variables + global styles
└── types/                  # TypeScript definitions

src-tauri/
├── src/commands/           # Rust commands (fs, lsp, pty)
└── capabilities/           # Tauri permissions
```

---

## 📖 Documentation

Detailed documentation for major features and architecture decisions:

| Document | Description |
|----------|-------------|
| [`/docs/ai-integration-architecture.md`](./docs/ai-integration-architecture.md) | **AI Integration** - Complete architecture for CopilotKit, DeepAgents, LangGraph, security, token billing, and implementation phases |
| [`/docs/ai-panel-ui.md`](./docs/ai-panel-ui.md) | **AI Panel UI/UX** - Custom headless chat interface with Perplexity design, streaming think blocks, message truncation, and resizing |
| [`/docs/import-validation-feature.md`](./docs/import-validation-feature.md) | Smart import path validation and color-coding feature |

---

## ✅ Completed Features

### Core Editor
- [x] Monaco Editor with Tokyo Night theme
- [x] Tab system with dirty indicators
- [x] Undo/redo-aware dirty state tracking
- [x] Close confirmation for unsaved files
- [x] File menu (New, Open, Save, Close)
- [x] Keyboard shortcuts (Ctrl+S, Ctrl+W, etc.)

### LSP Integration
- [x] TypeScript/JavaScript language server
- [x] Hover information
- [x] Auto-completion
- [x] Go to Definition (cross-file)
- [x] Find All References
- [x] Signature Help
- [x] Diagnostics (errors/warnings)
- [x] Semantic token highlighting (with delta caching)
- [x] **Smart Import Path Validation** (color-coded: green=valid local, cyan=valid npm, red=missing)

### File Explorer
- [x] Tree view with expand/collapse
- [x] VS Code-style file/folder icons
- [x] Inline file/folder creation
- [x] Special folder handling (dimmed node_modules)
- [x] Tree indent guides

### Terminal
- [x] Multi-terminal support
- [x] Smart shell detection (pwsh > powershell > cmd)
- [x] Context-aware CWD
- [x] Terminal state preservation

### UI/UX
- [x] Resizable panels (sidebar, terminal)
- [x] Activity bar with toggle
- [x] Status bar (cursor, language, encoding)
- [x] Welcome screen
- [x] Dropdown menus with hover-switch

---

## 🔲 TODO

### High Priority
- [x] Prevent window close with unsaved files
- [x] Tab context menu (Close Others, Close All)
- [x] File watcher for external changes
- [x] Search in files (Ctrl+Shift+F)
- [x] Settings as Editor Tab (::settings)
- [x] Instant Settings Apply (Font, Word Wrap, etc.)

### Medium Priority
- [ ] Tab drag & drop reordering
- [x] Recent files/folders
- [x] Auto-save option
- [ ] Terminal search (Ctrl+F in terminal)
- [ ] Split terminals

### Future (Multi-Language Support)
- [ ] Extension Registry (`src/extensions/index.ts`) - Maps file extensions to language modules
- [ ] Python LSP (`pylsp` or `pyright`) - `.py`, `.pyw` files
- [ ] Go LSP (`gopls`) - `.go` files
- [ ] Rust LSP (`rust-analyzer`) - `.rs` files
- [ ] Dynamic LSP switching in `useLsp` hook based on file type
- [ ] Toolchain auto-detection (check PATH, local installs)

### 🤖 AI Integration (Next Major Feature)

> **📖 Full Documentation:** [`/docs/ai-integration-architecture.md`](./docs/ai-integration-architecture.md)

**Architecture:** Tauri App → Python Agent (FastAPI + LangGraph + AG-UI) on port 8123

> **Note:** Simplified architecture for development. Production will add NestJS runtime layer.

#### Phase 1: Frontend Integration (3-4 days) - **COMPLETE** ✅
- [x] Install CopilotKit packages (`@copilotkit/react-core`, `@copilotkit/react-ui`, `@copilotkit/runtime`)
- [x] Wrap app with `<CopilotKit>` provider with `publicLicenseKey`
- [x] Implement fully custom headless AI chat UI (`useCopilotChatHeadless_c`)
- [x] **AI Panel UI/UX**:
  - [x] Resizable panel (320px-800px with drag handle)
  - [x] Toggle icon in TitleBar + View menu item
  - [x] Streaming think block with progressive rendering
  - [x] Message truncation with expand/collapse
  - [x] Perplexity-inspired design (typography hierarchy)
  - [x] Clean minimal aesthetic (no avatars/bubbles)
- [x] Create auth context for JWT management (Supabase Auth)
- [ ] Implement secure token storage (Rust keychain)
- [ ] Define frontend tools with `useFrontendTool` hook

#### Phase 2: Agent Server - Python (5-7 days) - **PARTIALLY COMPLETE** 🚧
- [x] Create FastAPI project structure
- [x] Implement Deep Agents workflow with ReAct pattern
- [x] Create AG-UI endpoint with `add_langgraph_fastapi_endpoint`
- [x] Implement frontend/backend tool routing (using CopilotKitMiddleware)
- [x] Configure MemorySaver for development
- [ ] Configure PostgresSaver with Supabase DB (Production)
- [ ] Implement TokenTrackingCallback for billing
- [ ] Add internal key authentication middleware
- [ ] Deploy to cloud infrastructure

#### Phase 3: Frontend Tools (3-4 days) - **STARTED**
- [x] Implement `useFrontendTool` (mock implementation created)
- [ ] Implement `create_file` real logic
- [ ] Implement `read_file` real logic
- [ ] Implement `edit_file` real logic
- [ ] Implement terminal command tool
- [ ] Implement navigation tools (open file, go to line)
- [ ] Add `useCopilotReadable` for editor context
- [ ] Implement `useAgentShutdown` hook for graceful disconnection
- [ ] Test E2E with agent

#### Phase 3.5: Agent Intelligence - Codebase Understanding (5-7 days) - **CRITICAL FOR SMART AGENT**

> **Goal:** Make the agent truly understand the codebase, not just execute commands blindly.

**Problem:** LLMs have limited context windows. Can't dump entire codebase. Need intelligent context gathering.

##### **Tier 1: Basic Intelligence (1-2 days) - START HERE**
- [ ] Implement `read_file` tool (use Tauri fs commands)
- [ ] Implement `list_files` tool (directory listing with filters)
- [ ] Implement `search_code` tool (wrapper around ripgrep)
- [ ] Implement `get_open_files` tool (what's currently in editor)
- [ ] Implement `get_file_diagnostics` tool (LSP errors/warnings for a file)

##### **Tier 2: LSP-Powered Intelligence (2-3 days)**
- [ ] Implement `find_symbol_definition` tool (LSP workspace/symbol)
- [ ] Implement `find_symbol_references` tool (LSP textDocument/references)
- [ ] Implement `get_type_info` tool (LSP textDocument/hover)
- [ ] Implement `get_project_structure` tool (high-level overview)
- [ ] Implement `get_file_dependencies` tool (imports/exports analysis)

##### **Tier 3: Semantic Search (3-4 days) - ADVANCED**
- [ ] Choose embedding model (OpenAI `text-embedding-3-small` or Nomic Embed local)
- [ ] Set up vector database (Chroma local or Supabase Vector)
- [ ] Implement codebase indexing on startup
- [ ] Implement re-indexing on file changes
- [ ] Implement `semantic_search` tool (search by concept, not just text)
- [ ] Implement `query_codebase_knowledge` tool (RAG over docs/comments)

##### **Tier 4: Smart Agent Prompting (1-2 days)**
- [ ] Update agent system prompt with tool usage strategies
- [ ] Add examples of progressive context loading
- [ ] Implement context window management logic
- [ ] Add codebase memory/knowledge base

**Tech Stack Recommendations:**
- **Embeddings**: OpenAI `text-embedding-3-small` ($0.02/1M tokens) or Nomic Embed (free, local)
- **Vector DB**: Chroma (local, Python) or Supabase Vector (you're already using Supabase!)
- **Code Parsing**: Tree-sitter or TypeScript Compiler API
- **LSP**: Already implemented, just expose as tools

**Why This Matters:**
Without semantic understanding, the agent is just a fancy command executor. With it, the agent can:
- Find relevant code without knowing exact file names
- Understand project architecture
- Make intelligent decisions about what to read
- Provide context-aware suggestions

**Implementation Priority:**
1. Start with Tier 1 (basic tools) - immediate value
2. Add Tier 2 (LSP tools) - leverage existing infrastructure
3. Add Tier 3 (semantic search) - game changer for large codebases
4. Refine Tier 4 (prompting) - optimize agent behavior

#### Phase 4: Runtime Server - NestJS (4-5 days) - **IN PROGRESS**
- [x] Create NestJS project with `@copilotkit/runtime`
- [x] Set up Supabase JWT verification guard
- [x] Implement CopilotRuntime with LangGraphHttpAgent
- [x] Environment validation with class-validator
- [x] Configure TypeScript for subpath exports (Node16 resolution)
- [ ] Add Redis for quota caching
- [ ] Create thread management endpoints (CRUD)
- [ ] Deploy to Railway/AWS

#### Phase 5: Thread Management UI (2-3 days)
- [ ] Create thread list sidebar component
- [ ] Implement new/rename/delete thread actions
- [ ] Wire up threadId to CopilotKit provider
- [ ] Implement `useResumeSession` for interrupted sessions
- [ ] Test conversation persistence across sessions

#### Phase 6: Billing & Polish (3-4 days)
- [ ] Implement usage dashboard in settings
- [ ] Add quota exceeded error handling
- [ ] Add tool timeout handling on agent side
- [ ] Implement orphaned session cleanup (cron job)
- [ ] Stripe integration (future)
- [ ] Performance optimization

**Estimated Total: 20-27 days**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript |
| Build | Vite 7 |
| Desktop | Tauri 2 (Rust) |
| Editor | Monaco Editor |
| Terminal | xterm.js + portable-pty |
| LSP | typescript-language-server |
| State | Zustand |

---

## 🎨 Design System (Tokyo Night)

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#1a1b26` | Main background |
| `--bg-secondary` | `#16161e` | Panels |
| `--text-primary` | `#c0caf5` | Main text |
| `--color-blue` | `#7aa2f7` | Primary accent |
| `--color-green` | `#9ece6a` | Success |
| `--color-red` | `#f7768e` | Error |
| `--color-yellow` | `#e0af68` | Warning |

---

## 🚀 Development

```bash
# Run development
npm run tauri dev

# Build production
npm run tauri build

# Required: Install LSP server globally
npm install -g typescript-language-server typescript
```

---

## 📐 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      TITLE BAR (File, Edit, View, Terminal)     │
├────┬────────────┬───────────────────────────────────────────────┤
│ A  │  SIDEBAR   │              EDITOR AREA                      │
│ C  │            │  ┌─────────────────────────────────────────┐  │
│ T  │  Explorer  │  │ Tab1.tsx* │ Tab2.rs │ Tab3.json │       │  │
│ I  │            │  ├─────────────────────────────────────────┤  │
│ V  │            │  │           MONACO EDITOR                 │  │
│ I  │            │  │      (LSP: hover, completion, etc.)     │  │
│ T  │            │  └─────────────────────────────────────────┘  │
│ Y  │            ├───────────────────────────────────────────────┤
│    │            │  PROBLEMS │ TERMINAL                          │
│ B  │            │  ┌─────────────────────────────────────────┐  │
│ A  │            │  │  PS C:\project> _                       │  │
│ R  │            │  └─────────────────────────────────────────┘  │
├────┴────────────┴───────────────────────────────────────────────┤
│  Ln 42, Col 15 │ Spaces: 2 │ UTF-8 │ TypeScript │ main         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Session History

<details>
<summary>2026-01-04 (Earlier) - Terminal & LSP</summary>

- Terminal blank screen fix (frontend-first ID generation)
- Smart shell detection (pwsh priority)
- Context-aware terminal CWD
- LSP semantic tokens with delta caching

</details>

<details>
<summary>2026-01-03 - UI Polish</summary>

- VS Code-style file icons
- Tree indent guides
- Inline file/folder creation
- Sidebar toggle from activity bar
- Editor tab icons

</details>

<details>
<summary>2026-01-03 (Earlier) - Foundation</summary>

- Tokyo Night theme
- Multi-terminal support
- LSP integration
- Semantic token highlighting

</details>

---

## 🔌 Extension Architecture Strategy (Updated 2026-01-10)

### The Goal
Support multiple languages (Python, Go, Rust) and Operating Systems (Linux, macOS) without bloating the application. We rely on the developer's existing environment ("User Provided" toolchain) instead of bundling massive binaries like VS Code.

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (TypeScript)                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              LanguageRegistry (Future)                     │  │
│  │  .ts/.tsx → TypeScriptLsp                                  │  │
│  │  .py      → PythonLsp (Future)                             │  │
│  │  .go      → GoLsp (Future)                                 │  │
│  │  .rs      → RustLsp (Future)                               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │           LspClient (Generic, Reusable)                    │  │
│  │  new LspClient({ cmd: "pylsp", args: ["--stdio"] })        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Rust - Generic)                    │
│  lsp_start(cmd: String, args: Vec<String>)                      │
│  → Spawns whatever process the frontend tells it to             │
│  → Language-agnostic, zero changes needed for new languages     │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Status

| Component | Status | File(s) |
|-----------|--------|------|
| Generic Rust Backend | ✅ **Done** | `src-tauri/src/commands/lsp.rs` |
| Generic LspClient | ✅ **Done** | `src/services/lsp/LspClient.ts` |
| TypeScript Extension | ✅ **Done** | `src/services/lsp/TypeScriptLsp.ts` |
| Extension Registry | ❌ **Not Started** | `src/extensions/index.ts` (planned) |
| Python Extension | ❌ **Not Started** | `src/extensions/python/` (planned) |
| Go Extension | ❌ **Not Started** | `src/extensions/go/` (planned) |
| Rust Extension | ❌ **Not Started** | `src/extensions/rust/` (planned) |
| Dynamic LSP Switching | ❌ **Not Started** | Update `useLsp` hook |

### What's Working Now

1. **Rust Backend is Generic** - Accepts `cmd` and `args` from frontend:
   ```rust
   lsp_start(cmd: "pylsp", args: vec!["--stdio"])
   ```

2. **TypeScript/JavaScript/TSX/JSX** - Fully working with:
   - Local `node_modules/.bin/typescript-language-server` (preferred)
   - Global PATH fallback
   - All LSP features: completion, hover, diagnostics, go-to-definition, etc.

### What's Missing (Future Work)

1. **Extension Registry** - A central service to map file extensions to LSP modules:
   ```typescript
   // Planned: src/extensions/index.ts
   const registry = {
     '.ts': TypeScriptExtension,
     '.py': PythonExtension,
     '.go': GoExtension,
   };
   ```

2. **Language Extensions** - Each language needs a module that knows:
   - How to find its LSP server (PATH, local install, etc.)
   - What file extensions it handles
   - Any language-specific configuration

3. **Dynamic LSP Switching** - Update `useLsp` hook to:
   - Detect file type on open
   - Start the appropriate LSP server
   - Stop unused LSP servers to save memory

### Why This Matters
This architecture allows us to add support for **any language** by simply adding a TypeScript file in the frontend. The Rust backend never needs to change. This keeps the app lightweight while being infinitely extensible.
