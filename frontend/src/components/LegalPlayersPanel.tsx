import React from "react";
import { Player } from "../types";

interface LegalPlayersPanelProps {
  ourPlayers: Player[];
  oppPlayers: Player[];
}

export const LegalPlayersPanel: React.FC<LegalPlayersPanelProps> = ({
  ourPlayers,
  oppPlayers,
}) => {
  const renderPlayerList = (players: Player[], label: string) => (
    <div style={styles.listContainer}>
      <h4 style={styles.listTitle}>{label}</h4>
      {players.length === 0 ? (
        <p style={styles.noData}>No legal players</p>
      ) : (
        <ul style={styles.list}>
          {players.map((p) => (
            <li key={p.id} style={styles.listItem}>
              <span style={styles.playerName}>
                {p.name} (SL{p.skill_level})
              </span>
              {p.recent_win_rate && (
                <span style={styles.winRate}>
                  {" "}
                  {(p.recent_win_rate * 100).toFixed(0)}%
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Legal Players</h3>
      <div style={styles.listsRow}>
        {renderPlayerList(ourPlayers, "Our Team")}
        {renderPlayerList(oppPlayers, "Opponent")}
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
  listsRow: {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap" as const,
  },
  listContainer: {
    flex: 1,
    minWidth: "200px",
  },
  listTitle: {
    margin: "0 0 8px 0",
    color: "#555",
    fontSize: "14px",
  },
  list: {
    margin: 0,
    padding: "0 0 0 20px",
    listStyle: "none",
  },
  listItem: {
    padding: "4px 0",
    fontSize: "14px",
  },
  playerName: {
    fontWeight: "500" as const,
  },
  winRate: {
    color: "#666",
    fontSize: "12px",
  },
  noData: {
    color: "#999",
    fontStyle: "italic" as const,
    fontSize: "14px",
  },
};
