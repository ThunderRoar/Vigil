import { NextResponse } from "next/server";
import type { InvestigationContext } from "@/components/ContextPanel";

// POST /api/chat - bridge the dashboard to the deployed ADK agent on Cloud Run.
// Server side: ensures an ADK session, runs the agent, and parses the event stream.

const AGENT_URL = process.env.AGENT_URL;
const APP = "vigil";
const USER = "web";

type ToolResult = {
  type?: string;
  data?: {
    columns?: { name: string }[];
    values?: unknown[][];
    resources?: { reference?: { id?: string }; content?: { snippets?: string[] } }[];
  };
};

// MCP tool output is a JSON string with a `results` array. Pull it out.
function getResults(functionResponse: unknown): ToolResult[] {
  try {
    const fr = functionResponse as { response?: { content?: { text?: string }[] } };
    const text = fr?.response?.content?.[0]?.text;
    if (!text) return [];
    const inner = JSON.parse(text) as { results?: ToolResult[] };
    return inner.results ?? [];
  } catch {
    return [];
  }
}

// ES|QL tools (lookup_kyc, search_transactions) -> columnar `esql_results` -> row objects.
function esqlRows(results: ToolResult[]): Record<string, unknown>[] {
  const er = results.find((r) => r.type === "esql_results");
  const cols = er?.data?.columns?.map((c) => c.name);
  const vals = er?.data?.values;
  if (!cols || !vals) return [];
  return vals.map((row) => Object.fromEntries(cols.map((c, i) => [c, row[i]])));
}

// Index-search tools (search_regulations) -> `resource_list` -> {id, body snippet}.
function firstResource(results: ToolResult[]): { id: string; body: string } | null {
  const rl = results.find((r) => r.type === "resource_list");
  const res = rl?.data?.resources?.[0];
  if (!res) return null;
  return { id: res.reference?.id ?? "", body: res.content?.snippets?.[0] ?? "" };
}

export async function POST(req: Request) {
  // Sanity check
  if (!AGENT_URL) {
    return NextResponse.json(
      { ok: false, error: "AGENT_URL not set in frontend/.env.local (restart dev server after adding)." },
      { status: 500 }
    );
  }

  const { message, sessionId } = await req.json();
  if (!message || !sessionId) {
    return NextResponse.json({ ok: false, error: "message and sessionId are required" }, { status: 400 });
  }

  // Ensure the session exists (idempotent ignoring "already exists")
  await fetch(
    `${AGENT_URL}/apps/${APP}/users/${USER}/sessions/${encodeURIComponent(sessionId)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  ).catch(() => {});

  // Run the agent (non-streaming: returns all events once the run completes)
  const runRes = await fetch(`${AGENT_URL}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_name: APP,
      user_id: USER,
      session_id: sessionId,
      new_message: { role: "user", parts: [{ text: message }] }
    }),
  });

  if (!runRes.ok) {
    return NextResponse.json({ ok: false, error: await runRes.text() }, { status: runRes.status });
  }

  const events = (await runRes.json()) as {
    content?: { parts?: Record<string, unknown>[] };
  }[];

  const toolCalls: { name: string }[] = [];
  const context: InvestigationContext = {};
  let answer = "";

  for (const e of events) {
    const parts = e?.content?.parts ?? [];
    const textOfEvent = parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("");
    if (textOfEvent) answer = textOfEvent; // final answer

    for (const p of parts) {
      if (p.functionCall) {
        toolCalls.push({ name: (p.functionCall as { name: string }).name });
      } else if (p.functionResponse) {
        const name = (p.functionResponse as { name: string }).name;
        const results = getResults(p.functionResponse);
        if (name === "lookup_kyc") {
          const rows = esqlRows(results);
          if (rows[0]) context.kyc = rows[0] as unknown as InvestigationContext["kyc"];
        } else if (name === "search_transactions") {
          const rows = esqlRows(results);
          if (rows.length)
            context.transactions = rows as unknown as InvestigationContext["transactions"];
        } else if (name === "search_regulations") {
          const res = firstResource(results);
          if (res)
            context.regulation = {
              regulation_id: res.id,
              title: "",
              body: res.body,
              authority: "",
              jurisdiction: "",
              categories: [],
              effective_date: "",
              last_updated: ""
            } as unknown as InvestigationContext["regulation"];
        }
      }
    }
  }

  return NextResponse.json({ ok: true, toolCalls, answer, context });
}
