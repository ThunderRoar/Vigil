"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CaseList } from "@/components/CaseList";
import { ChatPanel } from "@/components/ChatPanel";
import { ContextPanel, type InvestigationContext } from "@/components/ContextPanel";
import type { CaseFile } from "@/lib/types";

function Panel({ title, className, children }: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col ${className ?? ""}`}>
      <div className="shrink-0 border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}

export function Dashboard() {
  const [cases, setCases] = useState<CaseFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [context, setContext] = useState<InvestigationContext>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Live read the case list from Elasticsearch (the agent's memory) on mount.
  useEffect(() => {
    let alive = true;
    fetch("/api/cases")
      .then((r) => r.json())
      .then((d) => {
        if (alive && d.ok && Array.isArray(d.cases)) {
          setCases(d.cases);
          setSelectedId((cur) => cur ?? d.cases[0]?.case_id ?? null);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function addCase(c: CaseFile) {
    setCases((prev) => [c, ...prev.filter((p) => p.case_id !== c.case_id)]);
    setSelectedId(c.case_id);
    setHighlightId(c.case_id);
    setTimeout(() => setHighlightId(null), 2000);
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />

      <div className="flex min-h-0 flex-1">
        <Panel title="Investigations" className="w-70 shrink-0 border-r border-border bg-surface">
          <CaseList
            cases={cases}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setContext({}); // switch the right panel to this case's detail
            }}
            highlightId={highlightId}
          />
        </Panel>

        <Panel title="Investigation Chat" className="min-w-0 flex-1">
          <ChatPanel
            onContext={(patch) => setContext((c) => ({ ...c, ...patch }))}
            onSaveCase={addCase}
          />
        </Panel>

        <Panel title="Context" className="w-90 shrink-0 border-l border-border bg-surface">
          <ContextPanel
            context={context}
            selectedCase={cases.find((c) => c.case_id === selectedId) ?? null}
          />
        </Panel>
      </div>
    </div>
  );
}
