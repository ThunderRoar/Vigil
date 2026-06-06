// Matches the elasticsearch indices for single source of truth. 
export type RiskLevel = "low" | "medium" | "high" | "critical";
export type CaseStatus = "open" | "escalated" | "resolved";
export type Direction = "inbound" | "outbound";

// Transactions index
export interface Transaction {
  transaction_id: string;
  timestamp: string;
  amount: number;
  currency: string;
  type: "wire_transfer" | "ach" | "card_payment" | "internal_transfer";
  direction: Direction;
  account_id: string;
  counterparty: string;
  counterparty_country: string;
  description: string;
  risk_flags: string[];
  status: "completed" | "pending";
}

// kyc_records index
export interface KycRecord {
  account_id: string;
  customer_name: string;
  entity_type: "corporate" | "individual";
  country_of_incorporation: string;
  risk_score: number; // 0-100
  risk_level: RiskLevel;
  onboarding_date: string;
  last_review_date: string;
  pep_status: boolean;
  sanctions_match: boolean;
  document_status: "complete" | "incomplete";
  beneficial_owners: string[];
  industry: string;
}

// Regulations index
export interface Regulation {
  regulation_id: string;
  title: string;
  body: string;
  jurisdiction: string;
  authority: string;
  effective_date: string;
  categories: string[];
  last_updated: string;
}

// case_files index (agent memory)
export interface CaseFile {
  case_id: string;
  created_at: string;
  created_by: string;
  subject: string;
  summary: string;
  entities_involved: string[];
  risk_level: RiskLevel;
  status: CaseStatus;
  findings: string[];
  recommended_actions: string[];
  related_cases: string[];
}
