# PROJECT STATE

## Overview

Pool match optimizer app with:

* React frontend (Dashboard.tsx)
* FastAPI backend
* Real player-based lineup generation and elimination
* Live match decision support tools

---

## Completed Features

### 1. Lineup Tracker (Core Engine + UI)

* Generates all valid 5-player lineups (≤23 SL)
* Uses real player combinations (not abstract)
* Aggregates duplicate skill patterns
* Tracks:

  * Active lineups
  * Eliminated lineups
  * Most likely lineup
* UI features:

  * Most likely lineup highlighted
  * Active vs eliminated sections
  * Lineup counts per team
  * Pressure indicators:

    * 1 lineup → locked warning
    * 2–3 → limited options
  * Must-include players (intersection of active lineups)

---

### 2. Live Score Tracking System (NEW)

#### Match Rules (Fixed)

* Open 8-ball format
* Max 5 rounds
* Each round = one individual match
* Each round awards up to 3 team points
* Match is a race to 8 team points
* No scoring modes (single rule system only)

---

#### Score State

Tracked in frontend:

* teamAScore
* teamBScore
* raceTo = 8
* rounds[] (history of completed rounds)
* match status:

  * in_progress
  * clinched
  * complete

---

#### Round Structure

Each round stores:

* round number
* Team A player + SL
* Team B player + SL
* teamAPoints (0–3)
* teamBPoints (0–3)
* winner (derived from points)

---

#### Score Entry UI

* Fast round entry form
* Player selection (prevents reuse)
* Points input (0–3 inclusive)
* Winner is automatically derived from points
* Validation:

  * no tied scores
  * winner must match higher points
  * max 5 rounds
  * no duplicate players

---

#### Round History

* Displays all completed rounds
* Shows:

  * players
  * score (e.g., 2–1)
  * winner
  * running totals
* Supports:

  * edit round
  * delete round (undo)
  * automatic score recalculation

---

### 3. Score Context Engine

Derived match states:

* neutral
* protect_lead
* trailing
* desperation

Based on:

* score difference
* proximity to race target (8)

Used to drive:

* recommendation context
* UI indicators

---

### 4. Score-Aware Recommendations (NEW)

Recommendations now include:

#### Context Banner

* Displays current match state:

  * Neutral
  * Protect Lead
  * Trailing
  * Desperation

#### Guidance Text

Examples:

* "Protecting a lead — prioritize safer matchups"
* "Trailing — prioritize immediate win potential"

#### Reasoning Layer

Each recommendation includes:

* explanation tied to score context
* no change to backend calculations
* purely interpretive layer

---

## Current Architecture

System is now composed of:

1. **Lineup Engine**

   * Valid lineups
   * elimination tracking

2. **Score Engine**

   * round tracking
   * match state
   * race-to-8 logic

3. **Context Engine**

   * score pressure classification

4. **Decision Layer (Frontend)**

   * recommendations
   * score-aware explanations

---

## Key UX Improvements

* Live match usability prioritized
* Fast data entry (no unnecessary inputs like winner dropdown)
* Readable in <2 seconds during play
* Clear decision guidance, not just raw data

---

## Next Priority

### Opponent Behavior Modeling

Use score context to influence:

* expected opponent choices
* most likely lineup prediction

Examples:

* Neutral → standard matchups (e.g., 7 vs 7)
* Trailing → aggressive mismatches
* Leading → conservative / control plays

---

## Future Enhancements (Planned)

* Captain Mode decision engine
* Opponent prediction weighting
* Forward simulation (optional later)
* UI polish / layout refinement

---

## Notes

* No backend changes required for scoring yet
* All new logic implemented in Dashboard.tsx
* System designed to layer intelligence incrementally (no over-engineering)
