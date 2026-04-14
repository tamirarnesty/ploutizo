---
title: Milestone restructure — feature-based milestones
date: 2026-04-14
context: explore session — replaced single v0.1 MVP label with 6 feature-based milestones
---

## Decision

Replaced the single "v0.1 MVP" milestone (which was actually the entire v1 product) with
six feature-based milestones. Each milestone delivers a self-contained, usable slice.

## Milestone Map

| Milestone | Name | Phases |
|-----------|------|--------|
| v0.1 | Foundation | 1, 2, 02.x, 03.1 — complete |
| v0.2 | Transactions & Settlement | 03.2–03.5, 04.1–04.2 — **current** |
| v0.3 | Import | 05.1–05.4 |
| v0.4 | Budgets | 04.3–04.4 |
| v0.5 | Investments & Net Worth | 06.1–06.4 |
| v1.0 | Notifications + Launch | 07.1–07.2, 08.1–08.2 |

## Key decisions

- **Settlement folds into v0.2** — unusable without transactions; not a standalone milestone
- **Import moves before Budgets (v0.3 before v0.4)** — Import is the highest-value feature
  after Transactions; makes the app usable for real data while Budgets layers on top
- **Import has no dependency on Budgets** — Import creates transactions; Budgets query them
- **Budgets benefits from real data** — building v0.4 on top of imported transactions is
  a better dev/test experience than building against hand-entered fixtures
- **Notifications must be last** — hard deps on budgets (over-threshold) and investments
  (over-contribution warnings); correctly sits at v1.0

## Phase number note

Phase numbers (04.3/04.4 for Budgets, 05.x for Import) reflect original ordering.
Milestone execution order takes precedence: v0.3 Import ships before v0.4 Budgets.

## Pre-v0.3 action required

Collect real bank CSV export files (TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine,
EQ Bank) before starting v0.3. Column names in normalizers are LOW confidence from
training data — fixtures needed before writing parsers.
