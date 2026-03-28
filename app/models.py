from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Literal

# Nested structure for tracking matchup stats by opponent SL
class TrackedVsSL(BaseModel):
    matches: int = 0
    wins: int = 0
    win_percentage: Optional[float] = None

class Player(BaseModel):
    id: str
    name: str
    skill_level: int
    recent_win_rate: Optional[float] = None
    vs_skill_band: Optional[Dict[str, float]] = None
    notes: Optional[str] = None
    # APA match stats (manually entered/imported)
    matches_won: Optional[float] = None
    matches_played: Optional[float] = None
    win_percentage: Optional[float] = None
    points_per_match: Optional[float] = None
    percent_points_available: Optional[float] = None
    # Passive in-app matchup stats by opponent skill level (auto-derived from rounds)
    # Key = opponent SL (2-7), value = {matches, wins, win_percentage}
    tracked_vs_sl: Optional[Dict[str, TrackedVsSL]] = None

class Team(BaseModel):
    id: str
    name: str
    players: List[Player]

class DeclaredMatchup(BaseModel):
    round_index: int
    our_player_id: str
    opp_player_id: str

class MatchState(BaseModel):
    format: Literal["apa_open_8ball"] = "apa_open_8ball"
    round_index: int = 1
    our_team: Team
    opp_team: Team
    our_used_player_ids: List[str] = Field(default_factory=list)
    opp_used_player_ids: List[str] = Field(default_factory=list)
    our_points: float = 0.0
    opp_points: float = 0.0
    first_declarer_by_round: List[Literal["us", "opp"]] = Field(default_factory=lambda: ["us", "opp", "us", "opp", "us"])
    locked_matchups: List[DeclaredMatchup] = Field(default_factory=list)
