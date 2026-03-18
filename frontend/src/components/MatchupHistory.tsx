import React from "react";
import { MatchState, DeclaredMatchup } from "../types";

interface MatchupHistoryProps {
  matchState: MatchState;
}

export const MatchupHistory: React.FC<MatchupHistoryProps> = ({ matchState }) => {
  const { locked_matchups, our_team, opp_team, our_points, opp_points } = matchState;

  const getPlayerName = (playerId: string, team: "our" | "opp"): string => {
    const players = team === "our" ? our_team.players : opp_team.players;
    const player = players.find((p) => p.id === playerId);
    return player?.name || playerId;
  };

  if (locked_matchups.length === 0) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>Matchup History</h3>
        <p style={styles.empty}>No rounds completed yet</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Matchup History</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Round</th>
            <th style={styles.th}>Our Player</th>
            <th style={styles.th}>Opp Player</th>
          </tr>
        </thead>
        <tbody>
          {locked_matchups.map((matchup: DeclaredMatchup, index: number) => (
            <tr key={index} style={styles.row}>
              <td style={styles.td}>{matchup.round_index}</td>
              <td style={styles.td}>
                {getPlayerName(matchup.our_player_id, "our")}
              </td>
              <td style={styles.td}>
                {getPlayerName(matchup.opp_player_id, "opp")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={styles.scoreSummary}>
        <span style={styles.scoreLabel}>Score: </span>
        <span style={styles.ourScore}>Us: {our_points.toFixed(1)}</span>
        <span style={styles.oppScore}> | Them: {opp_points.toFixed(1)}</span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: "20px",
    padding: "15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fafafa",
  },
  title: {
    margin: "0 0 10px 0",
    color: "#333",
  },
  empty: {
    color: "#666",
    fontStyle: "italic" as const,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "14px",
  },
  th: {
    textAlign: "left" as const,
    padding: "8px",
    borderBottom: "2px solid #ddd",
    backgroundColor: "#f5f5f5",
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #eee",
  },
  row: {
    backgroundColor: "white",
  },
  scoreSummary: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "white",
    borderRadius: "4px",
    textAlign: "center" as const,
  },
  scoreLabel: {
    fontWeight: "bold" as const,
    color: "#333",
  },
  ourScore: {
    color: "#28a745",
    fontWeight: "bold" as const,
  },
  oppScore: {
    color: "#dc3545",
    fontWeight: "bold" as const,
  },
};
