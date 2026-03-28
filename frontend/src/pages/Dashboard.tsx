import React, { useEffect, useMemo, useState } from "react";
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  createMatch,
  getSampleMatch,
  getLegalPlayers,
  getBestFirstDeclaration,
  getBestResponse,
  applyMatchup,
  getLineupStatus,
  type Lineup,
} from "../api";

type Player = {
  id: string;
  name: string;
  skill_level: number;
  recent_win_rate?: number | null;
  notes?: string | null;
};

type Team = {
  id: string;
  name: string;
  players: Player[];
};

type DeclaredMatchup = {
  round_index: number;
  our_player_id: string;
  opp_player_id: string;
};

type MatchState = {
  format: string;
  round_index: number;
  our_team: Team;
  opp_team: Team;
  our_used_player_ids: string[];
  opp_used_player_ids: string[];
  our_points: number;
  opp_points: number;
  first_declarer_by_round: ("us" | "opp")[];
  locked_matchups: DeclaredMatchup[];
};

type Recommendation = {
  player: Player;
  value: number;
  confidence?: "high" | "medium" | "low";
  explanation?: {
    summary?: string;
    legality?: string;
    future_flexibility?: string;
    strategy?: string;
  };
};

function emptyPlayer(): Player {
  return {
    id: "",
    name: "",
    skill_level: 3,
    recent_win_rate: 0.5,
    notes: "",
  };
}

function emptyTeam(): Team {
  return {
    id: "",
    name: "",
    players: [emptyPlayer()],
  };
}

function badgeColor(confidence?: string): string {
  if (confidence === "high") return "#d1fae5";
  if (confidence === "medium") return "#fef3c7";
  if (confidence === "low") return "#fee2e2";
  return "#e5e7eb";
}

function findPlayer(team: Team | undefined, playerId: string): Player | undefined {
  return team?.players.find((p) => p.id === playerId);
}

// ============ SCORE TRACKING TYPES ============

const RACE_TO = 8;

type Round = {
  round: number;
  teamAPlayerId: string;
  teamBPlayerId: string;
  teamAPlayerName: string;
  teamBPlayerName: string;
  teamASkillLevel: number;
  teamBSkillLevel: number;
  winner: "teamA" | "teamB";
  teamAPoints: number;
  teamBPoints: number;
};

type MatchStatus = "in_progress" | "clinched" | "complete";

type ScoreState = {
  raceTo: number;
  rounds: Round[];
  teamAScore: number;
  teamBScore: number;
  status: MatchStatus;
};

// Helper to compute score context
type ScoreContext = "neutral" | "protect_lead" | "trailing" | "desperation";

function computeScoreContext(myScore: number, oppScore: number, raceTo: number): ScoreContext {
  const diff = myScore - oppScore;
  const oppNeeds = raceTo - oppScore;
  
  if (oppNeeds <= 0) return "desperation";
  if (diff <= 1) return "neutral";
  if (diff >= 2 && diff <= 3) return "protect_lead";
  if (diff >= 4) return "protect_lead";
  return "trailing";
}

function getScoreContextLabel(context: ScoreContext, isTeamA: boolean): string {
  const team = isTeamA ? "Team A" : "Team B";
  switch (context) {
    case "neutral": return `${team} - neutral game`;
    case "protect_lead": return `${team} protecting lead`;
    case "trailing": return `${team} in catch-up mode`;
    case "desperation": return `${team} - desperation!`;
  }
}

// Score-aware recommendation guidance
function getScoreContextGuidance(context: ScoreContext): string {
  switch (context) {
    case "neutral": return "Close match — standard matchup strategy applies.";
    case "protect_lead": return "Protecting a lead — prioritize safer matchups and preserve lineup flexibility.";
    case "trailing": return "Trailing — consider stronger immediate win chances, even if flexibility narrows.";
    case "desperation": return "High-pressure spot — prioritize highest immediate win probability.";
  }
}

// Score-aware explanation for why a recommendation was made
function getScoreContextReasoning(context: ScoreContext, recommendationType: "first" | "response"): string {
  switch (context) {
    case "neutral": 
      return recommendationType === "first" 
        ? "Standard strategy for a close match." 
        : "Standard response strategy for a close match.";
    case "protect_lead": 
      return recommendationType === "first"
        ? "Because you are ahead, this recommendation favors safer lineup preservation."
        : "Because you are ahead, this recommendation favors preserving lineup flexibility.";
    case "trailing": 
      return recommendationType === "first"
        ? "Because you are trailing, this recommendation favors immediate win potential."
        : "Because you are trailing, this recommendation prioritizes matching up strongly.";
    case "desperation": 
      return recommendationType === "first"
        ? "Because you're in a high-pressure situation, this recommendation prioritizes the highest immediate win probability."
        : "Because you're in a high-pressure situation, this recommendation prioritizes the strongest immediate response.";
  }
}

// Badge color for score context
function getScoreContextBadgeStyle(context: ScoreContext): { bg: string; color: string; border: string } {
  switch (context) {
    case "neutral": return { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
    case "protect_lead": return { bg: "#d1fae5", color: "#065f46", border: "#10b981" };
    case "trailing": return { bg: "#fef3c7", color: "#92400e", border: "#f59e0b" };
    case "desperation": return { bg: "#fee2e2", color: "#991b1b", border: "#dc2626" };
  }
}

// ============ PREDICTION ENGINE ============

type Prediction = {
  player: Player;
  reason: string;
  confidence: "high" | "medium" | "low";
};

// Predict likely first declaration player based on score context
function predictFirstDeclaration(
  players: Player[],
  context: ScoreContext,
  usedPlayerIds: Set<string>,
  isOurTeam: boolean
): Prediction[] {
  // Filter available players
  const available = players.filter(p => !usedPlayerIds.has(p.id));
  
  if (available.length === 0) return [];
  
  // Score context affects prioritization
  const scored = available.map(p => {
    let score = 0;
    let reason = "";
    
    // Base: prefer balanced players (skill level 4-5) for flexibility
    const skillLevel = p.skill_level;
    
    if (context === "neutral") {
      // Standard behavior: prefer balanced players
      if (skillLevel >= 4 && skillLevel <= 5) {
        score += 3;
        reason = "Balanced skill level for neutral game";
      } else if (skillLevel === 3 || skillLevel === 6) {
        score += 1;
        reason = "Moderate skill level";
      }
    } else if (context === "protect_lead") {
      // Safer choices: prefer lower SL, more flexibility
      if (skillLevel <= 4) {
        score += 3;
        reason = "Lower skill preserves lineup flexibility (protecting lead)";
      } else {
        score += 0;
        reason = "Higher skill may limit future options";
      }
    } else if (context === "trailing" || context === "desperation") {
      // Aggressive: prefer higher SL for immediate win chance
      if (skillLevel >= 6) {
        score += 3;
        reason = "High skill maximizes win probability (trailing)";
      } else if (skillLevel === 5) {
        score += 2;
        reason = "Moderate-high skill for strong matchup";
      } else {
        score += 0;
        reason = "Lower skill less ideal when behind";
      }
    }
    
    // Bonus: prefer players with good win rate
    const winRate = p.recent_win_rate ?? 0.5;
    score += (winRate - 0.5) * 4; // -1 to +2 bonus
    
    // Small bonus for players not yet used (fresh)
    if (!usedPlayerIds.has(p.id)) {
      score += 0.5;
    }
    
    return { player: p, score, reason };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Return top 2-3 predictions with reasoning
  const top = scored.slice(0, 3);
  return top.map((s, idx) => ({
    player: s.player,
    reason: s.reason,
    confidence: idx === 0 ? "high" : idx === 1 ? "medium" : "low"
  }));
}

// Predict likely response based on first declaration and score context
function predictResponse(
  availablePlayers: Player[],
  firstDeclaredPlayer: Player,
  context: ScoreContext,
  usedPlayerIds: Set<string>
): Prediction[] {
  const available = availablePlayers.filter(p => !usedPlayerIds.has(p.id));
  
  if (available.length === 0) return [];
  
  const firstSL = firstDeclaredPlayer.skill_level;
  
  const scored = available.map(p => {
    let score = 0;
    let reason = "";
    
    if (context === "neutral") {
      // Mirror strategy: similar skill level
      const slDiff = Math.abs(p.skill_level - firstSL);
      if (slDiff <= 1) {
        score += 3;
        reason = "Similar skill level (neutral game)";
      } else if (slDiff === 2) {
        score += 1;
        reason = "Slightly different skill level";
      }
    } else if (context === "protect_lead") {
      // Safer: lower SL to avoid giving away points
      if (p.skill_level <= firstSL) {
        score += 3;
        reason = "Equal or lower skill limits opponent scoring (protecting lead)";
      } else {
        score += 0;
        reason = "Higher skill risks giving points";
      }
    } else if (context === "trailing" || context === "desperation") {
      // Aggressive: higher SL to win
      if (p.skill_level > firstSL) {
        score += 3;
        reason = `Higher skill (SL${p.skill_level} vs SL${firstSL}) maximizes win chance`;
      } else if (p.skill_level === firstSL) {
        score += 1;
        reason = "Equal skill for fair matchup";
      } else {
        score += 0;
        reason = "Lower skill unlikely to win when behind";
      }
    }
    
    // Win rate bonus
    const winRate = p.recent_win_rate ?? 0.5;
    score += (winRate - 0.5) * 3;
    
    return { player: p, score, reason };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, 3).map((s, idx) => ({
    player: s.player,
    reason: s.reason,
    confidence: idx === 0 ? "high" : idx === 1 ? "medium" : "low"
  }));
}

// Get "If they do X, we should do Y" advice - returns JSX or null
function getPredictionAdvice(
  mode: "first" | "response",
  currentRoundDeclaringTeam: "teamA" | "teamB",
  ourTeamPlayers: Player[],
  oppTeamPlayers: Player[],
  usedAPlayerIdSet: Set<string>,
  usedBPlayerIdSet: Set<string>,
  teamAContext: ScoreContext,
  teamBContext: ScoreContext,
  firstDeclaredPlayer?: { id: string; name: string; team: "teamA" | "teamB" } | null
): React.ReactNode {
  if (mode === "first") {
    // Predicting their first play, show our recommended response
    const predictingForTeamA = currentRoundDeclaringTeam === "teamA";
    const teamAPlayers = predictingForTeamA ? ourTeamPlayers : oppTeamPlayers;
    const teamBPlayers = predictingForTeamA ? oppTeamPlayers : ourTeamPlayers;
    const usedTeamAIds = predictingForTeamA ? usedAPlayerIdSet : usedBPlayerIdSet;
    const usedTeamBIds = predictingForTeamA ? usedBPlayerIdSet : usedAPlayerIdSet;
    const context = predictingForTeamA ? teamAContext : teamBContext;
    
    const firstPreds = predictFirstDeclaration(teamAPlayers, context, usedTeamAIds, predictingForTeamA);
    if (firstPreds.length === 0) return null;
    
    const likelyFirst = firstPreds[0].player;
    const ourBestResponse = predictResponse(teamBPlayers, likelyFirst, context, usedTeamBIds);
    if (ourBestResponse.length === 0) return null;
    
    const bestOur = ourBestResponse[0];
    
    return (
      <div style={{ 
        marginTop: 16, 
        padding: "12px", 
        background: "#d1fae5", 
        borderRadius: 6,
        border: "2px solid #10b981"
      }}>
        <div style={{ fontSize: 12, color: "#065f46", marginBottom: 4 }}>
          💡 If they lead with <strong>{likelyFirst.name} (SL{likelyFirst.skill_level})</strong>:
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#065f46" }}>
          Our best response: {bestOur.player.name} (SL{bestOur.player.skill_level})
        </div>
        <div style={{ fontSize: 12, color: "#047857", marginTop: 4 }}>
          {bestOur.reason}
        </div>
      </div>
    );
  } else {
    // Response mode: they responded, show our next move
    if (!firstDeclaredPlayer) return null;
    
    const respondingIsTeamA = currentRoundDeclaringTeam !== "teamA";
    const respondingTeamPlayers = respondingIsTeamA ? ourTeamPlayers : oppTeamPlayers;
    const usedRespIds = respondingIsTeamA ? usedAPlayerIdSet : usedBPlayerIdSet;
    const context = respondingIsTeamA ? teamBContext : teamAContext;
    
    const firstPlayer = ourTeamPlayers.find(p => p.id === firstDeclaredPlayer.id) 
      || oppTeamPlayers.find(p => p.id === firstDeclaredPlayer.id);
    if (!firstPlayer) return null;
    
    const respPreds = predictResponse(respondingTeamPlayers, firstPlayer, context, usedRespIds);
    if (respPreds.length === 0) return null;
    
    const likelyResponse = respPreds[0].player;
    
    // Compute what we'd do in next round
    const ourTeamForNext = respondingIsTeamA ? oppTeamPlayers : ourTeamPlayers;
    const usedOurForNext = respondingIsTeamA ? usedBPlayerIdSet : usedAPlayerIdSet;
    const nextContext = respondingIsTeamA ? teamAContext : teamBContext;
    const nextFirstPreds = predictFirstDeclaration(ourTeamForNext, nextContext, usedOurForNext, !respondingIsTeamA);
    
    if (nextFirstPreds.length === 0) return null;
    
    const bestNext = nextFirstPreds[0];
    
    return (
      <div style={{ 
        marginTop: 16, 
        padding: "12px", 
        background: "#dbeafe", 
        borderRadius: 6,
        border: "2px solid #3b82f6"
      }}>
        <div style={{ fontSize: 12, color: "#1e40af", marginBottom: 4 }}>
          💡 If they respond with <strong>{likelyResponse.name} (SL{likelyResponse.skill_level})</strong>:
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>
          Our next round best first: {bestNext.player.name} (SL{bestNext.player.skill_level})
        </div>
        <div style={{ fontSize: 12, color: "#1e40af", marginTop: 4 }}>
          {bestNext.reason}
        </div>
      </div>
    );
  }
}

// ============ SCORE PANEL COMPONENT ============

type ScorePanelProps = {
  teamAName: string;
  teamBName: string;
  teamAScore: number;
  teamBScore: number;
  raceTo: number;
  status: MatchStatus;
  teamAContext: ScoreContext;
  teamBContext: ScoreContext;
};

function ScorePanel({ teamAName, teamBName, teamAScore, teamBScore, raceTo, status, teamAContext, teamBContext }: ScorePanelProps) {
  const teamANeeds = raceTo - teamAScore;
  const teamBNeeds = raceTo - teamBScore;
  const isClinched = status === "clinched";
  const isComplete = status === "complete";
  
  return (
    <div
      style={{
        border: isClinched ? "2px solid #10b981" : isComplete ? "2px solid #6b7280" : "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        background: isClinched ? "#ecfdf5" : isComplete ? "#f3f4f6" : "#fff",
        marginBottom: 24,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>🏆 Live Score</h3>
        <span style={{
          padding: "4px 10px",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 600,
          background: isClinched ? "#10b981" : isComplete ? "#6b7280" : "#3b82f6",
          color: "#fff",
        }}>
          {isClinched ? "MATCH CLINCHED" : isComplete ? "COMPLETE" : "IN PROGRESS"}
        </span>
      </div>
      
      <div style={{ display: "flex", gap: 24, alignItems: "center", marginBottom: 12 }}>
        {/* Team A Score */}
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{teamAName}</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#1f2937" }}>{teamAScore}</div>
          <div style={{ fontSize: 12, color: teamANeeds <= 2 ? "#dc2626" : "#6b7280" }}>
            needs {teamANeeds}
          </div>
        </div>
        
        <div style={{ fontSize: 20, color: "#9ca3af", fontWeight: 700 }}>:</div>
        
        {/* Team B Score */}
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{teamBName}</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#1f2937" }}>{teamBScore}</div>
          <div style={{ fontSize: 12, color: teamBNeeds <= 2 ? "#dc2626" : "#6b7280" }}>
            needs {teamBNeeds}
          </div>
        </div>
      </div>
      
      <div style={{ textAlign: "center", fontSize: 12, color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
        Race to {raceTo} • {getScoreContextLabel(teamAContext, true)} • {getScoreContextLabel(teamBContext, false)}
      </div>
    </div>
  );
}

// ============ ROUND HISTORY COMPONENT ============

type RoundHistoryProps = {
  rounds: Round[];
  teamAName: string;
  teamBName: string;
  onEditRound: (round: Round) => void;
  onDeleteRound: (roundNum: number) => void;
};

function RoundHistory({ rounds, teamAName, teamBName, onEditRound, onDeleteRound }: RoundHistoryProps) {
  if (rounds.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
        No rounds completed yet
      </div>
    );
  }
  
  return (
    <div style={{ fontSize: 13 }}>
      {rounds.map((round) => (
        <div
          key={round.round}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 12px",
            marginBottom: 6,
            borderRadius: 6,
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Round {round.round}
            </div>
            <div style={{ color: "#4b5563" }}>
              {round.teamAPlayerName} (SL{round.teamASkillLevel}) vs {round.teamBPlayerName} (SL{round.teamBSkillLevel})
            </div>
            <div style={{ 
              marginTop: 4, 
              fontWeight: 700,
              color: round.winner === "teamA" ? "#10b981" : round.winner === "teamB" ? "#dc2626" : "#6b7280"
            }}>
              {round.winner === "teamA" ? `${teamAName} wins` : `${teamBName} wins`}
              {" • "}
              <span style={{ color: "#1f2937" }}>
                {round.teamAPoints} - {round.teamBPoints}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => onEditRound(round)}
              style={{ padding: "4px 8px", fontSize: 11 }}
            >
              Edit
            </button>
            <button 
              onClick={() => onDeleteRound(round.round)}
              style={{ padding: "4px 8px", fontSize: 11, background: "#fee2e2", color: "#991b1b" }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ ROUND ENTRY FORM COMPONENT ============

type RoundEntryFormProps = {
  nextRound: number;
  teamAName: string;
  teamBName: string;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  usedAPlayerIds: string[];
  usedBPlayerIds: string[];
  editingRound?: Round | null;
  prefillMatchup?: {
    ourPlayerId: string;
    ourPlayerName: string;
    ourPlayerSkillLevel: number;
    oppPlayerId: string;
    oppPlayerName: string;
    oppPlayerSkillLevel: number;
  } | null;
  onSave: (round: Round) => void;
  onCancel: () => void;
};

function RoundEntryForm({ 
  nextRound, 
  teamAName, 
  teamBName, 
  teamAPlayers, 
  teamBPlayers,
  usedAPlayerIds, 
  usedBPlayerIds,
  editingRound,
  prefillMatchup,
  onSave, 
  onCancel 
}: RoundEntryFormProps) {
  const isPrefilled = !!prefillMatchup;
  
  const availableAPlayers = teamAPlayers.filter(p => !usedAPlayerIds.includes(p.id) || editingRound?.teamAPlayerId === p.id || prefillMatchup?.ourPlayerId === p.id);
  const availableBPlayers = teamBPlayers.filter(p => !usedBPlayerIds.includes(p.id) || editingRound?.teamBPlayerId === p.id || prefillMatchup?.oppPlayerId === p.id);
  
  const [teamAPlayerId, setTeamAPlayerId] = useState(prefillMatchup?.ourPlayerId ?? editingRound?.teamAPlayerId ?? "");
  const [teamBPlayerId, setTeamBPlayerId] = useState(prefillMatchup?.oppPlayerId ?? editingRound?.teamBPlayerId ?? "");
  const [teamAPoints, setTeamAPoints] = useState(2);
  const [teamBPoints, setTeamBPoints] = useState(0);
  
  // Derive winner from points
  const winner: "teamA" | "teamB" = teamAPoints > teamBPoints ? "teamA" : "teamB";
  
  const teamAPlayer = teamAPlayers.find(p => p.id === teamAPlayerId);
  const teamBPlayer = teamBPlayers.find(p => p.id === teamBPlayerId);
  
  // Validation: check for tied scores
  const isTied = teamAPoints === teamBPoints;
  const pointsValid = teamAPoints >= 0 && teamBPoints >= 0 && teamAPoints <= 3 && teamBPoints <= 3;
  
  const scoreError = !pointsValid ? "Points must be 0-3" :
    isTied ? "Scores cannot be tied - must have a winner" :
    "";
  
  // If prefilled matchup, players are already selected - just validate points
  const isValid = isPrefilled ? pointsValid && !isTied : (teamAPlayerId && teamBPlayerId && pointsValid && !isTied);
  
  const handleSave = () => {
    // Use prefilled matchup data if available, otherwise look up from players
    const ourPlayerName = prefillMatchup?.ourPlayerName ?? teamAPlayer?.name ?? "";
    const ourPlayerSkillLevel = prefillMatchup?.ourPlayerSkillLevel ?? teamAPlayer?.skill_level ?? 3;
    const oppPlayerName = prefillMatchup?.oppPlayerName ?? teamBPlayer?.name ?? "";
    const oppPlayerSkillLevel = prefillMatchup?.oppPlayerSkillLevel ?? teamBPlayer?.skill_level ?? 3;
    
    if (!ourPlayerName || !oppPlayerName) return;
    
    const round: Round = {
      round: editingRound?.round ?? nextRound,
      teamAPlayerId: prefillMatchup?.ourPlayerId ?? teamAPlayerId,
      teamBPlayerId: prefillMatchup?.oppPlayerId ?? teamBPlayerId,
      teamAPlayerName: ourPlayerName,
      teamBPlayerName: oppPlayerName,
      teamASkillLevel: ourPlayerSkillLevel,
      teamBSkillLevel: oppPlayerSkillLevel,
      winner,
      teamAPoints,
      teamBPoints,
    };
    
    onSave(round);
  };
  
  return (
    <div
      style={{
        border: "1px solid #3b82f6",
        borderRadius: 8,
        padding: 16,
        background: "#eff6ff",
        marginBottom: 16,
      }}
    >
      <h4 style={{ margin: "0 0 12px 0", color: "#1e40af" }}>
        {editingRound ? `Edit Round ${editingRound.round}` : prefillMatchup ? `Round ${nextRound}: Enter Score` : `Add Round ${nextRound}`}
      </h4>
      
      {/* Player display - either dropdown or read-only based on whether we have prefilled matchup */}
      {isPrefilled ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12, padding: "12px", background: "#dbeafe", borderRadius: 6 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{teamAName} (First)</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>{prefillMatchup.ourPlayerName}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>SL{prefillMatchup.ourPlayerSkillLevel}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>{teamBName} (Response)</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#dc2626" }}>{prefillMatchup.oppPlayerName}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>SL{prefillMatchup.oppPlayerSkillLevel}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              {teamAName} Player
            </label>
            <select
              value={teamAPlayerId}
              onChange={(e) => setTeamAPlayerId(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #d1d5db" }}
            >
              <option value="">Select player</option>
              {availableAPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name} (SL{p.skill_level})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              {teamBName} Player
            </label>
            <select
              value={teamBPlayerId}
              onChange={(e) => setTeamBPlayerId(e.target.value)}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #d1d5db" }}
            >
              <option value="">Select player</option>
              {availableBPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name} (SL{p.skill_level})</option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            {teamAName} Points
          </label>
          <input
            type="number"
            min={0}
            max={3}
            step={1}
            value={teamAPoints}
            onChange={(e) => setTeamAPoints(e.target.value === '' ? 0 : Number(e.target.value))}
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #d1d5db" }}
          />
        </div>
        
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
            {teamBName} Points
          </label>
          <input
            type="number"
            min={0}
            max={3}
            step={1}
            value={teamBPoints}
            onChange={(e) => setTeamBPoints(e.target.value === '' ? 0 : Number(e.target.value))}
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #d1d5db" }}
          />
        </div>
      </div>
      
      {scoreError && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 4, color: "#991b1b", fontSize: 13 }}>
          ⚠️ {scoreError}
        </div>
      )}
      
      <div style={{ display: "flex", gap: 8 }}>
        <button 
          onClick={handleSave}
          disabled={!isValid}
          style={{ 
            padding: "8px 16px", 
            background: isValid ? "#10b981" : "#9ca3af", 
            color: "#fff", 
            border: "none", 
            borderRadius: 4,
            cursor: isValid ? "pointer" : "not-allowed"
          }}
        >
          {editingRound ? "Update Round" : "Save Round"}
        </button>
        <button 
          onClick={onCancel}
          style={{ padding: "8px 16px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4 }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============ LINEUP TRACKER PANEL COMPONENT ============

type LineupTrackerPanelProps = {
  teamName: string;
  lineupStatus: { active_lineups: Lineup[]; eliminated_lineups: Lineup[] } | null;
  usedPlayerIds: string[];
  players: Player[];
};

function computeMustInclude(
  lineupStatus: { active_lineups: Lineup[]; eliminated_lineups: Lineup[] } | null,
  players: Player[]
): Player[] {
  if (!lineupStatus || lineupStatus.active_lineups.length === 0) return [];
  
  const active = lineupStatus.active_lineups;
  if (active.length === 0) return [];
  
  // Find players that appear in EVERY active lineup
  const playerIdSets = active.map(lineup => new Set(lineup.player_ids));
  
  // Start with all player IDs from first lineup
  let mustIncludeIds = new Set(playerIdSets[0]);
  
  // Intersect with each subsequent lineup
  for (let i = 1; i < playerIdSets.length; i++) {
    const currentIds = Array.from(mustIncludeIds);
    mustIncludeIds = new Set(currentIds.filter(id => playerIdSets[i].has(id)));
  }
  
  // Convert to Player objects
  return Array.from(mustIncludeIds)
    .map(id => players.find(p => p.id === id))
    .filter((p): p is Player => p !== undefined);
}

function LineupTrackerPanel({ teamName, lineupStatus, usedPlayerIds, players }: LineupTrackerPanelProps) {
  const activeCount = lineupStatus?.active_lineups.length ?? 0;
  const eliminatedCount = lineupStatus?.eliminated_lineups.length ?? 0;
  const mustIncludePlayers = computeMustInclude(lineupStatus, players);
  
  // Determine warning level
  const isCritical = activeCount === 1;
  const isWarning = activeCount >= 2 && activeCount <= 3;
  
  // Get most likely lineup (first one marked as most_likely, or first active if none marked)
  const mostLikelyLineup = lineupStatus?.active_lineups.find(l => l.most_likely) 
    ?? lineupStatus?.active_lineups[0];
  const otherActiveLineups = lineupStatus?.active_lineups.filter(l => l !== mostLikelyLineup) ?? [];
  
  if (!lineupStatus || (activeCount === 0 && eliminatedCount === 0)) {
    return null;
  }
  
  return (
    <div
      style={{
        border: isCritical ? "2px solid #dc2626" : isWarning ? "2px solid #f59e0b" : "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        background: isCritical ? "#fef2f2" : isWarning ? "#fffbeb" : "#fff",
        marginBottom: 24,
      }}
    >
      {/* Header with Team Name */}
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>
        📊 {teamName} Lineup Tracker
      </h3>
      
      {/* Summary Row */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 12,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        <span style={{ 
          color: activeCount <= 3 ? "#92400e" : "#1f2937",
          background: activeCount <= 3 ? "#fef3c7" : "#f3f4f6",
          padding: "6px 12px",
          borderRadius: 4,
          border: activeCount <= 3 ? "1px solid #f59e0b" : "1px solid #e5e7eb",
        }}>
          Active: {activeCount}
        </span>
        <span style={{ 
          color: "#6b7280",
          background: "#f3f4f6",
          padding: "6px 12px",
          borderRadius: 4,
          border: "1px solid #e5e7eb",
        }}>
          Eliminated: {eliminatedCount}
        </span>
      </div>
      
      {/* Pressure Banner */}
      {isCritical && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: 4,
            background: "#fee2e2",
            border: "2px solid #dc2626",
            color: "#991b1b",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          🔴 Only one viable lineup remains — lineup locked!
        </div>
      )}
      {isWarning && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 12,
            borderRadius: 4,
            background: "#fef3c7",
            border: "1px solid #f59e0b",
            color: "#92400e",
            fontSize: 14,
          }}
        >
          🟡 Limited options: {activeCount} active lineups
        </div>
      )}
      
      {/* Must Include Players */}
      {mustIncludePlayers.length > 0 && (
        <div style={{ fontSize: 13, marginBottom: 12, color: "#7c3aed" }}>
          <strong>Must include:</strong>{" "}
          {mustIncludePlayers.map((p, idx) => (
            <span key={p.id}>
              {idx > 0 && ", "}
              {p.name} (SL{p.skill_level})
            </span>
          ))}
        </div>
      )}
      
      {/* Already Used Players (for reference) */}
      {usedPlayerIds.length > 0 && (
        <div style={{ fontSize: 12, marginBottom: 12, color: "#6b7280" }}>
          <strong>Used:</strong>{" "}
          {usedPlayerIds.map((pid, idx) => {
            const p = findPlayer({ players } as Team, pid);
            return (
              <span key={pid}>
                {idx > 0 && ", "}
                {p?.name || pid}
              </span>
            );
          })}
        </div>
      )}
      
      {/* Lineup Lists */}
      <div style={{ fontSize: 13 }}>
        {/* Most Likely Lineup */}
        {mostLikelyLineup && (
          <div
            style={{
              padding: "10px 14px",
              marginBottom: 8,
              borderRadius: 6,
              background: "#d1fae5",
              border: "2px solid #10b981",
              color: "#065f46",
              fontWeight: 700,
            }}
          >
            ⭐ Most Likely Lineup: {mostLikelyLineup.label}
            {mostLikelyLineup.count && mostLikelyLineup.count > 1 && (
              <span style={{ fontWeight: 400, marginLeft: 8 }}>
                ({mostLikelyLineup.count} combos)
              </span>
            )}
          </div>
        )}
        
        {/* Other Active Lineups */}
        {otherActiveLineups.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, fontWeight: 600 }}>
              OTHER ACTIVE LINEUPS
            </div>
            {otherActiveLineups.map((lineup, idx) => (
              <div
                key={`active-${idx}`}
                style={{
                  padding: "8px 12px",
                  marginBottom: 4,
                  borderRadius: 4,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  color: "#1f2937",
                }}
              >
                {lineup.label}
                {lineup.count && lineup.count > 1 && (
                  <span style={{ color: "#6b7280", marginLeft: 8 }}>
                    ({lineup.count} combos)
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Eliminated Lineups */}
        {lineupStatus.eliminated_lineups.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "#991b1b", marginBottom: 6, fontWeight: 600 }}>
              ELIMINATED LINEUPS
            </div>
            {lineupStatus.eliminated_lineups.map((lineup, idx) => (
              <div
                key={`elim-${idx}`}
                style={{
                  padding: "6px 10px",
                  marginBottom: 4,
                  borderRadius: 4,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                  textDecoration: "line-through",
                  opacity: 0.7,
                  fontSize: 12,
                }}
              >
                {lineup.label}
                {lineup.count && lineup.count > 1 && (
                  <span style={{ opacity: 0.7 }}> ({lineup.count} combos)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [editingTeam, setEditingTeam] = useState<Team>(emptyTeam());
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const [ourTeamId, setOurTeamId] = useState("");
  const [oppTeamId, setOppTeamId] = useState("");
  const [firstDeclaPattern, setFirstDeclaPattern] = useState<("us" | "opp")[]>([
    "us",
    "opp",
    "us",
    "opp",
    "us",
  ]);

  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [ourLegalPlayers, setOurLegalPlayers] = useState<Player[]>([]);
  const [oppLegalPlayers, setOppLegalPlayers] = useState<Player[]>([]);

  const [bestFirstRecs, setBestFirstRecs] = useState<Recommendation[]>([]);
  const [bestResponseRecs, setBestResponseRecs] = useState<Recommendation[]>([]);

  const [ourLineupStatus, setOurLineupStatus] = useState<{
    active_lineups: Lineup[];
    eliminated_lineups: Lineup[];
  } | null>(null);
  const [oppLineupStatus, setOppLineupStatus] = useState<{
    active_lineups: Lineup[];
    eliminated_lineups: Lineup[];
  } | null>(null);

  // Score tracking state
  const [scoreState, setScoreState] = useState<ScoreState>({
    raceTo: RACE_TO,
    rounds: [],
    teamAScore: 0,
    teamBScore: 0,
    status: "in_progress",
  });
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);

  // Round declaration flow state
  const [startingDeclaringTeam, setStartingDeclaringTeam] = useState<"teamA" | "teamB">("teamA");
  const [declarationStep, setDeclarationStep] = useState<"first" | "response" | "complete">("first");
  const [firstDeclaredPlayer, setFirstDeclaredPlayer] = useState<{ id: string; name: string; team: "teamA" | "teamB" } | null>(null);
  
  // Pre-filled matchup from lock-in (players already selected, just need score)
  const [lockedMatchup, setLockedMatchup] = useState<{
    ourPlayerId: string;
    ourPlayerName: string;
    ourPlayerSkillLevel: number;
    oppPlayerId: string;
    oppPlayerName: string;
    oppPlayerSkillLevel: number;
  } | null>(null);

  // Stable team rosters - initialized once when match starts, never cleared during delete/edit
  const [stableOurTeamPlayers, setStableOurTeamPlayers] = useState<Player[]>([]);
  const [stableOppTeamPlayers, setStableOppTeamPlayers] = useState<Player[]>([]);
  const [stableOurTeamName, setStableOurTeamName] = useState<string>("Our Team");
  const [stableOppTeamName, setStableOppTeamName] = useState<string>("Opponent");

  const [selectedOurPlayerId, setSelectedOurPlayerId] = useState("");
  const [selectedOppPlayerId, setSelectedOppPlayerId] = useState("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");

  const matchComplete = !!matchState && matchState.round_index !== undefined && matchState.round_index > 5;

  // Derived values for score context
  const teamAContext = useMemo(() => 
    computeScoreContext(scoreState.teamAScore, scoreState.teamBScore, scoreState.raceTo),
    [scoreState.teamAScore, scoreState.teamBScore, scoreState.raceTo]
  );
  const teamBContext = useMemo(() => 
    computeScoreContext(scoreState.teamBScore, scoreState.teamAScore, scoreState.raceTo),
    [scoreState.teamBScore, scoreState.teamAScore, scoreState.raceTo]
  );
  const nextRound = scoreState.rounds.length + 1;
  
  // Canonical source of truth for used players - arrays derived from scoreState
  const usedAPlayerIds = scoreState.rounds.map(r => r.teamAPlayerId);
  const usedBPlayerIds = scoreState.rounds.map(r => r.teamBPlayerId);
  // Sets for O(1) lookup
  const usedAPlayerIdSet = new Set(usedAPlayerIds);
  const usedBPlayerIdSet = new Set(usedBPlayerIds);

  // Derive which team declares first based on round number and starting team
  const currentRoundDeclaringTeam: "teamA" | "teamB" = 
    (nextRound % 2 === 1) === (startingDeclaringTeam === "teamA") ? "teamA" : "teamB";
  
  // Safe team objects and names - use stable roster state that persists across delete/edit
  const liveOurTeam = matchState?.our_team ?? null;
  const liveOppTeam = matchState?.opp_team ?? null;
  const liveOurTeamName = stableOurTeamName || "Our Team";
  const liveOppTeamName = stableOppTeamName || "Opponent";
  const ourTeamPlayers = stableOurTeamPlayers.length > 0 ? stableOurTeamPlayers : (matchState?.our_team?.players ?? []);
  const oppTeamPlayers = stableOppTeamPlayers.length > 0 ? stableOppTeamPlayers : (matchState?.opp_team?.players ?? []);
  const liveOurTeamId = liveOurTeam?.id ?? "";
  const liveOppTeamId = liveOppTeam?.id ?? "";
  const declaringTeamName = currentRoundDeclaringTeam === "teamA" ? liveOurTeamName : liveOppTeamName;
  const respondingTeamName = currentRoundDeclaringTeam === "teamA" ? liveOppTeamName : liveOurTeamName;

  // Determine if a player is in their turn and can be selected
  const isTeamAInTurn = (declarationStep === "first" && currentRoundDeclaringTeam === "teamA") ||
                         (declarationStep === "response" && currentRoundDeclaringTeam !== "teamA");
  const isTeamBInTurn = (declarationStep === "first" && currentRoundDeclaringTeam === "teamB") ||
                         (declarationStep === "response" && currentRoundDeclaringTeam !== "teamB");

  // Check if live match is active - use stable roster state as primary indicator
  const hasLiveMatch = (matchState && liveOurTeamId && liveOppTeamId) || 
                       (stableOurTeamPlayers.length > 0 && stableOppTeamPlayers.length > 0);

  // Handle save round (add or update)
  const handleSaveRound = (round: Round) => {
    setScoreState(prev => {
      const existingIndex = prev.rounds.findIndex(r => r.round === round.round);
      let newRounds: Round[];
      
      if (existingIndex >= 0) {
        // Update existing round
        newRounds = [...prev.rounds];
        newRounds[existingIndex] = round;
      } else {
        // Add new round
        newRounds = [...prev.rounds, round];
      }
      
      // Recalculate scores
      const teamAScore = newRounds.reduce((sum, r) => sum + r.teamAPoints, 0);
      const teamBScore = newRounds.reduce((sum, r) => sum + r.teamBPoints, 0);
      
      let status: MatchStatus = "in_progress";
      if (teamAScore >= prev.raceTo || teamBScore >= prev.raceTo) {
        status = "clinched";
      } else if (newRounds.length >= 5) {
        status = "complete";
      }
      
      return {
        ...prev,
        rounds: newRounds,
        teamAScore,
        teamBScore,
        status,
      };
    });
    
    setShowRoundForm(false);
    setEditingRound(null);
    
    // Recalculate live declaration flow after saving round
    recalculateDeclarationFlow();
  };

  // Handle delete round (undo)
  const handleDeleteRound = (roundNum: number) => {
    if (!window.confirm(`Delete Round ${roundNum}?`)) return;
    
    setScoreState(prev => {
      const newRounds = prev.rounds.filter(r => r.round !== roundNum);
      const teamAScore = newRounds.reduce((sum, r) => sum + r.teamAPoints, 0);
      const teamBScore = newRounds.reduce((sum, r) => sum + r.teamBPoints, 0);
      
      let status: MatchStatus = "in_progress";
      if (teamAScore >= prev.raceTo || teamBScore >= prev.raceTo) {
        status = "clinched";
      } else if (newRounds.length >= 5) {
        status = "complete";
      }
      
      return {
        ...prev,
        rounds: newRounds,
        teamAScore,
        teamBScore,
        status,
      };
    });
    
    // Recalculate live declaration flow from updated round history
    recalculateDeclarationFlow();
  };

  // Helper to recalculate turn state after round changes (delete/edit/add)
  const recalculateDeclarationFlow = (roundCount?: number) => {
    // Use provided count or current state
    const roundsNow = roundCount ?? scoreState.rounds.length;
    
    // Clear first declared player (no longer valid for new round state)
    setFirstDeclaredPlayer(null);
    
    // Reset to first step since we're starting fresh for this round
    setDeclarationStep("first");
    
    // Clear any stale player selections for new round
    setSelectedOurPlayerId("");
    setSelectedOppPlayerId("");
    setBestFirstRecs([]);
    setBestResponseRecs([]);
  };

  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    setShowRoundForm(true);
  };

  const currentFirstDeclarer = useMemo(() => {
    if (!matchState) return null;
    if (!matchState.first_declarer_by_round || matchState.round_index === undefined) return null;
    return matchState.first_declarer_by_round[matchState.round_index - 1] ?? null;
  }, [matchState]);

  async function loadTeams() {
    setLoadingTeams(true);
    setTeamError("");
    try {
      const data = await getTeams();
      setTeams(data.teams ?? data);
    } catch (err: any) {
      setTeamError(err?.message || "Failed to load teams");
    } finally {
      setLoadingTeams(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, []);

  async function refreshLegalPlayers(nextState: MatchState) {
    const res = await getLegalPlayers(nextState);
    setOurLegalPlayers(res.our_legal_players || []);
    setOppLegalPlayers(res.opp_legal_players || []);
  }

  async function refreshLineupStatuses(nextState: MatchState) {
    const ourRes = await getLineupStatus(nextState.our_team, nextState.our_used_player_ids);
    const oppRes = await getLineupStatus(nextState.opp_team, nextState.opp_used_player_ids);
    setOurLineupStatus(ourRes);
    setOppLineupStatus(oppRes);
  }

  async function handleLoadSample() {
    setBusy(true);
    setStatus("Loading sample match...");
    try {
      const state = await getSampleMatch();
      setMatchState(state);
      setBestFirstRecs([]);
      setBestResponseRecs([]);
      setSelectedOurPlayerId("");
      setSelectedOppPlayerId("");
      await refreshLegalPlayers(state);
      await refreshLineupStatuses(state);
      setStatus("Sample match loaded.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to load sample match.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTeam() {
    if (!editingTeam.name.trim()) {
      setStatus("Team name is required.");
      return;
    }

    const cleanedPlayers = editingTeam.players.filter(
      (p) => p.id.trim() && p.name.trim()
    );

    if (cleanedPlayers.length < 5) {
      setStatus("Team must have at least 5 valid players.");
      return;
    }

    const payload: Team = {
      ...editingTeam,
      id: editingTeam.id.trim() || `team_${Date.now()}`,
      players: cleanedPlayers,
    };

    setBusy(true);
    setStatus(isEditingExisting ? "Updating team..." : "Creating team...");
    console.log("Saving team payload:", payload);

    try {
      if (isEditingExisting) {
        await updateTeam(payload.id, payload);
      } else {
        await createTeam(payload);
      }
      setEditingTeam(emptyTeam());
      setIsEditingExisting(false);
      await loadTeams();
      setStatus("Team saved.");
    } catch (err: any) {
      const msg = err?.message || "Failed to save team.";
      console.error("Save team failed:", err);
      setStatus(msg);
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleEditTeam(team: Team) {
    const clone = JSON.parse(JSON.stringify(team));
    setEditingTeam(clone);
    setIsEditingExisting(true);
    setStatus(`Editing ${team.name}`);
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm("Delete this team?")) return;
    setBusy(true);
    setStatus("Deleting team...");
    try {
      await deleteTeam(teamId);
      if (editingTeam.id === teamId) {
        setEditingTeam(emptyTeam());
        setIsEditingExisting(false);
      }
      await loadTeams();
      setStatus("Team deleted.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to delete team.");
    } finally {
      setBusy(false);
    }
  }

  function updateEditingPlayer(index: number, updates: Partial<Player>) {
    setEditingTeam((prev) => {
      const nextPlayers = [...prev.players];
      nextPlayers[index] = { ...nextPlayers[index], ...updates };
      return { ...prev, players: nextPlayers };
    });
  }

  function addEditingPlayer() {
    setEditingTeam((prev) => ({
      ...prev,
      players: [...prev.players, emptyPlayer()],
    }));
  }

  function removeEditingPlayer(index: number) {
    setEditingTeam((prev) => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== index),
    }));
  }

  function resetEditor() {
    setEditingTeam(emptyTeam());
    setIsEditingExisting(false);
    setStatus("Team editor reset.");
  }

  async function handleCreateMatch() {
    if (!ourTeamId || !oppTeamId) {
      setStatus("Select both teams.");
      return;
    }

    if (ourTeamId === oppTeamId) {
      setStatus("Choose two different teams.");
      return;
    }

    setBusy(true);
    setStatus("Creating match...");
    try {
      const res = await createMatch(ourTeamId, oppTeamId, firstDeclaPattern);
      const state = res.state ?? res;
      setMatchState(state);
      // Initialize stable team rosters - these persist across delete/edit
      setStableOurTeamPlayers(state.our_team.players);
      setStableOppTeamPlayers(state.opp_team.players);
      setStableOurTeamName(state.our_team.name);
      setStableOppTeamName(state.opp_team.name);
      setBestFirstRecs([]);
      setBestResponseRecs([]);
      setSelectedOurPlayerId("");
      setSelectedOppPlayerId("");
      // Reset declaration flow for new match
      setDeclarationStep("first");
      setFirstDeclaredPlayer(null);
      await refreshLegalPlayers(state);
      await refreshLineupStatuses(state);
      setStatus("Match created.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to create match.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBestFirst() {
    if (!matchState) return;

    setBusy(true);
    setStatus("Calculating best first declaration...");
    try {
      const res = await getBestFirstDeclaration(matchState);
      setBestFirstRecs(res.recommendations || []);
      setBestResponseRecs([]);
      setStatus("Best first declaration ready.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to get first declaration recommendations.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBestResponse() {
    if (!matchState || !selectedOppPlayerId) {
      setStatus("Select opponent player first.");
      return;
    }

    setBusy(true);
    setStatus("Calculating best response...");
    try {
      const res = await getBestResponse(matchState, selectedOppPlayerId);
      setBestResponseRecs(res.recommendations || []);
      setBestFirstRecs([]);
      setStatus("Best response ready.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to get response recommendations.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLockMatchup() {
    if (!matchState || !selectedOurPlayerId || !selectedOppPlayerId) {
      setStatus("Choose both players before locking matchup.");
      return;
    }

    // Find player details for the locked matchup
    const ourPlayer = ourTeamPlayers.find(p => p.id === selectedOurPlayerId);
    const oppPlayer = oppTeamPlayers.find(p => p.id === selectedOppPlayerId);
    
    if (!ourPlayer || !oppPlayer) {
      setStatus("Invalid player selection.");
      return;
    }

    // Set the locked matchup - this will pre-fill the round entry form
    setLockedMatchup({
      ourPlayerId: ourPlayer.id,
      ourPlayerName: ourPlayer.name,
      ourPlayerSkillLevel: ourPlayer.skill_level,
      oppPlayerId: oppPlayer.id,
      oppPlayerName: oppPlayer.name,
      oppPlayerSkillLevel: oppPlayer.skill_level,
    });
    
    // Show the round entry form with pre-filled players
    setShowRoundForm(true);
    setStatus(`Matchup locked: ${ourPlayer.name} vs ${oppPlayer.name} — enter score`);
  }

  // Confirm first declaration and advance to response step
  const handleConfirmFirstDeclaration = () => {
    if (declarationStep !== "first") return;
    
    // Determine which player was selected based on who's declaring
    const declaringIsTeamA = currentRoundDeclaringTeam === "teamA";
    const selectedPlayerId = declaringIsTeamA ? selectedOurPlayerId : selectedOppPlayerId;
    
    // Validate selected player exists and is available
    if (!selectedPlayerId) {
      setStatus("Select a player first");
      return;
    }
    
    if (!hasLiveMatch) {
      setStatus("No active match");
      return;
    }
    
    const player = declaringIsTeamA 
      ? ourTeamPlayers.find(p => p.id === selectedPlayerId)
      : oppTeamPlayers.find(p => p.id === selectedPlayerId);
    
    // Verify player is actually selectable (not already used)
    const isUsed = declaringIsTeamA ? usedAPlayerIdSet.has(selectedPlayerId) : usedBPlayerIdSet.has(selectedPlayerId);
    
    if (!player) {
      setStatus("Invalid player selection");
      return;
    }
    
    if (isUsed) {
      setStatus("Player already used in this match");
      return;
    }
    
    // Store the first declared player and advance to response
    setFirstDeclaredPlayer({
      id: player.id,
      name: player.name,
      team: currentRoundDeclaringTeam
    });
    setDeclarationStep("response");
    setStatus(`${declaringTeamName} declared ${player.name} — waiting for response`);
  };

  const ourLegalIds = new Set(ourLegalPlayers.map((p) => p.id));
  const oppLegalIds = new Set(oppLegalPlayers.map((p) => p.id));

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <h1>APA Pool Matchup Optimizer</h1>

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#f3f4f6",
          borderRadius: 8,
        }}
      >
        <strong>Status:</strong> {busy ? "Working..." : status}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2>Saved Teams</h2>
          <button onClick={loadTeams} disabled={loadingTeams || busy}>
            Refresh Teams
          </button>
          {teamError && <p style={{ color: "red" }}>{teamError}</p>}

          <div style={{ marginTop: 12 }}>
            {teams.length === 0 ? (
              <p>No saved teams yet.</p>
            ) : (
              teams.map((team) => (
                <div
                  key={team.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong>{team.name}</strong>
                      <div style={{ fontSize: 13, color: "#555" }}>
                        ID: {team.id} · Players: {team.players.length}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleEditTeam(team)} disabled={busy}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteTeam(team.id)} disabled={busy}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2>{isEditingExisting ? "Edit Team" : "Create Team"}</h2>

          <label style={{ display: "block", marginBottom: 8 }}>
            Team ID
            <input
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={editingTeam.id}
              onChange={(e) =>
                setEditingTeam((prev) => ({ ...prev, id: e.target.value }))
              }
              placeholder="team_alpha"
            />
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            Team Name
            <input
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={editingTeam.name}
              onChange={(e) =>
                setEditingTeam((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Cue Ballers"
            />
          </label>

          <h3>Players</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 120px 170px auto",
              gap: 8,
              fontWeight: 700,
              marginBottom: 8,
              fontSize: 14,
            }}
          >
            <div>Player ID</div>
            <div>Player Name</div>
            <div>Skill Level</div>
            <div>Recent Win Rate</div>
            <div>Action</div>
          </div>

          {editingTeam.players.map((player, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 120px 170px auto",
                  gap: 8,
                }}
              >
                <input
                  value={player.id}
                  onChange={(e) => updateEditingPlayer(index, { id: e.target.value })}
                  placeholder="8-digit Player ID"
                />
                <input
                  value={player.name}
                  onChange={(e) => updateEditingPlayer(index, { name: e.target.value })}
                  placeholder="Player Name"
                />
                <input
                  type="number"
                  min={2}
                  max={7}
                  value={player.skill_level}
                  onChange={(e) =>
                    updateEditingPlayer(index, {
                      skill_level: Number(e.target.value),
                    })
                  }
                  placeholder="Skill Level (2-7)"
                />
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={player.recent_win_rate ?? 0.5}
                  onChange={(e) =>
                    updateEditingPlayer(index, {
                      recent_win_rate: Number(e.target.value),
                    })
                  }
                  placeholder="Recent Win Rate (0.00-1.00)"
                />
                <button
                  onClick={() => removeEditingPlayer(index)}
                  disabled={editingTeam.players.length <= 1}
                >
                  Remove
                </button>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                Notes
              </div>
              <textarea
                style={{ width: "100%", marginTop: 8 }}
                value={player.notes ?? ""}
                onChange={(e) =>
                  updateEditingPlayer(index, { notes: e.target.value })
                }
                placeholder="Notes"
                rows={2}
              />
            </div>
          ))}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addEditingPlayer} disabled={busy}>
              Add Player
            </button>
            <button onClick={handleSaveTeam} disabled={busy}>
              {isEditingExisting ? "Update Team" : "Save Team"}
            </button>
            <button onClick={resetEditor} disabled={busy}>
              Reset
            </button>
          </div>
        </section>
      </div>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <h2>Start Match</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr auto auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label>
            Our Team
            <select
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={ourTeamId}
              onChange={(e) => setOurTeamId(e.target.value)}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Opponent Team
            <select
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={oppTeamId}
              onChange={(e) => setOppTeamId(e.target.value)}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Declaration Pattern
            <select
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={firstDeclaPattern.join(",")}
              onChange={(e) =>
                setFirstDeclaPattern(e.target.value.split(",") as ("us" | "opp")[])
              }
            >
              <option value="us,opp,us,opp,us">Us first: 1,3,5</option>
              <option value="opp,us,opp,us,opp">Opponent first: 1,3,5</option>
            </select>
          </label>

          <label>
            Round 1 Starts With
            <select
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={startingDeclaringTeam}
              onChange={(e) => setStartingDeclaringTeam(e.target.value as "teamA" | "teamB")}
            >
              <option value="teamA">Our Team</option>
              <option value="teamB">Opponent</option>
            </select>
          </label>

          <button onClick={handleCreateMatch} disabled={busy}>
            Start Matchup
          </button>

          <button onClick={handleLoadSample} disabled={busy}>
            Load Sample
          </button>
        </div>
      </section>

      {matchState && (
        <>
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <h2>Live Match Dashboard</h2>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <strong>Round:</strong> {nextRound}
              </div>
              <div>
                <strong>Score:</strong> Us {scoreState.teamAScore} - {scoreState.teamBScore} Opp
              </div>
              <div>
                <strong>Current Declaration:</strong>{" "}
                {currentRoundDeclaringTeam === "teamA"
                  ? `${liveOurTeamName} declares first`
                  : `${liveOppTeamName} declares first`}
              </div>
              <div>
                <strong>Status:</strong> {matchComplete ? "Match Complete" : "In Progress"}
              </div>
            </div>
            
            {/* Round Turn Banner */}
            <div style={{ 
              marginTop: 16, 
              padding: "12px 16px", 
              borderRadius: 8,
              background: currentRoundDeclaringTeam === "teamA" ? "#dbeafe" : "#fce7f3",
              border: `2px solid ${currentRoundDeclaringTeam === "teamA" ? "#3b82f6" : "#ec4899"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#1f2937" }}>
                {declarationStep === "first" ? (
                  <>🏓 Round {nextRound} — <strong>{declaringTeamName}</strong> puts up first</>
                ) : firstDeclaredPlayer ? (
                  <>🎯 <strong>{firstDeclaredPlayer.name}</strong> declared ({firstDeclaredPlayer.team === "teamA" ? liveOurTeamName : liveOppTeamName}) — <strong>{respondingTeamName}</strong> respond!</>
                ) : (
                  <>🏓 Round {nextRound} — Waiting for response</>
                )}
              </div>
              <div style={{ 
                padding: "4px 10px", 
                borderRadius: 4, 
                fontSize: 12, 
                fontWeight: 700,
                background: declarationStep === "first" ? "#f59e0b" : "#10b981",
                color: "#fff"
              }}>
                {declarationStep === "first" ? "WAITING FOR FIRST DECLARATION" : 
                 declarationStep === "response" ? "WAITING FOR RESPONSE" : "ROUND COMPLETE"}
              </div>
            </div>
          </section>

          {/* PREDICTION PANEL */}
          {matchState && !matchComplete && (
            <div
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
                background: "#faf5ff",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 12, color: "#7c3aed" }}>
                🔮 Opponent Prediction
              </h3>
              
              {declarationStep === "first" ? (
                // Predicting first declaration
                <div>
                  <div style={{ fontSize: 13, marginBottom: 8, color: "#6b7280" }}>
                    Based on score context: <strong style={{ color: getScoreContextBadgeStyle(currentRoundDeclaringTeam === "teamA" ? teamAContext : teamBContext).color }}>
                      {currentRoundDeclaringTeam === "teamA" ? teamAContext : teamBContext}
                    </strong>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 12, color: "#4b5563" }}>
                    Most likely <strong>{declaringTeamName}</strong> will put up:
                  </div>
                  {(() => {
                    const predictingForTeamA = currentRoundDeclaringTeam === "teamA";
                    const teamPlayers = predictingForTeamA ? ourTeamPlayers : oppTeamPlayers;
                    const usedIds = predictingForTeamA ? usedAPlayerIdSet : usedBPlayerIdSet;
                    const context = predictingForTeamA ? teamAContext : teamBContext;
                    const predictions = predictFirstDeclaration(teamPlayers, context, usedIds, predictingForTeamA);
                    
                    if (predictions.length === 0) {
                      return <div style={{ color: "#6b7280" }}>No available players to predict</div>;
                    }
                    
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {predictions.map((pred, idx) => (
                          <div
                            key={pred.player.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "8px 12px",
                              borderRadius: 6,
                              background: idx === 0 ? "#ede9fe" : "#f3f4f6",
                              border: idx === 0 ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                            }}
                          >
                            <span style={{ 
                              fontWeight: 700, 
                              color: idx === 0 ? "#7c3aed" : "#6b7280",
                              minWidth: 24
                            }}>
                              {idx === 0 ? "🎯" : idx === 1 ? "2️⃣" : "3️⃣"}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>
                                {pred.player.name} <span style={{ color: "#6b7280", fontWeight: 400 }}>(SL{pred.player.skill_level})</span>
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>{pred.reason}</div>
                            </div>
                            <span style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: pred.confidence === "high" ? "#d1fae5" : pred.confidence === "medium" ? "#fef3c7" : "#f3f4f6",
                              color: pred.confidence === "high" ? "#065f46" : pred.confidence === "medium" ? "#92400e" : "#6b7280",
                              fontWeight: 600,
                              textTransform: "uppercase"
                            }}>
                              {pred.confidence}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  
                  {/* If they do X, we should do Y */}
                  {getPredictionAdvice(
                    "first",
                    currentRoundDeclaringTeam,
                    ourTeamPlayers,
                    oppTeamPlayers,
                    usedAPlayerIdSet,
                    usedBPlayerIdSet,
                    teamAContext,
                    teamBContext
                  )}
                </div>
              ) : declarationStep === "response" && firstDeclaredPlayer ? (
                // Predicting response
                <div>
                  <div style={{ fontSize: 13, marginBottom: 8, color: "#6b7280" }}>
                    Based on score context: <strong style={{ color: getScoreContextBadgeStyle(currentRoundDeclaringTeam === "teamA" ? teamBContext : teamAContext).color }}>
                      {currentRoundDeclaringTeam === "teamA" ? teamBContext : teamAContext}
                    </strong>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 12, color: "#4b5563" }}>
                    Most likely <strong>{respondingTeamName}</strong> will respond with:
                  </div>
                  {(() => {
                    const respondingIsTeamA = currentRoundDeclaringTeam !== "teamA";
                    const teamPlayers = respondingIsTeamA ? ourTeamPlayers : oppTeamPlayers;
                    const usedIds = respondingIsTeamA ? usedAPlayerIdSet : usedBPlayerIdSet;
                    const context = respondingIsTeamA ? teamBContext : teamAContext;
                    
                    // Find the first declared player from our stored data
                    const firstPlayer = ourTeamPlayers.find(p => p.id === firstDeclaredPlayer.id) 
                      || oppTeamPlayers.find(p => p.id === firstDeclaredPlayer.id);
                    
                    if (!firstPlayer) {
                      return <div style={{ color: "#6b7280" }}>Unknown declared player</div>;
                    }
                    
                    const predictions = predictResponse(teamPlayers, firstPlayer, context, usedIds);
                    
                    if (predictions.length === 0) {
                      return <div style={{ color: "#6b7280" }}>No available players to predict</div>;
                    }
                    
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {predictions.map((pred, idx) => (
                          <div
                            key={pred.player.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "8px 12px",
                              borderRadius: 6,
                              background: idx === 0 ? "#ede9fe" : "#f3f4f6",
                              border: idx === 0 ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                            }}
                          >
                            <span style={{ 
                              fontWeight: 700, 
                              color: idx === 0 ? "#7c3aed" : "#6b7280",
                              minWidth: 24
                            }}>
                              {idx === 0 ? "🎯" : idx === 1 ? "2️⃣" : "3️⃣"}
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>
                                {pred.player.name} <span style={{ color: "#6b7280", fontWeight: 400 }}>(SL{pred.player.skill_level})</span>
                              </div>
                              <div style={{ fontSize: 12, color: "#6b7280" }}>{pred.reason}</div>
                            </div>
                            <span style={{
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: pred.confidence === "high" ? "#d1fae5" : pred.confidence === "medium" ? "#fef3c7" : "#f3f4f6",
                              color: pred.confidence === "high" ? "#065f46" : pred.confidence === "medium" ? "#92400e" : "#6b7280",
                              fontWeight: 600,
                              textTransform: "uppercase"
                            }}>
                              {pred.confidence}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  
                  {/* If they respond with X, here's what we should consider */}
                  {getPredictionAdvice(
                    "response",
                    currentRoundDeclaringTeam,
                    ourTeamPlayers,
                    oppTeamPlayers,
                    usedAPlayerIdSet,
                    usedBPlayerIdSet,
                    teamAContext,
                    teamBContext,
                    firstDeclaredPlayer
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* LIVE SCORE PANEL */}
          {matchState && (
            <ScorePanel
              teamAName={liveOurTeamName}
              teamBName={liveOppTeamName}
              teamAScore={scoreState.teamAScore}
              teamBScore={scoreState.teamBScore}
              raceTo={scoreState.raceTo}
              status={scoreState.status}
              teamAContext={teamAContext}
              teamBContext={teamBContext}
            />
          )}

          {/* ROUND HISTORY & ENTRY */}
          {matchState && scoreState.status !== "clinched" && scoreState.status !== "complete" && (
            <section
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>📋 Round History</h3>
                <button 
                  onClick={() => { setEditingRound(null); setShowRoundForm(true); }}
                  disabled={scoreState.rounds.length >= 5}
                  style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 4 }}
                >
                  + Add Round
                </button>
              </div>
              
              {showRoundForm && matchState && (
                <RoundEntryForm
                  nextRound={nextRound}
                  teamAName={liveOurTeamName}
                  teamBName={liveOppTeamName}
                  teamAPlayers={ourTeamPlayers}
                  teamBPlayers={oppTeamPlayers}
                  usedAPlayerIds={usedAPlayerIds}
                  usedBPlayerIds={usedBPlayerIds}
                  editingRound={editingRound}
                  prefillMatchup={lockedMatchup}
                  onSave={(round) => {
                    // Clear locked matchup after saving
                    handleSaveRound(round);
                    setLockedMatchup(null);
                    // Reset selection and declaration flow
                    setSelectedOurPlayerId("");
                    setSelectedOppPlayerId("");
                    setDeclarationStep("first");
                    setFirstDeclaredPlayer(null);
                  }}
                  onCancel={() => { 
                    setShowRoundForm(false); 
                    setEditingRound(null); 
                    setLockedMatchup(null);
                  }}
                />
              )}
              
              <RoundHistory
                rounds={scoreState.rounds}
                teamAName={liveOurTeamName}
                teamBName={liveOppTeamName}
                onEditRound={handleEditRound}
                onDeleteRound={handleDeleteRound}
              />
            </section>
          )}

          {/* LINEUP TRACKER PANEL - HIGH VISIBILITY */}
          {!matchComplete && matchState && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <LineupTrackerPanel
                teamName={liveOurTeamName}
                lineupStatus={ourLineupStatus}
                usedPlayerIds={usedAPlayerIds}
                players={ourTeamPlayers}
              />
              <LineupTrackerPanel
                teamName={liveOppTeamName}
                lineupStatus={oppLineupStatus}
                usedPlayerIds={usedBPlayerIds}
                players={oppTeamPlayers}
              />
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginBottom: 24,
            }}
          >
            <section
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3>
                {liveOurTeamName}
                {declarationStep === "first" && currentRoundDeclaringTeam !== "teamA" && (
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 400, marginLeft: 8 }}>
                    — waiting for their turn
                  </span>
                )}
                {declarationStep === "response" && currentRoundDeclaringTeam === "teamA" && (
                  <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600, marginLeft: 8 }}>
                    — respond now!
                  </span>
                )}
              </h3>
              {ourTeamPlayers.map((p) => {
                const used = usedAPlayerIdSet.has(p.id);
                const legal = ourLegalIds.has(p.id);
                const isMyTurn = (declarationStep === "first" && currentRoundDeclaringTeam === "teamA") ||
                                 (declarationStep === "response" && currentRoundDeclaringTeam !== "teamA");
                const isDisabled = !isMyTurn || used;

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 10,
                      marginBottom: 8,
                      borderRadius: 8,
                      border:
                        selectedOurPlayerId === p.id
                          ? "2px solid #2563eb"
                          : isDisabled ? "1px solid #e5e7eb" : "1px solid #ddd",
                      background: used ? "#f3f4f6" : isDisabled ? "#f9fafb" : legal ? "#ecfdf5" : "#fff7ed",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.6 : 1,
                    }}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedOurPlayerId(p.id);
                        // Auto-advance to response step when selecting first player
                        if (declarationStep === "first" && currentRoundDeclaringTeam === "teamA") {
                          setFirstDeclaredPlayer({ id: p.id, name: p.name, team: "teamA" });
                          setDeclarationStep("response");
                        }
                      }
                    }}
                  >
                    <strong>{p.name}</strong> (SL {p.skill_level}){" "}
                    {used ? "— Used" : !isMyTurn ? "— Not your turn" : legal ? "— Legal" : "— Unavailable"}
                    <div style={{ fontSize: 13, color: "#555" }}>
                      Win Rate: {((p.recent_win_rate ?? 0.5) * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </section>

            <section
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3>
                {liveOppTeamName}
                {declarationStep === "first" && currentRoundDeclaringTeam !== "teamB" && (
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 400, marginLeft: 8 }}>
                    — waiting for their turn
                  </span>
                )}
                {declarationStep === "response" && currentRoundDeclaringTeam === "teamB" && (
                  <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600, marginLeft: 8 }}>
                    — respond now!
                  </span>
                )}
              </h3>
              {oppTeamPlayers.map((p) => {
                const used = usedBPlayerIdSet.has(p.id);
                const legal = oppLegalIds.has(p.id);
                const isMyTurn = (declarationStep === "first" && currentRoundDeclaringTeam === "teamB") ||
                                 (declarationStep === "response" && currentRoundDeclaringTeam !== "teamB");
                const isDisabled = !isMyTurn || used;

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 10,
                      marginBottom: 8,
                      borderRadius: 8,
                      border:
                        selectedOppPlayerId === p.id
                          ? "2px solid #dc2626"
                          : isDisabled ? "1px solid #e5e7eb" : "1px solid #ddd",
                      background: used ? "#f3f4f6" : isDisabled ? "#f9fafb" : legal ? "#ecfdf5" : "#fff7ed",
                      cursor: isDisabled ? "not-allowed" : "pointer",
                      opacity: isDisabled ? 0.6 : 1,
                    }}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedOppPlayerId(p.id);
                        // Auto-advance to response step when selecting first player
                        if (declarationStep === "first" && currentRoundDeclaringTeam === "teamB") {
                          setFirstDeclaredPlayer({ id: p.id, name: p.name, team: "teamB" });
                          setDeclarationStep("response");
                        }
                      }
                    }}
                  >
                    <strong>{p.name}</strong> (SL {p.skill_level}){" "}
                    {used ? "— Used" : !isMyTurn ? "— Not your turn" : legal ? "— Legal" : "— Unavailable"}
                    <div style={{ fontSize: 13, color: "#555" }}>
                      Win Rate: {((p.recent_win_rate ?? 0.5) * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          {!matchComplete && (
            <>
              <section
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <h3>Actions</h3>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button 
                    onClick={handleBestFirst} 
                    disabled={busy || declarationStep !== "first"}
                    title={declarationStep !== "first" ? "Waiting for first declaration" : ""}
                  >
                    {currentRoundDeclaringTeam === "teamA" ? "Recommend Our First" : "Recommend Opp First"}
                  </button>
                  <button
                    onClick={handleBestResponse}
                    disabled={busy || declarationStep !== "response" || !selectedOurPlayerId}
                    title={declarationStep === "first" ? "Wait for first declaration first" : ""}
                  >
                    {currentRoundDeclaringTeam === "teamA" ? "Recommend Our Response" : "Recommend Opp Response"}
                  </button>
                  
                  <button
                    onClick={handleLockMatchup}
                    disabled={busy || !selectedOurPlayerId || !selectedOppPlayerId}
                  >
                    Lock Matchup
                  </button>
                </div>

                <div style={{ marginTop: 12, fontSize: 14 }}>
                  <div>
                    <strong>Selected Our Player:</strong>{" "}
                    {selectedOurPlayerId || "None"}
                  </div>
                  <div>
                    <strong>Selected Opponent Player:</strong>{" "}
                    {selectedOppPlayerId || "None"}
                  </div>
                </div>
              </section>

              {declarationStep === "first" && bestFirstRecs.length > 0 && (
                <section
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                  }}
                >
                  <h3>Recommended First Player — {declaringTeamName}</h3>
                  <div style={{ 
                    marginBottom: 12, 
                    padding: "8px 12px", 
                    borderRadius: 6,
                    background: getScoreContextBadgeStyle(teamAContext).bg,
                    border: `1px solid ${getScoreContextBadgeStyle(teamAContext).border}`,
                    color: getScoreContextBadgeStyle(teamAContext).color,
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>{getScoreContextGuidance(teamAContext)}</span>
                    <span style={{ 
                      textTransform: "uppercase", 
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: getScoreContextBadgeStyle(teamAContext).border,
                      color: "#fff"
                    }}>
                      {teamAContext.replace("_", " ")}
                    </span>
                  </div>
                  {bestFirstRecs.map((rec) => (
                    <div
                      key={rec.player.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <strong>{rec.player.name}</strong> (SL {rec.player.skill_level}) ·
                          Value {rec.value.toFixed(3)}
                        </div>
                        <div
                          style={{
                            background: badgeColor(rec.confidence),
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {rec.confidence || "n/a"}
                        </div>
                      </div>

                      {rec.explanation?.summary && <p>{rec.explanation.summary}</p>}
                      {rec.explanation?.legality && (
                        <p>
                          <strong>Legality:</strong> {rec.explanation.legality}
                        </p>
                      )}
                      {rec.explanation?.future_flexibility && (
                        <p>
                          <strong>Future:</strong> {rec.explanation.future_flexibility}
                        </p>
                      )}
                      {rec.explanation?.strategy && (
                        <p>
                          <strong>Strategy:</strong> {rec.explanation.strategy}
                        </p>
                      )}
                      
                      {/* Score-aware reasoning */}
                      <p style={{ 
                        marginTop: 8, 
                        paddingTop: 8, 
                        borderTop: "1px solid #e5e7eb",
                        fontSize: 12, 
                        fontStyle: "italic",
                        color: getScoreContextBadgeStyle(teamAContext).color
                      }}>
                        💡 {getScoreContextReasoning(teamAContext, "first")}
                      </p>

                      <button onClick={() => setSelectedOurPlayerId(rec.player.id)}>
                        Use This Player
                      </button>
                    </div>
                  ))}
                </section>
              )}

              {declarationStep === "response" && bestResponseRecs.length > 0 && (
                <section
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                  }}
                >
                  <h3>Recommended Response — {respondingTeamName}</h3>
                  <div style={{ 
                    marginBottom: 12, 
                    padding: "8px 12px", 
                    borderRadius: 6,
                    background: getScoreContextBadgeStyle(teamAContext).bg,
                    border: `1px solid ${getScoreContextBadgeStyle(teamAContext).border}`,
                    color: getScoreContextBadgeStyle(teamAContext).color,
                    fontSize: 13,
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span>{getScoreContextGuidance(teamAContext)}</span>
                    <span style={{ 
                      textTransform: "uppercase", 
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: getScoreContextBadgeStyle(teamAContext).border,
                      color: "#fff"
                    }}>
                      {teamAContext.replace("_", " ")}
                    </span>
                  </div>
                  {bestResponseRecs.map((rec) => (
                    <div
                      key={rec.player.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <strong>{rec.player.name}</strong> (SL {rec.player.skill_level}) ·
                          Value {rec.value.toFixed(3)}
                        </div>
                        <div
                          style={{
                            background: badgeColor(rec.confidence),
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {rec.confidence || "n/a"}
                        </div>
                      </div>

                      {rec.explanation?.summary && <p>{rec.explanation.summary}</p>}
                      {rec.explanation?.legality && (
                        <p>
                          <strong>Legality:</strong> {rec.explanation.legality}
                        </p>
                      )}
                      {rec.explanation?.future_flexibility && (
                        <p>
                          <strong>Future:</strong> {rec.explanation.future_flexibility}
                        </p>
                      )}
                      {rec.explanation?.strategy && (
                        <p>
                          <strong>Strategy:</strong> {rec.explanation.strategy}
                        </p>
                      )}
                      
                      {/* Score-aware reasoning */}
                      <p style={{ 
                        marginTop: 8, 
                        paddingTop: 8, 
                        borderTop: "1px solid #e5e7eb",
                        fontSize: 12, 
                        fontStyle: "italic",
                        color: getScoreContextBadgeStyle(teamAContext).color
                      }}>
                        💡 {getScoreContextReasoning(teamAContext, "response")}
                      </p>

                      <button onClick={() => setSelectedOurPlayerId(rec.player.id)}>
                        Use This Player
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}

          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3>Matchup History</h3>
            {!matchState?.locked_matchups?.length ? (
              <p>No completed rounds yet.</p>
            ) : (
              matchState.locked_matchups.map((m) => {
                const ourP = liveOurTeam ? findPlayer(liveOurTeam, m.our_player_id) : undefined;
                const oppP = liveOppTeam ? findPlayer(liveOppTeam, m.opp_player_id) : undefined;

                return (
                  <div
                    key={`${m.round_index}-${m.our_player_id}-${m.opp_player_id}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <strong>Round {m.round_index}:</strong> {ourP?.name || m.our_player_id} vs{" "}
                    {oppP?.name || m.opp_player_id}
                  </div>
                );
              })
            )}
          </section>
        </>
      )}
    </div>
  );
}