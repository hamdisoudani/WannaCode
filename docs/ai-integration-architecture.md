# CodeSurf AI Integration Architecture

> **Created:** 2026-01-10
> **Last Updated:** 2026-01-12 @ 01:10
> **Status:** Phase 1 (Frontend) ✅ | Phase 2 (Agent) 🚧 | Phase 3 (Tools) 🚧

This document contains the complete architecture, research findings, and implementation plan for integrating AI capabilities into CodeSurf IDE. This is the source of truth for all AI-related development.

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Component Details](#4-component-details)
5. [Security Architecture](#5-security-architecture)
   - [5.1 Disconnection & Graceful Shutdown](#51-disconnection--graceful-shutdown)
   - [5.2 Authentication Implementation (COMPLETE)](#52-authentication-implementation-complete)
6. [Token Usage & Billing](#6-token-usage--billing)
7. [Database Schema](#7-database-schema)
8. [Implementation Phases](#8-implementation-phases)
9. [Key Research Findings](#9-key-research-findings)
10. [Code Examples](#10-code-examples)
11. [Deployment Strategy](#11-deployment-strategy)
12. [CopilotKit v1.50 API Reference](#12-copilotkit-v150-api-reference)

---

## 1. Vision & Goals

### What We're Building

CodeSurf is the **first AI-Native IDE** built for "Vibe Coders" - users who want to code through conversation rather than typing. The AI agent can:

- Create, edit, and delete files
- Run terminal commands
- Navigate the editor
- Fix errors automatically
- Explain code and answer questions

### Architecture Principles

| Principle | Description |
|-----------|-------------|
| **SaaS Model** | Agent runs on our servers, not bundled with the app |
| **Local Execution** | Tools (file ops, terminal) execute on user's machine |
| **Secure by Design** | JWT auth, agent URL never exposed, defense in depth |
| **Token-Based Billing** | Track usage, enforce quotas, support subscription tiers |
| **Stateful Conversations** | Threads persist across sessions using Postgres checkpoints |

---

## 2. Technology Stack

### Frontend (Tauri IDE)

| Component | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| Framework | Tauri v2 + React 19 | Desktop app shell | ✅ |
| AI SDK | @copilotkit/react-core@1.50.1 | AI integration hooks | ✅ |
| AI UI | @copilotkit/react-ui@1.50.1 | Chat sidebar component | ✅ |
| AI Runtime | @copilotkit/runtime@1.50.1 | Runtime utilities | ✅ |
| Auth | Supabase Auth + Google OAuth | JWT tokens, PKCE flow | ✅ |
| Deep Links | tauri-plugin-deep-link | OAuth callbacks | ✅ |
| Single Instance | tauri-plugin-single-instance | Prevent duplicate apps | ✅ |
| State | Zustand | App state management | ✅ |

### Backend (Runtime Server) - IN PROGRESS

| Component | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| Framework | NestJS | API server on port 5000 | ✅ |
| AI Runtime | @copilotkit/runtime@1.50.1 | CopilotKit server-side | ✅ |
| Agent Connector | LangGraphHttpAgent | Connect to Python agent | ✅ |
| Auth | Supabase JWT verification | User authentication | ✅ |
| Validation | class-validator | Type-safe env config | ✅ |
| Cache | Redis | Quota caching | 🔜 |
| Database | Supabase Postgres | User data, threads | 🔜 |

### Agent Server

| Component | Technology | Purpose | Status |
|-----------|------------|---------|--------|
| Framework | FastAPI | Agent API on port 8080 | ✅ |
| Agent | LangGraph + CopilotKit | State machine agent | ✅ |
| Orchestration | LangGraph StateGraph | ReAct pattern workflow | ✅ |
| Protocol | AG-UI (ag-ui-langgraph) | Frontend-agent communication | ✅ |
| Checkpointing | MemorySaver (dev) / PostgresSaver (prod) | Conversation persistence | 🔜 |
| LLM | GPT-4o (OpenAI) | Language model | ✅ |

---

## 3. System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   COMPONENT 1: TAURI APP (User's Machine)                                   │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                   │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────┐     │
│   │  <CopilotKit                                                      │     │
│   │    runtimeUrl="https://api.codesurf.ai/copilotkit"               │     │
│   │    threadId={currentThreadId}                                     │     │
│   │    headers={{ Authorization: `Bearer ${jwt}` }}                   │     │
│   │  >                                                                │     │
│   │    <CopilotSidebar>                                               │     │
│   │      <Workbench />                                                │     │
│   │    </CopilotSidebar>                                              │     │
│   │  </CopilotKit>                                                    │     │
│   └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
│   Hooks Used:                                                               │
│   • useCopilotAction() → Define tools (create_file, run_cmd, etc.)          │
│   • useCopilotReadable() → Share context (current file, diagnostics)        │
│   • useCoAgent() → Sync state with agent                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ HTTPS + JWT + threadId
                                       │ (AG-UI Protocol)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   COMPONENT 2: RUNTIME SERVER (api.codesurf.ai)                             │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                             │
│   Location: Your cloud (Railway, AWS, etc.)                                 │
│   Tech: NestJS + @copilotkit/runtime                                        │
│                                                                             │
│   Responsibilities:                                                         │
│   1. Verify JWT token (Supabase Guard)                                      │
│   2. Check user quota (Redis cache → Supabase fallback)                     │
│   3. Forward request to Agent (LangGraphHttpAgent)                          │
│   4. Log usage for billing                                                  │
│                                                                             │
│   Key Endpoints:                                                            │
│   • POST /copilotkit → CopilotRuntime handler                               │
│   • POST /threads → Create new thread                                       │
│   • GET /threads → List user's threads                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Internal Network Only
                                       │ + X-Internal-Key header
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   COMPONENT 3: AGENT SERVER (Internal)                                      │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                     │
│   Location: Same cloud, internal network                                    │
│   Tech: FastAPI + DeepAgents + LangGraph + AG-UI                            │
│                                                                             │
│   Features:                                                                 │
│   • DeepAgents middleware (TodoList, Filesystem, SubAgent)                  │
│   • PostgresSaver for thread state (Supabase Postgres)                      │
│   • Token tracking via LangChain callbacks                                  │
│   • Graceful quota enforcement                                              │
│                                                                             │
│   Key Endpoints:                                                            │
│   • POST /agent/codesurf → AG-UI endpoint                                   │
│   • GET /health → Health check                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   SUPABASE (Shared Database)                                                │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━                                                │
│                                                                             │
│   Tables:                                                                   │
│   • auth.users → Supabase Auth (built-in)                                   │
│   • threads → User's conversation threads                                   │
│   • user_subscriptions → Plans, limits                                      │
│   • user_usage → Token tracking                                             │
│   • usage_history → Detailed logs for billing                               │
│   • checkpoints → LangGraph state (auto-created)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Request Flow

```
USER: "Create a login component"
      │
      │ 1️⃣ CopilotKit sends to Runtime
      │    POST https://api.codesurf.ai/copilotkit
      │    Headers: { Authorization: "Bearer supabase_jwt" }
      │    Body: { threadId: "abc-123", message: "..." }
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  NESTJS RUNTIME                                                 │
│  2️⃣ Verify JWT ✓                                                │
│  3️⃣ Check quota from cache: 500,000 remaining ✓                │
│  4️⃣ Add headers: X-User-Id, X-User-Quota, X-Internal-Key        │
│  5️⃣ Forward to Agent                                            │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  PYTHON AGENT                                                   │
│  6️⃣ Validate X-Internal-Key ✓                                   │
│  7️⃣ Load thread state from Postgres (threadId: abc-123)         │
│  8️⃣ Process with DeepAgents (planning, coding, etc.)            │
│  9️⃣ Track tokens via callback                                   │
│  🔟 Decide to call frontend tool: create_file                   │
└─────────────────────────────────────────────────────────────────┘
      │
      │ AG-UI: Tool call event
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  TAURI APP                                                      │
│  1️⃣1️⃣ useCopilotAction("create_file") triggered                 │
│       → Tauri.invoke("write_file", { path, content })           │
│       → File created on USER'S MACHINE                          │
│  1️⃣2️⃣ Tool result sent back to agent                            │
│  1️⃣3️⃣ Agent saves state, updates token usage in DB              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Details

### 4.1 Frontend Tools (useCopilotAction)

Tools defined in the frontend that the agent can call:

| Tool | Description | Tauri Command |
|------|-------------|---------------|
| `create_file` | Create a new file | `write_file` |
| `edit_file` | Modify existing file | `write_file` |
| `read_file` | Read file contents | `read_file` |
| `delete_file` | Delete a file | `delete_file` |
| `run_terminal` | Execute command | `pty_write` |
| `get_terminal_output` | Get terminal buffer | `pty_read` |
| `navigate_to` | Open file in editor | Store action |
| `get_diagnostics` | Get LSP errors | LSP query |
| `get_current_file` | Active file info | Store getter |
| `show_diff` | Display code diff | UI component |

### 4.2 Readable Context (useCopilotReadable)

Context shared with the agent:

| Context | Description |
|---------|-------------|
| Current File | Path, content, language, isDirty |
| Open Tabs | List of open file paths |
| Project Path | Root directory |
| Diagnostics | LSP errors and warnings |
| Selected Text | Highlighted code in editor |
| Terminal Output | Last N lines of terminal |

### 4.3 DeepAgents Middleware

Built-in capabilities from DeepAgents:

| Middleware | Purpose | Tools Provided |
|------------|---------|----------------|
| `TodoListMiddleware` | Task planning | `write_todos`, `read_todos` |
| `FilesystemMiddleware` | File operations | `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`, `execute` |
| `SubAgentMiddleware` | Specialized sub-agents | `task` (spawn subagent) |
| `SummarizationMiddleware` | Context management | Auto-summarize at 170k tokens |
| `HumanInTheLoopMiddleware` | User confirmation | Interrupt for approval |

### 4.4 Sub-Agents (Planned)

Specialized agents for different tasks:

| Sub-Agent | Description | Tools |
|-----------|-------------|-------|
| `planner` | Break down complex tasks | `write_todos` |
| `coder` | Write clean code | File tools |
| `debugger` | Fix errors | Diagnostics, file tools |
| `tester` | Run tests | Terminal |
| `explainer` | Explain code | Read-only |

---

## 5. Security Architecture

### Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Tauri     │     │   NestJS    │     │   Agent     │
│   App       │     │   Runtime   │     │   Server    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Request +      │                   │
       │    Bearer JWT     │                   │
       │───────────────────>                   │
       │                   │                   │
       │            2. Verify JWT              │
       │            (Supabase)                 │
       │                   │                   │
       │            3. Check quota             │
       │            (Redis/DB)                 │
       │                   │                   │
       │                   │ 4. Forward +      │
       │                   │    X-Internal-Key │
       │                   │───────────────────>
       │                   │                   │
       │                   │            5. Validate
       │                   │               Internal Key
       │                   │                   │
       │                   │            6. Process
       │                   │                   │
       │                   │<──────────────────│
       │<──────────────────│                   │
       │                   │                   │
```

### Security Layers

| Layer | What | How |
|-------|------|-----|
| **Transport** | HTTPS/TLS | Encrypt all traffic |
| **Identity** | JWT | Supabase Auth tokens |
| **Gateway** | Pre-flight check | Quota, subscription |
| **Internal** | X-Internal-Key | Only runtime knows |
| **Token Storage** | OS Keychain | Tauri secure storage |
| **Database** | RLS | Row-level security |

### Why Agent URL is Never Exposed

```
❌ BAD: Frontend → https://agent.codesurf.ai:8000 (public)
   Problems:
   - Anyone can use your AI
   - Can't enforce auth/billing
   - Agent URL is public

✅ GOOD: Frontend → Runtime (public) → Agent (internal)
   Benefits:
   - JWT verified at Runtime
   - Quota checked before forwarding
   - Agent URL is private network only
```

### 5.1 Disconnection & Graceful Shutdown

Since the agent relies on **frontend tools** (`useCopilotAction`) to execute operations, we must handle scenarios where the frontend becomes unavailable:

#### Disconnection Scenarios

| Scenario | Detection | Action |
|----------|-----------|--------|
| User closes IDE | Tauri `beforeunload` event | Graceful stop request |
| User shuts down PC | Connection timeout | Timeout-based cleanup |
| Network disconnects | WebSocket/SSE error | Timeout-based cleanup |
| App crashes | No heartbeat | Timeout-based cleanup |
| User clicks "Stop" | Manual trigger | Immediate stop |

#### Stop Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GRACEFUL SHUTDOWN FLOW                             │
│                                                                             │
│  SCENARIO 1: User Closes IDE (Graceful)                                     │
│  ──────────────────────────────────────                                     │
│                                                                             │
│  User clicks X → Tauri beforeunload → POST /copilotkit/agent/.../stop/...   │
│                                     → Agent receives stop signal            │
│                                     → Saves current state to checkpoint     │
│                                     → Returns "stopped" confirmation        │
│                                     → IDE closes cleanly                    │
│                                                                             │
│  SCENARIO 2: Network Loss / Crash (Ungraceful)                              │
│  ─────────────────────────────────────────────                              │
│                                                                             │
│  Connection drops → Agent waiting for tool response (timeout: 30s)          │
│                   → No response received                                    │
│                   → Agent detects frontend unavailable                      │
│                   → Saves state to checkpoint                               │
│                   → Marks thread as "interrupted"                           │
│                   → Cleans up resources                                     │
│                                                                             │
│  SCENARIO 3: User Clicks Stop Button                                        │
│  ─────────────────────────────────────                                      │
│                                                                             │
│  Stop button → POST /copilotkit/agent/codesurf_agent/stop/{threadId}        │
│             → Immediate interrupt of agent execution                        │
│             → State saved for potential resume                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### CopilotKit Stop Endpoint

CopilotKit provides a built-in endpoint and frontend hook for stopping agents:

```typescript
// CopilotKit Runtime exposes these endpoints:
POST /api/copilotkit/agent/:agentId/stop/:threadId  // Stop agent
POST /api/copilotkit/agent/:agentId/connect         // SSE connection
POST /api/copilotkit/agent/:agentId/run             // Start agent
```

#### Frontend Implementation: Graceful Shutdown

```typescript
// src/hooks/useAgentShutdown.ts
import { useEffect, useRef } from 'react';
import { useCopilotContext } from '@copilotkit/react-core';
import { listen } from '@tauri-apps/api/event';

export function useAgentShutdown(threadId: string | null) {
  const { stopGeneration } = useCopilotContext();
  const isStoppingRef = useRef(false);

  useEffect(() => {
    // Listen for Tauri window close event
    const unlisten = listen('tauri://close-requested', async (event) => {
      if (isStoppingRef.current) return;
      isStoppingRef.current = true;

      console.log('[Shutdown] Window close requested, stopping agent...');
      
      try {
        // 1. Stop the agent gracefully using CopilotKit
        if (threadId) {
          await stopGeneration();
          
          // 2. Also call the stop endpoint directly for safety
          await fetch(`https://api.codesurf.ai/copilotkit/agent/codesurf_agent/stop/${threadId}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`,
            },
          });
        }
        
        console.log('[Shutdown] Agent stopped successfully');
      } catch (error) {
        console.error('[Shutdown] Error stopping agent:', error);
      }
      
      // 3. Allow window to close
      const { appWindow } = await import('@tauri-apps/api/window');
      await appWindow.close();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [threadId, stopGeneration]);
}
```

#### Agent Implementation: Tool Timeout & Recovery

```python
# agent/middleware/disconnection.py
import asyncio
from typing import Any

class DisconnectionHandler:
    """Handle frontend disconnection gracefully."""
    
    TOOL_TIMEOUT_SECONDS = 30  # Max wait for frontend tool response
    
    async def execute_frontend_tool(
        self,
        tool_name: str,
        args: dict,
        config: dict,
    ) -> Any:
        """Execute a frontend tool with timeout protection."""
        
        try:
            # Wait for tool response with timeout
            result = await asyncio.wait_for(
                self._send_tool_call(tool_name, args, config),
                timeout=self.TOOL_TIMEOUT_SECONDS
            )
            return result
            
        except asyncio.TimeoutError:
            # Frontend didn't respond - likely disconnected
            thread_id = config.get("thread_id")
            
            # Save current state before cleanup
            await self._save_interrupted_state(thread_id, {
                "interrupted_at": tool_name,
                "pending_args": args,
                "reason": "frontend_timeout",
            })
            
            # Log for debugging
            print(f"[Disconnect] Frontend timeout on tool '{tool_name}' for thread {thread_id}")
            
            # Raise exception to stop agent gracefully
            raise FrontendDisconnectedException(
                f"Frontend disconnected while waiting for tool '{tool_name}'"
            )
    
    async def _save_interrupted_state(self, thread_id: str, metadata: dict):
        """Save state so user can resume later."""
        # This is handled by PostgresSaver automatically,
        # but we can add metadata to the checkpoint
        await self.checkpointer.put(
            config={"configurable": {"thread_id": thread_id}},
            checkpoint=current_state,
            metadata={
                "interrupted": True,
                **metadata,
            }
        )


class FrontendDisconnectedException(Exception):
    """Raised when frontend is no longer available."""
    pass
```

#### Database: Track Interrupted Sessions

```sql
-- Add status to threads table
ALTER TABLE threads ADD COLUMN status TEXT DEFAULT 'active';
-- Possible values: 'active', 'completed', 'interrupted', 'error'

ALTER TABLE threads ADD COLUMN interrupted_at TIMESTAMPTZ;
ALTER TABLE threads ADD COLUMN interrupted_reason TEXT;

-- Function to mark thread as interrupted
CREATE OR REPLACE FUNCTION mark_thread_interrupted(
    p_thread_id UUID,
    p_reason TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE threads
    SET 
        status = 'interrupted',
        interrupted_at = NOW(),
        interrupted_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Resume Interrupted Sessions

When user reopens the IDE:

```typescript
// src/hooks/useResumeSession.ts
import { useEffect } from 'react';
import { useCopilotChat } from '@copilotkit/react-core';

export function useResumeSession(threadId: string | null) {
  const { append } = useCopilotChat();
  
  useEffect(() => {
    async function checkInterrupted() {
      if (!threadId) return;
      
      // Check if thread was interrupted
      const response = await fetch(`/api/threads/${threadId}`);
      const thread = await response.json();
      
      if (thread.status === 'interrupted') {
        // Notify user
        const resume = confirm(
          `Your last session was interrupted. Would you like to resume where you left off?`
        );
        
        if (resume) {
          // LangGraph will automatically load from last checkpoint
          append({
            role: 'user',
            content: 'Please continue where we left off.',
          });
        } else {
          // Start fresh
          append({
            role: 'user', 
            content: 'Let\'s start fresh.',
          });
        }
      }
    }
    
    checkInterrupted();
  }, [threadId]);
}
```

#### Server-Side Timeout Cleanup (Cron Job)

```python
# agent/cleanup.py
"""
Run as a scheduled job (e.g., every 5 minutes) to clean up
orphaned agent sessions where frontend disconnected.
"""

import asyncio
from datetime import datetime, timedelta

async def cleanup_orphaned_sessions():
    """Find and clean up sessions that have been inactive too long."""
    
    # Sessions inactive for more than 5 minutes are considered orphaned
    cutoff = datetime.utcnow() - timedelta(minutes=5)
    
    # Query for active threads with no recent activity
    orphaned = await supabase.from_('threads') \
        .select('id') \
        .eq('status', 'active') \
        .lt('updated_at', cutoff.isoformat()) \
        .execute()
    
    for thread in orphaned.data:
        # Mark as interrupted
        await supabase.rpc('mark_thread_interrupted', {
            'p_thread_id': thread['id'],
            'p_reason': 'inactivity_timeout',
        })
        
        print(f"[Cleanup] Marked thread {thread['id']} as interrupted (inactivity)")


# Schedule with APScheduler or cron
if __name__ == "__main__":
    asyncio.run(cleanup_orphaned_sessions())
```

#### Summary: Disconnection Handling

| Component | Responsibility |
|-----------|---------------|
| **Frontend** | Send stop request on close, handle reconnection |
| **Runtime** | Forward stop requests, track active connections |
| **Agent** | Timeout on tool calls, save state on disconnect |
| **Database** | Track interrupted sessions, enable resume |
| **Cron Job** | Cleanup orphaned sessions periodically |

## 6. Token Usage & Billing

### Tracking Strategy: Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TOKEN TRACKING FLOW                                │
│                                                                             │
│  PHASE 1: PRE-FLIGHT CHECK (NestJS)                                         │
│  ───────────────────────────────────                                        │
│  • Get quota from Redis (fast path)                                         │
│  • Fallback to Supabase DB (cache miss)                                     │
│  • Reject if quota < 1000 tokens (minimum)                                  │
│  • Pass remaining quota to agent in headers                                 │
│                                                                             │
│  PHASE 2: REAL-TIME TRACKING (Python Agent)                                 │
│  ──────────────────────────────────────────                                 │
│  • TokenTrackingCallback attached to LLM                                    │
│  • Count tokens after each LLM call                                         │
│  • If accumulated > quota → Raise exception                                 │
│  • Agent returns graceful error message                                     │
│                                                                             │
│  PHASE 3: BATCH UPDATE (End of Workflow)                                    │
│  ────────────────────────────────────────                                   │
│  • Single DB update with total tokens used                                  │
│  • Atomic decrement via Supabase RPC                                        │
│  • Invalidate Redis cache                                                   │
│  • Log to usage_history for billing                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Subscription Tiers (Example)

| Plan | Monthly Tokens | Price |
|------|---------------|-------|
| Free | 100,000 | $0 |
| Pro | 2,000,000 | $20 |
| Team | 10,000,000 | $99 |
| Enterprise | Unlimited | Custom |

---

## 7. Database Schema

### Supabase Tables

```sql
-- User subscription and plan
CREATE TABLE user_subscriptions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    plan TEXT DEFAULT 'free',  -- 'free', 'pro', 'team', 'enterprise'
    tokens_limit INT DEFAULT 100000,
    billing_period_start TIMESTAMPTZ DEFAULT NOW(),
    billing_period_end TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 month',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time usage tracking
CREATE TABLE user_usage (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    tokens_remaining INT DEFAULT 100000,
    tokens_used_total INT DEFAULT 0,
    tokens_used_this_period INT DEFAULT 0,
    requests_this_period INT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    last_reset_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation threads
CREATE TABLE threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

-- Usage history for billing/analytics
CREATE TABLE usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    thread_id UUID REFERENCES threads(id),
    tokens_prompt INT,
    tokens_completion INT,
    tokens_total INT,
    model TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only see their own threads"
    ON threads FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY "Users can only see their own usage"
    ON user_usage FOR SELECT
    USING (user_id = auth.uid());

-- Atomic token decrement function
CREATE OR REPLACE FUNCTION decrement_tokens(p_user_id UUID, p_tokens INT)
RETURNS void AS $$
BEGIN
    UPDATE user_usage
    SET 
        tokens_remaining = GREATEST(tokens_remaining - p_tokens, 0),
        tokens_used_total = tokens_used_total + p_tokens,
        tokens_used_this_period = tokens_used_this_period + p_tokens,
        requests_this_period = requests_this_period + 1,
        last_used_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- LangGraph will auto-create these tables via PostgresSaver.setup():
-- checkpoints, checkpoint_blobs, checkpoint_writes
```

---

## 8. Implementation Phases

### Phase 1: Frontend Integration (3-4 days)

- [ ] Install CopilotKit packages in Tauri app
- [ ] Wrap app with `<CopilotKit>` provider
- [ ] Add `<CopilotSidebar>` to Workbench
- [ ] Create auth context for JWT management
- [ ] Implement secure token storage (Rust keychain)

### Phase 2: Runtime Server (4-5 days)

- [ ] Create NestJS project
- [ ] Set up Supabase JWT verification
- [ ] Implement CopilotRuntime with LangGraphHttpAgent
- [ ] Add Redis for quota caching
- [ ] Create thread management endpoints
- [ ] Deploy to Railway/AWS

### Phase 3: Agent Server (5-7 days)
- [x] Create FastAPI project structure
- [x] Implement Deep Agents workflow with ReAct pattern
- [x] Create AG-UI endpoint with `add_langgraph_fastapi_endpoint`
- [x] Implement frontend/backend tool routing (CopilotKitMiddleware)
- [x] Configure partial state schema (TypedDict)
- [ ] Implement TokenTrackingCallback for billing
- [ ] Add internal key authentication middleware
- [ ] Deploy to cloud infrastructure

### Phase 4: Frontend Tools (3-4 days)
- [x] Implement mock tools for testing
- [ ] Implement real tool logic (file ops, terminal)
- [ ] Test tool execution flow
- [ ] Optimize latency
- [ ] Configure PostgresSaver with Supabase
- [ ] Implement token tracking callback
- [ ] Add internal key authentication
- [ ] Create AG-UI endpoint
- [ ] Deploy to same infrastructure

### Phase 4: Frontend Tools (3-4 days)

- [ ] Implement `useCopilotAction` for all file operations
- [ ] Implement terminal command tool
- [ ] Implement navigation tools
- [ ] Add `useCopilotReadable` for editor context
- [ ] Test E2E with agent

### Phase 5: Thread Management (2-3 days)

- [ ] Create thread list UI in sidebar
- [ ] Implement new/rename/delete thread
- [ ] Wire up threadId to CopilotKit
- [ ] Test conversation persistence

### Phase 6: Billing & Polish (3-4 days)

- [ ] Implement usage dashboard
- [ ] Add Stripe integration (future)
- [ ] Error handling and edge cases
- [ ] Performance optimization
- [ ] User testing

**Total Estimated Time: 20-27 days**

---

## 9. Key Research Findings

### CopilotKit

- **AG-UI Protocol**: Open standard for frontend ↔ agent communication
- **runtimeUrl**: Points to your server, not directly to agent
- **threadId**: Enables conversation persistence
- **useCopilotAction**: Define tools that execute on frontend
- **useCopilotReadable**: Share app state with agent
- **LangGraphHttpAgent**: Connect runtime to self-hosted agent

### DeepAgents

- **Purpose**: Solve context overflow and complex task handling
- **Middleware**: Composable features (TodoList, Filesystem, SubAgent)
- **Built-in Tools**: File ops, shell execution, task delegation
- **vs Raw LangGraph**: 80% of IDE agent features out of the box

### LangGraph

- **PostgresSaver**: Persist conversation state to Postgres
- **thread_id**: Unique identifier for each conversation
- **Checkpoints**: Automatic state snapshots for resume
- **Supabase Compatible**: Use same DB for app and agent state

### Token Tracking

- **LangChain Callbacks**: `on_llm_end` provides token counts
- **Batch Updates**: Single DB write at end of workflow
- **Pre-flight Check**: Reject before running if quota low
- **Graceful Stop**: Interrupt agent if quota exceeded mid-run

---

## 10. Code Examples

### Frontend: CopilotKit Setup

```typescript
// src/App.tsx
import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import { useAuth } from "./contexts/AuthContext";
import "@copilotkit/react-ui/styles.css";

export function App() {
  const { token, threadId, setThreadId } = useAuth();

  if (!token) return <LoginScreen />;

  return (
    <CopilotKit
      runtimeUrl="https://api.codesurf.ai/copilotkit"
      threadId={threadId}
      headers={{
        Authorization: `Bearer ${token}`,
      }}
      agent="codesurf_agent"
    >
      <AgentToolsProvider>
        <CopilotSidebar
          labels={{ title: "CodeSurf AI" }}
          defaultOpen={false}
        >
          <Workbench />
        </CopilotSidebar>
      </AgentToolsProvider>
    </CopilotKit>
  );
}
```

### Frontend: Define Tools

```typescript
// src/hooks/useAgentTools.ts
import { useCopilotAction } from "@copilotkit/react-core";
import { invoke } from "@tauri-apps/api/core";

export function useAgentTools() {
  useCopilotAction({
    name: "create_file",
    description: "Create a new file with the given content",
    parameters: [
      { name: "path", type: "string", required: true },
      { name: "content", type: "string", required: true },
    ],
    handler: async ({ path, content }) => {
      await invoke("write_file", { path, content });
      return { success: true, message: `Created ${path}` };
    },
  });

  useCopilotAction({
    name: "run_terminal",
    description: "Run a command in the terminal",
    parameters: [
      { name: "command", type: "string", required: true },
    ],
    handler: async ({ command }) => {
      await invoke("pty_write", { id: getActiveTerminalId(), data: command + "\n" });
      return { executed: true };
    },
  });
}
```

### NestJS: Runtime Controller

```typescript
// src/copilotkit/copilotkit.controller.ts
import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { CopilotRuntime, LangGraphHttpAgent, copilotRuntimeNestEndpoint } from '@copilotkit/runtime';
import { SupabaseAuthGuard } from '../auth/supabase.guard';
import { QuotaGuard } from '../billing/quota.guard';

@Controller()
export class CopilotKitController {
  private runtime: CopilotRuntime;

  constructor() {
    this.runtime = new CopilotRuntime({
      agents: {
        codesurf_agent: new LangGraphHttpAgent({
          url: process.env.AGENT_URL,
          headers: {
            'X-Internal-Key': process.env.INTERNAL_API_KEY,
          },
        }),
      },
    });
  }

  @All('/copilotkit')
  @UseGuards(SupabaseAuthGuard, QuotaGuard)
  async copilotkit(@Req() req, @Res() res) {
    const handler = copilotRuntimeNestEndpoint({
      runtime: this.runtime,
      endpoint: '/copilotkit',
    });
    return handler(req, res);
  }
}
```

### Python: Agent Server

```python
# agent/main.py
import os
from fastapi import FastAPI, HTTPException, Request
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from agent.graph import create_codesurf_agent

app = FastAPI()
INTERNAL_API_KEY = os.environ["INTERNAL_API_KEY"]

# Internal auth middleware
@app.middleware("http")
async def verify_internal_key(request: Request, call_next):
    if request.url.path.startswith("/agent/"):
        key = request.headers.get("X-Internal-Key")
        if key != INTERNAL_API_KEY:
            raise HTTPException(403, "Forbidden")
    return await call_next(request)

# Initialize agent with Postgres checkpointer
async def get_agent():
    checkpointer = await AsyncPostgresSaver.from_conn_string(
        os.environ["SUPABASE_DB_URL"]
    )
    await checkpointer.setup()
    
    graph = create_codesurf_agent().compile(checkpointer=checkpointer)
    return graph

# AG-UI endpoint
@app.on_event("startup")
async def startup():
    graph = await get_agent()
    add_langgraph_fastapi_endpoint(
        app=app,
        agent=LangGraphAGUIAgent(
            name="codesurf_agent",
            description="AI coding assistant for CodeSurf IDE",
            graph=graph,
        ),
        path="/agent/codesurf",
    )

@app.get("/health")
def health():
    return {"status": "ok"}
```

---

## 11. Deployment Strategy

### Infrastructure

| Service | Platform | Purpose |
|---------|----------|---------|
| Runtime (NestJS) | Railway | API gateway |
| Agent (FastAPI) | Railway (same project) | AI processing |
| Database | Supabase | Auth + data + checkpoints |
| Cache | Upstash Redis | Quota caching |
| Monitoring | Sentry | Error tracking |

### Environment Variables

```bash
# NestJS Runtime
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...
AGENT_URL=http://agent:8000/agent/codesurf
INTERNAL_API_KEY=your-secret-internal-key
REDIS_URL=redis://...

# Python Agent
SUPABASE_DB_URL=postgresql://...
INTERNAL_API_KEY=your-secret-internal-key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Security Checklist

- [ ] HTTPS only (no HTTP)
- [ ] CORS configured for Tauri origins
- [ ] JWT verification on all protected routes
- [ ] Internal key for agent ↔ runtime
- [ ] Rate limiting enabled
- [ ] Request logging for audit
- [ ] Secrets in environment variables
- [ ] Supabase RLS enabled

---

## Appendix: Links & Resources

### Documentation

- [CopilotKit Docs](https://docs.copilotkit.ai/)
- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [DeepAgents](https://github.com/langchain-ai/deepagents)
- [AG-UI Protocol](https://docs.copilotkit.ai/ag-ui-protocol)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

### Packages

```bash
# Frontend (npm)
@copilotkit/react-core
@copilotkit/react-ui
@tauri-apps/api
@supabase/supabase-js

# Runtime (npm)
@copilotkit/runtime
@nestjs/common
ioredis

# Agent (pip)
copilotkit
ag-ui-langgraph
deepagents
langgraph
langgraph-checkpoint-postgres
fastapi
uvicorn
```

---

*This document will be updated as implementation progresses.*

---

## 5.2 Authentication Implementation (COMPLETE)

> **Implemented:** 2026-01-10
> **Status:** ✅ Fully Functional

### Overview

Google OAuth authentication is implemented using Supabase Auth with PKCE flow, allowing secure user login in the desktop Tauri application.

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. User clicks "Continue with Google"                                       │
│     └─→ signInWithGoogle() called                                           │
│         └─→ supabase.auth.signInWithOAuth({ provider: 'google' })           │
│             └─→ Opens browser to Google login                               │
│                                                                             │
│  2. User completes Google login                                             │
│     └─→ Google redirects to Supabase                                       │
│         └─→ Supabase redirects to: codesurf://auth/callback?code=xxx       │
│                                                                             │
│  3. Tauri app captures deep link                                            │
│     └─→ tauri-plugin-single-instance ensures running app receives it       │
│         └─→ onOpenUrl listener triggered                                   │
│             └─→ handleAuthCallback() called                                 │
│                 └─→ supabase.auth.exchangeCodeForSession(code)             │
│                     └─→ Session set, user authenticated ✅                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Supabase Client | `src/services/supabase/index.ts` | Auth functions, deep-link handling |
| Auth Context | `src/contexts/AuthContext.tsx` | React state management for auth |
| Login Screen | `src/components/Auth/LoginScreen.tsx` | Premium login UI |
| Deep Link Plugin | `src-tauri/src/lib.rs` | Register `codesurf://` scheme |
| Single Instance | `src-tauri/src/lib.rs` | Forward callbacks to running app |

### Configuration Files

**`src-tauri/tauri.conf.json`**:
```json
{
  "plugins": {
    "deep-link": {
      "desktop": {
        "schemes": ["codesurf"]
      }
    }
  }
}
```

**`src-tauri/capabilities/default.json`**:
```json
{
  "permissions": [
    "deep-link:default",
    "core:event:default"
  ]
}
```

**`src-tauri/Cargo.toml`**:
```toml
tauri-plugin-deep-link = "2.4.6"
tauri-plugin-single-instance = { version = "2", features = ["deep-link"] }
```

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Dashboard Configuration

1. **Authentication → Providers → Google**: Enable and add OAuth credentials
2. **Authentication → URL Configuration**: Add `codesurf://auth/callback` to Redirect URLs

### User Profile Features

- **Activity Bar Avatar**: Shows Google profile picture with dropdown menu
- **Personalized Greeting**: Welcome screen shows "Good morning/afternoon/evening, {name}!"
- **Sign Out**: Available from user dropdown menu

### Security Features

- **PKCE Flow**: Secure code exchange, no tokens in URL
- **Single Instance**: Prevents callback hijacking by duplicate apps
- **Session Persistence**: Automatic token refresh via Supabase

### Next Steps

The JWT token from `session.access_token` will be used for:
1. API requests to the NestJS Runtime server (production)
2. User identification for token billing
3. Thread ownership verification

---

## 12. CopilotKit v1.50 API Reference

> **Important:** This section documents the CopilotKit v1.50+ API changes. Always use Context7 to verify the latest API.

### Installation

```bash
npm install @copilotkit/react-core@latest @copilotkit/react-ui@latest @copilotkit/runtime@latest
```

### Provider Setup (v1.50)

The `<CopilotKit>` provider now uses `properties` prop instead of `headers` for authentication:

```tsx
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

<CopilotKit
  runtimeUrl="/api/copilotkit"
  properties={{
    authorization: session?.access_token,  // JWT from Supabase
  }}
>
  <CopilotSidebar
    defaultOpen={false}
    clickOutsideToClose={false}
    labels={{
      title: "CodeSurf AI",
      initial: "Hi! I'm your AI coding assistant...",
    }}
  >
    <YourApp />
  </CopilotSidebar>
</CopilotKit>
```

### Frontend Tools (v1.50)

Use `useFrontendTool` hook for client-side tools:

```tsx
import { useFrontendTool } from "@copilotkit/react-core";

useFrontendTool({
  name: "create_file",
  description: "Create a new file in the project",
  parameters: [
    { name: "path", type: "string", description: "File path", required: true },
    { name: "content", type: "string", description: "File content", required: true },
  ],
  handler: async ({ path, content }) => {
    await invoke("write_file", { path, content });
    return `Created ${path}`;
  },
});
```

### Key API Changes from Previous Versions

| Old API | New API (v1.50+) | Notes |
|---------|------------------|-------|
| `headers` prop | `properties` prop | Auth tokens in `properties.authorization` |
| `useCopilotAction` (for agent tools) | `useFrontendTool` | Dedicated hook for frontend-only tools |
| N/A | `available: "remote"` | Makes actions agent-only |

---

## 13. Actual Agent Implementation

### Directory Structure

```
agent/
├── main.py              # FastAPI entry point + AG-UI endpoint
├── requirements.txt     # Python dependencies
├── myvenv/              # Virtual environment
└── src/
    ├── agent.py         # LangGraph workflow with ReAct pattern
    └── util.py          # Tool routing helper functions
```

### FastAPI Entry Point (`main.py`)

```python
from fastapi import FastAPI
from src.agent import graph
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

app = FastAPI()

add_langgraph_fastapi_endpoint(
    app=app,
    agent=LangGraphAGUIAgent(
        name="sample_agent",
        description="CodeSurf AI coding assistant",
        graph=graph,
    ),
    path="/",
)
```

### LangGraph Workflow (`src/agent.py`)

```python
from copilotkit import CopilotKitState
from langgraph.graph import StateGraph
from langgraph.prebuilt import ToolNode

class AgentState(CopilotKitState):
    """Inherits copilotkit.actions for frontend tools"""
    proverbs: List[str]

async def chat_node(state: AgentState, config: RunnableConfig):
    # 1. Get frontend tools from state
    fe_tools = state.get("copilotkit", {}).get("actions", [])
    
    # 2. Bind both frontend and backend tools
    model_with_tools = model.bind_tools([*fe_tools, *backend_tools])
    
    # 3. Run model and route appropriately
    response = await model_with_tools.ainvoke([...])
    
    if should_route_to_tool_node(response.tool_calls, fe_tools):
        return Command(goto="tool_node", update={"messages": response})
    
    return Command(goto="__end__", update={"messages": response})

workflow = StateGraph(AgentState)
workflow.add_node("chat_node", chat_node)
workflow.add_node("tool_node", ToolNode(tools=backend_tools))
workflow.add_edge("tool_node", "chat_node")
workflow.set_entry_point("chat_node")

graph = workflow.compile(checkpointer=MemorySaver())
```

### Tool Routing Logic (`src/util.py`)

```python
def should_route_to_tool_node(tool_calls, fe_tools):
    """
    Returns True if all tool calls are backend tools.
    Returns False if any tool call is a frontend tool.
    """
    fe_tool_names = {tool.get("name") for tool in fe_tools}
    
    for tool_call in tool_calls:
        if tool_call.get("name") in fe_tool_names:
            return False  # Frontend handles this
    
    return True  # Backend ToolNode handles this
```

### Python Dependencies (`requirements.txt`)

```
copilotkit==0.1.74
langchain==1.0.1
langchain-openai==1.0.1
langgraph==1.0.1
openai==1.109.1
fastapi==0.115.12
uvicorn>=0.38.0
python-dotenv>=1.0.0
ag-ui-langgraph==0.0.22
pydantic>=2.0.0<3.0.0
```

### Running the Agent

```bash
cd agent
python -m venv myvenv
source myvenv/bin/activate  # or myvenv\Scripts\activate on Windows
pip install -r requirements.txt
python main.py  # Starts on port 8123
```

### Connection Flow

```
┌─────────────────────┐     ┌─────────────────────┐
│   Tauri Frontend    │     │   Python Agent      │
│   (CopilotKit)      │────▶│   (FastAPI + AG-UI) │
│   Port: Dev Server  │     │   Port: 8123        │
└─────────────────────┘     └─────────────────────┘
         │                           │
         │ useFrontendTool           │ Backend Tools
         │ (file ops, terminal)      │ (get_weather, etc)
         ▼                           ▼
   Local Execution            Agent Execution
```
