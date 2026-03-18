import pytest
from app.rules_engine import (
    is_senior,
    get_remaining_players,
    get_legal_players,
    is_legal_pick,
    can_finish_legally_after_pick,
    TEAM_SKILL_CAP,
    MAX_SENIORS,
    TOTAL_MATCHES
)
from app.models import MatchState, Team, Player

@pytest.fixture
def sample_players():
    # Need 5+ players for legal 5-player lineup (sum <= 23)
    our = [
        Player(id="p1", name="Ryan", skill_level=6),
        Player(id="p2", name="Mike", skill_level=5),
        Player(id="p3", name="Jake", skill_level=4),
        Player(id="p4", name="Chris", skill_level=3),
        Player(id="p5", name="Tom", skill_level=3),
    ]
    opp = [
        Player(id="o1", name="Alex", skill_level=6),
        Player(id="o2", name="Sam", skill_level=5),
        Player(id="o3", name="Joe", skill_level=4),
        Player(id="o4", name="Max", skill_level=3),
        Player(id="o5", name="Dan", skill_level=3),
    ]
    return our, opp

@pytest.fixture
def match_state(sample_players):
    our_players, opp_players = sample_players
    our_team = Team(id="t1", name="Team A", players=our_players)
    opp_team = Team(id="t2", name="Team B", players=opp_players)
    return MatchState(
        format="apa_open_8ball",
        round_index=1,
        our_team=our_team,
        opp_team=opp_team,
    )

def test_is_senior():
    assert is_senior(Player(id="p1", name="Test", skill_level=6)) == True
    assert is_senior(Player(id="p2", name="Test", skill_level=5)) == False

def test_team_skill_cap():
    assert TEAM_SKILL_CAP == 23

def test_max_seniors():
    assert MAX_SENIORS == 2

def test_total_matches():
    assert TOTAL_MATCHES == 5

def test_get_remaining_players(match_state):
    remaining = get_remaining_players(match_state, "us")
    assert len(remaining) == 5
    assert all(p.id.startswith("p") for p in remaining)

def test_player_cannot_be_reused(match_state):
    # Use a player
    match_state.our_used_player_ids.append("p1")
    remaining = get_remaining_players(match_state, "us")
    assert len(remaining) == 4
    assert all(p.id != "p1" for p in remaining)

def test_illegal_pick_rejected(match_state):
    # Try to use p1 (skill 6), p2 (skill 5), p3 (skill 4), p4 (skill 3)
    # Sum = 18, legal. But let's add more to make it illegal
    match_state.our_used_player_ids = ["p1", "p2", "p3", "p4"]
    # Now all 4 used, 5th pick should fail
    assert is_legal_pick(match_state, "us", "p1") == False

def test_legal_players_returns_only_legal(match_state):
    legal = get_legal_players(match_state, "us")
    assert len(legal) > 0
    # All returned players should be legal
    for p in legal:
        assert is_legal_pick(match_state, "us", p.id) == True
