from itertools import combinations
from .models import MatchState, Player

TEAM_SKILL_CAP = 23
MAX_SENIORS = 2
TOTAL_MATCHES = 5

def is_senior(player: Player) -> bool:
    return player.skill_level >= 6

def _team_players(state: MatchState, side: str):
    return state.our_team.players if side == "us" else state.opp_team.players

def _used_ids(state: MatchState, side: str):
    return set(state.our_used_player_ids if side == "us" else state.opp_used_player_ids)

def get_remaining_players(state: MatchState, side: str):
    used = _used_ids(state, side)
    return [p for p in _team_players(state, side) if p.id not in used]

def _projected_used_players(state: MatchState, side: str, extra_player_id=None):
    used = _used_ids(state, side).copy()
    if extra_player_id:
        used.add(extra_player_id)
    return [p for p in _team_players(state, side) if p.id in used]

def _lineup_is_legal(players):
    total_skill = sum(p.skill_level for p in players)
    senior_count = sum(1 for p in players if is_senior(p))
    return total_skill <= TEAM_SKILL_CAP and senior_count <= MAX_SENIORS

def can_finish_legally_after_pick(state: MatchState, side: str, player_id: str):
    projected = _projected_used_players(state, side, player_id)
    if not _lineup_is_legal(projected):
        return False

    rounds_left = TOTAL_MATCHES - len(projected)
    remaining = [p for p in _team_players(state, side) if p.id not in {x.id for x in projected}]

    if rounds_left < 0:
        return False
    if rounds_left == 0:
        return True
    if len(remaining) < rounds_left:
        return False

    for combo in combinations(remaining, rounds_left):
        if _lineup_is_legal(projected + list(combo)):
            return True

    return False

def is_legal_pick(state: MatchState, side: str, player_id: str):
    if player_id in _used_ids(state, side):
        return False
    return can_finish_legally_after_pick(state, side, player_id)

def get_legal_players(state: MatchState, side: str):
    return [p for p in get_remaining_players(state, side) if is_legal_pick(state, side, p.id)]
