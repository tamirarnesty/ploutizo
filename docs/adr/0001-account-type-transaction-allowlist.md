---
status: proposed
---

# Account-type transaction allowlists (defensive validation)

Ploutizo today accepts any of the six transaction types against any account type at the API layer (`createTransactionSchema` discriminates on `type` only). That permissive model allows invalid combinations (e.g. income or transfer on a credit card) that cannot occur in real household bookkeeping and could corrupt settlement views if written.

We will introduce an explicit **allowlist per account type**: each account type declares which transaction types may be created with that account as `accountId` (and, where applicable, as `counterpartAccountId`). Validation runs at create/update time and rejects disallowed pairs with a clear error before any DB write. The matrix should be **defensive** (deny by default for ambiguous cases) rather than permissive.

Settlement balances on credit cards already depend only on **expense**, **refund**, and **settlement** (see `CONTEXT.md`). This ADR is the hardening work that keeps the ledger consistent with that model—e.g. credit cards must not accept income or transfer. The full matrix (chequing, savings, investment, etc.) will be defined when we implement; this decision records that the constraint belongs in validators + API, not UI-only filtering.

**Related:** Personal vs shared **balance attribution** uses assignee count only, not account ownership metadata (`CONTEXT.md`). Every transaction type must have at least one assignee (household-wide rule; validators today still allow optional assignees on some types).
