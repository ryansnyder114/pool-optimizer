from copy import deepcopy
from .rules_engine import get_legal_players
from .prediction_engine import immediate_expected_margin

def apply_matchup(state, our_player, opp_player):
    next_state = deepcopy(state)

    next_state.our_used_player_ids.append(our_player.id)
    next_state.opp_used_player_ids.append(opp_player.id)

    margin = immediate_expected_margin(our_player, opp_player)

    next_state.our_points += max(0.0, 1.5 + margin / 2)
    next_state.opp_points += max(0.0, 1.5 - margin / 2)

    next_state.round_index += 1
    return next_state

def _state_key(state):
    return (
        state.round_index,
        tuple(sorted(state.our_used_player_ids)),
        tuple(sorted(state.opp_used_player_ids)),
    )

def future_value(state, memo=None):
    if memo is None:
        memo = {}

    if state.round_index > 5:
        return state.our_points - state.opp_points

    key = _state_key(state)
    if key in memo:
        return memo[key]

    who_first = state.first_declarer_by_round[state.round_index - 1]
    our_legal = get_legal_players(state, "us")
    opp_legal = get_legal_players(state, "opp")

    if who_first == "us":
        best = float("-inf")
        for our_p in our_legal:
            worst = float("inf")
            for opp_p in opp_legal:
                val = future_value(apply_matchup(state, our_p, opp_p), memo)
                worst = min(worst, val)
            best = max(best, worst)
        memo[key] = best
        return best
    else:
        worst = float("inf")
        for opp_p in opp_legal:
            best = float("-inf")
            for our_p in our_legal:
                val = future_value(apply_matchup(state, our_p, opp_p), memo)
                best = max(best, val)
            worst = min(worst, best)
        memo[key] = worst
        return worst

def best_response(state, opp_player):
    results = []
    for our_p in get_legal_players(state, "us"):
        val = future_value(apply_matchup(state, our_p, opp_player))
        results.append((our_p, val))
    return sorted(results, key=lambda x: x[1], reverse=True)

def best_first_declaration(state):
    results = []
    for our_p in get_legal_players(state, "us"):
        worst_case = float("inf")
        for opp_p in get_legal_players(state, "opp"):
            val = future_value(apply_matchup(state, our_p, opp_p))
            worst_case = min(worst_case, val)
        results.append((our_p, worst_case))
    return sorted(results, key=lambda x: x[1], reverse=True)
