"""
Debug Middleware

Logs information about tools and state for debugging purposes.
"""

from typing import Any, Dict
from langchain.agents.middleware import AgentMiddleware
from langgraph.runtime import Runtime


class DebugToolsMiddleware(AgentMiddleware):
    """
    Middleware that logs available tools for debugging.
    """
    
    tools = []  # No additional tools
    
    def before_model(self, state: Dict[str, Any], runtime: Runtime) -> Dict[str, Any] | None:
        """
        Log available tools before model call.
        """
        # Check state for CopilotKit tools
        copilotkit = state.get("copilotkit", {})
        copilotkit_actions = copilotkit.get("actions", [])
        
        print(f"\n🔧 DEBUG: CopilotKit actions in state: {len(copilotkit_actions)}")
        if copilotkit_actions:
            action_names = [a.get('name', 'unknown') if isinstance(a, dict) else getattr(a, 'name', 'unknown') for a in copilotkit_actions]
            print(f"   Action names: {action_names}")
        else:
            print("   ⚠️ No CopilotKit actions found in state!")
        
        # Don't modify state
        return None
