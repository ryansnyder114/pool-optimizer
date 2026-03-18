export interface Player {
  id: string;
  name: string;
  skill_level: number;
  recent_win_rate?: number;
  vs_skill_band?: Record<string, number>;
  notes?: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
}

export interface DeclaredMatchup {
  round_index: number;
  our_player_id: string;
  opp_player_id: string;
}

export type MatchFormat = "apa_open_8ball";
export type Declarer = "us" | "opp";

export interface MatchState {
  format: MatchFormat;
  round_index: number;
  our_team: Team;
  opp_team: Team;
  our_used_player_ids: string[];
  opp_used_player_ids: string[];
  our_points: number;
  opp_points: number;
  first_declarer_by_round: Declarer[];
  locked_matchups: DeclaredMatchup[];
}

export interface Recommendation {
  player: Player;
  value: number;
}

export interface BestFirstResponse {
  recommendations: Recommendation[];
}

export interface BestResponseResponse {
  recommendations: Recommendation[];
}

export interface LegalPlayersResponse {
  our_legal_players: Player[];
  opp_legal_players: Player[];
}
