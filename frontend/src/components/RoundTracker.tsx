import React from "react";
import { MatchState, Player } from "../types";

interface RoundTrackerProps {
  matchState: MatchState;
}

export const RoundTracker: React.FC<RoundTrackerProps> = ({ matchState }) => {
  const currentRound = matchState.round_index;
  const totalRounds = 5;

  const getUsedPlayers = (ids: string[], players: Player[]): string[] => {
    return ids
      .map((id) => players.find((p) => p.id === id)?.name)
      .filter(Boolean) as string[];
  };

  const ourUsed = getUsedPlayers(
    matchState.our_used_player_ids,
    matchState.our_team.players
  );
  const oppUsed = getUsedPlayers(
    matchState.opp_used_player_ids,
    matchState.opp_team.players
  );

  const ourRemaining = matchState.our_team.players
    .filter((p) => !matchState.our_used_player_ids.includes(p.id))
    .map((p) => p.name);

  const oppRemaining = matchState.opp_team.players
    .filter((p) => !matchState.opp_used_player_ids.includes(p.id))
    .map((p) => p.name);

  const currentDeclarer =
    matchState.first_declarer_by_round[currentRound - 1] || "us";

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Round Tracker</h3>
      
      <div style={styles.roundInfo}>
        <div style={styles.roundBadge}>
          Round {currentRound} of {totalRounds}
        </div>
        <div style={styles.declarer}>
          Current declarer: <strong>{currentDeclarer === "us" ? "We declare first" : "Opponent declares first"}</strong>
        </div>
      </div>

      <div style={styles.scoreRow}>
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>Our Points</span>
          <span style={styles.scoreValue}>{matchState.our_points.toFixed(1)}</span>
        </div>
        <div style={styles.scoreBox}>
          <span style={styles.scoreLabel}>Opponent</span>
          <span style={styles.scoreValue}>{matchState.opp_points.toFixed(1)}</span>
        </div>
      </div>

      <div style={styles.playersGrid}>
        <div style={styles.playerColumn}>
          <h4 style={styles.columnTitle}>Our Used</h4>
          {ourUsed.length === 0 ? (
            <p style={styles.empty}>None yet</p>
          ) : (
            <ul style={styles.playerList}>
              {ourUsed.map((name, i) => (
                <li key={i} style={styles.playerItem}>
                  {name}
                </li>
              ))}
            </ul>
          )}
          <h4 style={{ ...styles.columnTitle, marginTop: "10px" }}>Our Remaining</h4>
          {ourRemaining.length === 0 ? (
            <p style={styles.empty}>None</p>
          ) : (
            <ul style={styles.playerList}>
              {ourRemaining.map((name, i) => (
                <li key={i} style={styles.playerItem}>
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={styles.playerColumn}>
          <h4 style={styles.columnTitle}>Opponent Used</h4>
          {oppUsed.length === 0 ? (
            <p style={styles.empty}>None yet</p>
          ) : (
            <ul style={styles.playerList}>
              {oppUsed.map((name, i) => (
                <li key={i} style={styles.playerItem}>
                  {name}
                </li>
              ))}
            </ul>
          )}
          <h4 style={{ ...styles.columnTitle, marginTop: "10px" }}>Opponent Remaining</h4>
          {oppRemaining.length === 0 ? (
            <p style={styles.empty}>None</p>
          ) : (
            <ul style={styles.playerList}>
              {oppRemaining.map((name, i) => (
                <li key={i} style={styles.playerItem}>
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>
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
  roundInfo: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginBottom: "15px",
  },
  roundBadge: {
    padding: "8px 16px",
    backgroundColor: "#007bff",
    color: "white",
    borderRadius: "20px",
    fontWeight: "bold" as const,
    fontSize: "14px",
  },
  declarer: {
    fontSize: "14px",
    color: "#555",
  },
  scoreRow: {
    display: "flex",
    gap: "20px",
    marginBottom: "15px",
  },
  scoreBox: {
    flex: 1,
    padding: "10px",
    backgroundColor: "white",
    borderRadius: "4px",
    textAlign: "center" as const,
    border: "1px solid #ddd",
  },
  scoreLabel: {
    display: "block",
    fontSize: "12px",
    color: "#666",
    marginBottom: "4px",
  },
  scoreValue: {
    display: "block",
    fontSize: "24px",
    fontWeight: "bold" as const,
    color: "#333",
  },
  playersGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  playerColumn: {
    padding: "10px",
    backgroundColor: "white",
    borderRadius: "4px",
    border: "1px solid #eee",
  },
  columnTitle: {
    margin: "0 0 8px 0",
    fontSize: "14px",
    color: "#555",
  },
  playerList: {
    margin: 0,
    padding: "0 0 0 20px",
    listStyle: "disc",
  },
  playerItem: {
    fontSize: "13px",
    padding: "2px 0",
  },
  empty: {
    margin: 0,
    fontSize: "13px",
    color: "#999",
    fontStyle: "italic" as const,
  },
};
