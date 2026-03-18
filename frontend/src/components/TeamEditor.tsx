import React from "react";

interface Player {
  id: string;
  name: string;
  skill_level: number;
  recent_win_rate?: number;
  notes?: string;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
}

interface TeamEditorProps {
  team?: Team | null;
  onSave: (team: Team) => void;
  onCancel: () => void;
}

export const TeamEditor: React.FC<TeamEditorProps> = ({ team, onSave, onCancel }) => {
  const [teamName, setTeamName] = React.useState(team?.name || "");
  const [teamId, setTeamId] = React.useState(team?.id || "");
  const [players, setPlayers] = React.useState<Player[]>(team?.players || []);
  const [error, setError] = React.useState<string | null>(null);

  const addPlayer = () => {
    const newPlayer: Player = {
      id: `p${Date.now()}`,
      name: "",
      skill_level: 3,
      recent_win_rate: 0.5,
    };
    setPlayers([...players, newPlayer]);
  };

  const removePlayer = (index: number) => {
    setPlayers(players.filter((_, i) => i !== index));
  };

  const updatePlayer = (index: number, field: keyof Player, value: any) => {
    const updated = [...players];
    updated[index] = { ...updated[index], [field]: value };
    setPlayers(updated);
  };

  const handleSave = () => {
    setError(null);
    
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }
    if (!teamId.trim()) {
      setError("Team ID is required");
      return;
    }
    if (players.length < 5) {
      setError("At least 5 players are required");
      return;
    }
    
    for (let i = 0; i < players.length; i++) {
      if (!players[i].name.trim()) {
        setError(`Player ${i + 1} needs a name`);
        return;
      }
    }
    
    onSave({
      id: teamId.trim(),
      name: teamName.trim(),
      players: players.filter(p => p.name.trim()),
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{team ? "Edit Team" : "Create New Team"}</h2>
      
      {error && <div style={styles.error}>{error}</div>}
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Team ID (unique, no spaces):</label>
        <input
          style={styles.input}
          value={teamId}
          onChange={(e) => setTeamId(e.target.value.replace(/\s+/g, '-').toLowerCase())}
          placeholder="my-team-1"
          disabled={!!team}
        />
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Team Name:</label>
        <input
          style={styles.input}
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Cue Ballers"
        />
      </div>
      
      <h3 style={styles.subtitle}>Players ({players.length})</h3>
      
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>#</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Skill Level</th>
            <th style={styles.th}>Win Rate</th>
            <th style={styles.th}></th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={index} style={styles.row}>
              <td style={styles.td}>{index + 1}</td>
              <td style={styles.td}>
                <input
                  style={styles.playerInput}
                  value={player.name}
                  onChange={(e) => updatePlayer(index, "name", e.target.value)}
                  placeholder="Player name"
                />
              </td>
              <td style={styles.td}>
                <select
                  style={styles.select}
                  value={player.skill_level}
                  onChange={(e) => updatePlayer(index, "skill_level", parseInt(e.target.value))}
                >
                  {[1,2,3,4,5,6,7].map(sl => (
                    <option key={sl} value={sl}>{sl}</option>
                  ))}
                </select>
              </td>
              <td style={styles.td}>
                <input
                  style={styles.winInput}
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={player.recent_win_rate || 0.5}
                  onChange={(e) => updatePlayer(index, "recent_win_rate", parseFloat(e.target.value))}
                />
              </td>
              <td style={styles.td}>
                <button style={styles.removeBtn} onClick={() => removePlayer(index)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button style={styles.addBtn} onClick={addPlayer}>+ Add Player</button>
      
      <div style={styles.actions}>
        <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button style={styles.saveBtn} onClick={handleSave}>Save Team</button>
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
  subtitle: {
    margin: "20px 0 10px 0",
    color: "#555",
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
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #ccc",
    borderRadius: "4px",
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
  playerInput: {
    width: "100%",
    padding: "6px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  select: {
    padding: "6px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  winInput: {
    width: "60px",
    padding: "6px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  removeBtn: {
    padding: "4px 8px",
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  },
  addBtn: {
    marginTop: "10px",
    padding: "8px 16px",
    backgroundColor: "#28a745",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
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
  saveBtn: {
    padding: "10px 20px",
    backgroundColor: "#007bff",
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
