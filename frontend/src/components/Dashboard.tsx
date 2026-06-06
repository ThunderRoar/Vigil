"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { CaseList } from "@/components/CaseList";
import { RiskBadge, StatusBadge } from "@/components/Badge";
import { mockCaseFiles } from "@/lib/mockData";
import { ChatPanel } from "@/components/ChatPanel";

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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
      {text}
    </div>
  );
}

export function Dashboard() {
  const [selectedId, setSelectedId] = useState<string | null>(
    mockCaseFiles[0]?.case_id ?? null
  );
  const selected = mockCaseFiles.find((c) => c.case_id === selectedId) ?? null;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Header />

      <div className="flex min-h-0 flex-1">
        <Panel title="Investigations" className="w-70 shrink-0 border-r border-border bg-surface">
          <CaseList cases={mockCaseFiles} selectedId={selectedId} onSelect={setSelectedId}/>
        </Panel>

        <Panel title="Investigation Chat" className="min-w-0 flex-1">
          <ChatPanel />
        </Panel>

        {/* TODO: Context panel */}
        <Panel title="Context" className="w-90 shrink-0 border-l border-border bg-surface">
          {selected ? (
            <div className="space-y-3 p-4">
              <div className="flex items-center gap-1.5">
                <RiskBadge level={selected.risk_level} />
                <StatusBadge status={selected.status} />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                {selected.subject}
              </h2>
              <p className="text-sm leading-relaxed text-muted">
                {selected.summary}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selected.entities_involved.map((e) => (
                  <span key={e} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">{e}</span>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState text="Select a case to see details." />
          )}
        </Panel>
      </div>
    </div>
  );
}
