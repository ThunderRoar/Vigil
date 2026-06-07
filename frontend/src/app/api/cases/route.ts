import { NextResponse } from "next/server";

// POST /api/cases - write-back: index a case file into Elasticsearch case_files.
export async function POST(req: Request) {
  const url = process.env.ELASTIC_URL;
  const apiKey = process.env.ELASTIC_API_KEY;

  // Sanity check
  if (!url || !apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Elastic credentials missing. Set ELASTIC_URL and ELASTIC_API_KEY in frontend/.env.local and restart the dev server."
      },
      { status: 500 }
    );
  }

  const caseFile = await req.json();
  if (!caseFile?.case_id) {
    return NextResponse.json({ ok: false, error: "Missing case_id" }, { status: 400 });
  }

  const doc = {
    ...caseFile,
    created_by: "vigil-agent",
    created_at: caseFile.created_at ?? new Date().toISOString()
  };

  // ES index API: PUT /case_files/_doc/{id}?refresh=true so immediately searchable
  const esRes = await fetch(
    `${url}/case_files/_doc/${encodeURIComponent(caseFile.case_id)}?refresh=true`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${apiKey}`,
      },
      body: JSON.stringify(doc)
    }
  );

  if (!esRes.ok) {
    return NextResponse.json(
      { ok: false, error: await esRes.text() },
      { status: esRes.status }
    );
  }

  return NextResponse.json({ ok: true, case_id: caseFile.case_id });
}
