---
created: 2026-04-21T19:45:00Z
title: Redesign transaction form Notes + Tags section layout
area: ui
files:
  - apps/web/src/components/transactions/TransactionForm.tsx:414
  - apps/web/src/components/transactions/TransactionTagPicker.tsx
---

## Problem

The Notes and Tags fields are currently side-by-side in an equal-width flex row (see TransactionForm.tsx:414). This leaves the Notes textarea cramped — it gets only half the available width, making it hard to read/write longer notes. Tags, being a compact combobox, doesn't need that much space.

## Solution

Reconsider the layout. Options:
- Stack Notes on top (full width) and Tags below it (full width or constrained) — cleaner hierarchy since Notes is primary
- Or give Notes ~2/3 width and Tags ~1/3 in a grid, so Notes gets breathing room
- Notes textarea should also be taller (min 3 rows) to signal it accepts multi-line input

The current equal-width split (flex row) is the root of the imbalance.
