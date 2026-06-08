import { NextResponse } from "next/server";

// GET /api/health - server-side liveness checks for the two integrations i.e Gemini and Elasticsearch.

async function ping(url: string, init?: RequestInit): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const elasticUrl = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;
  const agentUrl = process.env.AGENT_URL;

  const [elastic, gemini] = await Promise.all([
    elasticUrl && apiKey
      ? ping(`${elasticUrl}/case_files/_count`, {
          headers: { Authorization: `ApiKey ${apiKey}` },
        })
      : Promise.resolve(false),
    agentUrl ? ping(`${agentUrl}/list-apps`) : Promise.resolve(false),
  ]);

  return NextResponse.json({ elastic, gemini });
}
