# AI Panel UI/UX Feature

> **Status:** ✅ Complete (2026-01-11) | **AG-UI Fix:** ✅ Complete (2026-01-12)  
> **Component:** `src/components/AI/AIPanel.tsx`

## Overview

A fully custom, headless AI chat interface built with CopilotKit's premium features, designed with a Perplexity-inspired minimal aesthetic and optimized UX for AI-assisted development.

## Key Features

### 1. **Resizable Panel**
- Drag-to-resize handle on left edge
- Width range: 320px (min) to 800px (max)
- Panel width persisted in Zustand store (`panelDimensions.aiPanelWidth`)
- Visual feedback: Purple highlight on hover/drag

### 2. **Toggle Controls**
- **TitleBar Icon**: Sparkles icon in right-side actions area
- **View Menu**: "AI Assistant" menu item with `Ctrl+Shift+I` shortcut  
- **Active State**: Icon highlights when panel is open
- Store integration: `isAIPanelVisible`, `toggleAIPanel()`

### 3. **Streaming Think Block**
- Parses `<think>...</think>` tags from AI responses
- **Progressive Rendering**: Detects partial/unclosed tags during streaming
  - `<think>content</think>` → Complete block (collapsible)
  - `<think>content...` → Streaming block (auto-expanded)
- **UI Components**:
  - Brain icon + "Thinking..." header (streaming) / "Thought Process" (complete)
  - Pulsing purple dot indicator while streaming
  - Blinking cursor (▋) at content end during streaming
  - Click header to expand/collapse
- **Scrollable**: Max height 200px with custom purple scrollbar

### 4. **Smart Message Truncation**
- **User Messages**: Auto-truncate at 150 characters
- **Expand/Collapse**: "Show more/less" button
- **State Tracking**: Uses `Set<string>` to track expanded messages
- Prevents overwhelming UI with long prompts

### 5. **Perplexity-Inspired Design**
- **Typography Hierarchy**:
  - User messages: 24px, bold (500), pure white → Looks like section headings
  - AI messages: 14px, normal, softer gray → Looks like paragraph text
- **Minimal Aesthetic**:
  - ✅ No message bubbles/backgrounds
  - ✅ No user/AI name labels
  - ✅ No avatar icons
  - ✅ Left-aligned document flow
- **Result**: Reads like a generated article/document (Q&A style)

### 6. **Generative UI (AG-UI Protocol)** ⭐ NEW
- **Custom Tool Rendering**: Both `useCopilotAction` and `useFrontendTool` now have `render` functions
- **Real-time Status Updates**: Shows tool execution state (inProgress → executing → complete)
- **Interactive Components**: 
  - File creation tools display path, content preview, and status
  - Tokyo Night color scheme (blue, yellow, green for different states)
  - Scrollable content previews for long file content
- **Render Props**:
  - `status`: 'inProgress' | 'executing' | 'complete'
  - `args`: Tool parameters in real-time
  - `result`: Tool execution result (when complete)

## Technical Implementation

### CopilotKit Integration
```typescript
// Uses premium headless hook
const { messages, sendMessage, stopGeneration, isLoading } = useCopilotChatHeadless_c();

// Configured with public license key in App.tsx
<CopilotKit 
  runtimeUrl="/api/copilotkit"
  publicLicenseKey="ck_pub_fa79034fd22de4f39fafa83479af81db"
>
```

### AG-UI Rendering (NEW)
```typescript
// Tools with render functions create generativeUI
useCopilotAction({
  name: "create_file",
  handler: async ({ path, content }) => {
    // Execute tool logic
    return result;
  },
  // 🎨 This creates the generativeUI attached to messages
  render: ({ status, args, result }) => {
    return (
      <div>
        {/* Custom React component */}
        <p>Status: {status}</p>
        <p>Path: {args.path}</p>
      </div>
    );
  },
});

// In message rendering
{isAIMessage(msg) && msg.generativeUI?.()} // Renders the custom UI
```

### Message Parsing
```typescript
interface ParsedContent {
  thinkContent: string | null;
  mainContent: string;
  isThinking: boolean; // True if still inside an unclosed <think> tag
}

function parseThinkTags(content: string): ParsedContent {
  // Handles both complete and partial think tags
  // - Complete: <think>...</think>
  // - Streaming: <think>... (no closing tag yet)
}
```

### Resizing Logic
```typescript
const handleResizeStart = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  setIsResizing(true);
}, []);

useEffect(() => {
  if (!isResizing) return;
  const handleMouseMove = (e: MouseEvent) => {
    const newWidth = parentRect.right - e.clientX;
    const clampedWidth = Math.max(320, Math.min(800, newWidth));
    setPanelDimensions({ aiPanelWidth: clampedWidth });
  };
  // ... event listeners
}, [isResizing]);
```

### State Management (Zustand)
```typescript
interface AppStore {
  isAIPanelVisible: boolean;
  toggleAIPanel: () => void;
  panelDimensions: {
    sidebarWidth: number;
    terminalHeight: number;
    aiPanelWidth?: number; // Added for AI panel
  };
  setPanelDimensions: (dimensions: Partial<PanelDimensions>) => void;
}
```

## Design Philosophy

### Why Perplexity-Style?

Traditional chat interfaces use visual artifacts (bubbles, colors, avatars) to distinguish speakers. Perplexity demonstrates that **typography alone** is sufficient:

1.  **User Input** → Large heading creates visual hierarchy
2.  **AI Response** → Standard text creates reading flow
3.  **Result** → Feels like a document, not a chat

This approach:
- ✅ Reduces visual clutter
- ✅ Improves scannability (larger user text = easy to find questions)
- ✅ Feels more "professional" and "document-like"
- ✅ Better for long conversations (less UI noise)

### Why No Avatars/Bubbles?

- **Avatars**: Redundant when typography already distinguishes roles
- **Bubbles**: Create visual boxes that interrupt reading flow
- **Result**: Pure content focus, better for technical discussions

## File Structure

```
src/components/AI/
├── AIPanel.tsx           # Main component (~590 lines)
│   ├── Icons (Minimal SVG components)
│   ├── ThinkBlock (Collapsible reasoning component)
│   ├── useIDETools (Tool definitions with render functions)
│   ├── Message parsing helpers
│   └── AIPanel (Main component with resizing, state)
│
└── AIPanel.css           # Styles (~380 lines)
    ├── Panel layout & resizer
    ├── Welcome screen
    ├── Messages (Perplexity typography)
    ├── Think block (scrollable, streaming states)
    ├── Markdown rendering
    └── Input area
```

## Dependencies

```json
{
  "@copilotkit/react-core": "^1.50.1",
  "@copilotkit/shared": "^1.50.1",
  "react-markdown": "^10.1.0"
}
```

## Future Enhancements

- [ ] Code syntax highlighting in AI responses
- [ ] Copy code button on code blocks
- [ ] Message threading/branching
- [ ] Export conversation to markdown
- [ ] Voice input integration
- [ ] Inline file attachment preview

## Testing Checklist

- [x] Panel resizes smoothly without lag
- [x] Think blocks render progressively during streaming
- [x] Long user messages truncate with expand button
- [x] Messages are clearly distinguishable by size/weight
- [x] Scrolling works correctly in think blocks and main panel
- [x] Toggle controls (icon + menu) work correctly
- [x] Panel width persists across sessions
- [x] Markdown rendering works (code blocks, lists, etc.)
- [x] Loading indicator displays during AI generation
- [x] **Generative UI renders correctly for tool calls** ⭐ NEW
- [x] **Custom UI components show real-time tool execution status** ⭐ NEW
- [ ] *E2E test with real AI agent pending*

## Related Documentation

- [`/project_plan.md`](../project_plan.md) - Full project overview
- [`/docs/ai-integration-architecture.md`](../docs/ai-integration-architecture.md) - AI system architecture
- [CopilotKit Docs](https://docs.copilotkit.ai) - Official documentation
