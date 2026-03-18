const API_BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed.detail || parsed.error || text;
    } catch {
      // leave text as-is
    }
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${message}`);
  }

  return text ? JSON.parse(text) : ({} as T);
}

export async function checkHealth(): Promise<{ ok: boolean }> {
  return fetchJson(`${API_BASE}/health`);
}

export async function getSampleMatch(): Promise<any> {
  return fetchJson(`${API_BASE}/sample-match`);
}

export async function getLegalPlayers(state: any): Promise<any> {
  return fetchJson(`${API_BASE}/legal-players`, {
    method: "POST",
    body: JSON.stringify(state),
  });
}

export async function getBestFirstDeclaration(state: any): Promise<any> {
  return fetchJson(`${API_BASE}/best-first-declaration`, {
    method: "POST",
    body: JSON.stringify(state),
  });
}

export async function getBestResponse(state: any, oppPlayerId: string): Promise<any> {
  return fetchJson(`${API_BASE}/best-response`, {
    method: "POST",
    body: JSON.stringify({
      state,
      opp_player_id: oppPlayerId,
    }),
  });
}

export async function applyMatchup(state: any, ourPlayerId: string, oppPlayerId: string): Promise<any> {
  return fetchJson(`${API_BASE}/apply-matchup`, {
    method: "POST",
    body: JSON.stringify({
      state,
      our_player_id: ourPlayerId,
      opp_player_id: oppPlayerId,
    }),
  });
}

// ============ TEAM MANAGEMENT ============

export async function getTeams(): Promise<{ teams: any[] }> {
  return fetchJson(`${API_BASE}/teams`);
}

export async function createTeam(team: any): Promise<any> {
  return fetchJson(`${API_BASE}/teams`, {
    method: "POST",
    body: JSON.stringify(team),
  });
}

export async function updateTeam(teamId: string, team: any): Promise<any> {
  return fetchJson(`${API_BASE}/teams/${teamId}`, {
    method: "PUT",
    body: JSON.stringify(team),
  });
}

export async function deleteTeam(teamId: string): Promise<any> {
  return fetchJson(`${API_BASE}/teams/${teamId}`, {
    method: "DELETE",
  });
}

// ============ MATCH CREATION ============

export async function createMatch(ourTeamId: string, oppTeamId: string, declarerOrder: string[]): Promise<any> {
  return fetchJson(`${API_BASE}/create-match`, {
    method: "POST",
    body: JSON.stringify({
      our_team_id: ourTeamId,
      opp_team_id: oppTeamId,
      first_declarer_by_round: declarerOrder,
    }),
  });
}
