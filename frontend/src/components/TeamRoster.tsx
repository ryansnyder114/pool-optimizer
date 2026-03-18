import React from "react";
import { Player, Team } from "../types";

interface TeamRosterProps {
  team: Team;
  teamName: string;
  usedPlayerIds: string[];
  legalPlayerIds?: string[];
  highlightIds?: string[];
}

export const TeamRoster: React.FC<TeamRosterProps> = ({
  team,
  teamName,
  usedPlayerIds,
  legalPlayerIds,
  highlightIds = [],
}) => {
  const usedSet = new Set(usedPlayerIds);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>{teamName}</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>SL</th>
            <th style={styles.th}>Win%</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {team.players.map((player) => {
            const isUsed = usedSet.has(player.id);
            const isLegal = legalPlayerIds?.includes(player.id);
            const isHighlighted = highlightIds.includes(player.id);

            return (
              <tr
                key={player.id}
                style={{
                  ...styles.row,
                  backgroundColor: isHighlighted
                    ? "#d4edda"
                    : isUsed
                    ? "#f8d7da"
                    : "white",
                }}
              >
                <td style={styles.td}>
                  {player.name}
                  {isHighlighted && " ★"}
                </td>
                <td style={styles.td}>{player.skill_level}</td>
                <td style={styles.td}>
                  {player.recent_win_rate
                    ? `${(player.recent_win_rate * 100).toFixed(0)}%`
                    : "-"}
                </td>
                <td style={styles.td}>
                  {isUsed ? (
                    <span style={styles.used}>Used</span>
                  ) : isLegal ? (
                    <span style={styles.legal}>Legal</span>
                  ) : (
                    <span style={styles.unavailable}>Unavailable</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
    transition: "background-color 0.2s",
  },
  used: {
    color: "#dc3545",
    fontWeight: "bold" as const,
  },
  legal: {
    color: "#28a745",
    fontWeight: "bold" as const,
  },
  unavailable: {
    color: "#6c757d",
  },
};
