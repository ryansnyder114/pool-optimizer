# PROJECT STATE

## Overview

Pool match optimizer app with:

* React frontend (Dashboard.tsx)
* FastAPI backend
* Real player-based lineup optimization
* Live match decision assistant

---

## Completed Features

### 1. Lineup Engine + Tracker UI

* Generates all valid 5-player lineups (≤23 SL)
* Uses real player combinations
* Tracks:

  * Active lineups
  * Eliminated lineups
  * Most likely lineup
* UI:

  * Most likely lineup highlighted
  * Active / eliminated sections
  * Lineup counts
  * Pressure indicators
  * Must-include players

---

### 2. Live Score Tracking System

* Race to 8 team points
* Max 5 rounds
* Each round awards 0–3 points
* Round history with:

  * players
  * score
  * winner (derived)
  * running totals
* Edit + delete (undo) support
* Validation:

  * no ties
  * valid point ranges
  * no duplicate players

---

### 3. Score Context Engine

Derived states:

* neutral
* protect_lead
* trailing
* desperation

Used for:

* UI labels
* recommendation guidance

---

### 4. Score-Aware Recommendations

* Context banner (e.g., "Protect Lead")
* Guidance text
* Per-recommendation reasoning
* No backend changes (frontend interpretation only)

---

### 5. Round Declaration Turn Engine

* Tracks:

  * startingDeclaringTeam
  * current round
  * declarationStep ("first" | "response" | "complete")
* Alternates first declaration each round
* UI:

  * turn banner
  * active team selection
  * disabled opposing team
  * step-based recommendations

---

### 6. First Declaration Workflow

* Player selection
* "Confirm First Declaration" button
* Stores `firstDeclaredPlayer`
* Advances step → "response"
* Unlocks responding team
* Banner updates dynamically

---

### 7. State Recalculation System

After delete/edit/save:

* recalculates round number
* recalculates declaring team
* resets declaration flow
* clears stale selections

---

### 8. Player Availability System (Partially Refactored)

* Derived from `scoreState.rounds`
* Uses Sets for fast lookup
* Removes dependency on:

  * `matchState.our_used_player_ids`
  * `matchState.opp_used_player_ids`

---

## Active Issues

### 1. CRITICAL: Old Declaration Logic Still Active

Runtime error:
undefined is not an object (evaluating 'matchState.first_declarer_by_round[matchState.round_index - 1]')

Cause:

* Old backend-driven declaration logic still exists
* Conflicts with new frontend-derived round system

Impact:

* crashes after delete/reselect
* inconsistent turn flow
* unstable UI state

---

### 2. Player Availability Mismatch

* Player may appear unavailable but still clickable
* Indicates multiple sources of truth still exist
* Needs full unification

---

## Current Architecture

System components:

1. Lineup Engine
2. Score Engine
3. Context Engine
4. Turn Engine
5. Decision Layer

⚠️ Currently mixed with legacy `matchState` logic (needs removal)

---

## Next Priority (BLOCKING)

### Remove Old Declaration System

* eliminate `matchState.first_declarer_by_round`
* eliminate `matchState.round_index` from live flow
* unify all logic under frontend-derived state

---

## Upcoming Features

* Opponent behavior modeling
* Improved lineup prediction
* Captain decision weighting
* Future-round awareness (light)

---

## Notes

* All new logic in Dashboard.tsx
* Backend unchanged
* Architecture is correct, but cleanup required
