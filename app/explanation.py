from .models import Player, MatchState, Team
from .rules_engine import is_legal_pick, get_legal_players, TEAM_SKILL_CAP, MAX_SENIORS

def is_senior(player: Player) -> bool:
    return player.skill_level >= 6

def calculate_confidence(recommendations):
    """Calculate confidence level based on gap between top recommendation and next best."""
    if len(recommendations) < 2:
        return "high"  # Single option is high confidence
    
    top_value = recommendations[0][1]
    second_value = recommendations[1][1]
    gap = top_value - second_value
    
    if gap > 0.75:
        return "high"
    elif gap > 0.25:
        return "medium"
    else:
        return "low"

def get_remaining_skill_after(state: MatchState, side: str, player_id: str) -> int:
    """Calculate remaining team skill after picking a player."""
    used = set(state.our_used_player_ids if side == "us" else state.opp_used_player_ids)
    used.add(player_id)
    
    team = state.our_team if side == "us" else state.opp_team
    remaining_players = [p for p in team.players if p.id not in used]
    return sum(p.skill_level for p in remaining_players)

def get_senior_count_after(state: MatchState, side: str, player_id: str) -> int:
    """Calculate remaining seniors after picking a player."""
    used = set(state.our_used_player_ids if side == "us" else state.opp_used_player_ids)
    used.add(player_id)
    
    team = state.our_team if side == "us" else state.opp_team
    remaining_players = [p for p in team.players if p.id not in used]
    return sum(1 for p in remaining_players if is_senior(p))

def generate_explanation(state: MatchState, player: Player, player_value: float, all_recommendations, is_first_declaration: bool) -> dict:
    """Generate plain-English explanation for a recommendation."""
    
    # Calculate current team state
    our_used = set(state.our_used_player_ids)
    our_skill_used = sum(p.skill_level for p in state.our_team.players if p.id in our_used)
    our_seniors_used = sum(1 for p in state.our_team.players if p.id in our_used and is_senior(p))
    
    # Future flexibility analysis
    remaining_our = [p for p in state.our_team.players if p.id not in our_used and p.id != player.id]
    remaining_skill = sum(p.skill_level for p in remaining_our)
    remaining_seniors = sum(1 for p in remaining_our if is_senior(p))
    
    current_pick_skill = sum(p.skill_level for p in state.our_team.players if p.id in our_used) + player.skill_level
    future_needed = 5 - (len(our_used) + 1)  # players needed after this pick
    
    # Build legality explanation
    legal_parts = []
    if current_pick_skill <= TEAM_SKILL_CAP:
        legal_parts.append(f"keeps total skill at {current_pick_skill} (under {TEAM_SKILL_CAP} cap)")
    if our_seniors_used + (1 if is_senior(player) else 0) <= MAX_SENIORS:
        legal_parts.append(f"uses {'a' if is_senior(player) else 'no'} new senior (max {MAX_SENIORS})")
    
    legality = " and ".join(legal_parts) if legal_parts else "maintains legal lineup"
    
    # Future flexibility explanation
    if remaining_skill > 15:
        future_flexibility = f"leaves {remaining_skill} skill across {len(remaining_our)} players for remaining {5 - len(our_used)} rounds"
    elif remaining_skill > 10:
        future_flexibility = f"moderate flexibility with {remaining_skill} skill remaining"
    else:
        future_flexibility = f"tight but legal - only {remaining_skill} skill left for future"
    
    # Strategy explanation
    if player_value > 0.2:
        strategy = "high expected value play - strong chance to win this match"
    elif player_value > 0:
        strategy = "moderate edge - reasonable choice given matchup"
    else:
        strategy = "defensive play - minimizing opponent advantage"
    
    # Compare to alternatives
    if len(all_recommendations) > 1:
        second_value = all_recommendations[1][1]
        gap = player_value - second_value
        if gap > 0.5:
            strategy += f". Clearly better than alternatives (gap: {gap:.2f})"
        elif gap > 0.1:
            strategy += f". Slightly better than next best option"
        else:
            strategy += f". Marginal advantage over alternatives"
    
    return {
        "summary": f"{player.name} (SL{player.skill_level}) with expected value {player_value:.2f}",
        "legality": legality,
        "future_flexibility": future_flexibility,
        "strategy": strategy
    }

def enrich_recommendations(state: MatchState, recommendations, is_first_declaration: bool) -> list:
    """Add confidence and explanations to recommendations."""
    
    if not recommendations:
        return []
    
    # Calculate confidence based on gap
    if len(recommendations) >= 2:
        top_val = recommendations[0][1]
        second_val = recommendations[1][1]
        gap = top_val - second_val
        
        if gap > 0.75:
            confidence = "high"
        elif gap > 0.25:
            confidence = "medium"
        else:
            confidence = "low"
    else:
        confidence = "high"
    
    enriched = []
    for player, value in recommendations:
        explanation = generate_explanation(state, player, value, recommendations, is_first_declaration)
        
        enriched.append({
            "player": player.model_dump(),
            "value": value,
            "confidence": confidence,
            "explanation": explanation
        })
    
    return enriched
