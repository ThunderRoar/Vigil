"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Check, Sparkles } from "lucide-react";

type ToolCall = { label: string; done: boolean };
type Msg = { id: string; role: "user" | "agent"; content: string; tools?: ToolCall[] };

// TODO: replace tmp scaffold
const SCRIPT = {
  prompt: "Investigate Meridian Capital Group",
  tools: [
    "Looking up KYC profile for Meridian Capital Group",
    "Searching transactions for ACC-8891",
    "Running transaction velocity check",
    "Searching regulations (SAR, cross-border)",
    "Searching past case files"
  ],
  answer: `I investigated Meridian Capital Group (ACC-8891) and found serious red flags:

- Velocity anomaly: 26 wires in two tight bursts (14 on May 15, 12 on Jun 3), totaling $532,500 to Aurora Holdings Ltd (Cyprus).
- KYC: risk score 78/100, documentation INCOMPLETE.
- Cross-border transfers to a high-risk jurisdiction.
- Under the Bank Secrecy Act, this likely meets the threshold for a SAR filing.

Recommendation: escalate for SAR filing, request updated KYC documents, and place enhanced monitoring on ACC-8891.

Would you like me to save a case file?`
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    console.log(messages)
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
    for (const label of SCRIPT.tools) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === agentId
            ? { ...msg, tools: [...(msg.tools ?? []), { label, done: false }] }
            : msg
        )
      );
      await delay(750);
      setMessages((m) =>
        m.map(
          (msg) => msg.id === agentId ? 
            {
              ...msg,
              tools: msg.tools?.map((t, i) =>
                i === msg.tools!.length - 1 ? { ...t, done: true } : t
              )
            } : msg
        )
      );
    }

    await delay(400);
    setMessages((m) =>
      m.map((msg) => (msg.id === agentId ? { ...msg, content: SCRIPT.answer } : msg))
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
              onClick={() => send(SCRIPT.prompt)}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-2"
            >
              {SCRIPT.prompt}
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
