import React from "react";
import { Team } from "../types";

interface TeamListProps {
  teams: Team[];
  onEdit: (team: Team) => void;
  onDelete: (teamId: string) => void;
  onUseInMatch: (team: Team) => void;
}

export const TeamList: React.FC<TeamListProps> = ({
  teams,
  onEdit,
  onDelete,
  onUseInMatch,
}) => {
  if (teams.length === 0) {
    return (
      <div style={styles.empty}>
        <p>No teams saved yet.</p>
        <p>Create your first team to get started!</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Saved Teams</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Team Name</th>
            <th style={styles.th}>Players</th>
            <th style={styles.th}>Avg SL</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => {
            const avgSL = team.players.reduce((sum, p) => sum + p.skill_level, 0) / team.players.length;
            return (
              <tr key={team.id} style={styles.row}>
                <td style={styles.td}>
                  <strong>{team.name}</strong>
                  <br />
                  <span style={styles.teamId}>{team.id}</span>
                </td>
                <td style={styles.td}>{team.players.length}</td>
                <td style={styles.td}>{avgSL.toFixed(1)}</td>
                <td style={styles.td}>
                  <button
                    style={styles.editBtn}
                    onClick={() => onEdit(team)}
                  >
                    Edit
                  </button>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => onDelete(team.id)}
                  >
                    Delete
                  </button>
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
    padding: "15px",
    backgroundColor: "#fafafa",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  title: {
    margin: "0 0 15px 0",
    color: "#333",
  },
  empty: {
    padding: "30px",
    textAlign: "center" as const,
    backgroundColor: "#fafafa",
    borderRadius: "8px",
    color: "#666",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "14px",
  },
  th: {
    textAlign: "left" as const,
    padding: "10px",
    borderBottom: "2px solid #ddd",
    backgroundColor: "#f5f5f5",
  },
  td: {
    padding: "10px",
    borderBottom: "1px solid #eee",
  },
  row: {
    backgroundColor: "white",
  },
  teamId: {
    fontSize: "12px",
    color: "#999",
  },
  editBtn: {
    padding: "6px 12px",
    marginRight: "5px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  deleteBtn: {
    padding: "6px 12px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
};
