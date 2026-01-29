import os
from langchain_openai import ChatOpenAI
from langchain_mistralai import ChatMistralAI
from dotenv import load_dotenv

load_dotenv()

def get_model(model_name: str = "nvidia_endpoint"):
    """
    Get the chat model based on the name.
    
    Supports:
    - 'fireworks': Uses Fireworks AI (default - good function calling support)
    - 'openrouter': Uses OpenRouter API
    - 'groq': Uses Groq (strict tool validation)
    - 'mistral': Uses Mistral AI
    
    Future support: 'gemini'
    """
    if model_name == "openrouter":
        # Use OpenRouter with a good reasoning model
        return ChatOpenAI(
            model="meta-llama/llama-3.3-70b-instruct",  # Fast and powerful
            openai_api_key=os.getenv("OPENROUTER_API_KEY"),
            openai_api_base="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": "https://bacprep-ai.com",
                "X-Title": "BacPrep AI",
            }
        )
    if model_name == "nvidia_endpoint":
        # Use OpenRouter with a good reasoning model
        return ChatOpenAI(
            model="moonshotai/kimi-k2.5",  # Fast and powerful
            openai_api_key=os.getenv("NVIDIA_API_KEY"),
            openai_api_base="https://integrate.api.nvidia.com/v1",
        )
    elif model_name == "groq":
        # Use OpenAI directly (fallback)
        return ChatOpenAI(
            model="openai/gpt-oss-120b",
            openai_api_key=os.getenv("GROQ_API_KEY"),
            openai_api_base="https://api.groq.com/openai/v1",
        )
    elif model_name == "mistral":
        # Use OpenAI directly (fallback)
        return ChatMistralAI(
            model="mistral-large-latest",
            temperature=0,
            max_retries=2,
            api_key=os.getenv("MISTRAL_API_KEY"),
            # other params...
        )
    elif model_name == "fireworks":
        return ChatOpenAI(
            model="accounts/fireworks/models/glm-4p7",  # Fast and powerful
            openai_api_key=os.getenv("FIREWORKS_API_KEY"),
            openai_api_base="https://api.fireworks.ai/inference/v1",
            temperature=0.2,
            max_retries=2
        )
    # elif model_name == "sambanova":
    #     return ChatOpenAI(
    #         model="DeepSeek-V3.2",  # Fast and powerful
    #         openai_api_key=os.getenv("SAMBANOVA_API_KEY"),
    #         openai_api_base="https://api.sambanova.ai/v1",
    #     )
    # Placeholder for future models
    # elif model_name == "groq":
    #     return ChatGroq(model="...")
    # elif model_name == "gemini":
    #     return ChatGoogleGenerativeAI(model="...")
    else:
        raise ValueError(f"Unknown model name: {model_name}")
