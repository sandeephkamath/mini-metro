# Home Screen Specification

**Version**: 1.0
**Extends**: `metro.md` §8 Screen States

This document defines the **home screen**: a top-level phase (`home`) the player lands on before a run begins, and returns to after a run ends. It is distinct from the `start` phase's instructions overlay (title, how-to-play bullets, Start Game button, shown over the fixed starting stations) — the home screen precedes that overlay rather than replacing it.

## Flow

`home` → `start` → `playing` → `gameover` → `home` (loops)

| Transition | Trigger |
|---|---|
| `home` → `start` | Player clicks "Play" |
| `start` → `playing` | Player clicks "Start Game" (existing behavior, unchanged) |
| `playing` → `gameover` | Station overflow (core/logic.md §3), unchanged |
| `gameover` → `home` | Player clicks "Back to Home" |

## Content (current scope)

- Title ("Mini Metro") and a "Play" button. Nothing else.
- Best Level Reached, the current Picture (partially revealed), and a "View Collection" control (per `metro.md` §9) are **not** shown yet — no persistence exists for meta-progression. Deferred; see `memo.md`.

## Not yet decided

- Where Best Level Reached / Picture / Collection entry land once meta-progression persistence exists (this doc, once written, will absorb the bullets currently sitting under `metro.md` §9 for the `start` row).
