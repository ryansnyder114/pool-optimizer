import React from "react";
import { Player } from "../types";

interface OpponentPickPanelProps {
  availableOpponents: Player[];
  selectedOpponentId: string | null;
  onSelectOpponent: (playerId: string) => void;
  onRecommend: () => void;
  isLoading: boolean;
}

export const OpponentPickPanel: React.FC<OpponentPickPanelProps> = ({
  availableOpponents,
  selectedOpponentId,
  onSelectOpponent,
  onRecommend,
  isLoading,
}) => {
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Opponent Pick</h3>
      <div style={styles.content}>
        <p style={styles.label}>Select opponent player:</p>
        <select
          style={styles.select}
          value={selectedOpponentId || ""}
          onChange={(e) => onSelectOpponent(e.target.value)}
        >
          <option value="">-- Select opponent --</option>
          {availableOpponents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (SL{p.skill_level})
            </option>
          ))}
        </select>
        <button
          style={{
            ...styles.button,
            opacity: selectedOpponentId && !isLoading ? 1 : 0.5,
          }}
          onClick={onRecommend}
          disabled={!selectedOpponentId || isLoading}
        >
          {isLoading ? "Loading..." : "Recommend Best Response"}
        </button>
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
  content: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
  },
  label: {
    margin: 0,
    fontSize: "14px",
    color: "#555",
  },
  select: {
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "white",
  },
  button: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "bold" as const,
    color: "white",
    backgroundColor: "#007bff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
};
