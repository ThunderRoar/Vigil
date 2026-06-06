"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Check, Sparkles, Save } from "lucide-react";
import { mockKyc, mockTransactions, mockRegulations } from "@/lib/mockData";
import type { InvestigationContext } from "@/components/ContextPanel";
import type { CaseFile } from "@/lib/types";

type ToolCall = { label: string; done: boolean };
type Msg = { 
  id: string;
  role: "user" | "agent";
  content: string;
  tools?: ToolCall[];
  offerSave?: boolean;
  saved?: boolean;
};

const meridianKyc = mockKyc.find((k) => k.account_id === "ACC-8891")!;
const meridianTxns = mockTransactions.filter(
  (t) => t.account_id === "ACC-8891" && t.counterparty === "Aurora Holdings Ltd"
);
const sarReg = mockRegulations.find((r) => r.regulation_id === "REG-BSA-SAR-001")!;

const PROMPT = "Investigate Meridian Capital Group";
const STEPS: { label: string; patch?: InvestigationContext }[] = [
  { label: "Looking up KYC profile for Meridian Capital Group", patch: { kyc: meridianKyc } },
  { label: "Searching transactions for ACC-8891", patch: { transactions: meridianTxns } },
  { label: "Running transaction velocity check" },
  { label: "Searching regulations (SAR, cross-border)", patch: { regulation: sarReg } },
  { label: "Searching past case files" },
];
const ANSWER = `I investigated Meridian Capital Group (ACC-8891) and found serious red flags:

• Velocity anomaly: 26 wires in two tight bursts (14 on May 15, 12 on Jun 3), totaling $532,500 to Aurora Holdings Ltd (Cyprus).
• KYC: risk score 78/100, documentation INCOMPLETE.
• Cross-border transfers to a high-risk jurisdiction.
• Under the Bank Secrecy Act, this likely meets the threshold for a SAR filing.

Recommendation: escalate for SAR filing, request updated KYC documents, and place enhanced monitoring on ACC-8891.

Would you like me to save a case file?`;

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
      "Enhanced monitoring on ACC-8891",
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
  const endRef = useRef<HTMLDivElement>(null);

  // auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput("");

    const agentId = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: agentId, role: "agent", content: "", tools: [] }
    ]);

    // reveal each tool call
    onResetContext();
    for (const step of STEPS) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId
            ? { ...msg, tools: [...(msg.tools ?? []), { label: step.label, done: false }] }
            : msg
        )
      );
      await delay(750);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId ? 
            {
              ...msg,
              tools: msg.tools?.map((t, i) => i === msg.tools!.length - 1 ? { ...t, done: true } : t)
            }
          : msg
        )
      );
      if (step.patch) onContext(step.patch); // reveal evidence in the Context panel
    }

    await delay(400);
    setMessages((m) =>
      m.map((msg) =>
        msg.id === agentId ? { ...msg, content: ANSWER, offerSave: true } : msg
      )
    );
    setBusy(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* message thread */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted">
              Ask Vigil to investigate an entity or pattern.
            </p>
            <button
              onClick={() => send(PROMPT)}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-2"
            >
              {PROMPT}
            </button>
          </div>
        )}

        {messages.map((msg) =>
          msg.role === "user" ? (
            <div key={msg.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-white">
                {msg.content}
              </div>
            </div>
          ) : (
            <div key={msg.id} className="flex justify-start">
              <div className="max-w-[85%] space-y-2">
                {/* tool call indicators */}
                {msg.tools && msg.tools.length > 0 && (
                  <div className="space-y-1">
                    {msg.tools.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted">
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
                  <div className="whitespace-pre-line rounded-2xl rounded-bl-sm border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground">
                    {msg.content}
                  </div>
                )}
                {msg.offerSave && (
                  <button
                    onClick={() => {
                      onSaveCase(buildCaseFile());
                      setMessages((m) =>
                        m.map((x) => (x.id === msg.id ? { ...x, saved: true } : x))
                      );
                    }}
                    disabled={msg.saved}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      msg.saved
                        ? "border border-success text-success"
                        : "bg-primary text-white hover:opacity-90"
                    }`}
                  >
                    {msg.saved ? (
                      <>
                        <Check className="h-4 w-4" /> Case file saved
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save case file
                      </>
                    )}
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
