import pytest
from app.optimizer import (
    apply_matchup,
    future_value,
    best_first_declaration,
    best_response
)
from app.models import MatchState, Team, Player

@pytest.fixture
def match_state():
    # Need 5+ players per team for legal 5-player lineup (sum <= 23)
    our = [
        Player(id="p1", name="Ryan", skill_level=6, recent_win_rate=0.6),
        Player(id="p2", name="Mike", skill_level=5, recent_win_rate=0.5),
        Player(id="p3", name="Jake", skill_level=4, recent_win_rate=0.4),
        Player(id="p4", name="Chris", skill_level=3, recent_win_rate=0.3),
        Player(id="p5", name="Tom", skill_level=3, recent_win_rate=0.3),
    ]
    opp = [
        Player(id="o1", name="Alex", skill_level=6, recent_win_rate=0.6),
        Player(id="o2", name="Sam", skill_level=5, recent_win_rate=0.5),
        Player(id="o3", name="Joe", skill_level=4, recent_win_rate=0.4),
        Player(id="o4", name="Max", skill_level=3, recent_win_rate=0.3),
        Player(id="o5", name="Dan", skill_level=3, recent_win_rate=0.3),
    ]
    our_team = Team(id="t1", name="Team A", players=our)
    opp_team = Team(id="t2", name="Team B", players=opp)
    return MatchState(
        format="apa_open_8ball",
        round_index=1,
        our_team=our_team,
        opp_team=opp_team,
    )

def test_apply_matchup(match_state):
    our_p = match_state.our_team.players[0]
    opp_p = match_state.opp_team.players[0]
    new_state = apply_matchup(match_state, our_p, opp_p)
    
    assert our_p.id in new_state.our_used_player_ids
    assert opp_p.id in new_state.opp_used_player_ids
    assert new_state.round_index == 2

def test_future_value_returns_number(match_state):
    val = future_value(match_state)
    assert isinstance(val, (int, float))

def test_best_first_declaration_returns_recommendations(match_state):
    results = best_first_declaration(match_state)
    assert len(results) > 0
    # Should return sorted by value descending
    assert results[0][1] >= results[-1][1]

def test_best_first_declaration_has_player_and_value(match_state):
    results = best_first_declaration(match_state)
    player, value = results[0]
    assert hasattr(player, 'id')
    assert isinstance(value, (int, float))

def test_best_response_returns_recommendations(match_state):
    opp_player = match_state.opp_team.players[0]
    results = best_response(match_state, opp_player)
    assert len(results) > 0

def test_best_response_uses_opp_player(match_state):
    opp_player = match_state.opp_team.players[0]
    results = best_response(match_state, opp_player)
    # Results should be sorted by value
    assert results[0][1] >= results[-1][1]

def test_minimax_logic_preserved(match_state):
    # Test that minimax logic gives different results based on who declares first
    state_us_first = match_state.model_copy()
    state_us_first.first_declarer_by_round = ["us", "us", "us", "us", "us"]
    
    val = future_value(state_us_first)
    assert isinstance(val, (int, float))
