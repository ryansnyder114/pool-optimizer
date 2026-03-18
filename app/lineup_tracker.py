"""
Lineup generation and tracking utilities.

Generates all legal 5-player lineups from an 8-player roster,
tracks which lineups are still possible given used players,
aggregates by skill-level label, and identifies the most likely remaining lineup.
"""

from itertools import combinations
from typing import List, Dict, Any, Set
from .models import Team, Player

# Constants (shared with rules_engine)
TEAM_SKILL_CAP = 23
MAX_SENIORS = 2
LINEUP_SIZE = 5


def is_senior(player: Player) -> bool:
    """Check if a player is a senior (skill level >= 6)."""
    return player.skill_level >= 6


def _lineup_is_legal(players: List[Player]) -> bool:
    """Check if a lineup is legal under APA rules."""
    if len(players) != LINEUP_SIZE:
        return False
    
    total_skill = sum(p.skill_level for p in players)
    senior_count = sum(1 for p in players if is_senior(p))
    
    return total_skill <= TEAM_SKILL_CAP and senior_count <= MAX_SENIORS


def _make_label(skill_levels: List[int]) -> str:
    """Create consistent label from sorted skill levels (descending)."""
    sorted_skills = sorted(skill_levels, reverse=True)
    return ",".join(map(str, sorted_skills))


def generate_all_legal_lineups(team: Team) -> List[Dict[str, Any]]:
    """
    Generate all legal 5-player lineups from a team's full roster.
    
    Each lineup is tracked with real player_ids, not abstract skill patterns.
    
    Args:
        team: The Team object with up to 8 players
        
    Returns:
        List of lineup objects with player_ids, skill_levels, and label
    """
    if len(team.players) < LINEUP_SIZE:
        return []
    
    legal_lineups = []
    
    # Generate all 5-player combinations from the roster
    for combo in combinations(team.players, LINEUP_SIZE):
        if _lineup_is_legal(list(combo)):
            player_ids = tuple(sorted(p.id for p in combo))  # sorted for consistency
            skill_levels = [p.skill_level for p in combo]
            label = _make_label(skill_levels)
            
            # Calculate combined win rate
            combined_win_rate = sum(p.recent_win_rate or 0.5 for p in combo) / len(combo)
            
            legal_lineups.append({
                "player_ids": player_ids,  # tuple for hashability
                "skill_levels": skill_levels,
                "label": label,
                "total_skill": sum(skill_levels),
                "combined_win_rate": combined_win_rate,
            })
    
    # Sort by total skill descending, then win rate
    legal_lineups.sort(key=lambda x: (-x["total_skill"], -x["combined_win_rate"]))
    
    return legal_lineups


def lineup_contains_used_players(lineup: Dict[str, Any], used_player_ids: List[str]) -> bool:
    """
    Check if a lineup contains all the already-used players.
    
    Args:
        lineup: A lineup object from generate_all_legal_lineups
        used_player_ids: List of player IDs already used in the match
        
    Returns:
        True if the lineup contains all used players, False otherwise
    """
    if not used_player_ids:
        return True
    
    lineup_player_set = set(lineup["player_ids"])
    return all(uid in lineup_player_set for uid in used_player_ids)


def _aggregate_lineups(lineups: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Aggregate lineups by skill-level label.
    
    For each label, keeps track of:
    - count: how many real player lineups share this label
    - at_least_one_active: whether any underlying lineup is still active
    
    Returns aggregated list with labels and counts.
    """
    by_label: Dict[str, Dict[str, Any]] = {}
    
    for lineup in lineups:
        label = lineup["label"]
        if label not in by_label:
            by_label[label] = {
                "label": label,
                "skill_levels": lineup["skill_levels"],  # same for all with this label
                "total_skill": lineup["total_skill"],
                "count": 0,
                "combined_win_rate": lineup["combined_win_rate"],
            }
        by_label[label]["count"] += 1
    
    # Convert to list and sort
    aggregated = list(by_label.values())
    aggregated.sort(key=lambda x: (-x["total_skill"], -x["combined_win_rate"]))
    
    return aggregated


def get_lineup_statuses(
    team: Team, 
    used_player_ids: List[str]
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all lineups categorized by status (active vs eliminated).
    
    - Active: lineups that contain all used players AND are achievable from roster
    - Eliminated: lineups that cannot work given used players
    
    Lineups are aggregated by skill-level label for display, but status
    is determined by underlying real player lineups.
    
    Args:
        team: The Team object
        used_player_ids: List of player IDs already used in the match
        
    Returns:
        Dictionary with 'active_lineups' and 'eliminated_lineups', each
        containing aggregated lineup objects with 'most_likely' flag
    """
    # Step 1: Generate ALL legal lineups from actual roster
    all_real_lineups = generate_all_legal_lineups(team)
    
    if not all_real_lineups:
        return {
            "active_lineups": [],
            "eliminated_lineups": []
        }
    
    # Step 2: Classify each real lineup as active or eliminated
    active_real = []
    eliminated_real = []
    
    for lineup in all_real_lineups:
        if lineup_contains_used_players(lineup, used_player_ids):
            active_real.append(lineup)
        else:
            eliminated_real.append(lineup)
    
    # Step 3: Aggregate by label, marking each label as active if ANY real lineup with that label is active
    active_by_label: Dict[str, Dict[str, Any]] = {}
    eliminated_by_label: Dict[str, Dict[str, Any]] = {}
    
    for lineup in active_real:
        label = lineup["label"]
        if label not in active_by_label:
            active_by_label[label] = {
                "label": label,
                "skill_levels": lineup["skill_levels"],
                "total_skill": lineup["total_skill"],
                "count": 0,
                "combined_win_rate": lineup["combined_win_rate"],
                "has_active_lineup": False,
            }
        active_by_label[label]["count"] += 1
        active_by_label[label]["has_active_lineup"] = True
    
    for lineup in eliminated_real:
        label = lineup["label"]
        if label not in eliminated_by_label:
            eliminated_by_label[label] = {
                "label": label,
                "skill_levels": lineup["skill_levels"],
                "total_skill": lineup["total_skill"],
                "count": 0,
                "combined_win_rate": lineup["combined_win_rate"],
                "has_active_lineup": False,
            }
        eliminated_by_label[label]["count"] += 1
    
    # Step 4: Determine most likely from active real lineups
    most_likely_label = None
    if active_real:
        # Already sorted by total_skill desc, win_rate desc
        most_likely_label = active_real[0]["label"]
    
    # Step 5: Build final output
    active_lineups = []
    for label, data in active_by_label.items():
        data["most_likely"] = (label == most_likely_label)
        active_lineups.append(data)
    
    # Sort active: most likely first, then by skill
    active_lineups.sort(key=lambda x: (-x["total_skill"], -x["combined_win_rate"]))
    
    # Mark the actual most likely one
    for lu in active_lineups:
        lu["most_likely"] = lu["label"] == most_likely_label
    
    eliminated_lineups = []
    for label, data in eliminated_by_label.items():
        data["most_likely"] = False
        eliminated_lineups.append(data)
    
    # Sort eliminated: by skill descending
    eliminated_lineups.sort(key=lambda x: (-x["total_skill"], -x["combined_win_rate"]))
    
    return {
        "active_lineups": active_lineups,
        "eliminated_lineups": eliminated_lineups
    }


# ============ TEST CASES ============

def run_test_cases():
    """Run test cases to verify lineup logic."""
    from app.models import Team, Player
    
    print("=== Test Case 1: Standard roster (7 players) ===")
    players = [
        Player(id="p1", name="Ryan", skill_level=6, recent_win_rate=0.68),
        Player(id="p2", name="Mike", skill_level=5, recent_win_rate=0.58),
        Player(id="p3", name="Jake", skill_level=5, recent_win_rate=0.52),
        Player(id="p4", name="Chris", skill_level=4, recent_win_rate=0.48),
        Player(id="p5", name="Tom", skill_level=3, recent_win_rate=0.42),
        Player(id="p6", name="Dan", skill_level=3, recent_win_rate=0.38),
        Player(id="p7", name="Nick", skill_level=2, recent_win_rate=0.35),
    ]
    team = Team(id="team1", name="Test", players=players)
    
    # No players used yet
    statuses = get_lineup_statuses(team, [])
    print(f"Initial: Active={len(statuses['active_lineups'])}, Eliminated={len(statuses['eliminated_lineups'])}")
    if statuses['active_lineups']:
        print(f"  Most likely: {statuses['active_lineups'][0]['label']}")
    
    # After using p1 (SL6), p2 (SL5)
    statuses = get_lineup_statuses(team, ["p1", "p2"])
    print(f"After p1,p2: Active={len(statuses['active_lineups'])}, Eliminated={len(statuses['eliminated_lineups'])}")
    if statuses['active_lineups']:
        print(f"  Most likely: {statuses['active_lineups'][0]['label']}")
    
    print("\n=== Test Case 2: Verify impossible patterns never appear ===")
    # Roster: one SL2, cannot make 7,6,6,2,2 (needs two SL2s)
    players2 = [
        Player(id="q1", name="A", skill_level=7, recent_win_rate=0.7),
        Player(id="q2", name="B", skill_level=6, recent_win_rate=0.6),
        Player(id="q3", name="C", skill_level=6, recent_win_rate=0.55),
        Player(id="q4", name="D", skill_level=4, recent_win_rate=0.5),
        Player(id="q5", name="E", skill_level=3, recent_win_rate=0.45),
        Player(id="q6", name="F", skill_level=2, recent_win_rate=0.4),
    ]
    team2 = Team(id="team2", name="Test2", players=players2)
    
    all_lineups = generate_all_legal_lineups(team2)
    labels = [lu["label"] for lu in all_lineups]
    print(f"Generated {len(all_lineups)} legal lineups")
    print(f"Labels present: {sorted(set(labels))}")
    
    # Check if 7,6,6,2,2 is in the list (it should NOT be)
    impossible_label = "7,6,6,2,2"
    if impossible_label in labels:
        print(f"ERROR: {impossible_label} should not be possible!")
    else:
        print(f"✓ Correct: {impossible_label} does not appear (only one SL2)")
    
    # Also verify no lineup uses more of any skill than exists in roster
    skill_counts = {}
    for p in players2:
        skill_counts[p.skill_level] = skill_counts.get(p.skill_level, 0) + 1
    
    for lu in all_lineups:
        lu_skills = {}
        for s in lu["skill_levels"]:
            lu_skills[s] = lu_skills.get(s, 0) + 1
        for s, count in lu_skills.items():
            if count > skill_counts.get(s, 0):
                print(f"ERROR: {lu['label']} uses {count}x SL{s} but roster only has {skill_counts.get(s, 0)}")
    
    print("✓ All lineups respect roster composition")
    
    print("\n=== Test Case 3: Aggregate duplicates ===")
    # Check that duplicate skill patterns show count
    statuses = get_lineup_statuses(team2, [])
    print(f"Unique active labels: {len(statuses['active_lineups'])}")
    for lu in statuses['active_lineups']:
        if lu["count"] > 1:
            print(f"  {lu['label']}: {lu['count']} variations")


if __name__ == "__main__":
    run_test_cases()
