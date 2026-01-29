# Prompts package
# All system prompts for agents are defined here

from .orchestrator import ORCHESTRATOR_SYSTEM_PROMPT
from .supervisor import SUPERVISOR_SYSTEM_PROMPT

__all__ = ["ORCHESTRATOR_SYSTEM_PROMPT", "SUPERVISOR_SYSTEM_PROMPT"]
