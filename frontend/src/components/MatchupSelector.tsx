import React from "react";
import { Player } from "../types";

interface MatchupSelectorProps {
  ourPlayer: Player | null;
  oppPlayer: Player | null;
  ourOptions: Player[];
  oppOptions: Player[];
  onOurSelect: (player: Player) => void;
  onOppSelect: (player: Player) => void;
  onLock: () => void;
  canLock: boolean;
  isLoading: boolean;
  currentDeclarer: "us" | "opp";
}

export const MatchupSelector: React.FC<MatchupSelectorProps> = ({
  ourPlayer,
  oppPlayer,
  ourOptions,
  oppOptions,
  onOurSelect,
  onOppSelect,
  onLock,
  canLock,
  isLoading,
  currentDeclarer,
}) => {
  const isMatchComplete = ourPlayer && oppPlayer;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Lock Matchup</h3>
      
      <div style={styles.selectorsRow}>
        <div style={styles.selectCol}>
          <label style={styles.label}>Our Player:</label>
          <select
            style={styles.select}
            value={ourPlayer?.id || ""}
            onChange={(e) => {
              const player = ourOptions.find((p) => p.id === e.target.value);
              if (player) onOurSelect(player);
            }}
          >
            <option value="">-- Select our player --</option>
            {ourOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (SL{p.skill_level})
              </option>
            ))}
          </select>
          {ourPlayer && (
            <div style={styles.selectedPlayer}>
              {ourPlayer.name} - SL{ourPlayer.skill_level}
            </div>
          )}
        </div>

        <div style={styles.selectCol}>
          <label style={styles.label}>Opponent Player:</label>
          <select
            style={styles.select}
            value={oppPlayer?.id || ""}
            onChange={(e) => {
              const player = oppOptions.find((p) => p.id === e.target.value);
              if (player) onOppSelect(player);
            }}
          >
            <option value="">-- Select opponent --</option>
            {oppOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (SL{p.skill_level})
              </option>
            ))}
          </select>
          {oppPlayer && (
            <div style={styles.selectedPlayer}>
              {oppPlayer.name} - SL{oppPlayer.skill_level}
            </div>
          )}
        </div>
      </div>

      {currentDeclarer === "us" && !ourPlayer && (
        <p style={styles.hint}>Select our player first, then opponent responds</p>
      )}
      {currentDeclarer === "opp" && !oppPlayer && (
        <p style={styles.hint}>Opponent declared first - select their player</p>
      )}

      <button
        style={{
          ...styles.lockButton,
          opacity: canLock && !isLoading ? 1 : 0.5,
        }}
        onClick={onLock}
        disabled={!canLock || isLoading}
      >
        {isLoading ? "Locking..." : "Lock Matchup"}
      </button>
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
    margin: "0 0 15px 0",
    color: "#333",
  },
  selectorsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "15px",
  },
  selectCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "5px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "bold" as const,
    color: "#555",
  },
  select: {
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "white",
  },
  selectedPlayer: {
    padding: "8px",
    backgroundColor: "#d4edda",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "bold" as const,
    color: "#155724",
  },
  hint: {
    margin: "0 0 15px 0",
    fontSize: "13px",
    color: "#666",
    fontStyle: "italic" as const,
  },
  lockButton: {
    width: "100%",
    padding: "12px 20px",
    fontSize: "16px",
    fontWeight: "bold" as const,
    color: "white",
    backgroundColor: "#28a745",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
};
