import React, { useEffect, useMemo, useState } from "react";
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  createMatch,
  getSampleMatch,
  getLegalPlayers,
  getBestFirstDeclaration,
  getBestResponse,
  applyMatchup,
  getLineupStatus,
  type Lineup,
} from "../api";

type Player = {
  id: string;
  name: string;
  skill_level: number;
  recent_win_rate?: number | null;
  notes?: string | null;
};

type Team = {
  id: string;
  name: string;
  players: Player[];
};

type DeclaredMatchup = {
  round_index: number;
  our_player_id: string;
  opp_player_id: string;
};

type MatchState = {
  format: string;
  round_index: number;
  our_team: Team;
  opp_team: Team;
  our_used_player_ids: string[];
  opp_used_player_ids: string[];
  our_points: number;
  opp_points: number;
  first_declarer_by_round: ("us" | "opp")[];
  locked_matchups: DeclaredMatchup[];
};

type Recommendation = {
  player: Player;
  value: number;
  confidence?: "high" | "medium" | "low";
  explanation?: {
    summary?: string;
    legality?: string;
    future_flexibility?: string;
    strategy?: string;
  };
};

function emptyPlayer(): Player {
  return {
    id: "",
    name: "",
    skill_level: 3,
    recent_win_rate: 0.5,
    notes: "",
  };
}

function emptyTeam(): Team {
  return {
    id: "",
    name: "",
    players: [emptyPlayer()],
  };
}

function badgeColor(confidence?: string): string {
  if (confidence === "high") return "#d1fae5";
  if (confidence === "medium") return "#fef3c7";
  if (confidence === "low") return "#fee2e2";
  return "#e5e7eb";
}

function findPlayer(team: Team | undefined, playerId: string): Player | undefined {
  return team?.players.find((p) => p.id === playerId);
}

export default function Dashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamError, setTeamError] = useState("");

  const [editingTeam, setEditingTeam] = useState<Team>(emptyTeam());
  const [isEditingExisting, setIsEditingExisting] = useState(false);

  const [ourTeamId, setOurTeamId] = useState("");
  const [oppTeamId, setOppTeamId] = useState("");
  const [firstDeclaPattern, setFirstDeclaPattern] = useState<("us" | "opp")[]>([
    "us",
    "opp",
    "us",
    "opp",
    "us",
  ]);

  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [ourLegalPlayers, setOurLegalPlayers] = useState<Player[]>([]);
  const [oppLegalPlayers, setOppLegalPlayers] = useState<Player[]>([]);

  const [bestFirstRecs, setBestFirstRecs] = useState<Recommendation[]>([]);
  const [bestResponseRecs, setBestResponseRecs] = useState<Recommendation[]>([]);

  const [ourLineupStatus, setOurLineupStatus] = useState<{
    active_lineups: Lineup[];
    eliminated_lineups: Lineup[];
  } | null>(null);
  const [oppLineupStatus, setOppLineupStatus] = useState<{
    active_lineups: Lineup[];
    eliminated_lineups: Lineup[];
  } | null>(null);

  const [selectedOurPlayerId, setSelectedOurPlayerId] = useState("");
  const [selectedOppPlayerId, setSelectedOppPlayerId] = useState("");

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");

  const matchComplete = !!matchState && matchState.round_index > 5;

  const currentFirstDeclarer = useMemo(() => {
    if (!matchState) return null;
    return matchState.first_declarer_by_round[matchState.round_index - 1] ?? null;
  }, [matchState]);

  async function loadTeams() {
    setLoadingTeams(true);
    setTeamError("");
    try {
      const data = await getTeams();
      setTeams(data.teams ?? data);
    } catch (err: any) {
      setTeamError(err?.message || "Failed to load teams");
    } finally {
      setLoadingTeams(false);
    }
  }

  useEffect(() => {
    loadTeams();
  }, []);

  async function refreshLegalPlayers(nextState: MatchState) {
    const res = await getLegalPlayers(nextState);
    setOurLegalPlayers(res.our_legal_players || []);
    setOppLegalPlayers(res.opp_legal_players || []);
  }

  async function refreshLineupStatuses(nextState: MatchState) {
    const ourRes = await getLineupStatus(nextState.our_team, nextState.our_used_player_ids);
    const oppRes = await getLineupStatus(nextState.opp_team, nextState.opp_used_player_ids);
    setOurLineupStatus(ourRes);
    setOppLineupStatus(oppRes);
  }

  async function handleLoadSample() {
    setBusy(true);
    setStatus("Loading sample match...");
    try {
      const state = await getSampleMatch();
      setMatchState(state);
      setBestFirstRecs([]);
      setBestResponseRecs([]);
      setSelectedOurPlayerId("");
      setSelectedOppPlayerId("");
      await refreshLegalPlayers(state);
      await refreshLineupStatuses(state);
      setStatus("Sample match loaded.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to load sample match.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTeam() {
    if (!editingTeam.name.trim()) {
      setStatus("Team name is required.");
      return;
    }

    const cleanedPlayers = editingTeam.players.filter(
      (p) => p.id.trim() && p.name.trim()
    );

    if (cleanedPlayers.length < 5) {
      setStatus("Team must have at least 5 valid players.");
      return;
    }

    const payload: Team = {
      ...editingTeam,
      id: editingTeam.id.trim() || `team_${Date.now()}`,
      players: cleanedPlayers,
    };

    setBusy(true);
    setStatus(isEditingExisting ? "Updating team..." : "Creating team...");
    console.log("Saving team payload:", payload);

    try {
      if (isEditingExisting) {
        await updateTeam(payload.id, payload);
      } else {
        await createTeam(payload);
      }
      setEditingTeam(emptyTeam());
      setIsEditingExisting(false);
      await loadTeams();
      setStatus("Team saved.");
    } catch (err: any) {
      const msg = err?.message || "Failed to save team.";
      console.error("Save team failed:", err);
      setStatus(msg);
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleEditTeam(team: Team) {
    const clone = JSON.parse(JSON.stringify(team));
    setEditingTeam(clone);
    setIsEditingExisting(true);
    setStatus(`Editing ${team.name}`);
  }

  async function handleDeleteTeam(teamId: string) {
    if (!window.confirm("Delete this team?")) return;
    setBusy(true);
    setStatus("Deleting team...");
    try {
      await deleteTeam(teamId);
      if (editingTeam.id === teamId) {
        setEditingTeam(emptyTeam());
        setIsEditingExisting(false);
      }
      await loadTeams();
      setStatus("Team deleted.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to delete team.");
    } finally {
      setBusy(false);
    }
  }

  function updateEditingPlayer(index: number, updates: Partial<Player>) {
    setEditingTeam((prev) => {
      const nextPlayers = [...prev.players];
      nextPlayers[index] = { ...nextPlayers[index], ...updates };
      return { ...prev, players: nextPlayers };
    });
  }

  function addEditingPlayer() {
    setEditingTeam((prev) => ({
      ...prev,
      players: [...prev.players, emptyPlayer()],
    }));
  }

  function removeEditingPlayer(index: number) {
    setEditingTeam((prev) => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== index),
    }));
  }

  function resetEditor() {
    setEditingTeam(emptyTeam());
    setIsEditingExisting(false);
    setStatus("Team editor reset.");
  }

  async function handleCreateMatch() {
    if (!ourTeamId || !oppTeamId) {
      setStatus("Select both teams.");
      return;
    }

    if (ourTeamId === oppTeamId) {
      setStatus("Choose two different teams.");
      return;
    }

    setBusy(true);
    setStatus("Creating match...");
    try {
      const res = await createMatch(ourTeamId, oppTeamId, firstDeclaPattern);
      const state = res.state ?? res;
      setMatchState(state);
      setBestFirstRecs([]);
      setBestResponseRecs([]);
      setSelectedOurPlayerId("");
      setSelectedOppPlayerId("");
      await refreshLegalPlayers(state);
      await refreshLineupStatuses(state);
      setStatus("Match created.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to create match.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBestFirst() {
    if (!matchState) return;

    setBusy(true);
    setStatus("Calculating best first declaration...");
    try {
      const res = await getBestFirstDeclaration(matchState);
      setBestFirstRecs(res.recommendations || []);
      setBestResponseRecs([]);
      setStatus("Best first declaration ready.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to get first declaration recommendations.");
    } finally {
      setBusy(false);
    }
  }

  async function handleBestResponse() {
    if (!matchState || !selectedOppPlayerId) {
      setStatus("Select opponent player first.");
      return;
    }

    setBusy(true);
    setStatus("Calculating best response...");
    try {
      const res = await getBestResponse(matchState, selectedOppPlayerId);
      setBestResponseRecs(res.recommendations || []);
      setBestFirstRecs([]);
      setStatus("Best response ready.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to get response recommendations.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLockMatchup() {
    if (!matchState || !selectedOurPlayerId || !selectedOppPlayerId) {
      setStatus("Choose both players before locking matchup.");
      return;
    }

    setBusy(true);
    setStatus("Applying matchup...");
    try {
      const res = await applyMatchup(
        matchState,
        selectedOurPlayerId,
        selectedOppPlayerId
      );
      const nextState = res.state ?? res;
      setMatchState(nextState);
      setSelectedOurPlayerId("");
      setSelectedOppPlayerId("");
      setBestFirstRecs([]);
      setBestResponseRecs([]);
      await refreshLegalPlayers(nextState);
      await refreshLineupStatuses(nextState);
      setStatus(nextState.round_index > 5 ? "Match complete." : "Matchup locked.");
    } catch (err: any) {
      setStatus(err?.message || "Failed to apply matchup.");
    } finally {
      setBusy(false);
    }
  }

  const ourLegalIds = new Set(ourLegalPlayers.map((p) => p.id));
  const oppLegalIds = new Set(oppLegalPlayers.map((p) => p.id));

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Arial, sans-serif",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <h1>APA Pool Matchup Optimizer</h1>

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#f3f4f6",
          borderRadius: 8,
        }}
      >
        <strong>Status:</strong> {busy ? "Working..." : status}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2>Saved Teams</h2>
          <button onClick={loadTeams} disabled={loadingTeams || busy}>
            Refresh Teams
          </button>
          {teamError && <p style={{ color: "red" }}>{teamError}</p>}

          <div style={{ marginTop: 12 }}>
            {teams.length === 0 ? (
              <p>No saved teams yet.</p>
            ) : (
              teams.map((team) => (
                <div
                  key={team.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong>{team.name}</strong>
                      <div style={{ fontSize: 13, color: "#555" }}>
                        ID: {team.id} · Players: {team.players.length}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleEditTeam(team)} disabled={busy}>
                        Edit
                      </button>
                      <button onClick={() => handleDeleteTeam(team.id)} disabled={busy}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2>{isEditingExisting ? "Edit Team" : "Create Team"}</h2>

          <label style={{ display: "block", marginBottom: 8 }}>
            Team ID
            <input
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={editingTeam.id}
              onChange={(e) =>
                setEditingTeam((prev) => ({ ...prev, id: e.target.value }))
              }
              placeholder="team_alpha"
            />
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            Team Name
            <input
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={editingTeam.name}
              onChange={(e) =>
                setEditingTeam((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Cue Ballers"
            />
          </label>

          <h3>Players</h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 120px 170px auto",
              gap: 8,
              fontWeight: 700,
              marginBottom: 8,
              fontSize: 14,
            }}
          >
            <div>Player ID</div>
            <div>Player Name</div>
            <div>Skill Level</div>
            <div>Recent Win Rate</div>
            <div>Action</div>
          </div>

          {editingTeam.players.map((player, index) => (
            <div
              key={index}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 120px 170px auto",
                  gap: 8,
                }}
              >
                <input
                  value={player.id}
                  onChange={(e) => updateEditingPlayer(index, { id: e.target.value })}
                  placeholder="8-digit Player ID"
                />
                <input
                  value={player.name}
                  onChange={(e) => updateEditingPlayer(index, { name: e.target.value })}
                  placeholder="Player Name"
                />
                <input
                  type="number"
                  min={2}
                  max={7}
                  value={player.skill_level}
                  onChange={(e) =>
                    updateEditingPlayer(index, {
                      skill_level: Number(e.target.value),
                    })
                  }
                  placeholder="Skill Level (2-7)"
                />
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.01}
                  value={player.recent_win_rate ?? 0.5}
                  onChange={(e) =>
                    updateEditingPlayer(index, {
                      recent_win_rate: Number(e.target.value),
                    })
                  }
                  placeholder="Recent Win Rate (0.00-1.00)"
                />
                <button
                  onClick={() => removeEditingPlayer(index)}
                  disabled={editingTeam.players.length <= 1}
                >
                  Remove
                </button>
              </div>

              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                Notes
              </div>
              <textarea
                style={{ width: "100%", marginTop: 8 }}
                value={player.notes ?? ""}
                onChange={(e) =>
                  updateEditingPlayer(index, { notes: e.target.value })
                }
                placeholder="Notes"
                rows={2}
              />
            </div>
          ))}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={addEditingPlayer} disabled={busy}>
              Add Player
            </button>
            <button onClick={handleSaveTeam} disabled={busy}>
              {isEditingExisting ? "Update Team" : "Save Team"}
            </button>
            <button onClick={resetEditor} disabled={busy}>
              Reset
            </button>
          </div>
        </section>
      </div>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <h2>Start Match</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.5fr auto auto",
            gap: 12,
            alignItems: "end",
          }}
        >
          <label>
            Our Team
            <select
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={ourTeamId}
              onChange={(e) => setOurTeamId(e.target.value)}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Opponent Team
            <select
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={oppTeamId}
              onChange={(e) => setOppTeamId(e.target.value)}
            >
              <option value="">Select team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Declaration Pattern
            <select
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
              value={firstDeclaPattern.join(",")}
              onChange={(e) =>
                setFirstDeclaPattern(e.target.value.split(",") as ("us" | "opp")[])
              }
            >
              <option value="us,opp,us,opp,us">Us first: 1,3,5</option>
              <option value="opp,us,opp,us,opp">Opponent first: 1,3,5</option>
            </select>
          </label>

          <button onClick={handleCreateMatch} disabled={busy}>
            Start Matchup
          </button>

          <button onClick={handleLoadSample} disabled={busy}>
            Load Sample
          </button>
        </div>
      </section>

      {matchState && (
        <>
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <h2>Live Match Dashboard</h2>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div>
                <strong>Round:</strong> {Math.min(matchState.round_index, 5)}
              </div>
              <div>
                <strong>Score:</strong> Us {matchState.our_points.toFixed(2)} -{" "}
                {matchState.opp_points.toFixed(2)} Opp
              </div>
              <div>
                <strong>Current Declaration:</strong>{" "}
                {currentFirstDeclarer === "us"
                  ? "We declare first"
                  : "Opponent declares first"}
              </div>
              <div>
                <strong>Status:</strong> {matchComplete ? "Match Complete" : "In Progress"}
              </div>
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginBottom: 24,
            }}
          >
            <section
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3>{matchState.our_team.name}</h3>
              {matchState.our_team.players.map((p) => {
                const used = matchState.our_used_player_ids.includes(p.id);
                const legal = ourLegalIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 10,
                      marginBottom: 8,
                      borderRadius: 8,
                      border:
                        selectedOurPlayerId === p.id
                          ? "2px solid #2563eb"
                          : "1px solid #ddd",
                      background: used ? "#f3f4f6" : legal ? "#ecfdf5" : "#fff7ed",
                      cursor: used ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (!used) setSelectedOurPlayerId(p.id);
                    }}
                  >
                    <strong>{p.name}</strong> (SL {p.skill_level}){" "}
                    {used ? "— Used" : legal ? "— Legal" : "— Unavailable"}
                    <div style={{ fontSize: 13, color: "#555" }}>
                      Win Rate: {((p.recent_win_rate ?? 0.5) * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </section>

            <section
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3>{matchState.opp_team.name}</h3>
              {matchState.opp_team.players.map((p) => {
                const used = matchState.opp_used_player_ids.includes(p.id);
                const legal = oppLegalIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 10,
                      marginBottom: 8,
                      borderRadius: 8,
                      border:
                        selectedOppPlayerId === p.id
                          ? "2px solid #dc2626"
                          : "1px solid #ddd",
                      background: used ? "#f3f4f6" : legal ? "#ecfdf5" : "#fff7ed",
                      cursor: used ? "not-allowed" : "pointer",
                    }}
                    onClick={() => {
                      if (!used) setSelectedOppPlayerId(p.id);
                    }}
                  >
                    <strong>{p.name}</strong> (SL {p.skill_level}){" "}
                    {used ? "— Used" : legal ? "— Legal" : "— Unavailable"}
                    <div style={{ fontSize: 13, color: "#555" }}>
                      Win Rate: {((p.recent_win_rate ?? 0.5) * 100).toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </section>
          </div>

          {!matchComplete && (
            <>
              <section
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
                }}
              >
                <h3>Actions</h3>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button onClick={handleBestFirst} disabled={busy}>
                    Recommend Our First Player
                  </button>
                  <button
                    onClick={handleBestResponse}
                    disabled={busy || !selectedOppPlayerId}
                  >
                    Recommend Best Response
                  </button>
                  <button
                    onClick={handleLockMatchup}
                    disabled={busy || !selectedOurPlayerId || !selectedOppPlayerId}
                  >
                    Lock Matchup
                  </button>
                </div>

                <div style={{ marginTop: 12, fontSize: 14 }}>
                  <div>
                    <strong>Selected Our Player:</strong>{" "}
                    {selectedOurPlayerId || "None"}
                  </div>
                  <div>
                    <strong>Selected Opponent Player:</strong>{" "}
                    {selectedOppPlayerId || "None"}
                  </div>
                </div>
              </section>

              {bestFirstRecs.length > 0 && (
                <section
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                  }}
                >
                  <h3>Best First Declaration</h3>
                  {bestFirstRecs.map((rec) => (
                    <div
                      key={rec.player.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <strong>{rec.player.name}</strong> (SL {rec.player.skill_level}) ·
                          Value {rec.value.toFixed(3)}
                        </div>
                        <div
                          style={{
                            background: badgeColor(rec.confidence),
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {rec.confidence || "n/a"}
                        </div>
                      </div>

                      {rec.explanation?.summary && <p>{rec.explanation.summary}</p>}
                      {rec.explanation?.legality && (
                        <p>
                          <strong>Legality:</strong> {rec.explanation.legality}
                        </p>
                      )}
                      {rec.explanation?.future_flexibility && (
                        <p>
                          <strong>Future:</strong> {rec.explanation.future_flexibility}
                        </p>
                      )}
                      {rec.explanation?.strategy && (
                        <p>
                          <strong>Strategy:</strong> {rec.explanation.strategy}
                        </p>
                      )}

                      <button onClick={() => setSelectedOurPlayerId(rec.player.id)}>
                        Use This Player
                      </button>
                    </div>
                  ))}
                </section>
              )}

              {bestResponseRecs.length > 0 && (
                <section
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                  }}
                >
                  <h3>Best Response</h3>
                  {bestResponseRecs.map((rec) => (
                    <div
                      key={rec.player.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div>
                          <strong>{rec.player.name}</strong> (SL {rec.player.skill_level}) ·
                          Value {rec.value.toFixed(3)}
                        </div>
                        <div
                          style={{
                            background: badgeColor(rec.confidence),
                            padding: "4px 8px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {rec.confidence || "n/a"}
                        </div>
                      </div>

                      {rec.explanation?.summary && <p>{rec.explanation.summary}</p>}
                      {rec.explanation?.legality && (
                        <p>
                          <strong>Legality:</strong> {rec.explanation.legality}
                        </p>
                      )}
                      {rec.explanation?.future_flexibility && (
                        <p>
                          <strong>Future:</strong> {rec.explanation.future_flexibility}
                        </p>
                      )}
                      {rec.explanation?.strategy && (
                        <p>
                          <strong>Strategy:</strong> {rec.explanation.strategy}
                        </p>
                      )}

                      <button onClick={() => setSelectedOurPlayerId(rec.player.id)}>
                        Use This Player
                      </button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}

          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3>Matchup History</h3>
            {matchState.locked_matchups.length === 0 ? (
              <p>No completed rounds yet.</p>
            ) : (
              matchState.locked_matchups.map((m) => {
                const ourP = findPlayer(matchState.our_team, m.our_player_id);
                const oppP = findPlayer(matchState.opp_team, m.opp_player_id);

                return (
                  <div
                    key={`${m.round_index}-${m.our_player_id}-${m.opp_player_id}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <strong>Round {m.round_index}:</strong> {ourP?.name || m.our_player_id} vs{" "}
                    {oppP?.name || m.opp_player_id}
                  </div>
                );
              })
            )}
          </section>

          {/* Lineup Possibility Tracker */}
          <section
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
              marginTop: 24,
            }}
          >
            <h3>Lineup Possibility Tracker</h3>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
              All legal 5-player lineups. Most likely in green. Eliminated in red with strikethrough.
              Eliminated lineups (red, strikethrough) can no longer be played.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Our Team Lineups */}
              <div>
                <h4>{matchState.our_team.name} - Our Lineups</h4>
                
                {/* Must Include Section */}
                {matchState.our_used_player_ids.length > 0 && (
                  <div style={{ fontSize: 12, marginBottom: 8, color: "#7c3aed" }}>
                    <strong>Must include:</strong>{" "}
                    {matchState.our_used_player_ids.map((pid, idx) => {
                      const p = findPlayer(matchState.our_team, pid);
                      return (
                        <span key={pid}>
                          {idx > 0 && ", "}
                          {p?.name || pid} (SL{p?.skill_level})
                        </span>
                      );
                    })}
                  </div>
                )}
                
                {/* Summary Counts */}
                {ourLineupStatus && (
                  <div style={{ 
                    fontSize: 12, 
                    marginBottom: 10,
                    padding: "6px 10px",
                    borderRadius: 4,
                    background: ourLineupStatus.active_lineups.length <= 3 ? "#fef3c7" : "#f3f4f6",
                    border: ourLineupStatus.active_lineups.length <= 3 ? "1px solid #f59e0b" : "1px solid #e5e7eb",
                  }}>
                    <span style={{ color: ourLineupStatus.active_lineups.length <= 3 ? "#92400e" : "#1f2937" }}>
                      <strong>Active:</strong> {ourLineupStatus.active_lineups.length} |{" "}
                      <strong>Eliminated:</strong> {ourLineupStatus.eliminated_lineups.length}
                    </span>
                  </div>
                )}
                
                {/* Lineup Pressure Indicator */}
                {ourLineupStatus && ourLineupStatus.active_lineups.length === 1 && (
                  <div style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    marginBottom: 10,
                    borderRadius: 4,
                    background: "#fee2e2",
                    border: "2px solid #dc2626",
                    color: "#991b1b",
                    fontWeight: 700,
                  }}>
                    ⚠️ Only one viable lineup remains - lineup locked!
                  </div>
                )}
                {ourLineupStatus && ourLineupStatus.active_lineups.length > 1 && ourLineupStatus.active_lineups.length <= 3 && (
                  <div style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    marginBottom: 10,
                    borderRadius: 4,
                    background: "#fef3c7",
                    border: "1px solid #f59e0b",
                    color: "#92400e",
                  }}>
                    ⚠️ Limited options: {ourLineupStatus.active_lineups.length} active lineups
                  </div>
                )}
                {ourLineupStatus && (
                  <div style={{ fontSize: 13 }}>
                    {ourLineupStatus.active_lineups.length === 0 && 
                     ourLineupStatus.eliminated_lineups.length === 0 ? (
                      <p>No legal lineups found.</p>
                    ) : (
                      <>
                        {/* Most Likely (first) */}
                        {ourLineupStatus.active_lineups.find(l => l.most_likely) && (
                          <div style={{ marginBottom: 8 }}>
                            {ourLineupStatus.active_lineups.filter(l => l.most_likely).map((lineup, idx) => (
                              <div
                                key={`mostlikely-${idx}`}
                                style={{
                                  padding: "8px 12px",
                                  marginBottom: 4,
                                  borderRadius: 4,
                                  background: "#d1fae5",
                                  border: "2px solid #10b981",
                                  color: "#065f46",
                                  fontWeight: 700,
                                }}
                              >
                                {lineup.label}
                                {lineup.count && lineup.count > 1 && <span style={{color: "#065f46", fontWeight: 400}}> ({lineup.count} combos)</span>}
                                {" "}← most likely
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Remaining Active (not most likely) */}
                        {ourLineupStatus.active_lineups.filter(l => !l.most_likely).length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Other active:</div>
                            {ourLineupStatus.active_lineups.filter(l => !l.most_likely).map((lineup, idx) => (
                              <div
                                key={`active-${idx}`}
                                style={{
                                  padding: "6px 10px",
                                  marginBottom: 4,
                                  borderRadius: 4,
                                  background: "#f9fafb",
                                  border: "1px solid #e5e7eb",
                                  color: "#1f2937",
                                }}
                              >
                                {lineup.label}
                                {lineup.count && lineup.count > 1 && <span style={{color: "#6b7280"}}> ({lineup.count} combos)</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Eliminated */}
                        {ourLineupStatus.eliminated_lineups.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, color: "#991b1b", marginBottom: 4 }}>Eliminated:</div>
                            {ourLineupStatus.eliminated_lineups.map((lineup, idx) => (
                              <div
                                key={`elim-${idx}`}
                                style={{
                                  padding: "6px 10px",
                                  marginBottom: 4,
                                  borderRadius: 4,
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#991b1b",
                                  textDecoration: "line-through",
                                  opacity: 0.7,
                                }}
                              >
                                {lineup.label}
                                {lineup.count && lineup.count > 1 && <span style={{color: "#991b1b", opacity: 0.7}}> ({lineup.count} combos)</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Opponent Team Lineups */}
              <div>
                <h4>{matchState.opp_team.name} - Opponent Lineups</h4>
                
                {/* Must Include Section */}
                {matchState.opp_used_player_ids.length > 0 && (
                  <div style={{ fontSize: 12, marginBottom: 8, color: "#7c3aed" }}>
                    <strong>Must include:</strong>{" "}
                    {matchState.opp_used_player_ids.map((pid, idx) => {
                      const p = findPlayer(matchState.opp_team, pid);
                      return (
                        <span key={pid}>
                          {idx > 0 && ", "}
                          {p?.name || pid} (SL{p?.skill_level})
                        </span>
                      );
                    })}
                  </div>
                )}
                
                {/* Summary Counts */}
                {oppLineupStatus && (
                  <div style={{ 
                    fontSize: 12, 
                    marginBottom: 10,
                    padding: "6px 10px",
                    borderRadius: 4,
                    background: oppLineupStatus.active_lineups.length <= 3 ? "#fef3c7" : "#f3f4f6",
                    border: oppLineupStatus.active_lineups.length <= 3 ? "1px solid #f59e0b" : "1px solid #e5e7eb",
                  }}>
                    <span style={{ color: oppLineupStatus.active_lineups.length <= 3 ? "#92400e" : "#1f2937" }}>
                      <strong>Active:</strong> {oppLineupStatus.active_lineups.length} |{" "}
                      <strong>Eliminated:</strong> {oppLineupStatus.eliminated_lineups.length}
                    </span>
                  </div>
                )}
                
                {/* Lineup Pressure Indicator */}
                {oppLineupStatus && oppLineupStatus.active_lineups.length === 1 && (
                  <div style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    marginBottom: 10,
                    borderRadius: 4,
                    background: "#fee2e2",
                    border: "2px solid #dc2626",
                    color: "#991b1b",
                    fontWeight: 700,
                  }}>
                    ⚠️ Only one viable lineup remains - lineup locked!
                  </div>
                )}
                {oppLineupStatus && oppLineupStatus.active_lineups.length > 1 && oppLineupStatus.active_lineups.length <= 3 && (
                  <div style={{
                    fontSize: 12,
                    padding: "8px 12px",
                    marginBottom: 10,
                    borderRadius: 4,
                    background: "#fef3c7",
                    border: "1px solid #f59e0b",
                    color: "#92400e",
                  }}>
                    ⚠️ Limited options: {oppLineupStatus.active_lineups.length} active lineups
                  </div>
                )}
                {oppLineupStatus && (
                  <div style={{ fontSize: 13 }}>
                    {oppLineupStatus.active_lineups.length === 0 && 
                     oppLineupStatus.eliminated_lineups.length === 0 ? (
                      <p>No legal lineups found.</p>
                    ) : (
                      <>
                        {/* Most Likely (first) */}
                        {oppLineupStatus.active_lineups.find(l => l.most_likely) && (
                          <div style={{ marginBottom: 8 }}>
                            {oppLineupStatus.active_lineups.filter(l => l.most_likely).map((lineup, idx) => (
                              <div
                                key={`mostlikely-${idx}`}
                                style={{
                                  padding: "8px 12px",
                                  marginBottom: 4,
                                  borderRadius: 4,
                                  background: "#d1fae5",
                                  border: "2px solid #10b981",
                                  color: "#065f46",
                                  fontWeight: 700,
                                }}
                              >
                                {lineup.label}
                                {lineup.count && lineup.count > 1 && <span style={{color: "#065f46", fontWeight: 400}}> ({lineup.count} combos)</span>}
                                {" "}← most likely
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Remaining Active (not most likely) */}
                        {oppLineupStatus.active_lineups.filter(l => !l.most_likely).length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>Other active:</div>
                            {oppLineupStatus.active_lineups.filter(l => !l.most_likely).map((lineup, idx) => (
                              <div
                                key={`active-${idx}`}
                                style={{
                                  padding: "6px 10px",
                                  marginBottom: 4,
                                  borderRadius: 4,
                                  background: "#f9fafb",
                                  border: "1px solid #e5e7eb",
                                  color: "#1f2937",
                                }}
                              >
                                {lineup.label}
                                {lineup.count && lineup.count > 1 && <span style={{color: "#6b7280"}}> ({lineup.count} combos)</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Eliminated */}
                        {oppLineupStatus.eliminated_lineups.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, color: "#991b1b", marginBottom: 4 }}>Eliminated:</div>
                            {oppLineupStatus.eliminated_lineups.map((lineup, idx) => (
                              <div
                                key={`elim-${idx}`}
                                style={{
                                  padding: "6px 10px",
                                  marginBottom: 4,
                                  borderRadius: 4,
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#991b1b",
                                  textDecoration: "line-through",
                                  opacity: 0.7,
                                }}
                              >
                                {lineup.label}
                                {lineup.count && lineup.count > 1 && <span style={{color: "#991b1b", opacity: 0.7}}> ({lineup.count} combos)</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}