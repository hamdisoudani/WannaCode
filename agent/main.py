"""
CodeSurf Agent Server

FastAPI server that exposes the CodeSurf DeepAgent via CopilotKit's AG-UI protocol.
The agent receives frontend tools from CopilotKit and uses them to interact with the IDE.

Includes:
- Graceful shutdown handling
- Request timeout configuration
- Client disconnect detection
"""

import os
import warnings
import signal
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI
import uvicorn
from src.deep_agent import graph
from copilotkit import LangGraphAGUIAgent
from ag_ui_langgraph import add_langgraph_fastapi_endpoint

_ = load_dotenv()
app = FastAPI(title="CodeSurf Agent", version="0.1.0")

# Track active requests for graceful shutdown
active_requests = set()

@app.middleware("http")
async def track_requests(request, call_next):
    """Track active requests and detect client disconnects."""
    request_id = id(request)
    active_requests.add(request_id)
    
    try:
        response = await call_next(request)
        return response
    except asyncio.CancelledError:
        # Client disconnected, clean up gracefully
        print(f"⚠️ Request {request_id} cancelled by client")
        raise
    except Exception as e:
        # Log other errors but don't break the response
        print(f"❌ Request {request_id} error: {e}")
        raise
    finally:
        active_requests.discard(request_id)

agent = LangGraphAGUIAgent(
    name="codesurf_agent",
    description="CodeSurf AI Agent - Your pair programming assistant for building amazing applications",
    graph=graph,
)

# Initialize the messages_in_process dict if it's None (bug workaround)
if not hasattr(agent, 'messages_in_process') or agent.messages_in_process is None:
    agent.messages_in_process = {}

add_langgraph_fastapi_endpoint(
    app=app,
    agent=agent,
    path="/",
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "active_requests": len(active_requests),
    }


def handle_shutdown(signum, frame):
    """Handle shutdown signals gracefully."""
    print(f"\n🛑 Received signal {signum}, shutting down gracefully...")
    print(f"⏳ Waiting for {len(active_requests)} active requests to complete...")
    # uvicorn will handle the actual shutdown
    

def main():
    """Run the uvicorn server."""
    port = int(os.getenv("PORT", "8080"))
    
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGTERM, handle_shutdown)
    signal.signal(signal.SIGINT, handle_shutdown)
    
    print(f"\n🤖 CodeSurf Agent Server starting on port {port}...")
    print(f"💡 Health check: http://localhost:{port}/health\n")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        timeout_keep_alive=300,  # 5 minutes
        timeout_graceful_shutdown=30,  # 30 seconds to finish active requests
    )


warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")
if __name__ == "__main__":
    main()