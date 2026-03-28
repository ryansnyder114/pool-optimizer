# PROJECT STATE (Checkpoint)

## Core System Status

The app is now a **live match decision assistant** with:

### 1. Lineup Engine

* Generates all valid 5-player lineups (≤23 SL)
* Tracks active/eliminated lineups
* Highlights most likely lineup
* Identifies must-include players

---

### 2. Score Engine

* Race to 8 (team points)
* 0–3 points per round
* Full round history (add/edit/delete)
* Automatic totals + validation

---

### 3. Score Context Engine

Derived match states:

* neutral
* protect_lead
* trailing
* desperation

Used across UI + logic

---

### 4. Turn / Declaration Engine

* Alternating first declaration per round
* Tracks:

  * `startingDeclaringTeam`
  * `declarationStep`
  * `firstDeclaredPlayer`
* Enforces turn-based player selection
* Supports delete/replay with correct recalculation

---

### 5. Stable Roster System

* Player rosters persist across delete/edit
* Availability derived from `scoreState.rounds`
* No dependency on transient `matchState`

---

### 6. Player Availability System

* Single source of truth (derived from rounds)
* Consistent:

  * styling
  * clickability
  * validation

---

### 7. Prediction Engine (NEW)

#### First Declaration Prediction

* Score-aware heuristic weighting
* Factors:

  * skill level
  * win rate
  * freshness

#### Response Prediction

* Based on opponent’s declared player
* Context-aware:

  * mirror vs mismatch logic

#### Output

* Top 3 predictions
* Confidence levels
* Reasoning text

---

### 8. Prediction UI Panel

* "Opponent Prediction" section
* Dynamically switches:

  * First play → response prediction
* Displays:

  * score context
  * predicted players
  * reasoning
  * confidence badges

---

## Architecture Status

System layers now complete:

1. Lineup Engine
2. Score Engine
3. Context Engine
4. Turn Engine
5. Prediction Engine ✅

⚠️ Backend still unchanged (all logic frontend-driven)

---

## Current State

✅ Stable (no crashes)
✅ Full live match workflow
✅ Score-aware predictions
✅ Delete/edit/replay safe

---

## Next Phase

### Upgrade Decision Intelligence

* Tie predictions into recommendations
* Add opponent modeling refinement
* Improve lineup probability weighting

---

## Notes

* All logic currently in Dashboard.tsx
* System is ready for deeper strategy layer
