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

#### Captain Logic Map

The recommendation engine is designed to behave like a practical team captain, not a black-box model.

### Recommendation Priority

1. **Lineup legality / future viability**

   * Only consider players who keep valid lineup paths alive
   * Never recommend a player that creates illegal or strategically broken future options

2. **Core player strength**

   * Use manual/imported stats as the main strength signal
   * Includes win percentage, matches played, points per match, and percent points available

3. **Match context**

   * Adjust for live match situation
   * Includes current score, declaration order, and strategic flexibility

4. **Tracked by-SL matchup tendency**

   * Use `tracked_vs_sl` as a small background modifier when opponent SL is known
   * Positive history vs that SL gives a slight boost
   * Negative history vs that SL gives a slight penalty
   * Small samples should have very low influence
   * This should act as a tiebreaker, not a primary decision-maker

5. **Minor tie-breakers**

   * Only used after the major recommendation layers above

### Design Intent

* Keep recommendations fast and captain-friendly
* Avoid UI clutter
* Avoid black-box behavior
* Let matchup history improve decisions quietly over time
* Never let tracked-by-SL data override legality, lineup preservation, or major strength differences

## UI Cleanup: Collapsible Team Management

Added collapsible sections for:
- Saved Teams
- Create Team

Behavior:
- Both sections can be manually expanded/collapsed
- Both auto-collapse once when a real match begins
- Users can manually reopen them during the match
- Auto-collapse does not repeatedly fight user input
- Collapse state resets when the match fully resets

Implementation notes:
- Uses local Dashboard.tsx state
- Uses stable live rosters as the active-match trigger
- Uses a ref guard so auto-collapse happens once per match session
- No backend changes


## Match Setup Simplification

Declaration pattern is no longer manually selected during match setup.

Instead:
- Selecting who puts up first automatically determines the declaration pattern
- If our team starts: first / response / first / response / first
- If opponent starts: response / first / response / first / response

Design intent:
- reduce setup clutter
- remove redundant choices
- prevent conflicting match-start inputs

## Match Setup Simplification

Removed the separate "Declaration Pattern" selector from match setup.

Current behavior:
- The user only selects who starts Round 1
- Declaration pattern is automatically derived from that choice

Derived patterns:
- Our Team starts → `["us", "opp", "us", "opp", "us"]`
- Opponent starts → `["opp", "us", "opp", "us", "opp"]`

Design intent:
- reduce setup clutter
- remove redundant choices
- prevent conflicting inputs
- preserve the exact existing alternating live-match flow

#### UI Upgrade: Start Matchup Button Emphasis

Improved the visual prominence of the "Start Matchup" button to make it clearly stand out as the primary action during match flow.

### Changes

* Increased button size (padding and font size)
* Applied stronger visual weight (bold text, improved contrast)
* Added subtle shadow for depth
* Improved spacing around the button to reduce clutter
* Enhanced hover/focus states for better feedback
* Optional icon/prefix added for clarity (e.g., ▶)

### Behavior

* No changes to button logic or functionality
* Enabled/disabled states remain unchanged
* Disabled styling improved to remain readable and intentional

### Design Intent

* Make the primary action immediately recognizable during live use
* Improve speed and confidence in match flow decisions
* Reduce visual ambiguity between primary and secondary actions
* Maintain a clean, non-flashy, captain-friendly interface


#### UI Upgrade: Action Button Hierarchy

Improved button hierarchy across the live match flow so the next important action is easier to find quickly during match play.

### Primary CTA Buttons

The following buttons now use stronger visual emphasis:

* **Start Matchup** (blue primary setup action)
* **Lock Matchup** (green primary live-flow action)
* **Save Round / Update Round** (green primary completion action)

### Styling Direction

Primary action buttons now use:

* larger padding
* larger font size
* bold text
* stronger border radius
* high-contrast background color
* subtle shadow
* clearer visual separation from secondary/tertiary buttons
* optional icon/prefix for faster recognition

### Visual Hierarchy

* **Primary CTA**: strongest emphasis for actions that advance the match
* **Secondary**: moderate emphasis for useful but non-critical actions
* **Tertiary**: subdued utility controls (cancel, edit, delete, sample/demo actions)

### Design Intent

* Make the next action obvious during live use
* Improve scan speed and confidence under match pressure
* Reduce visual competition between critical and non-critical controls
* Keep the interface polished, practical, and captain-friendly

### Behavior

* No button logic was changed
* Existing enabled/disabled behavior was preserved
* This was a styling and usability upgrade only


## UI Fix: Context-Aware Prediction Wording

Fixed prediction/recommendation wording so labels correctly reflect both:

1. who starts the sequence
2. which team owns the predicted follow-up player

### Problem

The previous wording assumed the follow-up label from the wrong team perspective in some cases.

Example of broken output:

* "If we put up Mike (SL5)..."
* "Our response: Alex (SL6)"

This was incorrect because Alex was the opponent player.

### Fix

Prediction text now uses:

* the acting team for the first label
* the predicted player's team ownership for the second label

### Correct behavior

* If we declare first → "If we put up..." / "Their response:"
* If opponent declares first → "If opponent puts up..." / "Our response:"
* If we respond → "If we respond with..." / "Their next lead:"
* If opponent responds → "If opponent responds with..." / "Our next lead:"

### Design Intent

* Keep prediction text aligned with actual declaration flow
* Make recommendation wording easier to trust and scan during live match use
* Preserve all existing prediction and scoring logic

## UI Upgrade: Live Step Indicator

Added a live step indicator to the match dashboard to make the current action more obvious during live match flow.

### Purpose

* Guide the captain to the next action quickly
* Reduce confusion during live match use
* Improve scan speed without changing workflow behavior

### Step Flow

The indicator shows the current live match stage across this sequence:

1. Select Players
2. Lock Matchup
3. Enter Score
4. Save Round
5. Next Round

### Derived Step Logic

The current step is derived from existing frontend state in `Dashboard.tsx`:

* `editingRound` → **Editing Round** (special override state)
* `showRoundForm && lockedMatchup` → **Enter Score**
* `lockedMatchup && !showRoundForm` → **Save Round** or **Next Round** depending on current state
* `selectedOurPlayerId && selectedOppPlayerId` → **Lock Matchup**
* `scoreState.rounds.length > 0` with no current selection → **Next Round**
* otherwise → **Select Players**

### State Signals Used

* `selectedOurPlayerId`
* `selectedOppPlayerId`
* `lockedMatchup`
* `showRoundForm`
* `editingRound`
* `scoreState.rounds`
* `scoreState.status`

### Visual Behavior

* **Active step**: blue background, white text
* **Completed steps**: green background
* **Future steps**: subdued gray
* **Editing Round**: special amber warning state

### Design Intent

* Use existing frontend-derived state as the source of truth
* Keep guidance visible but lightweight
* Improve live usability without turning the app into a wizard
* Preserve all existing match flow, recommendation, and scoring logic


## Reliability Upgrade: Auto-Save / Recovery

Added browser-local auto-save and recovery for live match state to protect against refreshes, accidental tab closes, or app restarts during live use.

### Recovery Storage

Uses `localStorage` with key:

`pool_optimizer_live_match_recovery`

### Recovery Payload

Saved payload structure:

```ts
{
  version: 1,
  savedAt: <timestamp>,
  data: {
    ourTeamId,
    oppTeamId,
    startingDeclaringTeam,
    stableOurTeamPlayers,
    stableOppTeamPlayers,
    stableOurTeamName,
    stableOppTeamName,
    scoreState,
    selectedOurPlayerId,
    selectedOppPlayerId,
    declarationStep,
    firstDeclaredPlayer,
    lockedMatchup,
    showRoundForm,
    editingRound,
    matchState
  }
}
```

### Auto-Save Behavior

* Auto-saves meaningful live match state with a 500ms debounce
* Saves when team selection, live rosters, score state, player selection, declaration flow, or round form state changes
* Uses try/catch protection around localStorage operations

### Recovery UX

On app load, if valid recovery data exists:

* show a recovery prompt/banner
* allow user to **Resume** saved match
* allow user to **Discard** saved match

Recovery is not applied silently in v1.

### Clearing Recovery Data

Recovery data is cleared when:

* a new match is started
* the match reaches `complete` or `clinched`
* the user explicitly discards recovery data

### Safety Notes

* version validation included
* invalid/corrupted payloads are ignored and cleared safely
* recovery is designed as a local-first reliability feature, not a backend persistence rewrite

### Design Intent

* protect live match progress
* reduce risk during real match use
* keep implementation lightweight and frontend-driven
* preserve existing recommendation, scoring, and match-flow behavior

## Data Portability: Export / Import App Data

Added Export / Import functionality so app data can be moved between devices without relying on Git.

### Purpose

* Keep team/player data consistent between Mac mini and Windows laptop
* Share tracked matchup history used by prediction logic
* Make the laptop a practical live-use device while preserving data portability

### Export Payload

Exports a JSON snapshot with structure:

```ts
{
  version: 1,
  exportedAt: <timestamp>,
  data: {
    teams: [...]
  }
}
```

### Included Data

Export/import includes:

* all teams
* all players
* manual/imported player stats
* `tracked_vs_sl` matchup history by opponent skill level

This ensures prediction/recommendation logic stays aligned across devices.

### Import Behavior

* Import validates payload version and basic shape
* Import warns that current saved team data will be replaced
* v1 uses **replace mode**, not merge mode
* Existing teams are removed, then imported teams are recreated
* UI refreshes immediately after successful import

### Prediction Impact

Imported `tracked_vs_sl` data becomes immediately available to:

* `predictFirstDeclaration`
* `predictResponse`
* `getTrackedMatchupAdjustment()`

No restart required after import.

### Design Intent

* Keep data sharing simple and reliable
* Avoid Git-based syncing for live match data
* Avoid duplicate/conflicting team merges in v1
* Preserve prediction consistency across devices

### Note

This v1 shares the accumulated tracked matchup data used by predictions. If full raw match-history analytics are needed later, export/import may need to include raw round history as well.

