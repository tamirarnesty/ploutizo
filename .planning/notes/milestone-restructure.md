---
title: Milestone restructure — feature-based milestones
date: 2026-04-14
updated: 2026-05-18
context: explore session — replaced single v0.1 MVP label with feature-based milestones; phase IDs realigned with delivery order 2026-05-18
---

## Decision

Replaced the single "v0.1 MVP" milestone (which was actually the entire v1 product) with
feature-based milestones. Each milestone delivers a self-contained, usable slice.

## Milestone Map (current)

Phase numbers **from 05.1 onward** match execution order (see `.planning/ROADMAP.md`).

| Milestone | Name | Phases |
|-----------|------|--------|
| v0.1 | Foundation | 1, 2, 02.x, 03.1 — complete |
| v0.2 | Transactions & Settlement | 03.2–03.6, 04.1–04.2 (+ 04.2.x tail) — **current** |
| v0.3 | Import | 05.1–05.4 |
| v0.4 | Budgets | 06.1–06.2 |
| v0.5 | Command center | 06.3 |
| v0.6 | Investments | 07.1–07.2 |
| v0.7 | Notifications | 07.3–07.4 |
| v0.8 | Net worth | 08.1–08.2 |
| v1.0 | Launch | 09.1–09.2 |

## Key decisions

- **Settlement folds into v0.2** — unusable without transactions; not a standalone milestone
- **Import before Budgets** — Import creates transaction volume; Budgets consume it
- **Overview (06.3) after Budgets** — dashboard spend-by-category + budget highlights need budget APIs/UI
- **Notifications after Investments** — contribution over-room triggers need `07.1–07.2`; budget + settlement triggers need prior phases
- **Net worth before Launch** — `08.x` completes wealth views; `09.x` is platform/i18n hardening

## Pre–Import action

Collect real bank CSV export files (TD, RBC, CIBC, Scotiabank, BMO, Amex, Tangerine,
EQ Bank) before starting **05.1**. Column names in normalizers are LOW confidence from
training data — fixtures needed before writing parsers.
