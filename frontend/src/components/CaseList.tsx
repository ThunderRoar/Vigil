"use client";

import type { CaseFile } from "@/lib/types";
import { RiskBadge, StatusBadge } from "@/components/Badge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CaseList({ cases, selectedId, onSelect, highlightId }: {
  cases: CaseFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  highlightId?: string | null;
}) {
  return (
    <ul className="divide-y divide-border">
      {cases.map((c) => {
        const active = c.case_id === selectedId;
        return (
          <li key={c.case_id}>
            <button
              onClick={() => onSelect(c.case_id)}
              className={`flex w-full flex-col gap-1.5 border-l-2 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${
                active ? "border-primary bg-surface-2" : "border-transparent"
              } ${c.case_id === highlightId ? "highlight-pulse" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted">{c.case_id}</span>
                <span className="text-xs text-muted">{formatDate(c.created_at)}</span>
              </div>
              <span className="line-clamp-2 text-sm font-medium text-foreground">
                {c.subject}
              </span>
              <div className="flex items-center gap-1.5">
                <RiskBadge level={c.risk_level} />
                <StatusBadge status={c.status} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
