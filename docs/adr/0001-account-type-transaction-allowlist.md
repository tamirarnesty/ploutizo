---
status: accepted
---

# Account-type transaction allowlists (defensive validation)

Ploutizo today accepts any of the six transaction types against any account type at the API layer (`createTransactionSchema` discriminates on `type` only). That permissive model allows invalid combinations (e.g. income or transfer on a credit card) that cannot occur in real household bookkeeping and could corrupt settlement views if written.

We will introduce an explicit allowlist for each transaction account role and counterpart account role. Validation runs at create/update time and rejects disallowed pairs with a clear error before any DB write. The matrix should be **defensive** (deny by default for ambiguous cases) rather than permissive.

Settlement balances on credit cards already depend only on **expense**, **refund**, and **settlement** (see `CONTEXT.md`). This ADR is the hardening work that keeps the ledger consistent with that model—e.g. credit cards must not accept income or transfer. This decision records that the constraint belongs in shared transaction policy plus API validation, not UI-only filtering.

**Related:** Personal vs shared **balance attribution** uses assignee count only, not account ownership metadata (`CONTEXT.md`). Every transaction type must have at least one assignee (household-wide rule; validators today still allow optional assignees on some types).

## Module placement

The shared policy module will live at `@ploutizo/utils/transaction-policy`, with a matching package subpath export. Keep the module specific to transaction policy for now. Do not introduce a generic `policies/` directory until multiple shared policy modules prove that taxonomy is useful.

The `other` account type is removed from the account taxonomy during development. Do not keep separate persisted and supported account-type lists unless a future compatibility requirement forces that split.

Removing `other` is part of the transaction-policy implementation scope because the policy matrix depends on the narrowed account taxonomy. The implementation removes it from shared type literals, account validators, DB enum declarations, and account UI labels before wiring transaction-policy behavior.

Policy constants are implementation details inside `@ploutizo/utils/transaction-policy`. Callers should use public accessors and pure adapters rather than importing policy objects directly. This keeps the policy shape private while giving web/API/validator surfaces consistent answers.

The public API starts with one read model and four operations:

- `getTransactionTypePolicy(type)` returns a readonly expanded policy for callers that need type-level metadata.
- `resolveTransactionDescriptionPolicy(input)` resolves conditional description semantics to an effective manual/generated mode.
- `getTransactionFieldsToClear(type)` derives scalar and account fields that should be cleared when switching to a transaction type.
- `validateTransactionAccountPolicy(input)` validates required account slots, allowed account types, and relationship rules for saved transaction writes.
- `getAccountOptionsForTransactionSlot(input)` filters and sorts selectable accounts for a transaction slot using policy order plus availability constraints.

API service validation should load transaction write references once, then validate policy against the loaded account rows. The current existence-only `assertTransactionWriteReferences` helper should evolve into a reference-loading helper that preserves org/reference checks and returns the transaction account and optional counterpart account with at least `id`, `type`, and `archivedAt`.

## Policy shape

The module will use a two-layer shape:

- `ACCOUNT_ROLE_POLICIES` maps each account role to an intentionally ordered list of allowed account types.
- `TRANSACTION_TYPE_POLICIES` maps each transaction type to its account slots, scalar field relevance, description mode, and relationship rules such as transfer source and destination needing different accounts.

This keeps account-type legality attached to domain roles while keeping transaction-specific behavior attached to transaction kinds. The policy does not own visible copy, routes, generated description templates, or UI component layout.

Saved transaction writes require every policy-declared required slot. `counterpartAccountId` is required for saved `transfer`, `settlement`, and `contribution` transactions. The database column remains nullable because it is type-specific and future capabilities may need intermediate or partial transaction states without a database migration. The UI and API enforce the narrowed saved-transaction rules through shared policy.

Scalar field relevance is modeled as a per-transaction field map, not parallel relevant/cleanup arrays. A field map entry is either `required` or `optional`; absent scalar fields are irrelevant for that transaction type and are cleared on type change. Account fields are governed by account slot policy instead of being duplicated in the scalar field map.

Description policy is modeled as transaction-kind semantics, not templates or UI lock flags. Static policy can mark a type as `manual`, `generated`, or `conditional_generated` with a source such as account-pair or linked-refund. A resolver returns only the effective mode for the current values: `manual` or `generated`. Generated description strings live in a sibling/defaults module. UI lock state is derived from the resolved mode plus whether the current description still matches the generated candidate; custom or legacy descriptions open as manual.

Every transaction with two account slots must use two different accounts. `transfer`, `settlement`, and `contribution` use the `different_accounts` relationship rule. The UI must prevent selecting account A as account B, and API validation must reject same-account writes as a defensive guard.

Archived-account availability is not part of account role policy. The shared matrix answers which account types are valid for a role. A separate account-options adapter filters archived accounts for new writes while preserving historical validity for existing rows. Service logic, not core policy, enforces that an archived account can only remain on a transaction dated on or before that account's archive date. This date rule applies independently to the transaction account and the counterpart account. UI date/account controls should prevent selecting an account/date combination that would put transaction activity after the account's archive date.

The allowed account type order is intentional. Account option adapters should use the role's allowed account type order as the default grouping/sort order, with a stable secondary order inside each type. Empty-state account creation derives its prefilled account type from the first allowed type for the missing role.

## Account role matrix

`accountId` is the **transaction account** and `counterpartAccountId` is the **counterpart account**. Allowed account types are ordered by the expected default first.

| Account role                       | Allowed account types                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `expense_account`                  | `credit_card`, `chequing`, `savings`, `prepaid_cash`, `e_transfer`                         |
| `refund_account`                   | `credit_card`, `chequing`, `savings`, `prepaid_cash`, `e_transfer`                         |
| `income_account`                   | `chequing`, `savings`, `prepaid_cash`, `e_transfer`                                        |
| `transfer_source_account`          | `chequing`, `savings`, `prepaid_cash`, `e_transfer`, `investment`                          |
| `transfer_destination_account`     | `chequing`, `savings`, `prepaid_cash`, `e_transfer`, `investment`; must differ from source |
| `settlement_scoped_account`        | `credit_card`                                                                              |
| `settlement_funding_account`       | `chequing`, `savings`                                                                      |
| `contribution_source_account`      | `chequing`, `savings`                                                                      |
| `contribution_destination_account` | `investment`                                                                               |

## UI consequence

The UI should use the same policy to filter account choices. If no account exists for a required role, the UI must show a recoverable empty state that guides the user to create an appropriate account type; it must not render an invalid select or rely on a failed write.

The shared policy module should stay copy- and route-agnostic. It exposes rules and reusable metadata such as ordered allowed account types. When the UI needs a default account type for account creation, it derives that value from the first allowed account type for the missing role. The web adapter owns the visible copy and navigation. For now, recovery navigates to `/accounts` and passes a temporary account creation intent through TanStack Router navigation `state`, not URL search params. The destination route consumes that state to auto-open the account creation sheet with the needed account type prefilled, then clears the consumed state so back/forward navigation does not repeat the interaction.

The first implementation includes a transaction form redesign around policy-driven account slots and recoverable empty states, plus cleanup of generated description templating outside the policy module. It does not include import draft behavior or user-facing policy editors/customization.

The transaction form keeps its flat TanStack Form value shape. The redesign changes rendering, account option derivation, scalar cleanup, description behavior, and submit/API validation around the shared policy; it does not rewrite form state into nested transaction-type-specific objects.

Transaction form payload construction should use policy accessors/adapters instead of a transaction-type switch. The policy determines which scalar fields and account slots are relevant; payload builders normalize and include only those fields.

Generated transaction description templates live adjacent to the policy inside the `@ploutizo/utils/transaction-policy` subpath, not inside policy constants. Existing helpers such as settlement description formatting should move into that module, and call sites should migrate directly to the new import path. Do not keep re-export shims solely to preserve old import paths.

The transaction-policy module is imported by subpath only. Do not export it from `packages/utils/src/index.ts`. When moving existing helpers into the new subpath, remove their old root-barrel export and update call sites directly.
