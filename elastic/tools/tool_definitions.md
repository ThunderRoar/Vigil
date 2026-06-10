# Vigil - Agent Builder Tool Definitions

This document specifies the Vigil tools. **6 are built in Agent Builder** (the agent calls
them via MCP); the **7th (write-back) is handled app-side** (see Tool 7).
Build the 6 in Kibana **Agent Builder > Tools > Create**. Tool types:
- **ES|QL** (tools 1-4): read/aggregate structured data
- **Index search** (tools 5-6): hybrid keyword + semantic search (uses ELSER)
- **App-side write** (tool 7): write-back via a Next.js API route (NOT in Agent Builder)

> **Dataset reference date: 2026-06-06.** Relative dates ("this week", "last 90 days")
> are interpreted against this date, NOT real wall-clock time, because the synthetic
> data is frozen. The agent's system prompt states this so it computes `start_date` correctly.

---

## Agent Builder UI notes (verified while building these live)

**Parameter types** - the ES|QL Parameters UI offers: `integer`, `string`, `float`,
`boolean`, `date`, `array`. Map our schema types as:

| Schema type | UI type |
|---|---|
| keyword / text | `string` |
| double | `float` |
| integer | `integer` |
| date | `date` (datetime picker for the *default*; the agent passes ISO-8601 at call time) |
| array (`keyword[]` / `text[]`) | `array` |

**Optional + Default**: mark filter params **Optional** and give a "match-all" default
(`*` for wildcards, `0` for min amounts, an early date like `01/01/2020` for start_date).
The agent then supplies only the params it cares about; the rest no-op. Defaults never
filter anything out.

**Descriptions are required** on every parameter and they're how Gemini decides when to
call the tool, so write them well.

**Tool ID rules**: lowercase letters, numbers, dots, underscores; must start/end with a
letter or number. All snake_case names below comply. (A separate display name can be prettier.)

**Labels**: optional; add `vigil` to group your tools. Labels do NOT affect tool selection
(Gemini uses name + description).

---

## Tool 1:  `search_transactions`  (ES|QL)
**Purpose:** Find transactions, filtered by account, counterparty, amount, and/or date.

```esql
FROM transactions
| WHERE account_id LIKE ?account_id
    AND counterparty.keyword LIKE ?counterparty
    AND amount >= ?min_amount
    AND timestamp >= ?start_date
| SORT timestamp DESC
| KEEP transaction_id, timestamp, account_id, counterparty, amount, currency,
       type, direction, counterparty_country, risk_flags, status
| LIMIT 100
```

| Param | UI Type | Description | Optional | Default |
|---|---|---|---|---|
| `account_id` | string | Account ID to filter by, or `*` for all accounts | yes | `*` |
| `counterparty` | string | Counterparty name wildcard (e.g. `*Aurora*`), or `*` for all | yes | `*` |
| `min_amount` | float | Minimum transaction amount in USD | yes | `0` |
| `start_date` | date | Earliest timestamp to include (agent passes ISO-8601) | yes | `01/01/2020` |

> Note: `counterparty.keyword` (not `counterparty`) - ES|QL `LIKE` needs the exact match
> sub-field. `LIKE` uses `*` (many chars) and `?` (one char) as wildcards.

---

## Tool 2: `transaction_velocity_check`  (ES|QL)
**Purpose:** Detect accounts with abnormally many transactions since a date — the core
anomaly detector. Powers Scenario 2.

```esql
FROM transactions
| WHERE timestamp >= ?start_date
| STATS tx_count = COUNT(*), total_amount = SUM(amount),
        avg_amount = AVG(amount), max_amount = MAX(amount) BY account_id
| WHERE tx_count >= ?min_count
| SORT tx_count DESC
| LIMIT 20
```

| Param | UI Type | Description | Optional | Default |
|---|---|---|---|---|
| `start_date` | date | Start of the window (agent computes from the reference date; "this week" = 2026-05-30) | no | — |
| `min_count` | integer | Flag accounts with at least this many transactions | yes | `10` |

> Expected for "this week" (start `2026-05-30`, min 10): **ACC-8891, ACC-7702, ACC-5310**.

---

## Tool 3: `lookup_kyc`  (ES|QL)
**Purpose:** Resolve a customer profile by account ID **or** name. Use `*` for the dimension you're not filtering on. This is the entity-resolution workhorse.

```esql
FROM kyc_records
| WHERE account_id LIKE ?account_id AND customer_name.keyword LIKE ?name
| KEEP account_id, customer_name, entity_type, country_of_incorporation,
       risk_score, risk_level, document_status, pep_status, sanctions_match,
       beneficial_owners, industry, onboarding_date, last_review_date
| LIMIT 5
```

| Param | UI Type | Description | Optional | Default |
|---|---|---|---|---|
| `account_id` | string | Exact account ID, or `*` | yes | `*` |
| `name` | string | Customer name wildcard (e.g. `*Meridian*`), or `*` | yes | `*` |

> Scenario 1: `account_id="*"`, `name="*Meridian*"` > returns ACC-8891 (risk 78, Cyprus, incomplete docs).
> Scenario 2: `account_id="ACC-8891"`, `name="*"` > same profile by ID.

---

## Tool 4: `high_risk_accounts`  (ES|QL)
**Purpose:** List customers above a risk-score threshold.

```esql
FROM kyc_records
| WHERE risk_score >= ?threshold
| SORT risk_score DESC
| KEEP account_id, customer_name, risk_score, risk_level,
       country_of_incorporation, document_status, pep_status
| LIMIT 25
```

| Param | UI Type | Description | Optional | Default |
|---|---|---|---|---|
| `threshold` | integer | Minimum risk score (0–100) | yes | `70` |

---

## Tool 5: `search_regulations`  (Index search)
**Purpose:** Hybrid (lexical + semantic) search over regulatory text. Powers Scenario 3.

**Config (UI - no ES|QL to write):**
- Tool type: **Index search**
- **Target pattern:** `regulations` (UI confirms "matches 1 source")
- **Row limit:** `5`
- **Custom instructions** (steers the auto-generated ES|QL - this is where you select fields):
  ```
  Return the fields regulation_id, title, body, authority, jurisdiction, and categories.
  Rank results by relevance to the user's query and return the most relevant regulations.
  ```
- The `query` parameter is **auto-exposed** by the tool - you do NOT define params manually.

---

## Tool 6: `search_case_files`  (Index search)
**Purpose:** Search the agent's own past investigations - the **memory read**.

**Config (UI):**
- Tool type: **Index search**
- **Target pattern:** `case_files`
- **Row limit:** `5`
- **Custom instructions:**
  ```
  Return the fields case_id, subject, summary, entities_involved, risk_level, status, and created_at.
  Rank results by relevance to the user's query.
  ```
- The `query` parameter is auto-exposed. Hybrid is automatic (semantic via `memory_semantic`,
  lexical via `subject` / `summary`).

---

## Tool 7 : `write_case_file`  (app side write-back and NOT built in Agent Builder)
**Purpose:** Index a new investigation into `case_files` - the **memory write**. Vigil's
signature feature.

Write-back is handled **app-side**: the dashboard's "Save case file" button POSTs to a Next.js route (`frontend/src/app/api/cases/route.ts`), which indexes the doc via the ES index API (`PUT /case_files/_doc/{id}?refresh=true`). The agent's **6 read tools + this app-side write** fully deliver the memory loop: write > `case_files` > Tool 6 recalls it.

Document shape written (id = `case_id`; `created_by` / `created_at` set server-side):

| Field | Type | Description |
|---|---|---|
| `case_id` | string | e.g. `"CASE-2026-0042"` |
| `subject` | string | Short title |
| `summary` | string | Narrative summary |
| `entities_involved` | array | e.g. `["ACC-8891","Meridian Capital Group"]` |
| `risk_level` | string | `low` / `medium` / `high` / `critical` |
| `status` | string | `open` / `escalated` / `resolved` |
| `findings` | array | Bullet findings |
| `recommended_actions` | array | Bullet actions |
