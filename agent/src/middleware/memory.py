"""
Memory Middleware

Injects memory management instructions into the agent's system prompt.
Does NOT access the filesystem - that's done through frontend tools.
"""

from typing import Any, Dict
from langchain.agents.middleware import AgentMiddleware
from langgraph.runtime import Runtime
from langchain_core.messages import SystemMessage


class WannaCodeMemoryMiddleware(AgentMiddleware):
    """
    Middleware that injects memory management instructions.
    
    The agent will use frontend tools (read_file, write_file) to:
    - Check .wannacode/ for previous work
    - Save findings to .wannacode/
    
    This middleware only adds instructions, it does NOT access files directly.
    """
    
    tools = []  # No additional tools needed
    
    def before_model(self, state: Dict[str, Any], runtime: Runtime) -> Dict[str, Any] | None:
        """
        Inject memory management instructions into the system prompt.
        """
        memory_instructions = """

# MEMORY MANAGEMENT (.wannacode/ folder)

You have access to a persistent memory system in the `.wannacode/` folder:

## Structure:
- `.wannacode/memory/` - Task history and results
- `.wannacode/skills/` - Reusable code patterns
- `.wannacode/findings/` - Codebase analysis

## How to use:

### Before starting a task:
Try to read relevant memory files using the file reading tool:
```
# Example: read_file(".wannacode/memory/auth_implementation.md")
```
If the file doesn't exist, you'll get an error - that's fine, just proceed.

### After completing a task:
Save your findings using the file writing tool:
```
# Example: write_file(".wannacode/memory/task_name.md", "# Task Results\\n\\nWhat you did...")
```

The frontend will create the folder structure automatically when you write files.

## Benefits:
- Avoid re-doing work
- Learn from past solutions
- Share knowledge between sessions
- Build up project understanding over time

**Always check memory before starting work!**
"""
        
        # Inject into system message
        messages = state.get("messages", [])
        if messages and isinstance(messages[0], SystemMessage):
            original_content = messages[0].content
            
            # Avoid duplicate injection
            if "# MEMORY MANAGEMENT" not in original_content:
                new_content = original_content + memory_instructions
                new_messages = [SystemMessage(content=new_content)] + messages[1:]
                return {"messages": new_messages}
        
        return None

