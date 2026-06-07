"use client";

import { useState } from "react";
import type { KycRecord, Transaction, Regulation, RiskLevel, CaseFile } from "@/lib/types";
import { FileSearch } from "lucide-react";
import { RiskBadge, StatusBadge } from "@/components/Badge";

// Shared shape for context (UI state not index)
export type InvestigationContext = {
  kyc?: KycRecord;
  transactions?: Transaction[];
  regulation?: Regulation;
};

function riskColor(level: RiskLevel) {
  if (level === "critical" || level === "high") return "text-danger";
  if (level === "medium") return "text-warning";
  return "text-success";
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Field({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-medium capitalize ${alert ? "text-danger" : "text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

function KycCard({ kyc }: { kyc: KycRecord }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 fade-in-up">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{kyc.customer_name}</h3>
        <span className="font-mono text-xs text-muted">{kyc.account_id}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-3xl ${riskColor(kyc.risk_level)}`}>
          {kyc.risk_score}
        </span>
        <span className="text-xs text-muted">/100 risk score</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <Field label="Entity" value={kyc.entity_type} />
        <Field label="Country" value={kyc.country_of_incorporation} />
        <Field
          label="Docs"
          value={kyc.document_status}
          alert={kyc.document_status === "incomplete"}
        />
        <Field label="PEP" value={kyc.pep_status ? "Yes" : "No"} alert={kyc.pep_status} />
        <Field
          label="Sanctions"
          value={kyc.sanctions_match ? "MATCH" : "Clear"}
          alert={kyc.sanctions_match}
        />
        <Field label="Industry" value={kyc.industry} />
      </dl>
    </div>
  );
}

const MAX_TX_ROWS = 8;
function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const [expanded, setExpanded] = useState(false);
  const total = transactions.reduce((s, t) => s + t.amount, 0);
  const hasMore = transactions.length > MAX_TX_ROWS;
  const shown = expanded ? transactions : transactions.slice(0, MAX_TX_ROWS);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface fade-in-up">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Transactions
        </span>
        <span className="font-mono text-xs text-foreground">
          {transactions.length} · ${fmt(total)}
        </span>
      </div>
      <div className={expanded ? "max-h-64 overflow-y-auto" : ""}>
        <table className="w-full text-xs">
          <tbody>
            {shown.map((t) => (
              <tr key={t.transaction_id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-mono text-muted">
                  {t.transaction_id.replace("TXN-2026-", "#")}
                </td>
                <td className="px-3 py-2 text-muted">
                  {new Date(t.timestamp).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-3 py-2 text-right font-mono text-foreground">
                  ${fmt(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full border-t border-border px-3 py-2 text-center text-xs font-medium text-primary transition-colors hover:bg-surface-2"
        >
          {expanded ? "Show less" : `Show all ${transactions.length}`}
        </button>
      )}
    </div>
  );
}

function CaseDetail({ c }: { c: CaseFile }) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 fade-in-up">
      <div className="flex items-center gap-1.5">
        <RiskBadge level={c.risk_level} />
        <StatusBadge status={c.status} />
      </div>
      <div>
        <div className="font-mono text-xs text-muted">{c.case_id}</div>
        <h3 className="text-sm font-semibold text-foreground">{c.subject}</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted">{c.summary}</p>
      {c.findings?.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Findings
          </div>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-foreground">
            {c.findings.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {c.recommended_actions?.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            Recommended actions
          </div>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-foreground">
            {c.recommended_actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {c.entities_involved.map((e) => (
          <span
            key={e}
            className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted"
          >
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}

function RegulationCard({ regulation }: { regulation: Regulation }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-4 fade-in-up">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">
          {regulation.authority || "Regulation"}
        </span>
        <span className="font-mono text-xs text-muted">{regulation.regulation_id}</span>
      </div>
      {regulation.title && (
        <h3 className="text-sm font-semibold text-foreground">{regulation.title}</h3>
      )}
      <p className="line-clamp-4 text-xs leading-relaxed text-muted">{regulation.body}</p>
    </div>
  );
}

export function ContextPanel({ context, selectedCase }: {
  context: InvestigationContext;
  selectedCase?: CaseFile | null;
}) {
  const hasAny = context.kyc || context.transactions || context.regulation;

  if (hasAny) {
    return (
      <div className="space-y-3 p-4">
        {context.kyc && <KycCard kyc={context.kyc} />}
        {context.transactions && <TransactionTable transactions={context.transactions} />}
        {context.regulation && <RegulationCard regulation={context.regulation} />}
      </div>
    );
  }
  if (selectedCase) {
    return (
      <div className="p-4">
        <CaseDetail c={selectedCase} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted">
      <FileSearch className="h-7 w-7 opacity-60" />
      <p className="text-sm">
        Run an investigation, or select a case, to see details here.
      </p>
    </div>
  );
}
