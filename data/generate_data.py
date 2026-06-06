import json
import os
import random
from datetime import datetime, timedelta, timezone

random.seed(42)

OUTPUT = os.path.join(os.path.dirname(__file__))
NOW = datetime(2026, 6, 5, 12, 0, 0, tzinfo=timezone.utc)
CURRENCIES = ["USD", "EUR", "GBP"]
TX_TYPES = ["wire_transfer", "ach", "card_payment", "internal_transfer"]
LOW_RISK_COUNTRIES = ["US", "CA", "GB", "DE", "FR", "AU", "JP", "NL"]
HIGH_RISK_COUNTRIES = ["CY", "MT", "PA", "SC", "VG", "AE"]
INDUSTRIES = ["financial_services", "real_estate", "import_export", "technology", "consulting", "hospitality", "construction", "retail"]
FIRST = ["John", "Jane", "Carlos", "Mei", "Ahmed", "Olga", "Liam", "Sofia", "Raj", "Anna"]
LAST = ["Doe", "Smith", "Rossi", "Khan", "Ivanov", "Mueller", "Chen", "Garcia", "Patel", "Novak"]
NORMAL_COUNTERPARTIES = ["Acme Supplies Inc", "Blue Ridge Payroll", "City Utilities Co",
                         "Global Logistics LLC", "Northwind Traders", "Sunset Realty",
                         "TechParts Wholesale", "Greenfield Consulting", "Harbor Insurance",
                         "Metro Office Leasing"]

def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def person():
    return f"{random.choice(FIRST)} {random.choice(LAST)}"

def split_amount(total, n, lo, hi):
    raw = [random.uniform(lo, hi) for _ in range(n)]
    s = sum(raw)
    amts = [round(r / s * total, 2) for r in raw]
    amts[-1] = round(amts[-1] + (total - sum(amts)), 2)
    return amts

# global running transaction id
_tx_seq = 0
def next_txn_id():
    global _tx_seq
    _tx_seq += 1
    return f"TXN-2026-{_tx_seq:06d}"

def risk_flags_for(amount, country, rapid=False):
    flags = []
    if amount >= 10000:
        flags.append("high_amount")
    if country in HIGH_RISK_COUNTRIES:
        flags.append("cross_border")
    if rapid:
        flags.append("rapid_succession")
    return flags

# Accounts and Know Your Customer (KYC) ------------------
account_ids = ["ACC-8891", "ACC-7702", "ACC-5310"]
while len(account_ids) < 50:
    acc_id = f"ACC-{random.randint(1000, 9999)}"
    if acc_id not in account_ids:
        account_ids.append(acc_id)

kyc_records = []
for acc_id in account_ids:
    if acc_id == "ACC-8891":
        kyc_records.append({
            "account_id": "ACC-8891",
            "customer_name": "Meridian Capital Group",
            "entity_type": "corporate",
            "country_of_incorporation": "Cyprus",
            "risk_score": 78,
            "risk_level": "high",
            "onboarding_date": "2025-08-12",
            "last_review_date": "2026-01-15",
            "pep_status": False,
            "sanctions_match": False,
            "document_status": "incomplete",
            "beneficial_owners": ["John Doe", "Jane Smith"],
            "industry": "financial_services",
        })
        continue

    is_corp = random.random() < 0.6
    country = random.choices(LOW_RISK_COUNTRIES + HIGH_RISK_COUNTRIES, weights=[6] * len(LOW_RISK_COUNTRIES) + [1] * len(HIGH_RISK_COUNTRIES))[0]
    base = random.randint(45, 70) if country in HIGH_RISK_COUNTRIES else random.randint(5, 55)

    if acc_id in ("ACC-7702", "ACC-5310"):
        base = random.randint(55, 72)
    
    risk_score = min(base, 100)
    risk_level = "high" if risk_score >= 70 else "medium" if risk_score >= 40 else "low"
    kyc_records.append({
        "account_id": acc_id,
        "customer_name": (random.choice(["Apex", "Vertex", "Orion", "Summit", "Delta", "Pioneer", "Crescent", "Atlas"]) + " " + random.choice(["Holdings", "Trading", "Partners", "Ventures", "Group", "Industries"]) + " Ltd") if is_corp else person(),
        "entity_type": "corporate" if is_corp else "individual",
        "country_of_incorporation": country,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "onboarding_date": iso(NOW - timedelta(days=random.randint(120, 900)))[:10],
        "last_review_date": iso(NOW - timedelta(days=random.randint(10, 200)))[:10],
        "pep_status": random.random() < 0.06,
        "sanctions_match": False,
        "document_status": random.choices(["complete", "incomplete"], weights=[5, 1])[0],
        "beneficial_owners": [person() for _ in range(random.randint(1, 3))] if is_corp else [],
        "industry": random.choice(INDUSTRIES),
    })

# Transactions ------------------
transactions = []
def make_tx(account_id, ts, amount, counterparty, country, direction="outbound", tx_type="wire_transfer", rapid=False, desc="Payment"):
    return {
        "transaction_id": next_txn_id(),
        "timestamp": iso(ts),
        "amount": round(amount, 2),
        "currency": "USD",
        "type": tx_type,
        "direction": direction,
        "account_id": account_id,
        "counterparty": counterparty,
        "counterparty_country": country,
        "description": desc,
        "risk_flags": risk_flags_for(amount, country, rapid),
        "status": random.choices(["completed", "pending"], weights=[9, 1])[0],
    }

# baseline setup
for acc_id in account_ids:
    for _ in range(random.randint(8, 26)):
        ts = NOW - timedelta(days=random.randint(1, 90), hours=random.randint(0, 23), minutes=random.randint(0, 59))
        transactions.append(make_tx(
            acc_id, ts,
            amount=round(random.uniform(50, 9000), 2),
            counterparty=random.choice(NORMAL_COUNTERPARTIES),
            country=random.choice(LOW_RISK_COUNTRIES),
            direction=random.choice(["inbound", "outbound"]),
            tx_type=random.choice(TX_TYPES),
            desc=random.choice(["Invoice payment", "Payroll", "Vendor settlement", "Subscription", "Refund", "Service fee"])
        ))

def burst(account_id, day, start_hour, window_hours, n, total, counterparty, country, desc):
    amts = split_amount(total, n, total / n * 0.7, total / n * 1.3)
    for a in amts:
        ts = day.replace(hour=start_hour) + timedelta(minutes=random.randint(0, window_hours * 60))
        transactions.append(make_tx(account_id, ts, a, counterparty, country, rapid=True, desc=desc))

# Case 1
burst("ACC-8891", datetime(2026, 5, 15, tzinfo=timezone.utc), start_hour=9, window_hours=3, n=14, 
      total=287500.00, counterparty="Aurora Holdings Ltd", country="CY", desc="Investment advisory fee")
burst("ACC-8891", datetime(2026, 6, 3, tzinfo=timezone.utc), start_hour=10, window_hours=2, n=12, 
      total=245000.00, counterparty="Aurora Holdings Ltd", country="CY", desc="Advisory retainer")

# Case 2
burst("ACC-7702", datetime(2026, 6, 2, tzinfo=timezone.utc), start_hour=13, window_hours=4, n=13, 
      total=96000.00, counterparty="Pacific Import Export", country="AE", desc="Goods purchase")
burst("ACC-5310", datetime(2026, 6, 4, tzinfo=timezone.utc), start_hour=8, window_hours=5, n=11, 
      total=54000.00, counterparty="Riviera Property SC", country="SC", desc="Real estate deposit")

# Real Regulations ------------------
regulations = [
    {
        "regulation_id": "REG-BSA-SAR-001",
        "title": "Bank Secrecy Act - Suspicious Activity Reporting (SAR)",
        "body": ("Financial institutions must file a Suspicious Activity Report with FinCEN "
                 "when they detect a transaction involving at least 5,000 US dollars that they "
                 "know, suspect, or have reason to suspect involves funds from illegal activity, "
                 "is structured to evade reporting requirements, has no apparent lawful purpose, "
                 "or is otherwise unusual for the customer. SARs must be filed within 30 days of "
                 "detection and the institution must not disclose the filing to the customer."),
        "jurisdiction": "US", "authority": "FinCEN",
        "effective_date": "2024-01-01", "last_updated": "2025-06-15",
        "categories": ["AML", "SAR", "reporting"]
    },
    {
        "regulation_id": "REG-CTR-002",
        "title": "Currency Transaction Reporting - $10,000 Threshold",
        "body": ("A Currency Transaction Report must be filed for any cash transaction, or series "
                 "of related cash transactions in a single business day, that exceeds 10,000 US "
                 "dollars. Attempting to break a large amount into smaller transactions to stay "
                 "under this threshold is called structuring and is itself a federal crime."),
        "jurisdiction": "US", "authority": "FinCEN",
        "effective_date": "2024-01-01", "last_updated": "2025-03-10",
        "categories": ["AML", "CTR", "reporting", "structuring"]
    },
    {
        "regulation_id": "REG-KYC-CDD-003",
        "title": "Customer Due Diligence and Know Your Customer",
        "body": ("Institutions must verify customer identity at onboarding, understand the nature "
                 "and purpose of the relationship, and maintain accurate records. Accounts with "
                 "incomplete documentation must not be permitted to transact until verification "
                 "is complete. Customer information must be kept current through periodic review."),
        "jurisdiction": "US", "authority": "FinCEN",
        "effective_date": "2024-05-11", "last_updated": "2025-01-20",
        "categories": ["KYC", "CDD", "onboarding"]
    },
    {
        "regulation_id": "REG-EDD-PEP-004",
        "title": "Enhanced Due Diligence for High-Risk Customers and PEPs",
        "body": ("Politically Exposed Persons, customers in high-risk jurisdictions, and entities "
                 "with complex ownership require Enhanced Due Diligence. This includes establishing "
                 "source of funds and source of wealth, senior management approval, and more "
                 "frequent ongoing monitoring of the relationship."),
        "jurisdiction": "US", "authority": "FFIEC",
        "effective_date": "2024-01-01", "last_updated": "2025-02-28",
        "categories": ["EDD", "PEP", "high_risk"]
    },
    {
        "regulation_id": "REG-CROSSBORDER-005",
        "title": "Cross-Border Funds Transfer Scrutiny",
        "body": ("Cross-border wire transfers, particularly to jurisdictions identified as higher "
                 "risk for money laundering, warrant heightened scrutiny. Institutions should "
                 "assess whether the transfer is consistent with the customer's known business, "
                 "and rapid sequences of cross-border transfers may indicate layering."),
        "jurisdiction": "US", "authority": "FinCEN",
        "effective_date": "2024-01-01", "last_updated": "2025-05-01",
        "categories": ["AML", "cross_border", "wire_transfer"]
    },
    {
        "regulation_id": "REG-OFAC-006",
        "title": "OFAC Sanctions Screening",
        "body": ("All transactions must be screened against the Office of Foreign Assets Control "
                 "sanctions lists. A confirmed match requires blocking the transaction and "
                 "reporting it to OFAC. Processing a transaction for a sanctioned party exposes "
                 "the institution to severe civil and criminal penalties."),
        "jurisdiction": "US", "authority": "OFAC",
        "effective_date": "2024-01-01", "last_updated": "2025-04-12",
        "categories": ["sanctions", "screening"]
    },
    {
        "regulation_id": "REG-STRUCTURING-007",
        "title": "Structuring and Smurfing Detection",
        "body": ("Structuring is the act of arranging transactions to avoid triggering reporting "
                 "thresholds. Patterns such as many sub-threshold deposits, or a high velocity of "
                 "transactions just under reporting limits, are red flags that should be "
                 "investigated and may require a SAR filing regardless of individual amounts."),
        "jurisdiction": "US", "authority": "FinCEN",
        "effective_date": "2024-01-01", "last_updated": "2025-06-01",
        "categories": ["AML", "structuring", "SAR"]
    },
    {
        "regulation_id": "REG-BENEFICIAL-008",
        "title": "Beneficial Ownership Identification",
        "body": ("Institutions must identify and verify the natural persons who own 25 percent or "
                 "more of a legal entity customer, and at least one person who controls it. "
                 "Opaque ownership structures and the use of shell companies are recognized money "
                 "laundering typologies that require additional scrutiny."),
        "jurisdiction": "US", "authority": "FinCEN",
        "effective_date": "2024-05-11", "last_updated": "2025-01-20",
        "categories": ["CDD", "beneficial_ownership"]
    },
    {
        "regulation_id": "REG-TRAVEL-009",
        "title": "Funds Transfer Recordkeeping (Travel Rule)",
        "body": ("For transmittals of funds of 3,000 US dollars or more, institutions must obtain "
                 "and retain originator and beneficiary information and pass it to the next "
                 "financial institution in the payment chain. These records support law "
                 "enforcement tracing of illicit funds."),
        "jurisdiction": "US", "authority": "FinCEN",
        "effective_date": "2024-01-01", "last_updated": "2024-12-15",
        "categories": ["recordkeeping", "travel_rule", "wire_transfer"]
    },
    {
        "regulation_id": "REG-MONITORING-010",
        "title": "Ongoing Transaction Monitoring",
        "body": ("Institutions must maintain risk-based systems to monitor customer transactions "
                 "for unusual or suspicious activity on an ongoing basis. Detected anomalies such "
                 "as sudden changes in volume, velocity, or counterparties should trigger review "
                 "and, where warranted, escalation and reporting."),
        "jurisdiction": "US", "authority": "FFIEC",
        "effective_date": "2024-01-01", "last_updated": "2025-05-30",
        "categories": ["AML", "monitoring"]
    }
]

# Seed case files ------------------
case_files = [
    {
        "case_id": "CASE-2026-0007",
        "created_at": "2026-03-18T09:30:00Z",
        "created_by": "vigil-agent",
        "subject": "Pacific Import Export - Round-number cash deposits",
        "summary": ("Investigation into ACC-7702 for a series of round-number deposits just below "
                    "the 10,000 dollar reporting threshold over a two-week period. Pattern is "
                    "consistent with possible structuring. Enhanced monitoring applied."),
        "entities_involved": ["ACC-7702", "Pacific Import Export"],
        "risk_level": "high", "status": "open",
        "findings": ["Multiple deposits between 9,200 and 9,800 dollars",
                     "Deposits across several branches in short window",
                     "Possible structuring to evade CTR threshold"],
        "recommended_actions": ["Enhanced monitoring on ACC-7702",
                                "Consider SAR if pattern continues"],
        "related_cases": []
    },
    {
        "case_id": "CASE-2026-0011",
        "created_at": "2026-04-02T14:05:00Z",
        "created_by": "vigil-agent",
        "subject": "Summit Ventures Ltd - Resolved false positive",
        "summary": ("Velocity alert on ACC-3300 reviewed and cleared. Spike corresponded to a "
                    "documented, legitimate quarterly supplier settlement. No further action."),
        "entities_involved": ["ACC-3300", "Summit Ventures Ltd"],
        "risk_level": "low", "status": "resolved",
        "findings": ["Velocity spike explained by quarterly supplier payments",
                     "Supporting invoices on file"],
        "recommended_actions": ["Close alert", "No SAR required"],
        "related_cases": []
    }
]

def dump(name, obj):
    path = os.path.join(OUTPUT, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    print(f"  wrote {len(obj):>4} docs -> {path}")

print("Generating synthetic Vigil data...")
dump("transactions.json", transactions)
dump("kyc_records.json", kyc_records)
dump("regulations.json", regulations)
dump("case_files.json", case_files)
print("Done. (seed=42, deterministic)")
