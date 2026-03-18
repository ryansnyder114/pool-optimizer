import math
from .models import Player

def _safe_rate(value, default):
    if value is None:
        return default
    return max(0.0, min(1.0, value))

def win_prob(our_player: Player, opp_player: Player):
    sl_diff = our_player.skill_level - opp_player.skill_level
    our_form = _safe_rate(our_player.recent_win_rate, 0.5)
    opp_form = _safe_rate(opp_player.recent_win_rate, 0.5)

    z = 0.9 * sl_diff + 1.2 * (our_form - opp_form)
    prob = 1 / (1 + math.exp(-z))
    return max(0.05, min(0.95, prob))

def expected_points_us(our_player, opp_player):
    return 3.0 * win_prob(our_player, opp_player)

def expected_points_opp(our_player, opp_player):
    return 3.0 * (1.0 - win_prob(our_player, opp_player))

def immediate_expected_margin(our_player, opp_player):
    return expected_points_us(our_player, opp_player) - expected_points_opp(our_player, opp_player)
