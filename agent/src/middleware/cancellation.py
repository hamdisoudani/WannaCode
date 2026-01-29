"""
Cancellation Middleware for LangGraph Agent

Detects client disconnects and gracefully cancels agent execution.
"""

import asyncio
from typing import Any, Dict
from langchain.agents.middleware.types import AgentMiddleware
from langgraph.runtime import Runtime
from copilotkit import CopilotKitState


class CancellationMiddleware(AgentMiddleware):
    """
    Middleware to detect and handle request cancellation.
    
    Checks if the client has disconnected before each tool call
    and raises CancelledError to stop execution gracefully.
    """
    
    tools = []  # No tools
    
    def __init__(self):
        super().__init__()
        self.cancelled = False
    
    def before_model(self, state: CopilotKitState, runtime: Runtime) -> Dict[str, Any] | None:
        """
        Check if request is cancelled before calling the model.
        """
        # Check if asyncio task is cancelled
        try:
            current_task = asyncio.current_task()
            if current_task and current_task.cancelled():
                raise asyncio.CancelledError("Request cancelled by client")
        except RuntimeError:
            # No event loop running, continue
            pass
        
        return None
    
    def before_tool(self, state: CopilotKitState, runtime: Runtime) -> Dict[str, Any] | None:
        """
        Check if request is cancelled before calling tools.
        """
        # Check if asyncio task is cancelled
        try:
            current_task = asyncio.current_task()
            if current_task and current_task.cancelled():
                raise asyncio.CancelledError("Request cancelled by client")
        except RuntimeError:
            # No event loop running, continue
            pass
        
        return None
