import type { KycRecord, Transaction, Regulation, RiskLevel } from "@/lib/types";
import { FileSearch } from "lucide-react";

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

function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const total = transactions.reduce((s, t) => s + t.amount, 0);
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
      <table className="w-full text-xs">
        <tbody>
          {transactions.map((t) => (
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
  );
}

function RegulationCard({ regulation }: { regulation: Regulation }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-4 fade-in-up">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-primary">{regulation.authority}</span>
        <span className="font-mono text-xs text-muted">{regulation.regulation_id}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground">{regulation.title}</h3>
      <p className="line-clamp-4 text-xs leading-relaxed text-muted">{regulation.body}</p>
    </div>
  );
}

export function ContextPanel({ context }: { context: InvestigationContext }) {
  const hasAny = context.kyc || context.transactions || context.regulation;
  if (!hasAny) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted">
        <FileSearch className="h-7 w-7 opacity-60" />
        <p className="text-sm">
          Run an investigation to see related KYC, transactions, and regulations here.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3 p-4">
      {context.kyc && <KycCard kyc={context.kyc} />}
      {context.transactions && <TransactionTable transactions={context.transactions} />}
      {context.regulation && <RegulationCard regulation={context.regulation} />}
    </div>
  );
}
