import React from "react";
import { Team } from "../types";

interface MatchCreatorProps {
  teams: Team[];
  onCreateMatch: (ourTeamId: string, oppTeamId: string, declarerOrder: string[]) => void;
  onCancel: () => void;
}

export const MatchCreator: React.FC<MatchCreatorProps> = ({
  teams,
  onCreateMatch,
  onCancel,
}) => {
  const [ourTeamId, setOurTeamId] = React.useState("");
  const [oppTeamId, setOppTeamId] = React.useState("");
  const [declarerPattern, setDeclarerPattern] = React.useState("us,opp,us,opp,us");
  const [error, setError] = React.useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    
    if (!ourTeamId) {
      setError("Please select your team");
      return;
    }
    if (!oppTeamId) {
      setError("Please select opponent team");
      return;
    }
    if (ourTeamId === oppTeamId) {
      setError("Teams must be different");
      return;
    }
    
    const declarerOrder = declarerPattern.split(",").map(d => d.trim().toLowerCase());
    const valid = ["us", "opp"];
    if (declarerOrder.length !== 5 || !declarerOrder.every(d => valid.includes(d))) {
      setError("Declaration order must be 5 values: us,opp,us,opp,us");
      return;
    }
    
    onCreateMatch(ourTeamId, oppTeamId, declarerOrder);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Start New Matchup</h2>
      
      {error && <div style={styles.error}>{error}</div>}
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Our Team:</label>
        <select
          style={styles.select}
          value={ourTeamId}
          onChange={(e) => setOurTeamId(e.target.value)}
        >
          <option value="">-- Select our team --</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({team.players.length} players)
            </option>
          ))}
        </select>
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Opponent Team:</label>
        <select
          style={styles.select}
          value={oppTeamId}
          onChange={(e) => setOppTeamId(e.target.value)}
        >
          <option value="">-- Select opponent team --</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name} ({team.players.length} players)
            </option>
          ))}
        </select>
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Declaration Order (who declares first each round):</label>
        <select
          style={styles.select}
          value={declarerPattern}
          onChange={(e) => setDeclarerPattern(e.target.value)}
        >
          <option value="us,opp,us,opp,us">We declare first (us, opp, us, opp, us)</option>
          <option value="opp,us,opp,us,opp">Opponent declares first (opp, us, opp, us, opp)</option>
          <option value="us,us,us,opp,opp">We declare first 3 rounds</option>
        </select>
        <p style={styles.hint}>
          Format: 5 values separated by commas (us or opp)
        </p>
      </div>
      
      <div style={styles.actions}>
        <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button style={styles.createBtn} onClick={handleCreate}>Start Match</button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: "20px",
    backgroundColor: "#fafafa",
    borderRadius: "8px",
    marginBottom: "20px",
  },
  title: {
    margin: "0 0 20px 0",
    color: "#333",
  },
  formGroup: {
    marginBottom: "15px",
  },
  label: {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold" as const,
    color: "#555",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    backgroundColor: "white",
  },
  hint: {
    margin: "5px 0 0 0",
    fontSize: "12px",
    color: "#666",
  },
  actions: {
    marginTop: "20px",
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    padding: "10px 20px",
    backgroundColor: "#6c757d",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  createBtn: {
    padding: "10px 20px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: "bold" as const,
  },
  error: {
    padding: "10px",
    backgroundColor: "#f8d7da",
    color: "#721c24",
    borderRadius: "4px",
    marginBottom: "15px",
  },
};
