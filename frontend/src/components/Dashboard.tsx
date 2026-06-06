"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { CaseList } from "@/components/CaseList";
import { ChatPanel } from "@/components/ChatPanel";
import { ContextPanel, type InvestigationContext } from "@/components/ContextPanel";
import { mockCaseFiles } from "@/lib/mockData";
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
  const [cases, setCases] = useState<CaseFile[]>(mockCaseFiles);
  const [selectedId, setSelectedId] = useState<string | null>(
    mockCaseFiles[0]?.case_id ?? null
  );
  const [context, setContext] = useState<InvestigationContext>({});

  function addCase(c: CaseFile) {
    setCases((prev) => [c, ...prev]);
    setSelectedId(c.case_id);
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />

      <div className="flex min-h-0 flex-1">
        <Panel title="Investigations" className="w-70 shrink-0 border-r border-border-surface">
          <CaseList cases={cases} selectedId={selectedId} onSelect={setSelectedId} />
        </Panel>

        <Panel title="Investigation Chat" className="min-w-0 flex-1">
          <ChatPanel
            onContext={(patch) => setContext((c) => ({ ...c, ...patch }))}
            onResetContext={() => setContext({})}
            onSaveCase={addCase}
          />
        </Panel>

        <Panel title="Context" className="w-90 shrink-0 border-l border-border bg-surface">
          <ContextPanel context={context} />
        </Panel>
      </div>
    </div>
  );
}
