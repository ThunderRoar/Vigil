"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Check, Sparkles, Save } from "lucide-react";
import type { InvestigationContext } from "@/components/ContextPanel";
import type { CaseFile } from "@/lib/types";
import { Markdown } from "@/components/Markdown";

type ToolCall = { label: string; done: boolean };
type Msg = {
  id: string;
  role: "user" | "agent";
  content: string;
  tools?: ToolCall[];
  offerSave?: boolean;
  saved?: boolean;
  saving?: boolean;
  saveError?: boolean;
};

const PROMPT = "Investigate Meridian Capital Group";

const TOOL_LABELS: Record<string, string> = {
  lookup_kyc: "Looking up KYC profile",
  search_transactions: "Searching transactions",
  transaction_velocity_check: "Running transaction velocity check",
  high_risk_accounts: "Scanning high-risk accounts",
  search_regulations: "Searching regulations",
  search_case_files: "Searching past case files",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildCaseFile(): CaseFile {
  return {
    case_id: `CASE-2026-${String(Date.now()).slice(-4)}`,
    created_at: new Date().toISOString(),
    created_by: "vigil-agent",
    subject: "Meridian Capital Group - Unusual transaction velocity",
    summary:
      "26 wires totaling $532,500 in two bursts (May 15, Jun 3) to Aurora Holdings Ltd (Cyprus). KYC incomplete, risk 78/100. Likely meets BSA threshold for SAR.",
    entities_involved: ["ACC-8891", "Meridian Capital Group", "Aurora Holdings Ltd"],
    risk_level: "critical",
    status: "open",
    findings: [
      "26 wires in two tight bursts (velocity anomaly)",
      "Cross-border transfers to high-risk jurisdiction (Cyprus)",
      "KYC documentation incomplete",
      "Total exceeds SAR threshold"
    ],
    recommended_actions: [
      "File SAR with FinCEN",
      "Request updated KYC documents",
      "Enhanced monitoring on ACC-8891"
    ],
    related_cases: []
  };
}

export function ChatPanel({ onContext, onResetContext, onSaveCase }: {
  onContext: (patch: InvestigationContext) => void;
  onResetContext: () => void;
  onSaveCase: (c: CaseFile) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID()); // one ADK session per page load
  const endRef = useRef<HTMLDivElement>(null);

  // auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput("");
    onResetContext();

    const agentId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: agentId, role: "agent", content: "", tools: [{ label: "Investigating…", done: false }] }
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Agent request failed");

      const { toolCalls, answer, context } = data as {
        toolCalls: { name: string }[];
        answer: string;
        context: InvestigationContext;
      };

      // clear the placeholder, then reveal the real tool calls one by one
      setMessages((m) => m.map((msg) => (msg.id === agentId ? { ...msg, tools: [] } : msg)));

      for (const tc of toolCalls) {
        const label = TOOL_LABELS[tc.name] ?? tc.name;
        setMessages((m) =>
          m.map((msg) =>
            msg.id === agentId
              ? { ...msg, tools: [...(msg.tools ?? []), { label, done: false }] }
              : msg
          )
        );
        await delay(450);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === agentId
              ? {
                  ...msg,
                  tools: msg.tools?.map((t, i) =>
                    i === msg.tools!.length - 1 ? { ...t, done: true } : t
                  )
                }
              : msg
          )
        );
        // surface the matching evidence (real tool output) in the Context panel
        if (tc.name === "lookup_kyc" && context.kyc) onContext({ kyc: context.kyc });
        else if (tc.name === "search_transactions" && context.transactions)
          onContext({ transactions: context.transactions });
        else if (tc.name === "search_regulations" && context.regulation)
          onContext({ regulation: context.regulation });
      }

      // safety net to capture all data
      onContext(context);
      await delay(250);
      const investigativeTools = [
        "lookup_kyc",
        "search_transactions",
        "transaction_velocity_check",
        "high_risk_accounts",
      ];
      const offerSave = toolCalls.some((tc) => investigativeTools.includes(tc.name));
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId
            ? { ...msg, content: answer || "(no answer returned)", offerSave }
            : msg
        )
      );
    } catch (err) {
      console.error("chat error", err);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId
            ? {
                ...msg,
                tools: [],
                content: `[ERROR] ${err instanceof Error ? err.message : "Agent request failed."}`
              }
            : msg
        )
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* message thread */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="fade-in-up flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Start an investigation</p>
              <p className="mt-1 text-sm text-muted">
                Ask Vigil about an entity, account, or pattern.
              </p>
            </div>
            <button
              onClick={() => send(PROMPT)}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {PROMPT}
            </button>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end fade-in-up">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start fade-in-up">
              <div className="max-w-[85%] space-y-2">
                {/* tool call indicators */}
                {msg.tools && msg.tools.length > 0 && (
                  <div className="space-y-1">
                    {msg.tools.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted fade-in-up">
                        {t.done ? (
                          <Check className="h-3.5 w-3.5 text-success" />
                        ) : (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        )}
                        {t.label}
                      </div>
                    ))}
                  </div>
                )}
                {/* final answer */}
                {msg.content && (
                  <div className="rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 text-sm text-foreground">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}
                {msg.offerSave && (
                  <button
                    onClick={async () => {
                      const c = buildCaseFile();
                      setMessages((m) =>
                        m.map((x) =>
                          x.id === msg.id ? { ...x, saving: true, saveError: false } : x
                        )
                      );
                      try {
                        const res = await fetch("/api/cases", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(c),
                        });
                        if (!res.ok) throw new Error(await res.text());
                        onSaveCase(c); // persisted -> reflect in the case list
                        setMessages((m) =>
                          m.map((x) =>
                            x.id === msg.id ? { ...x, saved: true, saving: false } : x
                          )
                        );
                      } catch (err) {
                        console.error("save case failed", err);
                        setMessages((m) =>
                          m.map((x) =>
                            x.id === msg.id ? { ...x, saving: false, saveError: true } : x
                          )
                        );
                      }
                    }}
                    disabled={msg.saved || msg.saving}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      msg.saved
                        ? "border border-success text-success"
                        : msg.saveError
                          ? "border border-danger text-danger"
                          : "bg-primary text-white hover:opacity-90 disabled:opacity-60"
                    }`}
                  >
                    {msg.saved ? (
                      <><Check className="h-4 w-4" /> Case file saved</>
                    ) : msg.saving ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                    ) : msg.saveError ? (
                      <><Save className="h-4 w-4" /> Save failed - retry</>
                    ) : (<><Save className="h-4 w-4" /> Save case file</>)
                    }
                  </button>
                )}
              </div>
            </div>
          )
        )}
        <div ref={endRef} />
      </div>

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Vigil to investigate…"
          disabled={busy}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white transition-opacity disabled:opacity-40"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
