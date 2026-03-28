✅ PROJECT STATE SUMMARY (Save Point)
🎯 What was just completed
1. Player Stat System (Full Stack)
Added new stat fields to player model:
matches_won
matches_played
win_percentage
points_per_match
percent_points_available
Stats are:
stored as numeric values
optional (safe if missing)
persisted via team save (teams.json)
2. Stat Entry UI (Team Editor)
Each player now has:
expandable "APA Stats (Optional)" section
Editable fields:
Matches Won
Matches Played
Win %
Points/Match
% Points Available
Validation implemented:
logical constraints (won ≤ played)
ranges (0–100 where applicable)
non-negative values
Save behavior:
persists through existing team save flow
no new backend endpoints needed
3. Stat Display (Live UI)
Player cards now show:
Record (won / played)
Win %
Points per Match
% Points Available
Formatting:
clean, compact row
safe fallbacks (—) for missing data
4. UI Flow Improvements (Earlier Step)
Removed duplicate lineup tracker (bottom section)
Removed "Confirm First Declaration" button
Auto-advance first → response on selection
"Lock Matchup" now:
sets players
opens score entry directly
Round creation is now tied to matchup lock (no manual player reselection)
🧠 Current App Capability
You now have:
✅ Full live match workflow (clean + fast)
✅ Score tracking (race to 8)
✅ Turn-based declaration system
✅ Lineup tracking
✅ Opponent prediction (heuristic)
✅ Editable, persisted player stats
🚨 Missing piece (next step):
Stats are not yet influencing decisions