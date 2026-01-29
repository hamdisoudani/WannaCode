# CodeSurf Agent Architecture

## Overview

CodeSurf uses a **Supervisor-Subagent** architecture where the main agent (Supervisor) delegates tasks to specialized subagents.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Request                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supervisor Agent                            │
│  - Understands user intent                                   │
│  - Breaks down complex tasks (TODO tool)                     │
│  - Checks memory (.wannacode/)                               │
│  - Delegates to subagents                                    │
│  - Aggregates results                                        │
│  - Does NOT code itself                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ task(agent="coding_agent", ...)
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Coding Subagent                             │
│  - Explores codebase                                         │
│  - Writes/modifies code                                      │
│  - Runs tests and commands                                   │
│  - Checks memory before starting                             │
│  - Saves findings to .wannacode/                             │
│  - Returns detailed report                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Result
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  .wannacode/ Folder                          │
│  memory/    - Task history and results                       │
│  skills/    - Reusable code patterns                         │
│  findings/  - Codebase analysis                              │
│  context/   - Shared context                                 │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Supervisor Agent (`src/deep_agent.py`)
**System Prompt**: `SUPERVISOR_SYSTEM_PROMPT`

**Responsibilities**:
- Parse user requests
- Break down complex tasks using TODO tool
- Check `.wannacode/` for previous work
- Delegate to Coding Agent with context
- Monitor progress
- Aggregate and present results

**Does NOT**:
- Write code directly
- Read files (unless checking memory)
- Execute commands

**Example Delegation**:
```python
task(
    description="Add authentication guard to /api/users endpoint. Context: Reference pattern in backend/src/copilotkit/copilotkit.controller.ts. Target file: backend/src/users/users.controller.ts. Requirements: Use SupabaseAuthGuard, verify with typecheck.",
    subagent_type="coding_agent"
)
```

### 2. Coding Subagent (`src/subagents/coding_agent.py`)
**System Prompt**: `CODING_AGENT_SYSTEM_PROMPT`

**Responsibilities**:
- Execute coding tasks delegated by supervisor
- Check memory before starting work
- Explore codebase efficiently
- Write complete, working code
- Verify with diagnostics and tests
- Document findings in `.wannacode/`

**Workflow**:
1. Check `.wannacode/memory/` for similar tasks
2. Explore codebase (list_dir_stats, search_code)
3. Read necessary files
4. Implement changes
5. Verify (get_diagnostics, run_command)
6. Save findings to `.wannacode/`
7. Return detailed report

### 3. Memory System (`.wannacode/` folder)

**Important**: The agent runs in the cloud and accesses the user's filesystem through frontend tools (`read_file`, `write_file`). The `.wannacode/` folder is created automatically when the agent writes its first file.

**Structure**:
```
.wannacode/
├── memory/       # Task history and results
│   ├── api_auth_task.md
│   ├── user_profile_feature.md
│   └── ...
├── skills/       # Reusable code patterns
│   ├── base_controller_pattern.md
│   ├── error_handling_pattern.md
│   └── ...
├── findings/     # Codebase analysis
│   ├── auth_architecture.md
│   ├── api_documentation.md
│   └── ...
└── context/      # Shared context
    └── ...
```

**How it works**:
1. Agent uses `write_file(".wannacode/memory/task.md", content)` to save findings
2. Frontend (Tauri) creates the folder structure automatically
3. Agent uses `read_file(".wannacode/memory/task.md")` to retrieve past work
4. If file doesn't exist, agent proceeds without memory (fresh start)

### 4. Frontend Tools (from CopilotKit)

The supervisor and subagents have access to these tools:

**File Operations**:
- `list_dir(path)` - List directory contents
- `list_dir_stats(path, depth)` - Get directory statistics
- `read_file(path)` - Read file contents
- `write_file(path, content)` - Write/overwrite file
- `search_code(query, is_regex, file_pattern)` - Search codebase

**Code Intelligence**:
- `find_definitions(symbol_name)` - Find symbol definitions
- `get_diagnostics(path)` - Get LSP errors/warnings

**Execution**:
- `run_command(command)` - Run shell commands

## Delegation Flow

### Example: "Add authentication to the API"

1. **User Request** → Supervisor
   ```
   User: "Add authentication to the /api/users endpoint"
   ```

2. **Supervisor Analysis**
   - Checks `.wannacode/memory/` for similar tasks
   - Finds: `auth_patterns.md` (we've done auth before)
   - Decides to delegate to Coding Agent

3. **Supervisor Delegates**
   ```python
   task(
       description="Add authentication guard to /api/users endpoint. IMPORTANT: Read .wannacode/memory/auth_patterns.md first! Follow pattern from backend/src/copilotkit/copilotkit.controller.ts. Target: backend/src/users/users.controller.ts. Requirements: Use SupabaseAuthGuard, verify with typecheck.",
       subagent_type="coding_agent"
   )
   ```

4. **Coding Agent Executes**
   - Reads `.wannacode/memory/auth_patterns.md`
   - Reads pattern file to understand implementation
   - Reads target file
   - Adds `@UseGuards(SupabaseAuthGuard)` decorator
   - Runs `get_diagnostics()` to verify
   - Saves result to `.wannacode/memory/api_users_auth.md`
   - Returns report

5. **Supervisor Aggregates**
   - Receives report from Coding Agent
   - Presents result to user:
   ```
   ✓ Authentication added to /api/users endpoint
   - Used SupabaseAuthGuard (same pattern as copilotkit controller)
   - All type checks pass
   - Saved to: .wannacode/memory/api_users_auth.md
   ```

## Benefits

### 1. **Context Efficiency**
- Subagent work doesn't pollute supervisor context
- When subagent finishes, only the result is returned
- Supervisor maintains high-level view

### 2. **Memory Persistence**
- `.wannacode/` folder prevents redundant work
- Agents learn from past tasks
- Patterns are reusable

### 3. **Specialization**
- Supervisor focuses on orchestration
- Coding Agent focuses on implementation
- Each agent has optimized prompts

### 4. **Scalability**
- Easy to add more subagents (testing, documentation, etc.)
- Each subagent can have its own tools and middleware

## Configuration

### Model Selection (`src/model.py`)
Currently using Fireworks AI, but supports:
- OpenRouter
- Groq
- Mistral
- OpenAI (future)

### Middleware Stack
1. `CopilotKitMiddleware` - Injects frontend tools from the IDE
2. `ContextInjectionMiddleware` - Injects useCopilotReadable context
3. `WannaCodeMemoryMiddleware` - Injects memory management instructions (does NOT access filesystem directly)
4. `CancellationMiddleware` - Handles client disconnects

**Subagent Middleware Stack:**
1. `CopilotKitMiddleware` - **CRITICAL**: Subagents also need access to frontend tools
2. `TodoListMiddleware` - Task management
3. `SummarizationMiddleware` - Context window management
4. `PatchToolCallsMiddleware` - Tool call fixes

**Important**: 
- The `WannaCodeMemoryMiddleware` only injects instructions into the system prompt. It does NOT create folders or access files directly. 
- The agent uses frontend tools (`read_file`, `write_file`) to interact with the `.wannacode/` folder, and the frontend creates the folder structure automatically.
- **Subagents MUST have `CopilotKitMiddleware`** to access frontend tools, otherwise they will get "tool not found" errors.

## Future Enhancements

1. **More Subagents**:
   - Testing Agent (writes and runs tests)
   - Documentation Agent (generates docs)
   - Refactoring Agent (code quality improvements)

2. **Enhanced Memory**:
   - Vector search for semantic memory retrieval
   - Automatic skill extraction from successful tasks
   - Cross-project learning

3. **Better Context Management**:
   - Smart file chunking for large files
   - Dependency graph analysis
   - Automatic relevance scoring

## Debugging

### Check Memory Context
```bash
cat .wannacode/memory/*.md
```

### View Agent Logs
```bash
langgraph dev  # Shows all agent interactions
```

### Test Delegation
Send a simple task and check if it's delegated:
```
User: "Find all authentication-related files"
Expected: Supervisor delegates to Coding Agent
```

## Notes

- The supervisor uses the `task()` tool to call subagents
- Subagents return results as tool responses
- Memory is automatically injected before each run
- `.wannacode/` folder is created automatically in project root
