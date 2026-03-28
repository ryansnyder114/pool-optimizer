from .models import MatchState, Team, Player

# Realistic APA-style sample data
# Both teams have legal 5-player lineups under Team Skill Cap (23) and Max Seniors (2)

OUR_PLAYERS = [
    Player(id="p1", name="Ryan", skill_level=6, recent_win_rate=0.68, matches_won=3, matches_played=7, win_percentage=42.86, points_per_match=1.14, percent_points_available=38.10),
    Player(id="p2", name="Mike", skill_level=5, recent_win_rate=0.58, matches_won=4, matches_played=8, win_percentage=50.00, points_per_match=1.25, percent_points_available=41.67),
    Player(id="p3", name="Jake", skill_level=5, recent_win_rate=0.52, matches_won=2, matches_played=5, win_percentage=40.00, points_per_match=1.00, percent_points_available=33.33),
    Player(id="p4", name="Chris", skill_level=4, recent_win_rate=0.48, matches_won=5, matches_played=9, win_percentage=55.56, points_per_match=1.33, percent_points_available=44.44),
    Player(id="p5", name="Tom", skill_level=3, recent_win_rate=0.42, matches_won=1, matches_played=4, win_percentage=25.00, points_per_match=0.75, percent_points_available=25.00),
    Player(id="p6", name="Dan", skill_level=3, recent_win_rate=0.38, matches_won=2, matches_played=6, win_percentage=33.33, points_per_match=0.83, percent_points_available=27.78),
    Player(id="p7", name="Nick", skill_level=2, recent_win_rate=0.35, matches_won=0, matches_played=3, win_percentage=0.00, points_per_match=0.33, percent_points_available=11.11),
]

OPP_PLAYERS = [
    Player(id="o1", name="Alex", skill_level=6, recent_win_rate=0.65, matches_won=5, matches_played=8, win_percentage=62.50, points_per_match=1.50, percent_points_available=50.00),
    Player(id="o2", name="Sam", skill_level=5, recent_win_rate=0.55, matches_won=3, matches_played=6, win_percentage=50.00, points_per_match=1.17, percent_points_available=38.89),
    Player(id="o3", name="Joe", skill_level=5, recent_win_rate=0.50, matches_won=2, matches_played=5, win_percentage=40.00, points_per_match=1.00, percent_points_available=33.33),
    Player(id="o4", name="Max", skill_level=4, recent_win_rate=0.45, matches_won=4, matches_played=7, win_percentage=57.14, points_per_match=1.29, percent_points_available=42.86),
    Player(id="o5", name="Dan", skill_level=4, recent_win_rate=0.40, matches_won=1, matches_played=4, win_percentage=25.00, points_per_match=0.75, percent_points_available=25.00),
    Player(id="o6", name="Evan", skill_level=3, recent_win_rate=0.38, matches_won=2, matches_played=5, win_percentage=40.00, points_per_match=0.80, percent_points_available=26.67),
    Player(id="o7", name="Greg", skill_level=2, recent_win_rate=0.32, matches_won=0, matches_played=2, win_percentage=0.00, points_per_match=0.50, percent_points_available=16.67),
]

OUR_TEAM = Team(id="team1", name="Cue Ballers", players=OUR_PLAYERS)
OPP_TEAM = Team(id="team2", name="Rack Attack", players=OPP_PLAYERS)

SAMPLE_MATCH = MatchState(
    format="apa_open_8ball",
    round_index=1,
    our_team=OUR_TEAM,
    opp_team=OPP_TEAM,
    our_used_player_ids=[],
    opp_used_player_ids=[],
    our_points=0.0,
    opp_points=0.0,
    first_declarer_by_round=["us", "opp", "us", "opp", "us"],
    locked_matchups=[]
)
