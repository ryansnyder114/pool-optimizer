from .models import MatchState, Team, Player

# Realistic APA-style sample data
# Both teams have legal 5-player lineups under Team Skill Cap (23) and Max Seniors (2)

OUR_PLAYERS = [
    Player(id="p1", name="Ryan", skill_level=6, recent_win_rate=0.68),
    Player(id="p2", name="Mike", skill_level=5, recent_win_rate=0.58),
    Player(id="p3", name="Jake", skill_level=5, recent_win_rate=0.52),
    Player(id="p4", name="Chris", skill_level=4, recent_win_rate=0.48),
    Player(id="p5", name="Tom", skill_level=3, recent_win_rate=0.42),
    Player(id="p6", name="Dan", skill_level=3, recent_win_rate=0.38),
    Player(id="p7", name="Nick", skill_level=2, recent_win_rate=0.35),
]

OPP_PLAYERS = [
    Player(id="o1", name="Alex", skill_level=6, recent_win_rate=0.65),
    Player(id="o2", name="Sam", skill_level=5, recent_win_rate=0.55),
    Player(id="o3", name="Joe", skill_level=5, recent_win_rate=0.50),
    Player(id="o4", name="Max", skill_level=4, recent_win_rate=0.45),
    Player(id="o5", name="Dan", skill_level=4, recent_win_rate=0.40),
    Player(id="o6", name="Evan", skill_level=3, recent_win_rate=0.38),
    Player(id="o7", name="Greg", skill_level=2, recent_win_rate=0.32),
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
