# Vigil - AI Compliance Investigation Agent

> An AI agent that investigates suspicious financial activity, checks regulations, and **builds institutional memory** - Gemini reasoning over Elastic search.

**Live App:** https://vigil-web-873470220125.us-central1.run.app
**Demo video:** https://www.youtube.com/watch?v=T65IWtzN828
**Built for:** Google Cloud Rapid Agent Hackathon - **Elastic track**

## What it is

Vigil is an AI compliance investigator for fintech. A compliance officer asks it to investigate an entity or pattern; Vigil **autonomously reasons in multiple steps**  pulling KYC profiles, searching transactions, running velocity checks, grounding findings in regulations, and recalling its own past cases which it then writes a case file back to Elasticsearch so it gets smarter over time.

It's powered by **Gemini** on **Google Cloud**, which calls **Elastic Agent Builder** tools over the
**Model Context Protocol (MCP)**.

## The differentiator: A memory loop

Most agents search and answer. Vigil **learns**. After each investigation it writes a case file to
Elasticsearch so future investigations recall it via semantic search. For example: Investigate Meridian today > reload tomorrow > ask "have we seen Meridian before?" > Vigil recalls the case. Institutional knowledge that compounds.

## Architecture

```
Browser
   │
   ▼
Cloud Run: vigil-web  (Next.js UI + server-side API routes / BFF)
   ├── /api/chat   -> calls the agent
   ├── /api/cases  -> reads/writes case_files (Elastic)
   └── /api/health -> liveness for Elastic + agent
   │                            │
   ▼                            ▼
Cloud Run: vigil-agent    Elastic Cloud (Serverless)
(Gemini via ADK)                 ├── transactions / kyc_records / regulations / case_files
   │  MCP (Streamable HTTP)      ├── ELSER semantic + hybrid search
   └────────────────────▶       └── Agent Builder MCP server (6 ES|QL + index-search tools)
```

- **GCP** = the brain + host: **Gemini** (Vertex AI) reasoning, deployed via the **Agent Development Kit** on **Cloud Run**, with the dashboard also on Cloud Run.
- **Elastic** = the data + search layer: Elasticsearch, **ELSER** hybrid search, and the **Agent Builder MCP server** exposing the tools.

## Key features

- **Proactive monitoring**: run a sweep and Vigil surfaces a prioritized watchlist of accounts to investigate (not just a reactive search box).
- **Multi step investigations** with visible tool calls (KYC > transactions > velocity > regulations > memory).
- **Write-back memory loop**: cases persist to Elasticsearch and are recalled across sessions.
- **MCP integration**: Gemini auto discovers Elastic's tools over the Model Context Protocol.
- **ES|QL + hybrid/ELSER** tools: structured analytics and semantic search over regulations.
- **5 AML typologies** in the data: velocity/layering, structuring, PEP inflows, sanctions hit, and a **false positive** the agent clears.
- **Compliance dashboard**: case list, agent chat, and a live context panel.

## Setup / run locally

**Prerequisites:** Python 3.11+, Node 20.9+, an Elastic Cloud Serverless project (with Agent
Builder), and a Google Cloud project (Vertex AI enabled).

```bash
# 1. Data: generate + index into Elastic
python -m venv .venv && . .venv/Scripts/activate
pip install -r requirements.txt
python data/generate_data.py
cp .env.example .env # fill ELASTIC_URL + ELASTIC_API_KEY
python elastic/setup.py

# 2. Tools: build the 6 tools in Elastic Agent Builder (see elastic/tools/tool_definitions.md),
# then copy the MCP server URL: https://<kibana-url>/api/agent_builder/mcp

# 3. Agent: configure agent/vigil/.env (project, region, ELASTIC_MCP_URL, ELASTIC_API_KEY)
pip install -r agent/requirements.txt
cd agent && adk web # test locally, then: adk deploy cloud_run ...

# 4. Frontend
cd frontend && npm install
cp .env.example .env.local  # fill AGENT_URL, ELASTIC_URL, ELASTIC_API_KEY
npm run dev # http://localhost:3000
```

Deployment uses **Cloud Run** for both the agent (`adk deploy cloud_run`) and the dashboard
(`gcloud run deploy --source frontend`).

## What's next for Vigil 
- **Agent-native write-back** via an Elastic Workflow tool (so the agent files cases itself over MCP).
- **SAR draft generation**: auto produce the filing narrative.
- **Multi agent specialists** (transaction, KYC, regulatory) under a coordinator.
- **Real time alerting** via Elastic Workflows and connectors to live data sources.

## License

[MIT](LICENSE)

---

*Built for the Google Cloud Rapid Agent Hackathon (Elastic track). Synthetic data and real regulatory concepts.*
