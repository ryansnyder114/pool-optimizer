import React from "react";
import { MatchState } from "../types";

interface CaptainGuidancePanelProps {
  matchState: MatchState;
}

export const CaptainGuidancePanel: React.FC<CaptainGuidancePanelProps> = ({ matchState }) => {
  const currentRound = matchState.round_index;
  const totalRounds = 5;
  
  if (currentRound > totalRounds) {
    return (
      <div style={styles.container}>
        <h3 style={styles.title}>👨‍💼 Captain's Guidance</h3>
        <div style={styles.completeBox}>
          <p style={styles.completeText}>🎉 Match Complete!</p>
          <p style={styles.scoreText}>
            Final Score: Us {matchState.our_points.toFixed(1)} - {matchState.opp_points.toFixed(1)} Them
          </p>
        </div>
      </div>
    );
  }
  
  const currentDeclarer = matchState.first_declarer_by_round[currentRound - 1] || "us";
  const isOurTurn = currentDeclarer === "us";
  
  const getGuidance = () => {
    const roundLeft = totalRounds - currentRound + 1;
    const ourUsed = matchState.our_used_player_ids.length;
    const ourRemaining = matchState.our_team.players.length - ourUsed;
    
    if (isOurTurn) {
      return {
        icon: "🗣️",
        heading: "You Declare First This Round",
        prompt: "Start with the safest high-value legal option. Your recommendation is optimized for the best outcome assuming opponent picks their best counter.",
        color: "#d4edda",
        borderColor: "#28a745"
      };
    } else {
      return {
        icon: "🎯",
        heading: "Opponent Has Declared",
        prompt: "Choose the best legal counter to their player. The response recommendations account for the opponent's specific pick.",
        color: "#fff3cd",
        borderColor: "#ffc107"
      };
    }
  };
  
  const guidance = getGuidance();
  
  return (
    <div style={{ ...styles.container, backgroundColor: guidance.color, borderColor: guidance.borderColor }}>
      <h3 style={styles.title}>👨‍💼 Captain's Guidance</h3>
      <div style={styles.roundBadge}>
        Round {currentRound} of {totalRounds}
      </div>
      <div style={styles.guidanceBox}>
        <div style={styles.icon}>{guidance.icon}</div>
        <div>
          <h4 style={styles.heading}>{guidance.heading}</h4>
          <p style={styles.prompt}>{guidance.prompt}</p>
        </div>
      </div>
      <div style={styles.statusRow}>
        <span style={styles.statusItem}>
          <strong>Our players used:</strong> {matchState.our_used_player_ids.length}
        </span>
        <span style={styles.statusItem}>
          <strong>Remaining:</strong> {matchState.our_team.players.length - matchState.our_used_player_ids.length}
        </span>
      </div>
    </div>
  );
};

const styles = {
  container: {
    marginBottom: "20px",
    padding: "15px",
    border: "2px solid #ddd",
    borderRadius: "8px",
  },
  title: {
    margin: "0 0 10px 0",
    color: "#333",
  },
  roundBadge: {
    display: "inline-block",
    padding: "4px 12px",
    backgroundColor: "#007bff",
    color: "white",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "bold" as const,
    marginBottom: "10px",
  },
  guidanceBox: {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    marginBottom: "10px",
  },
  icon: {
    fontSize: "24px",
  },
  heading: {
    margin: "0 0 5px 0",
    fontSize: "16px",
    color: "#333",
  },
  prompt: {
    margin: 0,
    fontSize: "14px",
    color: "#555",
    lineHeight: "1.4",
  },
  statusRow: {
    display: "flex",
    gap: "20px",
    fontSize: "13px",
    color: "#666",
    paddingTop: "10px",
    borderTop: "1px solid rgba(0,0,0,0.1)",
  },
  statusItem: {
    fontWeight: "500" as const,
  },
  completeBox: {
    textAlign: "center" as const,
    padding: "10px",
  },
  completeText: {
    fontSize: "18px",
    fontWeight: "bold" as const,
    margin: "0 0 5px 0",
  },
  scoreText: {
    fontSize: "16px",
    margin: 0,
    color: "#555",
  },
};
