# PROJECT STATE (Checkpoint)

## Overview

Pool match optimizer app with:

* React frontend (`frontend/src/pages/Dashboard.tsx`)
* FastAPI backend
* Live match workflow for team 8-ball
* Score-aware recommendation and prediction logic
* Manual + app-tracked player stat layers

---

## Core Systems Completed

### 1. Lineup Engine + Tracker UI

* Generates all legal 5-player lineups (≤23 SL)
* Uses real player combinations
* Tracks:

  * active lineups
  * eliminated lineups
  * most likely lineup
  * must-include players
* Duplicate bottom lineup tracker removed
* Main lineup tracker panels remain higher on page

### 2. Live Match / Turn Flow

* Tracks:

  * `startingDeclaringTeam`
  * `declarationStep`
  * `firstDeclaredPlayer`
* First declaration alternates by round
* First player selection auto-advances to response step
* No separate "Confirm First Declaration" button
* "Lock Matchup" is the only explicit matchup-confirm action

### 3. Round + Score Flow

* Race to 8 team points
* Up to 5 rounds
* Round history supports:

  * add/save through matchup flow
  * edit
  * delete
* Locking a matchup now opens score-entry for that matchup directly
* User no longer has to manually reselect players for the round
* Winner derived automatically from entered score

### 4. Opponent Prediction + Integrated Decision Flow

* Predicts likely first declaration
* Predicts likely response
* Integrated with recommendations:

  * “If they do X, we should do Y”
* Uses score context heuristics

### 5. Player Stat System (Manual / Imported Style)

Supported stats:

* `matches_won`
* `matches_played`
* `win_percentage`
* `points_per_match`
* `percent_points_available`

Implemented:

* backend model support
* persistence in team save flow
* Team Editor stat-entry UI
* validation
* compact stat display on player cards

### 6. Stat-Weighted Logic

Prediction and recommendation logic now lightly use:

* `win_percentage`
* `matches_played`
* `points_per_match`
* `percent_points_available`

Implemented:

* confidence/sample-size handling
* moderate stat weighting
* short reasoning text for stat-driven influence

### 7. Passive In-App Matchup Stats by Opponent SL (NEW)

Added app-generated matchup tracking from completed rounds.

#### Data structure

For each player:

* `tracked_vs_sl: { [opponentSL]: { matches, wins, win_percentage } }`

#### Behavior

When a round is completed:

* each player gets a matchup entry against opponent SL
* both players get +1 match in the correct SL bucket
* winner gets +1 win in the correct SL bucket
* win % recalculated automatically

#### Persistence

* tracked live in memory during match session
* persisted back to team storage with **Save Matchup Stats**
* stored in backend player data

#### UI

* currently not displayed in main UI
* intentionally kept passive / stored-first

---

## Current Architecture Layers

1. Lineup Engine
2. Score Engine
3. Turn Engine
4. Prediction Engine
5. Manual Player Stat Layer
6. Stat-Weighted Decision Layer
7. Passive In-App By-SL Matchup Tracking ✅

---

## Current State

* Stable
* No known crash blockers
* Live match flow is much cleaner than earlier versions
* App now learns passive by-SL matchup history from entered rounds

---

## Good Next Steps

Possible next moves:

1. display tracked by-SL stats lightly in Team Editor or player detail area
2. use tracked by-SL stats in response prediction/recommendation weighting
3. refine captain-behavior heuristics further

---

## Files Most Recently Touched

* `frontend/src/pages/Dashboard.tsx`
* `app/models.py`

---

## Notes

* Passive by-SL stats are separate from manually entered/imported player stats
* Tracked by-SL stats currently update on round save and persist through explicit save action
