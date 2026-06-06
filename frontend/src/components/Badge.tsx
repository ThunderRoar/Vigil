import type { RiskLevel, CaseStatus } from "@/lib/types";

const riskStyles: Record<RiskLevel, string> = {
  low: "bg-success/15 text-success",
  medium: "bg-warning/15 text-warning",
  high: "bg-danger/15 text-danger",
  critical: "bg-danger text-white",
};

const statusStyles: Record<CaseStatus, string> = {
  open: "border-primary text-primary",
  escalated: "border-danger text-danger",
  resolved: "border-muted text-muted",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${riskStyles[level]}`}>
      {level}
    </span>
  );
}

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
