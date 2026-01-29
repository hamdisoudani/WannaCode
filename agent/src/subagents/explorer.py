"""
Explorer Subagent (Future Implementation)

Role: Explores the project structure, finds files related to specific features,
reads their logic, and returns a summary to the orchestrator.

Example use case:
- "Find all files related to authentication"
- "What components use the UserContext?"
- "Show me the data flow for the login feature"

This subagent will be spawned by the orchestrator when deep exploration is needed.
"""

# TODO: Implement when SubAgentMiddleware is integrated
# 
# EXPLORER_SYSTEM_PROMPT = '''You are a code explorer agent.
# Your role is to analyze project structure and find related code.
# 
# When exploring:
# 1. Start with the file tree to understand structure
# 2. Search for relevant patterns and imports
# 3. Read key files to understand the logic
# 4. Summarize your findings for the main agent
# '''
#
# explorer_subagent = {
#     "name": "explorer",
#     "description": "Explores project structure and finds related code",
#     "prompt": EXPLORER_SYSTEM_PROMPT,
#     "tools": [],  # Will use frontend tools for file reading
# }
