"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Check, Sparkles, Save, Plus } from "lucide-react";
import type { InvestigationContext } from "@/components/ContextPanel";
import type { CaseFile } from "@/lib/types";
import { Markdown } from "@/components/Markdown";

const SESSION_KEY = "vigil-session";
const MESSAGES_KEY = "vigil-messages";

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
  caseFile?: CaseFile;
};

const PROMPT = "Investigate Meridian Capital Group";
const SWEEP_PROMPT = "Run today's monitoring sweep — which accounts should I investigate?";

const TOOL_LABELS: Record<string, string> = {
  lookup_kyc: "Looking up KYC profile",
  search_transactions: "Searching transactions",
  transaction_velocity_check: "Running transaction velocity check",
  high_risk_accounts: "Scanning high-risk accounts",
  search_regulations: "Searching regulations",
  search_case_files: "Searching past case files",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ChatPanel({ onContext, onSaveCase }: {
  onContext: (patch: InvestigationContext) => void;
  onSaveCase: (c: CaseFile) => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // restore session id + chat thread from sessionStorage on mount (client-only)
  useEffect(() => {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    setSessionId(id);
    try {
      const saved = sessionStorage.getItem(MESSAGES_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      /* ignore malformed cache */
    }
    setHydrated(true);
  }, []);

  // persist the chat thread
  useEffect(() => {
    if (hydrated) sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages, hydrated]);

  // auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function newConversation() {
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.removeItem(MESSAGES_KEY);
    setSessionId(id);
    setMessages([]);
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput("");

    // ensure a session id even if the hydration effect hasn't run yet
    let sid = sessionId;
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
      setSessionId(sid);
    }

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
        body: JSON.stringify({ message: text, sessionId: sid })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Agent request failed");

      const { toolCalls, answer, context, caseFile } = data as {
        toolCalls: { name: string }[];
        answer: string;
        context: InvestigationContext;
        caseFile: CaseFile | null;
      };

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
        if (tc.name === "lookup_kyc" && context.kyc) onContext({ kyc: context.kyc });
        else if (tc.name === "search_transactions" && context.transactions)
          onContext({ transactions: context.transactions });
        else if (tc.name === "search_regulations" && context.regulation)
          onContext({ regulation: context.regulation });
      }

      // safety net to capture all data
      onContext(context);
      await delay(250);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId
            ? {
                ...msg,
                content: answer || "(no answer returned)",
                offerSave: !!caseFile,
                caseFile: caseFile ?? undefined
              }
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
      {/* new conversation bar (only once a chat has started) */}
      {messages.length > 0 && (
        <div className="flex shrink-0 justify-end border-b border-border px-3 py-1.5">
          <button
            onClick={newConversation}
            disabled={busy}
            className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> New conversation
          </button>
        </div>
      )}

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
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => send(SWEEP_PROMPT)}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                Run today&apos;s monitoring sweep
              </button>
              <button
                onClick={() => send(PROMPT)}
                className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {PROMPT}
              </button>
            </div>
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
                      const c = msg.caseFile;
                      if (!c) return;
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
