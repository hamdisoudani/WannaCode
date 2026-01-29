"""
CodeSurf Deep Agent

Uses LangChain's Deep Agents package with CopilotKit integration.
Frontend tools are sent by CopilotKit as JSON in state.copilotkit.actions.

This file contains:
1. DebugMiddleware - Logs state to understand what CopilotKit sends
2. CopilotKitToolsMiddleware - Will read and bind frontend tools (after debugging)
"""

from typing import Any, Dict, List, Callable, Awaitable
from langchain.agents.middleware import AgentMiddleware
from langgraph.runtime import Runtime
# from langgraph.checkpoint.memory import MemorySaver # Not needed for LangGraph Platform
# from deepagents import create_deep_agent # Using custom one
from copilotkit import CopilotKitState
import json
from copilotkit import CopilotKitMiddleware, CopilotKitState 

from langchain_core.messages import SystemMessage
from src.model import get_model
from src.prompts import SUPERVISOR_SYSTEM_PROMPT
from src.subagents import CODING_AGENT_SYSTEM_PROMPT

# Import necessary types for the custom factory
from collections.abc import Callable, Sequence
from typing import Any
from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware, InterruptOnConfig, TodoListMiddleware
from langchain.agents.middleware.summarization import SummarizationMiddleware
from langchain.agents.middleware.types import AgentMiddleware
from langchain.agents.structured_output import ResponseFormat
from langchain.chat_models import init_chat_model
from langchain_anthropic.middleware import AnthropicPromptCachingMiddleware
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import BaseTool
from langgraph.cache.base import BaseCache
from langgraph.graph.state import CompiledStateGraph
from langgraph.store.base import BaseStore
from langgraph.types import Checkpointer

from deepagents.backends import StateBackend
from deepagents.backends.protocol import BackendFactory, BackendProtocol
# from deepagents.middleware.filesystem import FilesystemMiddleware # Removed
# from deepagents.middleware.memory import MemoryMiddleware # Removed - using custom WannaCodeMemoryMiddleware
from deepagents.middleware.patch_tool_calls import PatchToolCallsMiddleware
from deepagents.middleware.skills import SkillsMiddleware
from deepagents.middleware.subagents import CompiledSubAgent, SubAgent, SubAgentMiddleware
from deepagents.graph import get_default_model, BASE_AGENT_PROMPT

class ContextInjectionMiddleware(AgentMiddleware):
    """
    Middleware to inject useCopilotReadable context into the system prompt.
    """
    
    tools = []  # No tools
    
    def before_model(self, state: CopilotKitState, runtime: Runtime) -> Dict[str, Any] | None:
        """
        Inject readable context into the system prompt.
        """
        copilotkit = state.get("copilotkit", {})
        # Note: key is 'context' in newer copilotkit versions, 'properties' in older ones
        # We'll check both for compatibility
        properties = copilotkit.get("context", copilotkit.get("properties", {}))
        
        # Format properties into a context string
        context_str = "\n\n# CURRENT CONTEXT\n"
        has_context = False
        print(f"\n🤖 CopilotKit properties: {properties}")
        # Helper to safely iterate
        if isinstance(properties, list):
            # CopilotKit sends a list of Context objects with 'description' and 'value' attributes
            for item in properties:
                has_context = True
                # The item might be an object/dict or a Context class instance
                # We need to handle both cases safely
                try:
                    # Get description
                    if hasattr(item, 'description'):
                        desc = item.description
                    else:
                        desc = item.get('description', 'Context')
                        
                    # Get value
                    if hasattr(item, 'value'):
                        val = item.value
                    else:
                        val = item.get('value', '')
                        
                    # Value might be a JSON string, try to parse for cleaner output
                    if isinstance(val, str) and val.startswith('{'):
                        try:
                            val_dict = json.loads(val)
                            # Pretty print JSON string values
                            val = json.dumps(val_dict, indent=2)
                        except:
                            pass
                            
                    context_str += f"- **{desc}**: {val}\n"
                except Exception as e:
                    print(f"⚠️ Error parsing context item: {e}")
                    
        elif isinstance(properties, dict):
            # Older format or direct dict
            for key, value in properties.items():
                has_context = True
                if isinstance(value, dict) and "value" in value:
                    desc = value.get("description", key)
                    val = value.get("value")
                    context_str += f"- **{desc}**: {val}\n"
                else:
                    context_str += f"- **{key}**: {value}\n"
                
        if not has_context:
            return None
            
        # Prepend to system prompt (first message) or append as new system message
        messages = state.get("messages", [])
        if messages and isinstance(messages[0], SystemMessage):
            # Update existing system prompt
            original_content = messages[0].content
            
            # Avoid duplicate injection
            if "# CURRENT CONTEXT" in original_content:
                # If context changed, we might want to update it, but simplistic check for now
                return None
                
            new_content = original_content + context_str
            new_messages = [SystemMessage(content=new_content)] + messages[1:]
            return {"messages": new_messages}
        
        return None


def create_custom_deep_agent(
    model: str | BaseChatModel | None = None,
    tools: Sequence[BaseTool | Callable | dict[str, Any]] | None = None,
    *,
    system_prompt: str | None = None,
    middleware: Sequence[AgentMiddleware] = (),
    subagents: list[SubAgent | CompiledSubAgent] | None = None,
    skills: list[str] | None = None,
    memory: list[str] | None = None,
    response_format: ResponseFormat | None = None,
    context_schema: type[Any] | None = None,
    checkpointer: Checkpointer | None = None,
    store: BaseStore | None = None,
    backend: BackendProtocol | BackendFactory | None = None,
    interrupt_on: dict[str, bool | InterruptOnConfig] | None = None,
    debug: bool = False,
    name: str | None = None,
    cache: BaseCache | None = None,
    subagent_middleware: Sequence[AgentMiddleware] = (),  # NEW: Allow passing middleware for subagents
) -> CompiledStateGraph:
    """
    Custom implementation of create_deep_agent that DOES NOT include FilesystemMiddleware.
    """
    if model is None:
        model = get_default_model()
    elif isinstance(model, str):
        model = init_chat_model(model)

    if (
        getattr(model, "profile", None) is not None
        and isinstance(model.profile, dict)
        and "max_input_tokens" in model.profile
        and isinstance(model.profile["max_input_tokens"], int)
    ):
        trigger = ("fraction", 0.85)
        keep = ("fraction", 0.10)
    else:
        # Default for most models
        trigger = ("tokens", 120000) # Slightly lower than max for safety
        keep = ("messages", 10)

    # Build middleware stack for subagents (includes skills if provided)
    subagent_middleware_list: list[AgentMiddleware] = [
        TodoListMiddleware(),
    ]
    
    # Add custom subagent middleware first (e.g., CopilotKitMiddleware)
    if subagent_middleware:
        subagent_middleware_list.extend(subagent_middleware)

    backend = backend if backend is not None else (lambda rt: StateBackend(rt))

    if skills is not None:
        subagent_middleware_list.append(SkillsMiddleware(backend=backend, sources=skills))
    
    subagent_middleware_list.extend(
        [
            # FilesystemMiddleware(backend=backend), # REMOVED
            SummarizationMiddleware(
                model=model,
                trigger=trigger,
                keep=keep,
                trim_tokens_to_summarize=None,
            ),
            AnthropicPromptCachingMiddleware(unsupported_model_behavior="ignore"),
            PatchToolCallsMiddleware(),
        ]
    )

    # Build main agent middleware stack
    deepagent_middleware: list[AgentMiddleware] = [
        TodoListMiddleware(),
    ]
    # Note: memory parameter is not used - we use custom WannaCodeMemoryMiddleware instead
    if skills is not None:
        deepagent_middleware.append(SkillsMiddleware(backend=backend, sources=skills))
    
    deepagent_middleware.extend(
        [
            # FilesystemMiddleware(backend=backend), # REMOVED
            SubAgentMiddleware(
                default_model=model,
                default_tools=tools,
                subagents=subagents if subagents is not None else [],
                default_middleware=subagent_middleware_list,
                default_interrupt_on=interrupt_on,
                general_purpose_agent=True,
            ),
            SummarizationMiddleware(
                model=model,
                trigger=trigger,
                keep=keep,
                trim_tokens_to_summarize=None,
            ),
            AnthropicPromptCachingMiddleware(unsupported_model_behavior="ignore"),
            PatchToolCallsMiddleware(),
        ]
    )
    if middleware:
        deepagent_middleware.extend(middleware)
    if interrupt_on is not None:
        deepagent_middleware.append(HumanInTheLoopMiddleware(interrupt_on=interrupt_on))

    return create_agent(
        model,
        system_prompt=system_prompt + "\n\n" + BASE_AGENT_PROMPT if system_prompt else BASE_AGENT_PROMPT,
        tools=tools,
        middleware=deepagent_middleware,
        response_format=response_format,
        context_schema=context_schema,
        checkpointer=checkpointer,
        store=store,
        debug=debug,
        name=name,
        cache=cache,
    ).with_config({"recursion_limit": 1000})


from src.middleware.cancellation import CancellationMiddleware
from src.middleware.memory import WannaCodeMemoryMiddleware
from src.middleware.debug import DebugToolsMiddleware

def create_codesurf_agent():
    """
    Create the CodeSurf agent with supervisor and coding subagent.
    """
    # Get our custom model
    model = get_model()
    
    # Note: When using LangGraph Platform (langgraph dev), 
    # checkpointer is provided automatically by the platform.
    checkpointer = None  # Let LangGraph Platform handle persistence
    
    # Define the Coding Subagent
    coding_subagent = SubAgent(
        name="coding_agent",
        description="Specialized agent for code exploration, modification, testing, and execution. Handles all implementation work.",
        system_prompt=CODING_AGENT_SYSTEM_PROMPT,
        tools=[],  # Will inherit frontend tools from parent
    )
    
    # Create the supervisor agent with coding subagent
    agent = create_custom_deep_agent(
        model=model,
        system_prompt=SUPERVISOR_SYSTEM_PROMPT,
        middleware=[
            CopilotKitMiddleware(), # Inject frontend tools first
            DebugToolsMiddleware(), # Debug: Log available tools
            ContextInjectionMiddleware(), # Inject context into prompt
            WannaCodeMemoryMiddleware(), # Inject memory management instructions
            CancellationMiddleware(), # Handle client disconnects
        ],
        subagent_middleware=[
            CopilotKitMiddleware(), # IMPORTANT: Subagents also need access to frontend tools
        ],
        context_schema=CopilotKitState,
        tools=[],  # No static tools - will come from CopilotKit
        subagents=[coding_subagent],  # Add the coding subagent
        checkpointer=checkpointer,
    )
    
    return agent


# Create the agent graph for export
graph = create_codesurf_agent()
