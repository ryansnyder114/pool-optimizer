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
  * Pressure indicators (1 = locked, 2–3 = limited)
  * Must-include players (intersection of active lineups)

---

### 2. Live Score Tracking System

#### Match Rules

* Open 8-ball format
* Max 5 rounds
* Each round awards 0–3 team points
* Race to 8 team points
* No scoring modes (fixed system)

#### Score State

* teamAScore / teamBScore
* raceTo = 8
* rounds[]
* match status:

  * in_progress
  * clinched
  * complete

#### Round Entry

* Player selection (no duplicates)
* Points input (0–3)
* Winner automatically derived from points
* Validation:

  * no tied scores
  * valid score ranges
  * max 5 rounds

#### Round History

* Displays all rounds
* Shows players, score, winner, running totals
* Supports edit + delete (undo)
* Recalculates totals automatically

---

### 3. Score Context Engine

Derived states:

* neutral
* protect_lead
* trailing
* desperation

Used for:

* UI labels
* recommendation context

---

### 4. Score-Aware Recommendations

Enhancements:

* Context banner (e.g., "Protect Lead")
* Guidance text based on score
* Per-recommendation reasoning:

  * explains decisions in match context
* No backend changes (frontend interpretation only)

---

### 5. Round Declaration Turn Engine (NEW)

#### Core Logic

* Tracks:

  * startingDeclaringTeam
  * current round
  * declarationStep ("first" | "response" | "complete")
* Alternates first declaration each round:

  * Round 1 = starting team
  * Round 2 = opposite
  * Round 3 = original, etc.

#### UI Behavior

* Turn banner:

  * shows round number
  * shows which team declares first
  * shows current step (waiting / respond)
* Player selection:

  * only active team enabled
  * other team disabled with "Not your turn"
* Recommendation display:

  * first-declaration recommendations shown only during "first"
  * response recommendations shown only during "response"

---

## Current Issue (ACTIVE BUG)

### First Declaration Not Confirming

* Selecting a player only highlights it
* No action to confirm first declaration
* `declarationStep` remains "first"
* App stuck at:
  → "WAITING FOR FIRST DECLARATION"

#### Required Fix

* Add "Confirm First Declaration" action
* On confirm:

  * store `firstDeclaredPlayer`
  * advance step → "response"
  * unlock responding team
  * update turn banner

---

## Current Architecture

System now consists of:

1. **Lineup Engine**
2. **Score Engine**
3. **Context Engine**
4. **Turn Engine (round flow)**
5. **Decision Layer (recommendations + explanations)**

---

## Key UX Principles Achieved

* Built for live match use
* Fast input, minimal friction
* Clear turn guidance
* Recommendations tied to real context
* Readable in <2 seconds

---

## Next Priority

### Fix First Declaration Confirmation

* Add confirm action
* advance state properly
* unlock response flow

---

## Upcoming Features

### 1. Opponent Behavior Modeling

* Adjust expectations based on score:

  * neutral → standard matchups
  * trailing → aggressive plays
  * leading → conservative

### 2. Improved Lineup Prediction

* Use score + behavior to refine:

  * most likely lineup
  * expected opponent moves

### 3. Captain Mode Enhancements

* smarter decision weighting
* future-round awareness (light)

---

## Notes

* All new logic currently in Dashboard.tsx
* Backend unchanged for scoring
* System built incrementally (no over-engineering)
