import json
import os
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI
from .sample_data import SAMPLE_MATCH, MatchState
from .rules_engine import get_legal_players
from .optimizer import best_first_declaration, best_response, apply_matchup
from .explanation import enrich_recommendations
from .models import Team, Player
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Simple JSON file persistence
DATA_DIR = Path(__file__).parent.parent / "data"
TEAMS_FILE = DATA_DIR / "teams.json"
MATCHES_FILE = DATA_DIR / "matches.json"

def ensure_data_dir():
    DATA_DIR.mkdir(exist_ok=True)
    if not TEAMS_FILE.exists():
        TEAMS_FILE.write_text("{}")
    if not MATCHES_FILE.exists():
        MATCHES_FILE.write_text("{}")

def load_teams() -> dict:
    ensure_data_dir()
    return json.loads(TEAMS_FILE.read_text())

def save_teams(teams: dict):
    ensure_data_dir()
    TEAMS_FILE.write_text(json.dumps(teams, indent=2))

def load_matches() -> dict:
    ensure_data_dir()
    return json.loads(MATCHES_FILE.read_text())

def save_matches(matches: dict):
    ensure_data_dir()
    MATCHES_FILE.write_text(json.dumps(matches, indent=2))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.get("/sample-match")
def sample_match():
    return SAMPLE_MATCH.model_dump()

# ============ TEAM ENDPOINTS ============

@app.get("/teams")
def list_teams():
    teams = load_teams()
    return {"teams": list(teams.values())}

@app.post("/teams")
def create_team(team: dict):
    teams = load_teams()

    team_id = team.get("id")
    if not team_id:
        raise HTTPException(status_code=400, detail="Team ID is required")

    if team_id in teams:
        raise HTTPException(status_code=400, detail=f"Team with ID '{team_id}' already exists")

    players = team.get("players", [])
    if len(players) < 5:
        raise HTTPException(status_code=400, detail="Team must have at least 5 players")

    for p in players:
        if not p.get("id") or not p.get("name"):
            raise HTTPException(status_code=400, detail="Each player must have id and name")
        if not isinstance(p.get("skill_level"), int):
            raise HTTPException(status_code=400, detail="Each player must have a valid skill_level")
        if p["skill_level"] < 1 or p["skill_level"] > 7:
            raise HTTPException(status_code=400, detail="Skill level must be between 1 and 7")

    teams[team_id] = team
    save_teams(teams)
    return {"team": team}
    

@app.put("/teams/{team_id}")
def update_team(team_id: str, team: dict):
    teams = load_teams()

    if team_id not in teams:
        raise HTTPException(status_code=404, detail=f"Team '{team_id}' not found")

    players = team.get("players", [])
    if len(players) < 5:
        raise HTTPException(status_code=400, detail="Team must have at least 5 players")

    team["id"] = team_id
    teams[team_id] = team
    save_teams(teams)
    return {"team": team}

@app.delete("/teams/{team_id}")
def delete_team(team_id: str):
    teams = load_teams()

    if team_id not in teams:
        raise HTTPException(status_code=404, detail=f"Team '{team_id}' not found")

    del teams[team_id]
    save_teams(teams)
    return {"deleted": team_id}

@app.get("/teams/{team_id}")
def get_team(team_id: str):
    teams = load_teams()

    if team_id not in teams:
        raise HTTPException(status_code=404, detail=f"Team '{team_id}' not found")

    return {"team": teams[team_id]}

# ============ MATCH ENDPOINTS ============

@app.post("/create-match")
def create_match(request: dict):
    """Create a new match from saved teams."""
    our_team_id = request.get("our_team_id")
    opp_team_id = request.get("opp_team_id")
    first_declarer = request.get("first_declarer_by_round", ["us", "opp", "us", "opp", "us"])
    
    if not our_team_id or not opp_team_id:
        return {"error": "Both our_team_id and opp_team_id are required"}
    
    teams = load_teams()
    
    if our_team_id not in teams:
        return {"error": f"Our team '{our_team_id}' not found"}
    
    if opp_team_id not in teams:
        return {"error": f"Opponent team '{opp_team_id}' not found"}
    
    our_team_data = teams[our_team_id]
    opp_team_data = teams[opp_team_id]
    
    # Validate team sizes
    if len(our_team_data.get("players", [])) < 5:
        return {"error": f"Team '{our_team_id}' must have at least 5 players"}
    if len(opp_team_data.get("players", [])) < 5:
        return {"error": f"Team '{opp_team_id}' must have at least 5 players"}
    
    # Build MatchState
    match_state = MatchState(
        format="apa_open_8ball",
        round_index=1,
        our_team=Team(**our_team_data),
        opp_team=Team(**opp_team_data),
        our_used_player_ids=[],
        opp_used_player_ids=[],
        our_points=0.0,
        opp_points=0.0,
        first_declarer_by_round=first_declarer,
        locked_matchups=[]
    )
    
    return {"state": match_state.model_dump()}

# ============ SAVED MATCHES (OPTIONAL) ============

@app.get("/saved-matches")
def list_saved_matches():
    """List all saved matches."""
    matches = load_matches()
    return {"matches": list(matches.values())}

@app.post("/saved-matches")
def save_match(request: dict):
    """Save a match state."""
    match_id = request.get("id")
    state = request.get("state")
    
    if not match_id or not state:
        return {"error": "Both id and state are required"}
    
    matches = load_matches()
    matches[match_id] = {"id": match_id, "state": state}
    save_matches(matches)
    
    return {"saved": match_id}

@app.get("/saved-matches/{match_id}")
def get_saved_match(match_id: str):
    """Get a specific saved match."""
    matches = load_matches()
    
    if match_id not in matches:
        return {"error": f"Match '{match_id}' not found"}
    
    return {"match": matches[match_id]}

# ============ EXISTING ENDPOINTS ============

@app.post("/legal-players")
def legal_players(state: dict):
    match_state = MatchState(**state)
    our_legal = get_legal_players(match_state, "us")
    opp_legal = get_legal_players(match_state, "opp")
    return {
        "our_legal_players": [p.model_dump() for p in our_legal],
        "opp_legal_players": [p.model_dump() for p in opp_legal]
    }

@app.post("/best-first-declaration")
def best_first_declaration_endpoint(state: dict):
    match_state = MatchState(**state)
    recommendations = best_first_declaration(match_state)
    enriched = enrich_recommendations(match_state, recommendations, is_first_declaration=True)
    return {"recommendations": enriched}

@app.post("/best-response")
def best_response_endpoint(body: dict):
    state = MatchState(**body.get("state", {}))
    opp_player_id = body.get("opp_player_id")
    
    opp_player = None
    for p in state.opp_team.players:
        if p.id == opp_player_id:
            opp_player = p
            break
    
    if not opp_player:
        return {"error": "Opponent player not found"}
    
    recommendations = best_response(state, opp_player)
    enriched = enrich_recommendations(state, recommendations, is_first_declaration=False)
    return {"recommendations": enriched}

@app.post("/apply-matchup")
def apply_matchup_endpoint(body: dict):
    state = MatchState(**body.get("state", {}))
    our_player_id = body.get("our_player_id")
    opp_player_id = body.get("opp_player_id")
    
    if not our_player_id or not opp_player_id:
        return {"error": "Both our_player_id and opp_player_id are required"}
    
    our_player = None
    for p in state.our_team.players:
        if p.id == our_player_id:
            our_player = p
            break
    
    if not our_player:
        return {"error": f"Our player not found: {our_player_id}"}
    
    opp_player = None
    for p in state.opp_team.players:
        if p.id == opp_player_id:
            opp_player = p
            break
    
    if not opp_player:
        return {"error": f"Opponent player not found: {opp_player_id}"}
    
    if our_player_id in state.our_used_player_ids:
        return {"error": f"Player {our_player.name} has already been used"}
    
    if opp_player_id in state.opp_used_player_ids:
        return {"error": f"Opponent player {opp_player.name} has already been used"}
    
    if state.round_index > 5:
        return {"error": "Match is already complete"}
    
    next_state = apply_matchup(state, our_player, opp_player)
    
    from .models import DeclaredMatchup
    next_state.locked_matchups.append(
        DeclaredMatchup(
            round_index=state.round_index,
            our_player_id=our_player_id,
            opp_player_id=opp_player_id
        )
    )
    
    return {"state": next_state.model_dump()}
