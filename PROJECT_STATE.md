# PROJECT STATE (Checkpoint)

## Overview

Pool match optimizer app with:

* React frontend (`frontend/src/pages/Dashboard.tsx`)
* FastAPI backend
* Live match workflow for team 8-ball
* Score-aware recommendations and opponent predictions

---

## Completed Systems

### 1. Lineup Engine + Tracker UI

* Generates all legal 5-player lineups (≤23 SL)
* Uses real player combinations
* Tracks:

  * active lineups
  * eliminated lineups
  * most likely lineup
  * must-include players
* Main lineup tracker panels remain visible higher on the page

### 2. Live Score Tracking

* Race to 8 team points
* Up to 5 rounds
* Round history with:

  * players
  * score
  * derived winner
  * running totals
* Supports edit/delete
* Validation:

  * no ties
  * valid score ranges
  * no duplicate player use

### 3. Score Context Engine

Derived contexts:

* neutral
* protect_lead
* trailing
* desperation

Used for:

* recommendation text
* prediction heuristics
* contextual UI guidance

### 4. Turn / Declaration Flow

* Tracks:

  * `startingDeclaringTeam`
  * `declarationStep`
  * `firstDeclaredPlayer`
* First declaration alternates by round
* Turn banner shows whose move it is
* Non-active team selection is disabled appropriately

### 5. Stable Roster + Availability System

* Team rosters persist across delete/edit/replay
* Used players derived from `scoreState.rounds`
* Availability logic is consistent across:

  * styling
  * clickability
  * validation

### 6. Opponent Prediction Engine

* Predicts likely first declaration
* Predicts likely response
* Uses score-aware heuristic weighting
* Shows top predictions with confidence/reasoning

### 7. UI Cleanup / Live Match Workflow (Latest)

#### Removed duplicate bottom tracker

* Removed bottom "Lineup Possibility Tracker" section
* Kept primary lineup tracker panels above

#### Removed confirm-first-declaration step

* No "Confirm First Declaration" button
* Selecting the first player automatically:

  * stores `firstDeclaredPlayer`
  * advances to response step

#### Lock matchup now creates the round flow

* Clicking "Lock Matchup" now:

  * stores `lockedMatchup`
  * opens score entry with the two selected players prefilled
* User does not need to manually reselect players for the round

#### Simplified score entry

* Locked matchup players shown read-only
* User only enters score/result
* After submit:

  * score updates
  * round history updates
  * selection state resets
  * next round begins

---

## Current Live Flow

1. App shows whose turn it is
2. First team selects player
3. App auto-advances to response step
4. Other team selects player
5. User clicks "Lock Matchup"
6. Score form opens with both players already filled in
7. User enters final score and submits
8. Round history + totals update
9. App advances to next round

---

## Files Most Recently Modified

* `frontend/src/pages/Dashboard.tsx`

---

## Good Next Areas (for next chat)

* connect prediction + recommendation into one conditional card:

  * “If they do X, we should do Y”
* further UI polish/layout cleanup
* deeper opponent behavior modeling
* eventual smarter captain-decision weighting

---

## Notes

* Backend remains mostly unchanged for these newer workflow/UI features
* Most recent work is frontend-driven in `Dashboard.tsx`
