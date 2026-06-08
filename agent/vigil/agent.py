"""
Vigil - ADK Agent
A Gemini powered compliance investigation agent whose tools come from Elastic
Agent Builder over MCP (Streamable HTTP). ADK auto discovers the 6 read tools
exposed by the Elastic MCP server.
"""

import os

from google.adk.agents import Agent
from google.adk.tools.mcp_tool.mcp_toolset import (
    McpToolset,
    StreamableHTTPConnectionParams,
)

_HERE = os.path.dirname(__file__)
with open(os.path.join(_HERE, "system_prompt.txt"), encoding="utf-8") as f:
    SYSTEM_PROMPT = f.read()

_MCP_URL = os.environ["ELASTIC_MCP_URL"]
_API_KEY = os.environ["ELASTIC_API_KEY"]

# Whitelist ONLY Vigil's 6 tools
VIGIL_TOOLS = [
    "search_transactions",
    "transaction_velocity_check",
    "lookup_kyc",
    "high_risk_accounts",
    "search_regulations",
    "search_case_files",
]

_elastic_tools = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url=_MCP_URL,
        headers={"Authorization": f"ApiKey {_API_KEY}"},
    ),
    tool_filter=VIGIL_TOOLS,
)

root_agent = Agent(
    name="vigil",
    model=os.environ.get("VIGIL_MODEL", "gemini-2.5-flash"),
    description="AI compliance investigation agent over Elastic financial data.",
    instruction=SYSTEM_PROMPT,
    tools=[_elastic_tools],
)
